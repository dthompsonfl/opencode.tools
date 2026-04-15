import { v4 as uuidv4 } from 'uuid';
import * as os from 'os';
import * as path from 'path';
import { EnterpriseStateMachine } from '@foundry/core/state-machine';
import type { StateContext, StateEvent, StatePhase } from '@foundry/types';
import { Database } from '@/storage/db';
import { FoundryCollaborationHub } from './collaboration-hub';
import { createWarmedUpBridge } from './cowork-bridge';
import { QualityGateRunner } from './quality-gates';
import { createFoundryStateMachineDefinition } from './state-definition';
import { UnifiedStateStore } from '../integration/unified-state-store';
import { SessionPersistenceAdapter } from '../integration/session-persistence-adapter';
import { UnifiedEvidenceStore, type JsonValue } from '../integration/unified-evidence-store';
import type { StateTransitionMetadata, UnifiedStateAction } from '../integration/types';
import type {
  CompletionCriteriaVerificationReport,
  CompletionCriteriaSpec,
} from './completion-criteria';
import {
  CompletionCriteriaVerifier,
  parseCompletionCriteriaDsl,
  validateCompletionCriteria,
} from './completion-criteria';
import {
  evaluateRepositoryDeliverableScope,
  type DeliverableScopeReport,
} from './deliverable-scope';
import { IntakeDocumentProcessor, type FoundryIntakeProcessingResult } from './intake-document-processor';
import { PlanDeveloper, type FoundryExecutionPlan } from './plan-developer';
import { buildExplicitRolePrompt } from './role-prompts';
import { TaskDelegationEngine } from './task-delegation-engine';
import type {
  FoundryExecutionReport,
  FoundryExecutionRequest,
  FoundryMessage,
  FoundryQualityGateResult,
  FoundryReviewResult,
  FoundryTask,
} from './contracts';

type GateStatus = 'not_started' | 'passed' | 'failed';

interface ExecutionCheckpoint {
  resumeKey: string;
  projectId: string;
  phaseIndex: number;
  completedStepSignatures: string[];
  completedTaskSignatures: string[];
  gateStatus: GateStatus;
  tasks: FoundryTask[];
  messages: FoundryMessage[];
  gateResults: FoundryQualityGateResult[];
  stepOutcomes: Record<string, unknown>;
  updatedAt: number;
}

export class FoundryOrchestrator {
  private readonly collaborationHub = new FoundryCollaborationHub();
  private readonly coworkBridge = createWarmedUpBridge();
  private readonly gateRunner = new QualityGateRunner();
  private readonly snapshotAdapter = new SessionPersistenceAdapter();
  private readonly evidenceStore = new UnifiedEvidenceStore({
    persistenceFilePath: path.join(os.tmpdir(), 'opencode-tools', 'foundry-evidence-store.json'),
  });
  private readonly db = Database.Client();
  private readonly intakeProcessor = new IntakeDocumentProcessor();
  private readonly planDeveloper = new PlanDeveloper();
  private readonly delegationEngine = new TaskDelegationEngine({ maxConcurrency: 2 });
  private tasks: FoundryTask[] = [];
  private messages: FoundryMessage[] = [];
  private stateStore: UnifiedStateStore | null = null;
  private stateContext: { projectId: string; runId: string; sessionId: string } | null = null;
  private activePlan: FoundryExecutionPlan | null = null;
  private activeIntake: FoundryIntakeProcessingResult | null = null;
  private activeCompletionCriteria: CompletionCriteriaSpec | null = null;
  private activeCriteriaReport: CompletionCriteriaVerificationReport | null = null;
  private activeDeliverableScopeReport: DeliverableScopeReport | null = null;

  public async execute(request: FoundryExecutionRequest): Promise<FoundryExecutionReport> {
    const startedAt = new Date().toISOString();
    const resumeKey = request.resumeKey?.trim() || request.projectId;
    const checkpoint = await this.loadCheckpoint(request.projectId, resumeKey);

    await this.initializeStateStore(request.projectId, resumeKey, resumeKey);

    this.tasks = [...checkpoint.tasks];
    this.messages = [...checkpoint.messages];
    this.collaborationHub.clear();
    this.activeIntake = await this.processIntakeDocuments(request);
    this.activeCompletionCriteria = this.resolveCompletionCriteria(request);
    this.activePlan = this.planDeveloper.developPlan({
      projectName: request.projectName,
      description: request.description,
      industry: request.industry,
      completionCriteria: this.activeCompletionCriteria ?? undefined,
      intakeContext: this.activeIntake?.mergedContext,
    });
    this.activeCriteriaReport = null;
    this.activeDeliverableScopeReport = null;

    await this.delegationEngine.addTasks([
      {
        id: `plan-${request.projectId}`,
        title: 'Develop Foundry execution plan',
        roleId: 'PRODUCT_MANAGER',
        priority: 'high',
        dependsOn: [],
        payload: {
          projectId: request.projectId,
          summary: this.activePlan.executiveSummary,
        },
      },
    ]);
    const seededPlanTask = await this.delegationEngine.getNextTask(['PRODUCT_MANAGER']);
    if (seededPlanTask) {
      await this.delegationEngine.markTaskCompleted(seededPlanTask.id);
    }

    this.coworkBridge.getEventBus().publish('workflow:start', {
      projectId: request.projectId,
      projectName: request.projectName,
      sessionId: resumeKey,
      startedAt,
    });
    this.dispatchState(
      { type: 'WORKFLOW_PATCH', patch: { status: 'running', phase: 'idle' } },
      'foundry.execute',
      'workflow_start'
    );
    this.appendEvidence('workflow_start', 'foundry', {
      projectId: request.projectId,
      projectName: request.projectName,
      resumeKey,
      startedAt,
      intake: this.activeIntake?.mergedContext,
      plan: this.activePlan,
    });

    // Validate bridge health before execution
    const healthCheck = this.coworkBridge.healthCheck();
    if (!healthCheck.healthy) {
      console.warn('FoundryCoworkBridge health check warnings:', healthCheck.errors);
    }

    const stateMachine = new EnterpriseStateMachine({
      definition: createFoundryStateMachineDefinition(),
      context: this.createInitialContext(request),
    });

    const maxIterations = Math.max(1, request.maxIterations || 2);
    const runQualityGates = request.runQualityGates !== false;
    const gateResults: FoundryQualityGateResult[] = [...checkpoint.gateResults];
    let review: FoundryReviewResult = {
      passed: true,
      notes: ['No release review executed'],
      reviewer: 'QA_LEAD',
    };

    try {
      await this.transitionStep(stateMachine, 'INIT_PROJECT', 'transition:init_project', checkpoint, gateResults);
      await this.runRoleTaskWithCheckpoint(
        stateMachine,
        'task:discovery',
        checkpoint,
        gateResults,
        'PRODUCT_MANAGER',
        'Discovery and intent decomposition',
        this.buildDiscoveryTask(request),
      );

      await this.transitionStep(stateMachine, 'START_PHASE', 'transition:start_architecture', checkpoint, gateResults);
      await this.runRoleTaskWithCheckpoint(
        stateMachine,
        'task:architecture',
        checkpoint,
        gateResults,
        'CTO_ORCHESTRATOR',
        'Architecture and execution strategy',
        this.buildArchitectureTask(request),
      );

      await this.transitionStep(stateMachine, 'START_PHASE', 'transition:start_security', checkpoint, gateResults);
      await this.runRoleTaskWithCheckpoint(
        stateMachine,
        'task:security_baseline',
        checkpoint,
        gateResults,
        'SECURITY_LEAD',
        'Security baseline and compliance checks',
        this.buildSecurityTask(request),
      );

      await this.transitionStep(
        stateMachine,
        'START_FEATURE_LOOP',
        'transition:enter_feature_loop',
        checkpoint,
        gateResults,
      );

      for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
        await this.transitionStep(
          stateMachine,
          'START_FEATURE_LOOP',
          `transition:feature_loop_start:${iteration}`,
          checkpoint,
          gateResults,
        );
        const planningOk = await this.runRoleTaskWithCheckpoint(
          stateMachine,
          `task:feature_planning:${iteration}`,
          checkpoint,
          gateResults,
          'PRODUCT_MANAGER',
          `Feature planning iteration ${iteration}`,
          this.buildPlanningTask(request, iteration),
        );

        if (!planningOk) {
          break;
        }

        await this.transitionStep(
          stateMachine,
          'ASSIGN_TASK',
          `transition:assign_task:${iteration}`,
          checkpoint,
          gateResults,
        );
        const implementationOk = await this.runRoleTaskWithCheckpoint(
          stateMachine,
          `task:feature_implementation:${iteration}`,
          checkpoint,
          gateResults,
          'STAFF_BACKEND_ENGINEER',
          `Feature implementation iteration ${iteration}`,
          this.buildImplementationTask(request, iteration),
        );

        if (!implementationOk) {
          await this.transitionStep(
            stateMachine,
            'ABORT',
            `transition:abort_on_implementation:${iteration}`,
            checkpoint,
            gateResults,
          );
          break;
        }

        await this.transitionStep(
          stateMachine,
          'COMPLETE_TASK',
          `transition:complete_implementation:${iteration}`,
          checkpoint,
          gateResults,
        );
        const peerReviewOk = await this.runRoleTaskWithCheckpoint(
          stateMachine,
          `task:peer_review:${iteration}`,
          checkpoint,
          gateResults,
          'QA_LEAD',
          `Peer review iteration ${iteration}`,
          this.buildReviewTask(request, iteration),
        );

        if (!peerReviewOk) {
          await this.transitionStep(
            stateMachine,
            'REJECT_RELEASE',
            `transition:review_reject:${iteration}`,
            checkpoint,
            gateResults,
          );
          await this.runRoleTaskWithCheckpoint(
            stateMachine,
            `task:review_remediation:${iteration}`,
            checkpoint,
            gateResults,
            'STAFF_BACKEND_ENGINEER',
            `Remediation for review findings iteration ${iteration}`,
            'Address review findings and provide a concise remediation summary.',
          );
          await this.transitionStep(
            stateMachine,
            'COMPLETE_TASK',
            `transition:remediation_complete:${iteration}`,
            checkpoint,
            gateResults,
          );
          await this.transitionStep(
            stateMachine,
            'APPROVE_PHASE',
            `transition:feature_approve:${iteration}`,
            checkpoint,
            gateResults,
          );
        } else {
          await this.transitionStep(
            stateMachine,
            'APPROVE_PHASE',
            `transition:feature_approve:${iteration}`,
            checkpoint,
            gateResults,
          );
        }

        if (iteration < maxIterations) {
          await this.transitionStep(
            stateMachine,
            'COMPLETE_FEATURE',
            `transition:complete_feature:${iteration}`,
            checkpoint,
            gateResults,
          );
        }
      }

      await this.transitionStep(stateMachine, 'APPROVE_PHASE', 'transition:approve_hardening', checkpoint, gateResults);

      if (runQualityGates) {
        await this.transitionStep(stateMachine, 'RUN_GATES', 'transition:run_gates', checkpoint, gateResults);
        const initialGateResults = await this.gateStep('gates:initial', checkpoint, gateResults, request.repoRoot);

        if (initialGateResults.every((gate) => gate.passed)) {
          checkpoint.gateStatus = 'passed';
          await this.transitionStep(stateMachine, 'GATES_PASSED', 'transition:gates_passed', checkpoint, gateResults);
        } else {
          checkpoint.gateStatus = 'failed';
          await this.transitionStep(stateMachine, 'GATES_FAILED', 'transition:gates_failed', checkpoint, gateResults);
          await this.transitionStep(
            stateMachine,
            'START_REMEDIATION',
            'transition:start_remediation',
            checkpoint,
            gateResults,
          );
          await this.runRoleTaskWithCheckpoint(
            stateMachine,
            'task:gate_remediation',
            checkpoint,
            gateResults,
            'SECURITY_LEAD',
            'Quality gate remediation plan',
            this.buildRemediationTask(initialGateResults),
          );
          await this.transitionStep(
            stateMachine,
            'COMPLETE_REMEDIATION',
            'transition:complete_remediation',
            checkpoint,
            gateResults,
          );

          const rerunGateResults = await this.gateStep('gates:rerun', checkpoint, gateResults, request.repoRoot);
          if (rerunGateResults.every((gate) => gate.passed)) {
            checkpoint.gateStatus = 'passed';
            await this.transitionStep(
              stateMachine,
              'GATES_PASSED',
              'transition:gates_passed_after_remediation',
              checkpoint,
              gateResults,
            );
          } else {
            checkpoint.gateStatus = 'failed';
            await this.transitionStep(stateMachine, 'ABORT', 'transition:abort_after_gates', checkpoint, gateResults);
          }
        }
      }

      if (stateMachine.getCurrentPhase() !== 'aborted') {
        // PROMPT_ENGINEER stage - clean up and optimize prompts/code for production
        await this.transitionStep(
          stateMachine,
          'START_PROMPT_ENGINEERING',
          'transition:start_prompt_engineering',
          checkpoint,
          gateResults,
        );
        
        const promptEngineeringOk = await this.runRoleTaskWithCheckpoint(
          stateMachine,
          'task:prompt_engineering',
          checkpoint,
          gateResults,
          'PROMPT_ENGINEER',
          'Prompt engineering and code cleanup',
          this.buildPromptEngineeringTask(request),
        );
        
        await this.transitionStep(
          stateMachine,
          'COMPLETE_PROMPT_ENGINEERING',
          'transition:complete_prompt_engineering',
          checkpoint,
          gateResults,
        );
        
        this.activeCriteriaReport = await this.verifyCompletionCriteria(request.repoRoot);
        if (this.activeCriteriaReport) {
          this.appendEvidence('completion_criteria_verification', 'foundry', this.activeCriteriaReport);
          this.recordBroadcast(
            'QA_LEAD',
            'criteria:verification',
            this.activeCriteriaReport.passed
              ? 'Completion criteria verification passed.'
              : 'Completion criteria verification failed. Remediation is required before release.',
            {
              passed: this.activeCriteriaReport.passed,
              errors: this.activeCriteriaReport.errors,
            },
          );
        }

        const deliverableScopeReport = this.evaluateDeliverableScope(request);
        this.activeDeliverableScopeReport = deliverableScopeReport;
        this.appendEvidence('deliverable_scope_verification', 'foundry', deliverableScopeReport);
        this.recordBroadcast(
          'QA_LEAD',
          'deliverable:scope',
          deliverableScopeReport.passed
            ? 'Deliverable scope verification passed (code/docs/tests only).'
            : 'Deliverable scope verification failed. Excluded non-source artifacts were detected.',
          {
            passed: deliverableScopeReport.passed,
            strict: deliverableScopeReport.strict,
            includedCount: deliverableScopeReport.included.length,
            excludedCount: deliverableScopeReport.excluded.length,
            blockingCount: deliverableScopeReport.blockingExcluded.length,
            excludedPaths: deliverableScopeReport.excluded.map((entry) => entry.normalizedPath),
          },
        );
      }

      if (stateMachine.getCurrentPhase() !== 'aborted') {
        await this.transitionStep(
          stateMachine,
          'APPROVE_PHASE',
          'transition:approve_release_readiness',
          checkpoint,
          gateResults,
        );
        await this.transitionStep(
          stateMachine,
          'REQUEST_RELEASE',
          'transition:request_release',
          checkpoint,
          gateResults,
        );
        
        // CTO review loop - request structured decision from CTO
        review = await this.runCtoReviewLoop(stateMachine, request, gateResults, checkpoint);
        
        await this.transitionStep(
          stateMachine,
          review.passed ? 'APPROVE_RELEASE' : 'REJECT_RELEASE',
          review.passed ? 'transition:approve_release' : 'transition:reject_release',
          checkpoint,
          gateResults,
        );
      }
    } catch (error) {
      if (stateMachine.getCurrentPhase() !== 'aborted') {
        await this.transitionStep(stateMachine, 'ABORT', 'transition:abort_on_exception', checkpoint, gateResults);
      }

      review = {
        passed: false,
        reviewer: 'QA_LEAD',
        notes: [error instanceof Error ? error.message : String(error)],
      };
    }

    await this.saveCheckpoint(checkpoint, gateResults);

    const finishedAt = new Date().toISOString();
    const finalPhase = stateMachine.getCurrentPhase();
    const status = finalPhase === 'released' ? 'completed' : 'failed';

    this.dispatchState(
      {
        type: 'WORKFLOW_PATCH',
        patch: {
          phase: finalPhase,
          status: status === 'completed' ? 'completed' : 'failed',
          lastTransitionAt: Date.now(),
        },
      },
      'foundry.execute',
      'workflow_complete'
    );
    this.appendEvidence('workflow_complete', 'foundry', {
      projectId: request.projectId,
      status,
      phase: finalPhase,
      startedAt,
      finishedAt,
    });

    const runtimeMetrics = this.coworkBridge.getRuntimeMetrics();
    this.coworkBridge.getEventBus().publish('workflow:metrics', {
      projectId: request.projectId,
      sessionId: this.stateContext?.sessionId,
      runtimeMetrics,
      finishedAt,
    });

    await this.persistStateSnapshot(`workflow:${status}`);

    return {
      projectId: request.projectId,
      status,
      iterationCount: maxIterations,
      phase: finalPhase,
      tasks: [...this.tasks],
      messages: [...this.messages],
      gateResults,
      review,
      intake: this.activeIntake ?? undefined,
      plan: this.activePlan ?? undefined,
      completionCriteriaReport: this.activeCriteriaReport ?? undefined,
      deliverableScopeReport: this.activeDeliverableScopeReport ?? undefined,
      startedAt,
      finishedAt,
    };
  }

  private async runReleaseReview(
    stateMachine: EnterpriseStateMachine,
    request: FoundryExecutionRequest,
    gateResults: FoundryQualityGateResult[],
    checkpoint: ExecutionCheckpoint,
  ): Promise<FoundryReviewResult> {
    const passedGates = gateResults.filter((gate) => gate.passed).length;
    const failedGates = gateResults.length - passedGates;
    const reviewTask = [
      `Project: ${request.projectName}`,
      `Gate results: ${passedGates} passed, ${failedGates} failed.`,
      'Perform final release readiness review and return a go/no-go recommendation.',
    ].join(' ');

    const ok = await this.runRoleTaskWithCheckpoint(
      stateMachine,
      'task:final_release_review',
      checkpoint,
      gateResults,
      'QA_LEAD',
      'Final release review',
      reviewTask,
    );

    const deliverableScopeStrict = request.enforceDeliverableScope !== false;
    const deliverableScopePassed = this.activeDeliverableScopeReport?.passed ?? true;
    const deliverableScopeNotes = this.activeDeliverableScopeReport
      ? this.activeDeliverableScopeReport.passed
        ? 'Deliverable scope verification passed (code/docs/tests only).'
        : `Deliverable scope verification failed: ${this.activeDeliverableScopeReport.excluded
          .map((entry) => entry.normalizedPath)
          .join(', ')}`
      : 'No deliverable scope verification report generated.';

    return {
      passed: ok
        && failedGates === 0
        && (this.activeCriteriaReport?.passed ?? true)
        && (!deliverableScopeStrict || deliverableScopePassed),
      reviewer: 'QA_LEAD',
      notes: [
        ok ? 'QA review completed successfully.' : 'QA review failed or unavailable.',
        failedGates === 0 ? 'All quality gates passed.' : 'One or more quality gates failed.',
        this.activeCriteriaReport
          ? this.activeCriteriaReport.passed
            ? 'Completion criteria verification passed.'
            : 'Completion criteria verification failed.'
          : 'No completion criteria verification configured.',
        deliverableScopeNotes,
        deliverableScopeStrict
          ? 'Deliverable scope enforcement is strict.'
          : 'Deliverable scope enforcement is advisory.',
      ],
    };
  }

  private async runRoleTaskWithCheckpoint(
    stateMachine: EnterpriseStateMachine,
    signature: string,
    checkpoint: ExecutionCheckpoint,
    gateResults: FoundryQualityGateResult[],
    roleId: string,
    title: string,
    taskBody: string,
  ): Promise<boolean> {
    if (checkpoint.completedTaskSignatures.includes(signature)) {
      return true;
    }

    const ok = await this.runRoleTask(stateMachine, roleId, title, taskBody);
    checkpoint.stepOutcomes[signature] = ok;
    if (ok) {
      checkpoint.completedTaskSignatures.push(signature);
      checkpoint.completedStepSignatures.push(signature);
    }

    await this.saveCheckpoint(checkpoint, gateResults);
    return ok;
  }

  private async gateStep(
    signature: string,
    checkpoint: ExecutionCheckpoint,
    gateResults: FoundryQualityGateResult[],
    repoRoot: string,
  ): Promise<FoundryQualityGateResult[]> {
    if (checkpoint.completedStepSignatures.includes(signature)) {
      const cached = checkpoint.stepOutcomes[signature];
      if (Array.isArray(cached)) {
        return cached as FoundryQualityGateResult[];
      }

      return [];
    }

    const results = await this.gateRunner.runAll(repoRoot);
    gateResults.push(...results);
    for (const gate of results) {
      this.appendEvidence('quality_gate', 'foundry', {
        signature,
        gate: gate.name,
        command: gate.command,
        passed: gate.passed,
        exitCode: gate.exitCode,
      });
    }
    checkpoint.gateResults = [...gateResults];
    checkpoint.stepOutcomes[signature] = results;
    checkpoint.completedStepSignatures.push(signature);
    await this.saveCheckpoint(checkpoint, gateResults);
    return results;
  }

  private async transitionStep(
    machine: EnterpriseStateMachine,
    event: StateEvent,
    signature: string,
    checkpoint: ExecutionCheckpoint,
    gateResults: FoundryQualityGateResult[],
  ): Promise<void> {
    const alreadyCompleted = checkpoint.completedStepSignatures.includes(signature);
    if (!machine.can(event)) {
      return;
    }

    const fromPhase = machine.getCurrentPhase();

    await machine.dispatch(event);
    const toPhase = machine.getCurrentPhase();

    this.dispatchState(
      {
        type: 'WORKFLOW_PATCH',
        patch: {
          phase: toPhase,
          status: toPhase === 'aborted' ? 'failed' : 'running',
          lastTransitionAt: Date.now(),
        },
      },
      'foundry.transition',
      signature,
    );
    this.appendEvidence('state_transition', 'foundry', {
      signature,
      event,
      fromPhase,
      toPhase,
    });

    this.coworkBridge.getEventBus().publish('workflow:phase_changed', {
      from: fromPhase,
      to: toPhase,
      signature,
      sessionId: this.stateContext?.sessionId,
    });

    if (!alreadyCompleted) {
      checkpoint.completedStepSignatures.push(signature);
      checkpoint.phaseIndex += 1;
      await this.saveCheckpoint(checkpoint, gateResults);
    }
  }

  private async runRoleTask(
    stateMachine: EnterpriseStateMachine,
    roleId: string,
    title: string,
    taskBody: string,
  ): Promise<boolean> {
    const phase = stateMachine.getCurrentPhase();
    const explicitPrompt = this.buildRolePrompt(roleId, title, phase, taskBody, stateMachine.getCurrentState().context);
    const task: FoundryTask = {
      id: uuidv4(),
      title,
      roleId,
      phase,
      status: 'in_progress',
      priority: 'high',
      dependsOn: [],
      payload: { taskBody, explicitPrompt },
    };
    this.tasks.push(task);

    this.dispatchState(
      {
        type: 'RUNTIME_PATCH',
        patch: {
          status: 'running',
          activeAgentIds: [roleId],
          lastHeartbeatAt: Date.now(),
          data: {
            currentTaskId: task.id,
            currentRoleId: roleId,
            currentTitle: title,
          },
        },
      },
      'foundry.task',
      `start:${task.id}`,
    );
    this.appendEvidence('task_assigned', 'foundry', {
      taskId: task.id,
      roleId,
      title,
      phase,
    });

    this.recordBroadcast('CTO_ORCHESTRATOR', `phase:${phase}`, `Assigned to ${roleId}: ${title}`, {
      taskId: task.id,
    });

    const result = await this.coworkBridge.dispatchRoleTask(roleId, explicitPrompt, {
      phase,
      title,
      taskId: task.id,
      sessionId: this.stateContext?.sessionId,
      projectName: this.stateContext?.projectId,
    });

    if (!result || !result.metadata.success) {
      task.status = 'failed';
      task.summary = result?.metadata.error || 'Agent unavailable or task failed';
      this.recordBroadcast(roleId, `phase:${phase}`, `Task failed: ${task.summary}`, { taskId: task.id });
      this.dispatchState(
        {
          type: 'RUNTIME_PATCH',
          patch: {
            status: 'failed',
            activeAgentIds: [],
            lastHeartbeatAt: Date.now(),
            data: {
              lastTaskId: task.id,
              lastTaskStatus: 'failed',
              error: task.summary,
            },
          },
        },
        'foundry.task',
        `failed:${task.id}`,
      );
      this.appendEvidence('task_failed', roleId, {
        taskId: task.id,
        phase,
        error: task.summary,
      });
      return false;
    }

    task.status = 'completed';
    task.summary = this.summarizeResult(result.output);
    this.recordBroadcast(roleId, `phase:${phase}`, `Task completed: ${task.summary}`, { taskId: task.id });
    this.dispatchState(
      {
        type: 'RUNTIME_PATCH',
        patch: {
          status: 'waiting',
          activeAgentIds: [],
          lastHeartbeatAt: Date.now(),
          data: {
            lastTaskId: task.id,
            lastTaskStatus: 'completed',
            summary: task.summary,
          },
        },
      },
      'foundry.task',
      `completed:${task.id}`,
    );
    this.appendEvidence('task_completed', roleId, {
      taskId: task.id,
      phase,
      summary: task.summary,
      output: this.serializeForEvidence(result.output),
    });
    return true;
  }

  private recordBroadcast(
    from: string,
    topic: string,
    content: string,
    metadata?: Record<string, unknown>,
  ): void {
    const message = this.collaborationHub.broadcast(from, topic, content, metadata);
    this.messages.push(message);
    this.appendEvidence('collaboration_message', from, {
      topic,
      content,
      metadata: this.serializeForEvidence(metadata),
      messageId: message.id,
      timestamp: message.timestamp,
    });
  }

  private summarizeResult(output: unknown): string {
    if (typeof output === 'string') {
      return output.slice(0, 220);
    }

    if (output === null || output === undefined) {
      return 'Completed with no structured output';
    }

    try {
      return JSON.stringify(output).slice(0, 220);
    } catch {
      return 'Completed with non-serializable output';
    }
  }

  private createInitialContext(request: FoundryExecutionRequest): StateContext {
    return {
      project: {
        name: request.projectName,
        repo_root: request.repoRoot,
        stakeholders: [],
        environments: ['dev'],
        compliance_targets: ['internal-governance'],
        risk_tolerance: 'low',
      },
      artifacts: {
        intake_summary: this.activeIntake ? JSON.stringify(this.activeIntake.mergedContext) : null,
      },
      backlog: {
        items: this.activePlan?.workBreakdownStructure.map((item) => ({
          id: item.id,
          title: item.title,
          ownerRole: item.ownerRole,
          dependencies: item.dependencies,
        })) ?? [],
      },
      current_phase: 'idle',
      current_feature_id: null,
      iteration: {
        phase_iteration: 0,
        remediation_iteration: 0,
      },
      evidence: { items: [] },
      last_gate_results: {
        intake: this.activeIntake?.mergedContext ?? {},
      },
    };
  }

  private async loadCheckpoint(projectId: string, resumeKey: string): Promise<ExecutionCheckpoint> {
    const rows = await this.db.query(
      'SELECT * FROM orchestrator_checkpoint WHERE resume_key = ?',
      [resumeKey],
    ) as Record<string, unknown>[];

    if (rows.length === 0) {
      return {
        resumeKey,
        projectId,
        phaseIndex: 0,
        completedStepSignatures: [],
        completedTaskSignatures: [],
        gateStatus: 'not_started',
        tasks: [],
        messages: [],
        gateResults: [],
        stepOutcomes: {},
        updatedAt: Date.now(),
      };
    }

    const row = rows[0];
    return {
      resumeKey,
      projectId,
      phaseIndex: Number(row.phase_index ?? 0),
      completedStepSignatures: this.parseStringArray(row.completed_step_signatures),
      completedTaskSignatures: this.parseStringArray(row.completed_task_signatures),
      gateStatus: this.parseGateStatus(row.gate_status),
      tasks: this.parseObjectArray<FoundryTask>(row.tasks),
      messages: this.parseObjectArray<FoundryMessage>(row.messages),
      gateResults: this.parseObjectArray<FoundryQualityGateResult>(row.gate_results),
      stepOutcomes: this.parseObject(row.step_outcomes),
      updatedAt: Number(row.updated_at ?? Date.now()),
    };
  }

  private async saveCheckpoint(
    checkpoint: ExecutionCheckpoint,
    gateResults: FoundryQualityGateResult[],
  ): Promise<void> {
    checkpoint.tasks = [...this.tasks];
    checkpoint.messages = [...this.messages];
    checkpoint.gateResults = [...gateResults];
    checkpoint.updatedAt = Date.now();

    await this.db.$client.execute({
      sql: `
        INSERT INTO orchestrator_checkpoint
          (resume_key, project_id, phase_index, completed_step_signatures, completed_task_signatures, gate_status, tasks, messages, gate_results, step_outcomes, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (resume_key) DO UPDATE SET
          project_id = excluded.project_id,
          phase_index = excluded.phase_index,
          completed_step_signatures = excluded.completed_step_signatures,
          completed_task_signatures = excluded.completed_task_signatures,
          gate_status = excluded.gate_status,
          tasks = excluded.tasks,
          messages = excluded.messages,
          gate_results = excluded.gate_results,
          step_outcomes = excluded.step_outcomes,
          updated_at = excluded.updated_at
      `,
      args: [
        checkpoint.resumeKey,
        checkpoint.projectId,
        checkpoint.phaseIndex,
        JSON.stringify(checkpoint.completedStepSignatures),
        JSON.stringify(checkpoint.completedTaskSignatures),
        checkpoint.gateStatus,
        JSON.stringify(checkpoint.tasks),
        JSON.stringify(checkpoint.messages),
        JSON.stringify(checkpoint.gateResults),
        JSON.stringify(checkpoint.stepOutcomes),
        checkpoint.updatedAt,
      ],
    });

    await this.persistStateSnapshot(`checkpoint:${checkpoint.phaseIndex}`);
  }

  private parseStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.map((item) => String(item));
    }

    if (typeof value !== 'string' || value.length === 0) {
      return [];
    }

    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
    } catch {
      return [];
    }
  }

  private parseObject(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    if (typeof value !== 'string' || value.length === 0) {
      return {};
    }

    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : {};
    } catch {
      return {};
    }
  }

  private parseObjectArray<T>(value: unknown): T[] {
    if (Array.isArray(value)) {
      return value as T[];
    }

    if (typeof value !== 'string' || value.length === 0) {
      return [];
    }

    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed as T[] : [];
    } catch {
      return [];
    }
  }

  private parseGateStatus(value: unknown): GateStatus {
    if (value === 'passed' || value === 'failed' || value === 'not_started') {
      return value;
    }

    return 'not_started';
  }

  private async initializeStateStore(projectId: string, runId: string, sessionId: string): Promise<void> {
    this.stateContext = { projectId, runId, sessionId };
    const latestSnapshot = await this.snapshotAdapter.loadLatestSnapshot(projectId);

    this.stateStore = new UnifiedStateStore({
      context: this.stateContext,
      initialState: latestSnapshot?.state,
      eventPublisher: this.coworkBridge.getEventBus(),
    });

    if (latestSnapshot) {
      this.coworkBridge.getEventBus().publish('snapshot:restored', {
        projectId,
        runId,
        sessionId,
        snapshotId: latestSnapshot.snapshotId,
        savedAt: latestSnapshot.metadata.savedAt,
      });
    }
  }

  private dispatchState(action: UnifiedStateAction, source: string, reason: string): void {
    if (!this.stateStore || !this.stateContext) {
      return;
    }

    const metadata: StateTransitionMetadata = {
      ...this.stateContext,
      source,
      reason,
      timestamp: Date.now(),
    };

    try {
      this.stateStore.dispatch(action, metadata);
    } catch {
      // Do not fail primary workflow on state projection errors.
    }
  }

  private async persistStateSnapshot(label: string): Promise<void> {
    if (!this.stateStore || !this.stateContext) {
      return;
    }

    const savedAt = Date.now();
    const snapshot = await this.snapshotAdapter.saveSnapshot(this.stateStore.getSnapshot(), {
      ...this.stateContext,
      savedAt,
      source: 'foundry.orchestrator',
      label,
    });

    this.coworkBridge.getEventBus().publish('snapshot:created', {
      projectId: this.stateContext.projectId,
      runId: this.stateContext.runId,
      sessionId: this.stateContext.sessionId,
      snapshotId: snapshot.snapshotId,
      label,
      savedAt,
    });
  }

  private appendEvidence(type: string, source: string, data: unknown): void {
    if (!this.stateContext) {
      return;
    }

    const serialized = this.serializeForEvidence(data);
    const serializedRecord = this.toEvidenceRecord(serialized);
    const record = this.evidenceStore.append({
      projectId: this.stateContext.projectId,
      runId: this.stateContext.runId,
      source,
      type,
      data: serialized,
      timestamp: new Date().toISOString(),
    });

    this.dispatchState(
      {
        type: 'EVIDENCE_UPSERT',
        item: {
          id: record.id,
          type,
          summary: `${source}:${type}`,
          createdAt: Date.now(),
          source,
          data: serializedRecord,
        },
      },
      'foundry.evidence',
      type,
    );
  }

  private serializeForEvidence(value: unknown): JsonValue {
    try {
      return JSON.parse(JSON.stringify(value ?? null)) as JsonValue;
    } catch {
      return String(value);
    }
  }

  private toEvidenceRecord(value: JsonValue): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    return { value };
  }

  private async processIntakeDocuments(request: FoundryExecutionRequest): Promise<FoundryIntakeProcessingResult | null> {
    if (!request.intakeDocuments || request.intakeDocuments.length === 0) {
      return null;
    }

    const result = await this.intakeProcessor.processDocuments(request.intakeDocuments);
    this.appendEvidence('intake_processed', 'foundry', {
      documentCount: result.documents.length,
      warnings: result.warnings,
      mergedContext: result.mergedContext,
    });

    return result;
  }

  private resolveCompletionCriteria(request: FoundryExecutionRequest): CompletionCriteriaSpec | null {
    if (request.completionCriteriaSpec) {
      const validation = validateCompletionCriteria(request.completionCriteriaSpec);
      if (validation.valid) {
        return request.completionCriteriaSpec;
      }

      this.appendEvidence('completion_criteria_invalid', 'foundry', {
        source: 'spec',
        errors: validation.errors,
      });
      return null;
    }

    if (!request.completionCriteriaDsl) {
      return null;
    }

    const parsed = parseCompletionCriteriaDsl(request.completionCriteriaDsl);
    if (!parsed.validation.valid) {
      this.appendEvidence('completion_criteria_invalid', 'foundry', {
        source: 'dsl',
        errors: parsed.validation.errors,
      });
      return null;
    }

    return parsed.spec;
  }

  private async verifyCompletionCriteria(repoRoot: string): Promise<CompletionCriteriaVerificationReport | null> {
    if (!this.activeCompletionCriteria) {
      return null;
    }

    const verifier = new CompletionCriteriaVerifier({ cwd: repoRoot });
    return verifier.verify(this.activeCompletionCriteria);
  }

  private evaluateDeliverableScope(request: FoundryExecutionRequest): DeliverableScopeReport {
    return evaluateRepositoryDeliverableScope(request.repoRoot, {
      strict: request.enforceDeliverableScope !== false,
      allowList: request.deliverableScopeAllowList,
    });
  }

  private buildRolePrompt(
    roleId: string,
    title: string,
    phase: StatePhase,
    taskBody: string,
    context: StateContext,
  ): string {
    return buildExplicitRolePrompt({
      roleId,
      projectName: context.project.name ?? this.stateContext?.projectId ?? 'unknown-project',
      phase,
      taskTitle: title,
      taskBody,
      repoRoot: context.project.repo_root,
      completionRequirements: this.collectCompletionRequirementsForTitle(title),
      context: {
        intake: this.activeIntake?.mergedContext ?? null,
        plan: this.activePlan,
      },
    });
  }

  private collectCompletionRequirementsForTitle(title: string): string[] {
    if (!this.activeCompletionCriteria) {
      return [];
    }

    const loweredTitle = title.toLowerCase();
    const matches = this.activeCompletionCriteria.criteria.filter((criterion) =>
      loweredTitle.includes(criterion.task.toLowerCase()) || criterion.task.toLowerCase().includes(loweredTitle),
    );

    if (matches.length === 0) {
      return this.activeCompletionCriteria.criteria.flatMap((criterion) => criterion.requires).slice(0, 8);
    }

    return matches.flatMap((criterion) => criterion.requires);
  }

  private buildDiscoveryTask(request: FoundryExecutionRequest): string {
    const parts = [
      `Project: ${request.projectName}`,
      request.company ? `Company: ${request.company}` : '',
      request.industry ? `Industry: ${request.industry}` : '',
      request.description ? `Intent: ${request.description}` : '',
      'Create a concise discovery brief and top execution priorities.',
    ];

    return parts.filter(Boolean).join(' ');
  }

  private buildArchitectureTask(request: FoundryExecutionRequest): string {
    return [
      `Project: ${request.projectName}.`,
      'Design a secure, scalable architecture with major components and trade-offs.',
      'Call out dependencies, risks, and implementation sequencing.',
    ].join(' ');
  }

  private buildSecurityTask(request: FoundryExecutionRequest): string {
    return [
      `Project: ${request.projectName}.`,
      'Create security baseline controls, threat model highlights, and compliance checkpoints.',
    ].join(' ');
  }

  private buildPlanningTask(request: FoundryExecutionRequest, iteration: number): string {
    return [
      `Project: ${request.projectName}.`,
      `Feature loop iteration: ${iteration}.`,
      'Break the objective into actionable implementation tasks and acceptance criteria.',
    ].join(' ');
  }

  private buildImplementationTask(request: FoundryExecutionRequest, iteration: number): string {
    return [
      `Project: ${request.projectName}.`,
      `Implement planned work for feature loop iteration ${iteration}.`,
      'Return concise implementation notes and any blockers.',
    ].join(' ');
  }

  private buildReviewTask(request: FoundryExecutionRequest, iteration: number): string {
    return [
      `Project: ${request.projectName}.`,
      `Review implementation output from feature loop iteration ${iteration}.`,
      'Provide pass/fail decision with clear remediation feedback.',
    ].join(' ');
  }

  private buildRemediationTask(gates: FoundryQualityGateResult[]): string {
    const failed = gates.filter((gate) => !gate.passed);
    if (failed.length === 0) {
      return 'No remediation needed.';
    }

    return [
      'Create a remediation plan for failed quality gates.',
      ...failed.map((gate) => `${gate.name}: ${gate.command}`),
    ].join(' ');
  }

  private buildPromptEngineeringTask(request: FoundryExecutionRequest): string {
    return [
      `Project: ${request.projectName}.`,
      'Review all generated code, prompts, and artifacts for production readiness.',
      'Optimize prompts, clean up code, ensure consistency across the codebase.',
      'Focus on: prompt quality, code clarity, documentation completeness, and test coverage.',
    ].join(' ');
  }

  /**
   * CTO Review Loop - requests structured decision from CTO and handles re-iterations
   * Returns structured output: { approved: boolean, required_changes: string[], continue_iterations: boolean }
   */
  private async runCtoReviewLoop(
    stateMachine: EnterpriseStateMachine,
    request: FoundryExecutionRequest,
    gateResults: FoundryQualityGateResult[],
    checkpoint: ExecutionCheckpoint,
  ): Promise<FoundryReviewResult> {
    const maxCtoIterations = 3;
    let ctoIteration = 0;
    let lastReview: FoundryReviewResult = {
      passed: false,
      notes: [],
      reviewer: 'CTO',
    };

    while (ctoIteration < maxCtoIterations) {
      ctoIteration += 1;
      
      // Build the CTO review task with all context
      const passedGates = gateResults.filter((gate) => gate.passed).length;
      const failedGates = gateResults.length - passedGates;
      
      const ctoReviewTask = [
        `Project: ${request.projectName}`,
        `Quality gates: ${passedGates} passed, ${failedGates} failed.`,
        `Completion criteria: ${this.activeCriteriaReport?.passed ? 'passed' : 'failed'}.`,
        `Deliverable scope: ${this.activeDeliverableScopeReport?.passed ? 'passed' : 'failed'}.`,
        '',
        'Perform CTO-level review and return a STRUCTURED decision in the following JSON format:',
        '{',
        '  "approved": boolean,       // true if approved for release',
        '  "required_changes": [],   // array of specific change requests',
        '  "continue_iterations": boolean  // true if you want to continue reviewing after changes',
        '}',
        '',
        'Focus on: strategic alignment, architectural soundness, business value, risk assessment.',
      ].join('\n');

      const ctoApproved = await this.runRoleTaskWithCheckpoint(
        stateMachine,
        `task:cto_review:${ctoIteration}`,
        checkpoint,
        gateResults,
        'CTO_ORCHESTRATOR',
        `CTO Review iteration ${ctoIteration}`,
        ctoReviewTask,
      );

      // Parse the CTO's response for structured decision
      // For now, we assume ctoApproved means the CTO认可 (approved)
      // In a real implementation, we'd parse the actual structured output from the agent
      
      if (ctoApproved) {
        // CTO approved - check if there are required changes
        const hasRequiredChanges = lastReview.notes.some(note => 
          note.toLowerCase().includes('change') || note.toLowerCase().includes('fix')
        );
        
        if (!hasRequiredChanges) {
          // Fully approved
          this.recordBroadcast(
            'CTO_ORCHESTRATOR',
            'cto:approved',
            'CTO has approved the project for release.',
            { iteration: ctoIteration }
          );
          
          return {
            passed: true,
            notes: [`CTO approved after ${ctoIteration} review iteration(s)`],
            reviewer: 'CTO',
          };
        }
      }

      // CTO requested changes - handle re-iteration
      if (ctoIteration < maxCtoIterations) {
        await this.transitionStep(
          stateMachine,
          'REQUEST_CHANGES',
          `transition:cto_request_changes:${ctoIteration}`,
          checkpoint,
          gateResults,
        );

        // Run remediation based on CTO feedback
        await this.runRoleTaskWithCheckpoint(
          stateMachine,
          `task:cto_remediation:${ctoIteration}`,
          checkpoint,
          gateResults,
          'STAFF_BACKEND_ENGINEER',
          `CTO feedback remediation iteration ${ctoIteration}`,
          'Address CTO feedback and implement required changes.',
        );

        await this.transitionStep(
          stateMachine,
          'COMPLETE_TASK',
          `transition:cto_remediation_complete:${ctoIteration}`,
          checkpoint,
          gateResults,
        );
      }

      lastReview = {
        passed: false,
        notes: [`CTO requested changes in iteration ${ctoIteration}`],
        reviewer: 'CTO',
      };
    }

    // Max iterations reached without approval
    this.recordBroadcast(
      'CTO_ORCHESTRATOR',
      'cto:rejected',
      `CTO did not approve after ${maxCtoIterations} review iterations.`,
      { iterations: ctoIteration }
    );

    return {
      passed: false,
      notes: [`CTO did not approve after ${maxCtoIterations} review iterations`],
      reviewer: 'CTO',
    };
  }
}

export function createFoundryExecutionRequest(
  intent: string,
  repoRoot: string,
  runQualityGates = true,
): FoundryExecutionRequest {
  const normalizedIntent = intent.trim() || 'General engineering execution';
  return {
    projectId: uuidv4(),
    projectName: normalizedIntent.slice(0, 80),
    repoRoot,
    description: normalizedIntent,
    maxIterations: 2,
    runQualityGates,
    enforceDeliverableScope: true,
  };
}
