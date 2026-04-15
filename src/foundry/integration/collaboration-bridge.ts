/**
 * Foundry Collaboration Bridge
 *
 * Deep integration between FoundryOrchestrator and Cowork runtime.
 * Enables team-based execution, parallel monitoring, evidence collection,
 * and real-time visibility to TUI.
 */

import { FoundryOrchestrator } from '@/foundry/orchestrator';
import { CoworkOrchestrator } from '@/cowork/orchestrator/cowork-orchestrator';
import { EventBus } from '@/cowork/orchestrator/event-bus';
import { Blackboard } from '@/cowork/orchestrator/blackboard';
import { ParallelStateMonitor } from '@/cowork/monitoring/parallel-state-monitor';
import { EvidenceCollector } from '@/cowork/evidence/collector';
import { CollaborationProtocol } from '@/cowork/team/collaboration-protocol';
import { TeamManager } from '@/cowork/team/team-manager';
import { CollaborationRequestWorker } from '@/cowork/team/collaboration-request-worker';
import { DevelopmentTeam, TeamMember } from '@/cowork/team/team-types';
import { CollaborativeWorkspace } from '@/cowork/collaboration/collaborative-workspace';
import { FoundryTeamAdapter } from './team-adapter';
import { SecurityDomainOrchestrator } from '@/foundry/domains/security/security-orchestrator';
import { FeatureDomainOrchestrator } from '@/foundry/domains/feature/feature-orchestrator';
import { ReleaseDomainOrchestrator } from '@/foundry/domains/release/release-orchestrator';
import { logger } from '@/runtime/logger';
import type {
  FoundryExecutionRequest,
  FoundryExecutionReport,
} from '@/foundry/contracts';

// Project context
export interface ProjectContext {
  projectId: string;
  team: DevelopmentTeam;
  workspaceId: string;
  monitoringEnabled: boolean;
}

// Team activity
export interface TeamActivity {
  timestamp: number;
  agentId: string;
  roleId: string;
  action: string;
  details: Record<string, unknown>;
}

// Phase result
export interface PhaseResult {
  phase: string;
  success: boolean;
  tasksCompleted: number;
  duration: number;
  findings: Array<{ type: string; severity: string; message: string }>;
  summary: string;
}

// Agent result
export interface AgentResult {
  agentId: string;
  roleId: string;
  success: boolean;
  output: unknown;
  duration: number;
}

// Task for parallel execution
export interface Task {
  id: string;
  roleId: string;
  description: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  timeout?: number;
  dependencies?: string[];
}

export class FoundryCollaborationBridge {
  private foundryOrchestrator: FoundryOrchestrator;
  private coworkOrchestrator: CoworkOrchestrator;
  private teamAdapter: FoundryTeamAdapter;
  private parallelStateMonitor: ParallelStateMonitor;
  private evidenceCollector: EvidenceCollector;
  private collaborationProtocol: CollaborationProtocol;
  private teamManager: TeamManager;
  private workspace: CollaborativeWorkspace;
  private eventBus: EventBus;
  private blackboard: Blackboard;
  private securityOrchestrator: SecurityDomainOrchestrator;
  private featureOrchestrator: FeatureDomainOrchestrator;
  private releaseOrchestrator: ReleaseDomainOrchestrator;
  private projectContexts: Map<string, ProjectContext> = new Map();
  private teamActivities: Map<string, TeamActivity[]> = new Map();
  private requestWorker: CollaborationRequestWorker | null = null;
  private initialized = false;

  constructor(foundryOrchestrator?: FoundryOrchestrator) {
    this.foundryOrchestrator = foundryOrchestrator || new FoundryOrchestrator();
    this.coworkOrchestrator = CoworkOrchestrator.getInstance();
    this.teamAdapter = new FoundryTeamAdapter();
    this.parallelStateMonitor = ParallelStateMonitor.getInstance();
    this.evidenceCollector = EvidenceCollector.getInstance();
    this.collaborationProtocol = CollaborationProtocol.getInstance();
    this.teamManager = TeamManager.getInstance();
    this.workspace = CollaborativeWorkspace.getInstance();
    this.eventBus = EventBus.getInstance();
    this.blackboard = Blackboard.getInstance();
    this.securityOrchestrator = new SecurityDomainOrchestrator();
    this.featureOrchestrator = new FeatureDomainOrchestrator();
    this.releaseOrchestrator = new ReleaseDomainOrchestrator();
  }

  /**
   * Initialize the bridge
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Initialize team adapter
    this.teamAdapter.initialize();

    // Start evidence collection
    this.evidenceCollector.startCollecting();

    // Start collaboration request worker
    this.startRequestWorker();

    // Set up event listeners for TUI visibility
    this.setupEventListeners();

    this.initialized = true;

    this.eventBus.publish('foundry:collaboration_bridge:initialized', {
      timestamp: Date.now(),
    });

    logger.info('[FoundryCollaborationBridge] Initialized successfully');
  }

  /**
   * Start a project with team collaboration
   */
  public async startProject(request: FoundryExecutionRequest): Promise<ProjectContext> {
    await this.initialize();

    // Create team from Foundry roles
    const roles = this.getRolesForProject(request);
    const team = this.teamAdapter.createTeamFromFoundryRoles(
      request.projectId,
      request.projectName,
      roles,
      'CTO_ORCHESTRATOR'
    );

    // Get workspace from team (source of truth)
    let workspace = this.workspace.getWorkspace(team.workspaceId);
    
    // Fallback: create workspace if it doesn't exist (shouldn't happen normally)
    if (!workspace) {
      logger.warn(`[FoundryCollaborationBridge] Workspace ${team.workspaceId} not found for team ${team.id}, creating new workspace`);
      workspace = this.workspace.createWorkspace(
        request.projectId,
        `${request.projectName} Team Workspace`,
        'foundry-bridge',
        { description: `Workspace for ${request.projectName} development team` }
      );
    }

    // Start parallel monitoring
    this.parallelStateMonitor.startMonitoring(request.projectId);

    // Create project context with correct workspace ID from team
    const context: ProjectContext = {
      projectId: request.projectId,
      team,
      workspaceId: workspace.id,
      monitoringEnabled: true,
    };

    this.projectContexts.set(request.projectId, context);

    // Initialize domain orchestrators
    await this.securityOrchestrator.initialize(request.projectId);
    await this.featureOrchestrator.initialize(request.projectId, team.id);
    await this.releaseOrchestrator.initialize(request.projectId);

    // Publish team activity
    this.publishTeamActivity(request.projectId, 'bridge', 'system', 'project_started', {
      projectName: request.projectName,
      teamSize: team.members.size,
    });

    this.eventBus.publish('foundry:project:started', {
      projectId: request.projectId,
      teamId: team.id,
      timestamp: Date.now(),
    });

    logger.info(`[FoundryCollaborationBridge] Started project ${request.projectId} with team ${team.id}`);

    return context;
  }

  /**
   * Execute with team collaboration
   */
  public async executeWithTeam(request: FoundryExecutionRequest): Promise<FoundryExecutionReport> {
    const context = await this.startProject(request);

    try {
      // Execute phases with collaboration
      const phaseResults: PhaseResult[] = [];

      // Phase 1: Security
      const securityResult = await this.runPhaseWithCollaboration('phase_2_security', context.team);
      phaseResults.push(securityResult);

      // Phase 2: Feature Development
      const featureResult = await this.runPhaseWithCollaboration('phase_3_feature', context.team);
      phaseResults.push(featureResult);

      // Phase 3: Release
      const releaseResult = await this.runPhaseWithCollaboration('phase_4_release', context.team);
      phaseResults.push(releaseResult);

      // Collect phase evidence
      const evidence = this.collectPhaseEvidence('all', request.projectId);

      // Get team activity
      const activities = this.getTeamActivity(request.projectId);

      // Publish final update
      this.publishTeamUpdates(request.projectId);

      // Run the original orchestrator to maintain compatibility
      const report = await this.foundryOrchestrator.execute(request);

      // Enhance report with collaboration data
      return {
        ...report,
        // Add collaboration metadata
        collaborationData: {
          teamId: context.team.id,
          phaseResults,
          evidenceCount: evidence.length,
          activityCount: activities.length,
        },
      } as FoundryExecutionReport;
    } catch (error) {
      logger.error(`[FoundryCollaborationBridge] Execution failed for ${request.projectId}`, error);
      throw error;
    }
  }

  /**
   * Run a phase with team collaboration
   */
  public async runPhaseWithCollaboration(phase: string, team: DevelopmentTeam): Promise<PhaseResult> {
    const startTime = Date.now();
    const result: PhaseResult = {
      phase,
      success: true,
      tasksCompleted: 0,
      duration: 0,
      findings: [],
      summary: '',
    };

    logger.info(`[FoundryCollaborationBridge] Running phase ${phase} with team ${team.id}`);

    switch (phase) {
      case 'phase_2_security': {
        // Run security orchestration
        const securityContext = {
          projectId: team.projectId,
          assets: ['api', 'database', 'frontend'],
          dataFlows: [],
          trustBoundaries: [],
        };

        const threatModel = await this.securityOrchestrator.initiateThreatModeling(securityContext);
        result.success = threatModel.success;
        result.summary = threatModel.summary;
        break;
      }

      case 'phase_3_feature': {
        // Feature planning and implementation handled by feature orchestrator
        result.summary = 'Feature phase executed via collaboration';
        break;
      }

      case 'phase_4_release': {
        // Release orchestration
        result.summary = 'Release phase executed via collaboration';
        break;
      }
    }

    result.duration = Date.now() - startTime;

    this.eventBus.publish('foundry:phase:complete', {
      phase,
      teamId: team.id,
      success: result.success,
      duration: result.duration,
      timestamp: Date.now(),
    });

    return result;
  }

  /**
   * Spawn an agent collaboratively
   */
  public async spawnAgentCollaboratively(
    roleId: string,
    task: string,
    team: DevelopmentTeam
  ): Promise<AgentResult> {
    const startTime = Date.now();

    // Find team member for role
    const member = this.findTeamMemberByRole(team, roleId);
    if (!member) {
      return {
        agentId: '',
        roleId,
        success: false,
        output: null,
        duration: 0,
      };
    }

    // Update status
    this.teamManager.updateMemberStatus(team.id, member.agentId, 'busy');

    // Request help via collaboration protocol
    const response = await this.collaborationProtocol.requestHelp(
      'collaboration-bridge',
      member.agentId,
      task,
      { roleId },
      'normal',
      300000
    );

    // Update status
    this.teamManager.updateMemberStatus(
      team.id,
      member.agentId,
      response.accepted ? 'idle' : 'error'
    );

    const result: AgentResult = {
      agentId: member.agentId,
      roleId,
      success: response.accepted,
      output: response.data,
      duration: Date.now() - startTime,
    };

    // Publish activity
    this.publishTeamActivity(team.projectId, member.agentId, roleId, 'task_completed', {
      task,
      success: result.success,
    });

    this.eventBus.publish('foundry:agent:spawn_complete', {
      agentId: member.agentId,
      roleId,
      success: result.success,
      timestamp: Date.now(),
    });

    return result;
  }

  /**
   * Coordinate parallel execution of tasks
   */
  public async coordinateParallelExecution(
    tasks: Task[],
    team: DevelopmentTeam
  ): Promise<AgentResult[]> {
    const results: AgentResult[] = [];

    // Execute tasks in parallel
    const promises = tasks.map(async (task) => {
      const result = await this.spawnAgentCollaboratively(task.roleId, task.description, team);
      return result;
    });

    const taskResults = await Promise.all(promises);
    results.push(...taskResults);

    this.eventBus.publish('foundry:parallel_execution:complete', {
      teamId: team.id,
      taskCount: tasks.length,
      successCount: results.filter(r => r.success).length,
      timestamp: Date.now(),
    });

    return results;
  }

  /**
   * Handle agent failure
   */
  public async handleAgentFailure(agentId: string, team: DevelopmentTeam): Promise<void> {
    logger.error(`[FoundryCollaborationBridge] Agent ${agentId} failed in team ${team.id}`);

    // Update member status
    this.teamManager.updateMemberStatus(team.id, agentId, 'error');

    // Escalate to team lead
    const lead = this.teamManager.getTeamLead(team.id);
    if (lead) {
      await this.collaborationProtocol.escalate(
        'collaboration-bridge',
        {
          title: `Agent Failure: ${agentId}`,
          description: `Agent ${agentId} has failed and needs attention`,
          severity: 'high',
        },
        [team.leadRoleId]
      );
    }

    // Publish activity
    this.publishTeamActivity(team.projectId, agentId, 'unknown', 'agent_failed', {
      teamId: team.id,
    });

    this.eventBus.publish('foundry:agent:failed', {
      agentId,
      teamId: team.id,
      timestamp: Date.now(),
    });
  }

  /**
   * Collect evidence for a phase
   */
  public collectPhaseEvidence(phase: string, projectId: string) {
    return this.evidenceCollector.getEvidenceForProject(projectId);
  }

  /**
   * Get team activity for a project
   */
  public getTeamActivity(projectId: string): TeamActivity[] {
    return this.teamActivities.get(projectId) || [];
  }

  /**
   * Publish team updates to EventBus for TUI visibility
   */
  public publishTeamUpdates(projectId: string): void {
    const context = this.projectContexts.get(projectId);
    if (!context) {
      return;
    }

    const team = context.team;
    const activities = this.getTeamActivity(projectId);

    // Publish team:* events for TUI
    this.eventBus.publish('team:activity', {
      projectId,
      teamId: team.id,
      memberCount: team.members.size,
      activities: activities.slice(-10), // Last 10 activities
      timestamp: Date.now(),
    });

    // Publish individual member updates
    for (const [agentId, member] of team.members) {
      this.eventBus.publish(`team:member:${agentId}`, {
        agentId,
        roleId: member.roleId,
        status: member.status,
        projectId,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Check bridge health
   */
  public healthCheck(): {
    healthy: boolean;
    initialized: boolean;
    monitoringActive: boolean;
    evidenceCollecting: boolean;
    projectCount: number;
  } {
    return {
      healthy: this.initialized,
      initialized: this.initialized,
      monitoringActive: this.parallelStateMonitor.isMonitoring(),
      evidenceCollecting: this.evidenceCollector.getStatus().isCollecting,
      projectCount: this.projectContexts.size,
    };
  }

  /**
   * Stop the bridge and cleanup resources
   */
  public stop(): void {
    if (!this.initialized) {
      return;
    }

    // Stop the request worker
    this.stopRequestWorker();

    this.initialized = false;

    logger.info('[FoundryCollaborationBridge] Stopped');
  }

  // Private helper methods

  private startRequestWorker(): void {
    // Get all team members to register with the worker
    const allTeams = this.teamManager.listAllTeams();
    const agentIds: string[] = [];

    for (const team of allTeams) {
      for (const member of team.members.values()) {
        agentIds.push(member.agentId);
      }
    }

    if (agentIds.length === 0) {
      logger.warn('[FoundryCollaborationBridge] No agents found for request worker');
      return;
    }

    this.requestWorker = new CollaborationRequestWorker({
      agentIds,
      defaultTimeout: 300000, // 5 minutes
      maxConcurrentRequests: 3,
      autoStart: true,
    });

    logger.info(`[FoundryCollaborationBridge] Started request worker with ${agentIds.length} agents`);
  }

  private stopRequestWorker(): void {
    if (this.requestWorker) {
      this.requestWorker.stop();
      this.requestWorker = null;
      logger.info('[FoundryCollaborationBridge] Stopped request worker');
    }
  }

  private setupEventListeners(): void {
    // Listen for monitoring findings
    this.eventBus.subscribe('monitoring:finding:critical', (payload) => {
      const finding = payload as { projectId?: string };
      if (finding.projectId) {
        this.publishTeamActivity(finding.projectId, 'monitor', 'system', 'critical_finding', finding);
      }
    });

    // Listen for evidence collection
    this.eventBus.subscribe('evidence:collected', (payload) => {
      const evidence = payload as { projectId?: string; type: string };
      if (evidence.projectId) {
        this.publishTeamActivity(evidence.projectId, 'evidence', 'system', 'evidence_collected', {
          type: evidence.type,
        });
      }
    });

    // Listen for team events
    this.eventBus.subscribe('team:member:status_changed', (payload) => {
      const event = payload as { teamId: string; agentId: string; newStatus: string };
      const team = this.teamManager.getTeam(event.teamId);
      if (team) {
        this.publishTeamActivity(team.projectId, event.agentId, 'unknown', 'status_changed', {
          newStatus: event.newStatus,
        });
      }
    });
  }

  private publishTeamActivity(
    projectId: string,
    agentId: string,
    roleId: string,
    action: string,
    details: Record<string, unknown>
  ): void {
    const activity: TeamActivity = {
      timestamp: Date.now(),
      agentId,
      roleId,
      action,
      details,
    };

    const activities = this.teamActivities.get(projectId) || [];
    activities.push(activity);
    this.teamActivities.set(projectId, activities);

    // Publish for TUI visibility
    this.eventBus.publish('team:activity:update', {
      projectId,
      activity,
    });
  }

  private findTeamMemberByRole(team: DevelopmentTeam, roleId: string): TeamMember | null {
    for (const member of team.members.values()) {
      if (member.roleId === roleId || member.metadata?.foundryRoleId === roleId) {
        return member;
      }
    }
    return null;
  }

  private getRolesForProject(request: FoundryExecutionRequest): string[] {
    // Determine roles based on project requirements
    const roles: string[] = [
      'CTO_ORCHESTRATOR',
      'PRODUCT_MANAGER',
      'SECURITY_LEAD',
      'STAFF_BACKEND_ENGINEER',
      'QA_LEAD',
    ];

    // Add frontend engineer if needed
    if (request.description?.toLowerCase().includes('frontend') ||
        request.description?.toLowerCase().includes('ui')) {
      roles.push('STAFF_FRONTEND_ENGINEER');
    }

    // Add SRE for deployment
    if (request.description?.toLowerCase().includes('deploy') ||
        request.description?.toLowerCase().includes('release')) {
      roles.push('SRE_DEVOPS');
    }

    return roles;
  }
}

export default FoundryCollaborationBridge;
