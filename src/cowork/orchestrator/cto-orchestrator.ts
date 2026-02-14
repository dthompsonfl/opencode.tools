/**
 * CTO Orchestrator - Executive-Level Multi-Agent Coordination System
 * 
 * This orchestrator acts as the CTO/Executive between users and the development team.
 * It has full access to all tools, controls every function of the app, and coordinates
 * the entire development process from requirement gathering to production deployment.
 * 
 * Key Capabilities:
 * 1. Deep requirement understanding through clarifying questions
 * 2. Strategic planning and task decomposition
 * 3. Multi-agent collaboration with message passing
 * 4. Self-healing code review and improvement
 * 5. Automatic feature implementation
 * 6. Production-ready code generation with Apple-level quality standards
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import {
  CommandDefinition,
  AgentDefinition,
  HookEvent,
  HookContext,
  HookDecision
} from '../types';
import { CommandRegistry } from '../registries/command-registry';
import { AgentRegistry } from '../registries/agent-registry';
import { HookManager } from '../hooks/hook-manager';
import { ToolPermissionGate } from '../permissions/tool-gate';
import { AgentSpawner, TaskContext, SpawnOptions } from './agent-spawner';
import { ResultMerger, AgentResult, MergedResult } from './result-merger';
import { CollaborationBus, CollaborationMessage, MessageType } from '../collaboration/message-bus';
import { AgentSession } from '../collaboration/agent-session';

/**
 * Requirement understanding level
 */
export interface RequirementUnderstanding {
  originalPrompt: string;
  clarifiedIntent: string;
  desiredOutcome: string;
  constraints: string[];
  assumptions: string[];
  openQuestions: string[];
  confidence: number; // 0-1
}

/**
 * Strategic plan created by CTO
 */
export interface StrategicPlan {
  id: string;
  title: string;
  phases: PlanPhase[];
  estimatedEffort: string;
  criticalPath: string[];
  risks: Risk[];
  successCriteria: string[];
}

/**
 * Individual phase in the strategic plan
 */
export interface PlanPhase {
  id: string;
  name: string;
  description: string;
  assignedAgents: string[];
  dependencies: string[];
  estimatedDuration: string;
  deliverables: string[];
}

/**
 * Risk assessment
 */
export interface Risk {
  id: string;
  description: string;
  probability: 'low' | 'medium' | 'high' | 'critical';
  impact: 'low' | 'medium' | 'high' | 'critical';
  mitigation: string;
}

/**
 * Task dispatch configuration
 */
export interface TaskDispatch {
  taskId: string;
  agentId: string;
  task: string;
  context: Record<string, unknown>;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dependencies: string[];
}

/**
 * Quality gate check
 */
export interface QualityGate {
  name: string;
  checks: QualityCheck[];
  passed: boolean;
  score: number; // 0-100
}

/**
 * Individual quality check
 */
export interface QualityCheck {
  category: 'security' | 'performance' | 'correctness' | 'completeness' | 'maintainability';
  name: string;
  passed: boolean;
  score: number;
  findings: Finding[];
}

/**
 * Finding from quality check
 */
export interface Finding {
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  location?: string;
  suggestion?: string;
  autoFixable: boolean;
}

/**
 * CTO Orchestrator Options
 */
export interface CTOOrchestratorOptions {
  projectDir?: string;
  transcriptDir?: string;
  maxConcurrent?: number;
  defaultTimeout?: number;
  enableAutoHeal?: boolean;
  enableAutoFeature?: boolean;
  qualityThreshold?: number; // 0-100, default 95
  llmProvider?: 'openai' | 'anthropic' | 'local';
}

/**
 * Execution context for a session
 */
export interface ExecutionContext {
  sessionId: string;
  originalPrompt: string;
  understanding?: RequirementUnderstanding;
  plan?: StrategicPlan;
  results: Map<string, AgentResult>;
  qualityGates: QualityGate[];
  transcript: TranscriptEntry[];
  startTime: string;
  endTime?: string;
}

/**
 * Transcript entry for audit trail
 */
export interface TranscriptEntry {
  timestamp: string;
  type: 'understanding' | 'planning' | 'dispatch' | 'collaboration' | 'completion' | 'error' | 'quality' | 'autoheal';
  agentId?: string;
  taskId?: string;
  message: string;
  data?: unknown;
}

/**
 * CTO Orchestrator - Executive Multi-Agent Coordination
 * 
 * This is the main orchestrator that acts as the CTO, managing the entire
 * development process with full control over all tools and agents.
 */
export class CTOOrchestrator extends EventEmitter {
  private commandRegistry: CommandRegistry;
  private agentRegistry: AgentRegistry;
  private hookManager: HookManager;
  private permissionGate: ToolPermissionGate;
  private agentSpawner: AgentSpawner;
  private resultMerger: ResultMerger;
  private collaborationBus: CollaborationBus;
  private options: Required<CTOOrchestratorOptions>;
  private activeSessions: Map<string, ExecutionContext>;
  private transcript: TranscriptEntry[];

  constructor(options?: CTOOrchestratorOptions) {
    super();
    
    this.commandRegistry = CommandRegistry.getInstance();
    this.agentRegistry = AgentRegistry.getInstance();
    this.hookManager = new HookManager();
    this.permissionGate = new ToolPermissionGate();
    this.agentSpawner = new AgentSpawner();
    this.resultMerger = new ResultMerger();
    this.collaborationBus = new CollaborationBus();
    this.activeSessions = new Map();
    this.transcript = [];
    
    this.options = {
      projectDir: options?.projectDir || process.cwd(),
      transcriptDir: options?.transcriptDir || './transcripts',
      maxConcurrent: options?.maxConcurrent || 10,
      defaultTimeout: options?.defaultTimeout || 120000,
      enableAutoHeal: options?.enableAutoHeal ?? true,
      enableAutoFeature: options?.enableAutoFeature ?? true,
      qualityThreshold: options?.qualityThreshold || 95,
      llmProvider: options?.llmProvider || 'openai'
    };

    // Grant CTO full access to all tools
    this.initializeCTOPermissions();
    this.setupCollaborationHandlers();
  }

  /**
   * Initialize CTO with full tool permissions
   */
  private initializeCTOPermissions(): void {
    // CTO has unrestricted access to all tools
    this.permissionGate.setCommandAllowlist('cto', ['*']);
    this.permissionGate.setAgentAllowlist('cto', ['*']);
  }

  /**
   * Setup collaboration message handlers
   */
  private setupCollaborationHandlers(): void {
    // Listen for collaboration messages and route them
    this.collaborationBus.on('message', (message: CollaborationMessage) => {
      this.handleCollaborationMessage(message);
    });

    // Listen for agent requests for help
    this.collaborationBus.on('help-request', async (message: CollaborationMessage) => {
      await this.handleHelpRequest(message);
    });

    // Listen for consensus requests
    this.collaborationBus.on('consensus-request', async (message: CollaborationMessage) => {
      await this.handleConsensusRequest(message);
    });
  }

  /**
   * Execute a complete development workflow from user prompt to production
   * 
   * Workflow:
   * 1. Understand user requirements through clarifying questions
   * 2. Create strategic plan with PM agent
   * 3. Dispatch development team agents
   * 4. Facilitate collaboration between agents
   * 5. Quality review and self-healing
   * 6. Return production-ready code
   */
  public async executeWorkflow(userPrompt: string): Promise<MergedResult> {
    const sessionId = uuidv4();
    const session: ExecutionContext = {
      sessionId,
      originalPrompt: userPrompt,
      results: new Map(),
      qualityGates: [],
      transcript: [],
      startTime: new Date().toISOString()
    };

    this.activeSessions.set(sessionId, session);

    try {
      this.emit('session:start', { sessionId, prompt: userPrompt });

      // Step 1: Deep requirement understanding
      this.emit('phase:start', { phase: 'understanding', sessionId });
      const understanding = await this.gatherRequirements(userPrompt, session);
      session.understanding = understanding;
      this.emit('phase:complete', { phase: 'understanding', understanding });

      if (understanding.confidence < 0.8) {
        // Not confident enough - return questions to user
        return this.createClarificationResult(understanding);
      }

      // Step 2: Create strategic plan
      this.emit('phase:start', { phase: 'planning', sessionId });
      const plan = await this.createStrategicPlan(understanding, session);
      session.plan = plan;
      this.emit('phase:complete', { phase: 'planning', plan });

      // Step 3: Dispatch development team
      this.emit('phase:start', { phase: 'execution', sessionId });
      const results = await this.executeStrategicPlan(plan, session);
      this.emit('phase:complete', { phase: 'execution', results });

      // Step 4: Quality review and self-healing
      this.emit('phase:start', { phase: 'quality', sessionId });
      const qualityResult = await this.performQualityReview(results, session);
      this.emit('phase:complete', { phase: 'quality', qualityResult });

      // Step 5: Final integration
      this.emit('phase:start', { phase: 'integration', sessionId });
      const finalResult = await this.integrateResults(results, qualityResult, session);
      this.emit('phase:complete', { phase: 'integration', finalResult });

      session.endTime = new Date().toISOString();
      this.emit('session:complete', { sessionId, result: finalResult });

      return finalResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.addTranscriptEntry(session, {
        type: 'error',
        message: `Workflow execution failed: ${errorMessage}`
      });
      this.emit('session:error', { sessionId, error: errorMessage });
      throw error;
    } finally {
      this.activeSessions.delete(sessionId);
    }
  }

  /**
   * Step 1: Gather requirements and clarify user intent
   * Uses the Prompt Master agent to refine understanding
   */
  private async gatherRequirements(
    userPrompt: string,
    session: ExecutionContext
  ): Promise<RequirementUnderstanding> {
    this.addTranscriptEntry(session, {
      type: 'understanding',
      message: 'Starting requirement gathering phase'
    });

    // Spawn Prompt Master agent for requirement analysis
    const promptMasterContext: TaskContext = {
      task: `Analyze the following user request and create a comprehensive understanding document. 

User Request: "${userPrompt}"

Your task:
1. Identify the core intent and desired outcome
2. List 5-10 clarifying questions to ensure complete understanding
3. Identify potential constraints and assumptions
4. Assess confidence level (0-1) in understanding

Return a structured analysis with:
- clarifiedIntent: Clear statement of what the user wants
- desiredOutcome: Specific measurable outcomes
- constraints: List of identified constraints
- assumptions: List of assumptions made
- openQuestions: Questions to ask the user
- confidence: Your confidence score (0-1)`,
      context: { sessionId: session.sessionId },
      tools: ['read', 'write', 'analyze']
    };

    const result = await this.agentSpawner.spawn('prompt-master', promptMasterContext, {
      timeout: this.options.defaultTimeout
    });

    if (!result.metadata.success) {
      // Fallback to basic understanding
      return {
        originalPrompt: userPrompt,
        clarifiedIntent: userPrompt,
        desiredOutcome: 'Complete implementation as requested',
        constraints: [],
        assumptions: ['User wants production-ready code'],
        openQuestions: ['What specific technologies should be used?', 'What is the timeline?', 'Are there specific quality requirements?'],
        confidence: 0.5
      };
    }

    // Parse the result into structured understanding
    const output = result.output as Record<string, unknown>;
    
    const understanding: RequirementUnderstanding = {
      originalPrompt: userPrompt,
      clarifiedIntent: String(output.clarifiedIntent || userPrompt),
      desiredOutcome: String(output.desiredOutcome || 'Production-ready implementation'),
      constraints: Array.isArray(output.constraints) ? output.constraints as string[] : [],
      assumptions: Array.isArray(output.assumptions) ? output.assumptions as string[] : [],
      openQuestions: Array.isArray(output.openQuestions) ? output.openQuestions as string[] : [],
      confidence: Number(output.confidence) || 0.5
    };

    this.addTranscriptEntry(session, {
      type: 'understanding',
      message: `Requirements gathered with confidence ${understanding.confidence}`,
      data: { understanding }
    });

    return understanding;
  }

  /**
   * Step 2: Create strategic plan based on understanding
   * Uses PM agent and Architect agent for planning
   */
  private async createStrategicPlan(
    understanding: RequirementUnderstanding,
    session: ExecutionContext
  ): Promise<StrategicPlan> {
    this.addTranscriptEntry(session, {
      type: 'planning',
      message: 'Creating strategic development plan'
    });

    // Create a collaborative session for planning
    const agentSession = new AgentSession(`plan-${session.sessionId}`, this.collaborationBus);
    
    // Invite PM and Architect to planning session
    await agentSession.inviteAgent('pm', 'lead');
    await agentSession.inviteAgent('architect', 'contributor');

    // Dispatch PM for project planning
    const pmTask: TaskContext = {
      task: `Create a detailed project plan for the following requirement:

${understanding.clarifiedIntent}

Desired Outcome: ${understanding.desiredOutcome}
Constraints: ${understanding.constraints.join(', ')}

Create:
1. Phase breakdown with deliverables
2. Agent assignments per phase
3. Dependencies between phases
4. Risk assessment
5. Success criteria`,
      context: { sessionId: session.sessionId, understanding },
      tools: ['read', 'write', 'analyze']
    };

    const pmResult = await this.agentSpawner.spawn('pm', pmTask, {
      timeout: this.options.defaultTimeout
    });

    // Dispatch Architect for technical planning
    const architectTask: TaskContext = {
      task: `Create technical architecture for:

${understanding.clarifiedIntent}

Provide:
1. System architecture overview
2. Technology stack recommendations
3. Data models and APIs
4. Security considerations
5. Performance targets`,
      context: { sessionId: session.sessionId, understanding },
      tools: ['read', 'write', 'analyze', 'glob']
    };

    const architectResult = await this.agentSpawner.spawn('architect', architectTask, {
      timeout: this.options.defaultTimeout
    });

    // Merge plans from PM and Architect
    const plan: StrategicPlan = {
      id: `plan-${session.sessionId}`,
      title: understanding.clarifiedIntent.substring(0, 100),
      phases: this.extractPhases(pmResult, architectResult),
      estimatedEffort: this.calculateEffort(pmResult, architectResult),
      criticalPath: this.identifyCriticalPath(pmResult),
      risks: this.extractRisks(pmResult),
      successCriteria: this.extractSuccessCriteria(pmResult)
    };

    this.addTranscriptEntry(session, {
      type: 'planning',
      message: `Strategic plan created with ${plan.phases.length} phases`,
      data: { plan }
    });

    return plan;
  }

  /**
   * Step 3: Execute the strategic plan
   * Dispatches agents according to plan with collaboration
   */
  private async executeStrategicPlan(
    plan: StrategicPlan,
    session: ExecutionContext
  ): Promise<AgentResult[]> {
    this.addTranscriptEntry(session, {
      type: 'dispatch',
      message: `Executing strategic plan with ${plan.phases.length} phases`
    });

    const results: AgentResult[] = [];

    // Process phases in dependency order
    const orderedPhases = this.topologicalSort(plan.phases);

    for (const phase of orderedPhases) {
      this.emit('phase:dispatch', { phaseId: phase.id, phaseName: phase.name });

      // Create collaboration session for this phase
      const phaseSession = new AgentSession(`phase-${phase.id}`, this.collaborationBus);

      // Spawn agents for this phase in parallel
      const phaseTasks = phase.assignedAgents.map(agentId => ({
        agentId,
        context: {
          task: `${phase.description}\n\nDeliverables: ${phase.deliverables.join(', ')}`,
          context: { 
            phaseId: phase.id, 
            sessionId: session.sessionId,
            plan,
            previousResults: Object.fromEntries(session.results)
          },
          tools: this.getToolsForAgent(agentId)
        }
      }));

      // Execute agents concurrently
      const phaseResults = await this.agentSpawner.spawnMany(phaseTasks, {
        timeout: this.options.defaultTimeout
      });

      // Store results
      phaseResults.forEach(result => {
        session.results.set(result.agentId, result);
        results.push(result);
      });

      // Allow agents to collaborate and refine results
      await this.facilitateCollaboration(phaseSession, phaseResults, session);

      this.emit('phase:complete', { phaseId: phase.id, results: phaseResults });
    }

    return results;
  }

  /**
   * Facilitate collaboration between agents in a session
   */
  private async facilitateCollaboration(
    session: AgentSession,
    results: AgentResult[],
    execContext: ExecutionContext
  ): Promise<void> {
    // Allow agents to review each other's work
    for (const result of results) {
      if (!result.metadata.success) {
        // Failed agent - request help from team
        await session.requestHelp(result.agentId, `Task failed: ${result.metadata.error}`);
      }
    }

    // Wait for collaboration to complete
    await session.waitForConsensus(30000); // 30 second collaboration window
  }

  /**
   * Step 4: Perform comprehensive quality review
   */
  private async performQualityReview(
    results: AgentResult[],
    session: ExecutionContext
  ): Promise<QualityGate> {
    this.addTranscriptEntry(session, {
      type: 'quality',
      message: 'Starting comprehensive quality review'
    });

    // Spawn QA agent for testing
    const qaTask: TaskContext = {
      task: `Review all implementation results for quality assurance:

${results.map(r => `${r.agentName}: ${JSON.stringify(r.output)}`).join('\n\n')}

Check:
1. Security vulnerabilities
2. Performance issues
3. Code correctness
4. Completeness against requirements
5. Maintainability

Provide detailed findings with severity levels.`,
      context: { sessionId: session.sessionId, results },
      tools: ['read', 'write', 'analyze', 'grep']
    };

    const qaResult = await this.agentSpawner.spawn('qa', qaTask, {
      timeout: this.options.defaultTimeout
    });

    // Spawn Security agent for security review
    const securityTask: TaskContext = {
      task: `Perform security audit on implementation:

${results.map(r => `${r.agentName}: ${JSON.stringify(r.output)}`).join('\n\n')}

Check for:
1. Injection vulnerabilities
2. Authentication/authorization issues
3. Data exposure risks
4. Dependency vulnerabilities
5. Secure coding practices

Provide security findings with severity and remediation steps.`,
      context: { sessionId: session.sessionId, results },
      tools: ['read', 'write', 'analyze', 'grep', 'bash']
    };

    const securityResult = await this.agentSpawner.spawn('security', securityTask, {
      timeout: this.options.defaultTimeout
    });

    // Compile quality gate results
    const qualityGate: QualityGate = {
      name: 'Production Readiness',
      checks: [
        this.compileQualityCheck('correctness', qaResult),
        this.compileQualityCheck('security', securityResult)
      ],
      passed: qaResult.metadata.success && securityResult.metadata.success,
      score: this.calculateQualityScore([qaResult, securityResult])
    };

    session.qualityGates.push(qualityGate);

    // Self-healing: if quality issues found and auto-heal enabled
    if (this.options.enableAutoHeal && qualityGate.score < this.options.qualityThreshold) {
      await this.performSelfHealing(results, qualityGate, session);
    }

    this.addTranscriptEntry(session, {
      type: 'quality',
      message: `Quality review complete. Score: ${qualityGate.score}/100`,
      data: { qualityGate }
    });

    return qualityGate;
  }

  /**
   * Self-healing: automatically fix quality issues
   */
  private async performSelfHealing(
    results: AgentResult[],
    qualityGate: QualityGate,
    session: ExecutionContext
  ): Promise<void> {
    this.addTranscriptEntry(session, {
      type: 'autoheal',
      message: 'Initiating self-healing for quality issues'
    });

    for (const check of qualityGate.checks) {
      for (const finding of check.findings) {
        if (finding.autoFixable && finding.severity !== 'info') {
          // Spawn healer agent to fix the issue
          const healTask: TaskContext = {
            task: `Fix the following ${check.category} issue:

${finding.message}
Location: ${finding.location || 'Unknown'}
Suggestion: ${finding.suggestion || 'No suggestion provided'}

Apply the fix and verify the solution.`,
            context: { 
              sessionId: session.sessionId, 
              finding,
              originalResults: results 
            },
            tools: ['read', 'write', 'bash']
          };

          const healResult = await this.agentSpawner.spawn('implementer', healTask, {
            timeout: this.options.defaultTimeout
          });

          if (healResult.metadata.success) {
            this.addTranscriptEntry(session, {
              type: 'autoheal',
              message: `Auto-fixed ${check.category} issue: ${finding.message}`
            });
          }
        }
      }
    }
  }

  /**
   * Step 5: Integrate all results into final deliverable
   */
  private async integrateResults(
    results: AgentResult[],
    qualityResult: QualityGate,
    session: ExecutionContext
  ): Promise<MergedResult> {
    // Merge all agent results
    const merged = this.resultMerger.merge(results);

    // Add quality metadata
    const finalResult: MergedResult = {
      output: {
        implementation: merged.output,
        quality: qualityResult,
        plan: session.plan,
        understanding: session.understanding
      },
      metadata: {
        ...merged.metadata,
        agentIds: [...merged.metadata.agentIds, 'cto']
      }
    };

    // Add extended metadata properties
    (finalResult.metadata as any).qualityScore = qualityResult.score;
    (finalResult.metadata as any).productionReady = qualityResult.passed && qualityResult.score >= this.options.qualityThreshold;

    this.addTranscriptEntry(session, {
      type: 'completion',
      message: 'Workflow complete. Final result integrated.',
      data: { finalResult }
    });

    return finalResult;
  }

  /**
   * Create a result asking for user clarification
   */
  private createClarificationResult(understanding: RequirementUnderstanding): MergedResult {
    return {
      output: {
        status: 'clarification_needed',
        message: 'I need to understand your requirements better before proceeding.',
        questions: understanding.openQuestions,
        currentUnderstanding: understanding
      },
      metadata: {
        agentIds: ['prompt-master'],
        runIds: [uuidv4()],
        timestamp: new Date().toISOString(),
        totalToolsUsed: [],
        allSucceeded: false
      }
    };
  }

  // Helper methods

  private addTranscriptEntry(session: ExecutionContext, entry: Omit<TranscriptEntry, 'timestamp'>): void {
    session.transcript.push({
      timestamp: new Date().toISOString(),
      ...entry
    });
    this.transcript.push({
      timestamp: new Date().toISOString(),
      ...entry
    });
  }

  private getToolsForAgent(agentId: string): string[] {
    const agent = this.agentRegistry.get(agentId);
    return agent?.tools || ['read', 'write'];
  }

  private extractPhases(pmResult: AgentResult, architectResult: AgentResult): PlanPhase[] {
    // Extract phases from PM and Architect results
    const pmOutput = pmResult.output as Record<string, unknown>;
    return Array.isArray(pmOutput.phases) ? pmOutput.phases as PlanPhase[] : [];
  }

  private calculateEffort(pmResult: AgentResult, architectResult: AgentResult): string {
    const pmOutput = pmResult.output as Record<string, unknown>;
    return String(pmOutput.estimatedEffort || 'Unknown');
  }

  private identifyCriticalPath(pmResult: AgentResult): string[] {
    const pmOutput = pmResult.output as Record<string, unknown>;
    return Array.isArray(pmOutput.criticalPath) ? pmOutput.criticalPath as string[] : [];
  }

  private extractRisks(pmResult: AgentResult): Risk[] {
    const pmOutput = pmResult.output as Record<string, unknown>;
    return Array.isArray(pmOutput.risks) ? pmOutput.risks as Risk[] : [];
  }

  private extractSuccessCriteria(pmResult: AgentResult): string[] {
    const pmOutput = pmResult.output as Record<string, unknown>;
    return Array.isArray(pmOutput.successCriteria) ? pmOutput.successCriteria as string[] : [];
  }

  private topologicalSort(phases: PlanPhase[]): PlanPhase[] {
    // Simple topological sort based on dependencies
    const sorted: PlanPhase[] = [];
    const visited = new Set<string>();

    const visit = (phase: PlanPhase) => {
      if (visited.has(phase.id)) return;
      visited.add(phase.id);
      
      // Visit dependencies first
      for (const depId of phase.dependencies) {
        const depPhase = phases.find(p => p.id === depId);
        if (depPhase) visit(depPhase);
      }
      
      sorted.push(phase);
    };

    phases.forEach(visit);
    return sorted;
  }

  private compileQualityCheck(category: string, result: AgentResult): QualityCheck {
    const output = result.output as Record<string, unknown>;
    return {
      category: category as any,
      name: `${category} Review`,
      passed: result.metadata.success,
      score: Number(output.score) || 0,
      findings: Array.isArray(output.findings) ? output.findings as Finding[] : []
    };
  }

  private calculateQualityScore(results: AgentResult[]): number {
    if (results.length === 0) return 0;
    const scores = results.map(r => {
      const output = r.output as Record<string, unknown>;
      return Number(output.score) || (r.metadata.success ? 100 : 0);
    });
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  private handleCollaborationMessage(message: CollaborationMessage): void {
    // Route messages to appropriate agents
    this.emit('collaboration:message', message);
  }

  private async handleHelpRequest(message: CollaborationMessage): Promise<void> {
    // Dispatch help to requesting agent
    this.emit('collaboration:help', message);
  }

  private async handleConsensusRequest(message: CollaborationMessage): Promise<void> {
    // Facilitate consensus building
    this.emit('collaboration:consensus', message);
  }

  // Public API methods

  public getTranscript(): TranscriptEntry[] {
    return [...this.transcript];
  }

  public getSession(sessionId: string): ExecutionContext | undefined {
    return this.activeSessions.get(sessionId);
  }

  public clearTranscript(): void {
    this.transcript = [];
  }

  public async spawnAgent(agentId: string, task: string, context?: Record<string, unknown>): Promise<AgentResult> {
    const taskContext: TaskContext = {
      task,
      context,
      tools: this.getToolsForAgent(agentId)
    };

    return this.agentSpawner.spawn(agentId, taskContext, {
      timeout: this.options.defaultTimeout
    });
  }

  public async dispatchTask(dispatch: TaskDispatch): Promise<AgentResult> {
    const taskContext: TaskContext = {
      task: dispatch.task,
      context: dispatch.context,
      tools: this.getToolsForAgent(dispatch.agentId)
    };

    return this.agentSpawner.spawn(dispatch.agentId, taskContext, {
      timeout: this.options.defaultTimeout
    });
  }
}
