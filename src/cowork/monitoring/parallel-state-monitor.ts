/**
 * Parallel State Monitor
 *
 * Orchestrates multiple monitoring agents that run in parallel to the main
 * workflow. Manages parallel monitoring states and auto-escalates critical findings.
 */

import { logger } from '../../runtime/logger';
import { EventBus } from '../orchestrator/event-bus';
import { CollaborativeWorkspace } from '../collaboration/collaborative-workspace';
import { TeamManager } from '../team/team-manager';
import { CollaborationProtocol } from '../team/collaboration-protocol';
import {
  MonitoringAgent,
  SecurityMonitorAgent,
  ComplianceMonitorAgent,
  ObservabilityAgent,
  Finding,
  MonitorType,
  MonitoringResult
} from './monitoring-agents';

export type ParallelStateType = 'security_monitoring' | 'compliance_monitoring' | 'observability';

export interface ParallelState {
  type: ParallelStateType;
  status: 'active' | 'paused' | 'error';
  lastCheck: number;
  metrics: Record<string, unknown>;
  findings: Finding[];
  projectId: string;
}

export interface MonitoringReport {
  projectId: string;
  generatedAt: number;
  states: Record<ParallelStateType, ParallelState>;
  totalFindings: number;
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  lowFindings: number;
  agents: Array<{
    id: string;
    name: string;
    type: MonitorType;
    status: string;
    lastRun: number;
  }>;
  summary: string;
}

export class ParallelStateMonitor {
  private static instance: ParallelStateMonitor;
  private monitoringAgents: Map<string, MonitoringAgent> = new Map();
  private parallelStates: Map<string, Map<ParallelStateType, ParallelState>> = new Map(); // projectId -> states
  private isRunning: boolean = false;
  private eventBus: EventBus;
  private workspace: CollaborativeWorkspace;
  private teamManager: TeamManager;
  private collaboration: CollaborationProtocol;
  private eventListeners: Array<() => void> = [];

  private constructor() {
    this.eventBus = EventBus.getInstance();
    this.workspace = CollaborativeWorkspace.getInstance();
    this.teamManager = TeamManager.getInstance();
    this.collaboration = CollaborationProtocol.getInstance();
    this.setupEventListeners();
  }

  private getWorkspace(): CollaborativeWorkspace | null {
    if (this.workspace) {
      return this.workspace;
    }

    try {
      this.workspace = CollaborativeWorkspace.getInstance();
      return this.workspace;
    } catch (error) {
      logger.warn('[ParallelStateMonitor] Workspace unavailable, skipping artifact persistence', {
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  public static getInstance(): ParallelStateMonitor {
    if (!ParallelStateMonitor.instance) {
      ParallelStateMonitor.instance = new ParallelStateMonitor();
    }
    return ParallelStateMonitor.instance;
  }

  /**
   * Set up event listeners for monitoring findings
   */
  private setupEventListeners(): void {
    // Listen for critical findings
    const criticalUnsub = this.eventBus.subscribe('monitoring:finding:critical', (payload) => {
      const finding = payload as Finding;
      this.handleFinding(finding);
    });

    // Listen for high severity findings
    const highUnsub = this.eventBus.subscribe('monitoring:finding:high', (payload) => {
      const finding = payload as Finding;
      this.handleFinding(finding);
    });

    // Listen for all monitoring results
    const metricsUnsub = this.eventBus.subscribe('monitoring:metrics', (payload) => {
      const data = payload as {
        agentId: string;
        type: MonitorType;
        metrics: Record<string, number>;
        timestamp: number;
      };
      this.updateMetrics(data.agentId, data.metrics);
    });

    this.eventListeners = [criticalUnsub, highUnsub, metricsUnsub];
  }

  /**
   * Start monitoring for a project
   */
  public startMonitoring(projectId: string): void {
    // Initialize parallel states for project
    if (!this.parallelStates.has(projectId)) {
      const states = new Map<ParallelStateType, ParallelState>();

      const now = Date.now();

      states.set('security_monitoring', {
        type: 'security_monitoring',
        status: 'active',
        lastCheck: now,
        metrics: {},
        findings: [],
        projectId
      });

      states.set('compliance_monitoring', {
        type: 'compliance_monitoring',
        status: 'active',
        lastCheck: now,
        metrics: {},
        findings: [],
        projectId
      });

      states.set('observability', {
        type: 'observability',
        status: 'active',
        lastCheck: now,
        metrics: {},
        findings: [],
        projectId
      });

      this.parallelStates.set(projectId, states);
    }

    // Start all registered agents
    for (const agent of this.monitoringAgents.values()) {
      agent.start();
    }

    this.isRunning = true;

    logger.info(`[ParallelStateMonitor] Started monitoring for project ${projectId}`);

    this.eventBus.publish('monitoring:started', {
      projectId,
      timestamp: Date.now()
    });
  }

  /**
   * Stop monitoring for a project
   */
  public stopMonitoring(projectId: string): void {
    const states = this.parallelStates.get(projectId);
    if (states) {
      for (const state of states.values()) {
        state.status = 'paused';
      }
    }

    // Stop all agents
    for (const agent of this.monitoringAgents.values()) {
      agent.stop();
    }

    this.isRunning = false;

    logger.info(`[ParallelStateMonitor] Stopped monitoring for project ${projectId}`);

    this.eventBus.publish('monitoring:stopped', {
      projectId,
      timestamp: Date.now()
    });
  }

  /**
   * Register a monitoring agent
   */
  public registerAgent(agent: MonitoringAgent): void {
    this.monitoringAgents.set(agent.id, agent);

    logger.debug(`[ParallelStateMonitor] Registered monitoring agent: ${agent.name}`);

    this.eventBus.publish('monitoring:agent:registered', {
      agentId: agent.id,
      name: agent.name,
      type: agent.type,
      timestamp: Date.now()
    });
  }

  /**
   * Unregister a monitoring agent
   */
  public unregisterAgent(agentId: string): void {
    const agent = this.monitoringAgents.get(agentId);
    if (agent) {
      agent.stop();
      this.monitoringAgents.delete(agentId);

      logger.debug(`[ParallelStateMonitor] Unregistered monitoring agent: ${agentId}`);

      this.eventBus.publish('monitoring:agent:unregistered', {
        agentId,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Get parallel state for a project
   */
  public getParallelState(projectId: string, type: ParallelStateType): ParallelState | undefined {
    const states = this.parallelStates.get(projectId);
    if (!states) return undefined;
    return states.get(type);
  }

  /**
   * Update parallel state
   */
  public updateParallelState(
    projectId: string,
    type: ParallelStateType,
    update: Partial<ParallelState>
  ): void {
    const states = this.parallelStates.get(projectId);
    if (!states) {
      logger.warn(`[ParallelStateMonitor] No states found for project ${projectId}`);
      return;
    }

    const state = states.get(type);
    if (!state) {
      logger.warn(`[ParallelStateMonitor] State ${type} not found for project ${projectId}`);
      return;
    }

    Object.assign(state, update);

    this.eventBus.publish('monitoring:state:updated', {
      projectId,
      stateType: type,
      update,
      timestamp: Date.now()
    });
  }

  /**
   * Get monitoring report for a project
   */
  public getMonitoringReport(projectId: string): MonitoringReport | null {
    const states = this.parallelStates.get(projectId);
    if (!states) return null;

    const report: MonitoringReport = {
      projectId,
      generatedAt: Date.now(),
      states: {
        security_monitoring: states.get('security_monitoring')!,
        compliance_monitoring: states.get('compliance_monitoring')!,
        observability: states.get('observability')!
      },
      totalFindings: 0,
      criticalFindings: 0,
      highFindings: 0,
      mediumFindings: 0,
      lowFindings: 0,
      agents: Array.from(this.monitoringAgents.values()).map(agent => ({
        id: agent.id,
        name: agent.name,
        type: agent.type,
        status: agent.status,
        lastRun: agent.lastRun
      })),
      summary: ''
    };

    // Calculate findings
    for (const state of states.values()) {
      for (const finding of state.findings) {
        report.totalFindings++;
        switch (finding.severity) {
          case 'critical':
            report.criticalFindings++;
            break;
          case 'high':
            report.highFindings++;
            break;
          case 'medium':
            report.mediumFindings++;
            break;
          case 'low':
            report.lowFindings++;
            break;
        }
      }
    }

    report.summary = `Found ${report.totalFindings} issues: ${report.criticalFindings} critical, ${report.highFindings} high, ${report.mediumFindings} medium, ${report.lowFindings} low`;

    return report;
  }

  /**
   * Pause monitoring for a project
   */
  public pauseMonitoring(projectId: string): void {
    const states = this.parallelStates.get(projectId);
    if (states) {
      for (const state of states.values()) {
        state.status = 'paused';
      }
    }

    logger.info(`[ParallelStateMonitor] Paused monitoring for project ${projectId}`);

    this.eventBus.publish('monitoring:paused', {
      projectId,
      timestamp: Date.now()
    });
  }

  /**
   * Resume monitoring for a project
   */
  public resumeMonitoring(projectId: string): void {
    const states = this.parallelStates.get(projectId);
    if (states) {
      for (const state of states.values()) {
        state.status = 'active';
        state.lastCheck = Date.now();
      }
    }

    // Restart agents if not running
    if (!this.isRunning) {
      for (const agent of this.monitoringAgents.values()) {
        agent.start();
      }
      this.isRunning = true;
    }

    logger.info(`[ParallelStateMonitor] Resumed monitoring for project ${projectId}`);

    this.eventBus.publish('monitoring:resumed', {
      projectId,
      timestamp: Date.now()
    });
  }

  /**
   * Handle a finding - auto-remediate or escalate
   */
  public handleFinding(finding: Finding): void {
    // Store finding in parallel state
    if (finding.projectId) {
      const stateType = this.getStateTypeForFinding(finding);
      const state = this.getParallelState(finding.projectId, stateType);
      if (state) {
        state.findings.push(finding);
      }
    }

    // Auto-escalate critical findings
    if (finding.severity === 'critical') {
      this.escalateFinding(finding);
    }

    // Store finding as artifact in workspace
    if (finding.projectId) {
      const workspace = this.getWorkspace();
      const workspaces = workspace?.getWorkspacesForProject(finding.projectId) ?? [];
      if (workspaces.length > 0) {
        const activeWorkspace = workspaces.find(w => w.status === 'active') || workspaces[0];
        workspace?.updateArtifact(
          activeWorkspace.id,
          `findings/${finding.type}/${finding.id}`,
          finding,
          'parallel-state-monitor',
          finding.type,
          {
            changeDescription: `Detected ${finding.severity} finding: ${finding.title}`,
            metadata: { severity: finding.severity, findingId: finding.id }
          }
        );
      }
    }

    logger.info(`[ParallelStateMonitor] Handled ${finding.severity} finding: ${finding.title}`);
  }

  /**
   * Escalate a critical finding
   */
  private escalateFinding(finding: Finding): void {
    // Get team for project
    if (!finding.projectId) return;

    const team = this.teamManager.getTeamForProject(finding.projectId);
    if (!team) return;

    // Get team lead
    const lead = this.teamManager.getTeamLead(team.id);
    if (!lead) return;

    // Create escalation request
    this.collaboration.escalate(
      'monitoring-system',
      {
        title: `Critical Finding: ${finding.title}`,
        description: finding.description,
        severity: 'critical',
        context: {
          findingId: finding.id,
          findingType: finding.type,
          location: finding.location,
          remediation: finding.remediation
        }
      },
      [team.leadRoleId]
    );

    this.eventBus.publish('monitoring:finding:escalated', {
      finding,
      escalatedTo: lead.agentId,
      timestamp: Date.now()
    });
  }

  /**
   * Get state type for finding
   */
  private getStateTypeForFinding(finding: Finding): ParallelStateType {
    // Determine state type based on finding type
    const securityTypes = ['sql_injection', 'xss', 'hardcoded_secret', 'dependency_vulnerability', 'config_drift', 'security'];
    const complianceTypes = ['stale_evidence', 'control_validation', 'policy_violation', 'compliance'];

    if (securityTypes.some(t => finding.type.includes(t))) {
      return 'security_monitoring';
    }

    if (complianceTypes.some(t => finding.type.includes(t))) {
      return 'compliance_monitoring';
    }

    return 'observability';
  }

  /**
   * Update metrics for an agent
   */
  private updateMetrics(agentId: string, metrics: Record<string, number>): void {
    const agent = this.monitoringAgents.get(agentId);
    if (!agent) return;

    // Update corresponding parallel state
    const stateType = this.getStateTypeFromAgent(agent.type);

    for (const [projectId, states] of this.parallelStates) {
      const state = states.get(stateType);
      if (state) {
        state.metrics = { ...state.metrics, ...metrics };
        state.lastCheck = Date.now();
      }
    }
  }

  /**
   * Get state type from agent type
   */
  private getStateTypeFromAgent(agentType: MonitorType): ParallelStateType {
    switch (agentType) {
      case 'security':
        return 'security_monitoring';
      case 'compliance':
        return 'compliance_monitoring';
      case 'observability':
        return 'observability';
      default:
        return 'observability';
    }
  }

  /**
   * Get all registered agents
   */
  public getRegisteredAgents(): MonitoringAgent[] {
    return Array.from(this.monitoringAgents.values());
  }

  /**
   * Check if monitoring is running
   */
  public isMonitoring(): boolean {
    return this.isRunning;
  }

  /**
   * Get all parallel states
   */
  public getAllParallelStates(): Map<string, Map<ParallelStateType, ParallelState>> {
    return new Map(this.parallelStates);
  }

  /**
   * Clear all data (for testing)
   */
  public clear(): void {
    for (const agent of this.monitoringAgents.values()) {
      agent.stop();
    }
    this.monitoringAgents.clear();
    this.parallelStates.clear();
    this.isRunning = false;

    for (const unsubscribe of this.eventListeners) {
      unsubscribe();
    }
    this.eventListeners = [];

    ParallelStateMonitor.instance = undefined as unknown as ParallelStateMonitor;
    logger.warn('[ParallelStateMonitor] All data cleared');
  }
}

export default ParallelStateMonitor;
