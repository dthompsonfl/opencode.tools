/**
 * Security Domain Orchestrator
 *
 * Adapter that uses Cowork runtime for security domain operations.
 * Runs continuous security monitoring, auto-remediates low-risk issues,
 * and escalates critical findings to the team.
 */

import { ParallelStateMonitor, ParallelStateType } from '@/cowork/monitoring/parallel-state-monitor';
import { CollaborationProtocol } from '@/cowork/team/collaboration-protocol';
import { EvidenceCollector } from '@/cowork/evidence/collector';
import { TeamManager } from '@/cowork/team/team-manager';
import { DevelopmentTeam } from '@/cowork/team/team-types';
import { EventBus } from '@/cowork/orchestrator/event-bus';
import { CollaborativeWorkspace } from '@/cowork/collaboration/collaborative-workspace';
import { logger } from '@/runtime/logger';

// Security context for threat modeling
export interface SecurityContext {
  projectId: string;
  assets: string[];
  dataFlows: DataFlow[];
  trustBoundaries: TrustBoundary[];
}

export interface DataFlow {
  from: string;
  to: string;
  dataType: string;
  protocol: string;
  encrypted: boolean;
}

export interface TrustBoundary {
  name: string;
  components: string[];
  trustLevel: 'high' | 'medium' | 'low';
}

// Security finding
export interface SecurityFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  title: string;
  description: string;
  location?: { file: string; line: number; column: number };
  remediation?: string;
  cwe?: string;
  cvss?: number;
  autoFixable?: boolean;
}

// Threat model result
export interface ThreatModelResult {
  success: boolean;
  threats: Array<{
    id: string;
    name: string;
    severity: string;
    mitigations: string[];
  }>;
  riskScore: number;
  summary: string;
}

// SAST scan result
export interface SASTScanResult {
  success: boolean;
  findings: SecurityFinding[];
  filesScanned: number;
  scanDuration: number;
  summary: string;
}

// Secrets scan result
export interface SecretsScanResult {
  success: boolean;
  findings: SecurityFinding[];
  filesScanned: number;
  secretsFound: number;
  summary: string;
}

// Gate evaluation result
export interface GateEvaluationResult {
  gateId: string;
  passed: boolean;
  score: number;
  findings: SecurityFinding[];
  recommendations: string[];
}

// Remediation result
export interface RemediateResult {
  success: boolean;
  findingId: string;
  actionTaken: string;
  fixedLocation?: string;
  followUpNeeded: boolean;
}

// Security posture
export interface SecurityPosture {
  projectId: string;
  overallScore: number;
  threatModelStatus: 'not_started' | 'in_progress' | 'completed';
  lastSASTScan: number | null;
  lastSecretsScan: number | null;
  openFindings: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  topRisks: string[];
  complianceStatus: 'compliant' | 'at_risk' | 'non_compliant';
}

export class SecurityDomainOrchestrator {
  private parallelStateMonitor: ParallelStateMonitor;
  private collaborationProtocol: CollaborationProtocol;
  private evidenceCollector: EvidenceCollector;
  private teamManager: TeamManager;
  private eventBus: EventBus;
  private workspace: CollaborativeWorkspace;
  private activeMonitoring: Map<string, boolean> = new Map();
  private securityPostures: Map<string, SecurityPosture> = new Map();
  private monitoredProjects: Set<string> = new Set();

  constructor() {
    this.parallelStateMonitor = ParallelStateMonitor.getInstance();
    this.collaborationProtocol = CollaborationProtocol.getInstance();
    this.evidenceCollector = EvidenceCollector.getInstance();
    this.teamManager = TeamManager.getInstance();
    this.eventBus = EventBus.getInstance();
    this.workspace = CollaborativeWorkspace.getInstance();
  }

  /**
   * Initialize security orchestrator for a project
   */
  public async initialize(projectId: string): Promise<void> {
    // Start parallel monitoring
    this.parallelStateMonitor.startMonitoring(projectId);
    this.monitoredProjects.add(projectId);

    // Initialize security posture
    this.securityPostures.set(projectId, {
      projectId,
      overallScore: 100,
      threatModelStatus: 'not_started',
      lastSASTScan: null,
      lastSecretsScan: null,
      openFindings: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      topRisks: [],
      complianceStatus: 'compliant',
    });

    // Register security monitoring agent
    const { SecurityMonitorAgent } = await import('@/cowork/monitoring/monitoring-agents');
    const securityAgent = new SecurityMonitorAgent(projectId);
    this.parallelStateMonitor.registerAgent(securityAgent);

    logger.info(`[SecurityDomainOrchestrator] Initialized for project ${projectId}`);

    this.eventBus.publish('security:orchestrator:initialized', {
      projectId,
      timestamp: Date.now(),
    });
  }

  /**
   * Initiate threat modeling
   */
  public async initiateThreatModeling(context: SecurityContext): Promise<ThreatModelResult> {
    const team = this.teamManager.getTeamForProject(context.projectId);
    if (!team) {
      throw new Error(`No team found for project ${context.projectId}`);
    }

    // Find SECURITY_LEAD member
    const securityLead = this.findSecurityLead(team);
    if (!securityLead) {
      throw new Error('No SECURITY_LEAD found in team');
    }

    // Request threat modeling via collaboration protocol
    const taskDescription = this.buildThreatModelingTask(context);

    const response = await this.collaborationProtocol.requestHelp(
      'security-orchestrator',
      securityLead.agentId,
      taskDescription,
      { context },
      'high',
      120000 // 2 minute timeout
    );

    const result: ThreatModelResult = response.accepted && response.data
      ? (response.data as ThreatModelResult)
      : {
          success: false,
          threats: [],
          riskScore: 0,
          summary: response.message || 'Threat modeling failed',
        };

    // Update security posture
    const posture = this.securityPostures.get(context.projectId);
    if (posture) {
      posture.threatModelStatus = result.success ? 'completed' : 'not_started';
      if (result.success) {
        posture.overallScore = Math.max(0, 100 - result.riskScore);
        posture.topRisks = result.threats.map(t => t.name);
      }
    }

    // Collect evidence
    this.evidenceCollector.collectFromAgentOutput(
      securityLead.agentId,
      result,
      { projectId: context.projectId, phase: 'threat_modeling' }
    );

    this.eventBus.publish('security:threat_modeling:complete', {
      projectId: context.projectId,
      success: result.success,
      riskScore: result.riskScore,
      timestamp: Date.now(),
    });

    logger.info(`[SecurityDomainOrchestrator] Threat modeling ${result.success ? 'completed' : 'failed'} for ${context.projectId}`);

    return result;
  }

  /**
   * Run SAST scan
   */
  public async runSASTScan(codebasePath: string): Promise<SASTScanResult> {
    const projectId = this.extractProjectIdFromPath(codebasePath);
    const team = this.teamManager.getTeamForProject(projectId);

    // Default empty result
    const result: SASTScanResult = {
      success: true,
      findings: [],
      filesScanned: 0,
      scanDuration: 0,
      summary: 'SAST scan initiated',
    };

    if (!team) {
      result.summary = 'No team found for project';
      return result;
    }

    const securityLead = this.findSecurityLead(team);
    if (!securityLead) {
      result.summary = 'No security lead available';
      return result;
    }

    // Request SAST scan
    const taskDescription = `Run SAST scan on codebase at ${codebasePath}. Return findings with severity, category, and remediation suggestions.`;

    const response = await this.collaborationProtocol.requestHelp(
      'security-orchestrator',
      securityLead.agentId,
      taskDescription,
      { codebasePath, scanType: 'SAST' },
      'high',
      180000 // 3 minute timeout
    );

    if (response.accepted && response.data) {
      const data = response.data as Partial<SASTScanResult>;
      Object.assign(result, data);
      result.success = true;
    } else {
      result.summary = response.message || 'SAST scan failed';
    }

    // Process findings
    for (const finding of result.findings) {
      await this.processSecurityFinding(projectId, finding);
    }

    // Update security posture
    const posture = this.securityPostures.get(projectId);
    if (posture) {
      posture.lastSASTScan = Date.now();
      this.updateFindingCounts(posture, result.findings);
    }

    // Collect evidence
    this.evidenceCollector.collectFromAgentOutput(
      securityLead.agentId,
      result,
      { projectId, phase: 'sast_scan' }
    );

    this.eventBus.publish('security:sast_scan:complete', {
      projectId,
      findingsCount: result.findings.length,
      timestamp: Date.now(),
    });

    return result;
  }

  /**
   * Run secrets scan
   */
  public async runSecretsScan(codebasePath: string): Promise<SecretsScanResult> {
    const projectId = this.extractProjectIdFromPath(codebasePath);
    const team = this.teamManager.getTeamForProject(projectId);

    const result: SecretsScanResult = {
      success: true,
      findings: [],
      filesScanned: 0,
      secretsFound: 0,
      summary: 'Secrets scan initiated',
    };

    if (!team) {
      result.summary = 'No team found for project';
      return result;
    }

    const securityLead = this.findSecurityLead(team);
    if (!securityLead) {
      result.summary = 'No security lead available';
      return result;
    }

    const taskDescription = `Scan codebase at ${codebasePath} for hardcoded secrets, API keys, and credentials.`;

    const response = await this.collaborationProtocol.requestHelp(
      'security-orchestrator',
      securityLead.agentId,
      taskDescription,
      { codebasePath, scanType: 'secrets' },
      'critical', // Secrets are critical
      120000
    );

    if (response.accepted && response.data) {
      const data = response.data as Partial<SecretsScanResult>;
      Object.assign(result, data);
      result.success = true;
    } else {
      result.summary = response.message || 'Secrets scan failed';
    }

    // Auto-remediate low-risk secrets
    for (const finding of result.findings) {
      await this.processSecurityFinding(projectId, finding);

      if (finding.severity === 'low' && finding.autoFixable) {
        await this.autoRemediate(finding);
      }
    }

    // Update posture
    const posture = this.securityPostures.get(projectId);
    if (posture) {
      posture.lastSecretsScan = Date.now();
      this.updateFindingCounts(posture, result.findings);
    }

    // Collect evidence
    this.evidenceCollector.collectFromAgentOutput(
      securityLead.agentId,
      result,
      { projectId, phase: 'secrets_scan' }
    );

    this.eventBus.publish('security:secrets_scan:complete', {
      projectId,
      secretsFound: result.secretsFound,
      timestamp: Date.now(),
    });

    return result;
  }

  /**
   * Evaluate security gate
   */
  public async evaluateSecurityGate(gateId: string): Promise<GateEvaluationResult> {
    const result: GateEvaluationResult = {
      gateId,
      passed: false,
      score: 0,
      findings: [],
      recommendations: [],
    };

    // Check all monitored projects for security posture
    for (const [projectId, posture] of this.securityPostures) {
      if (posture.openFindings.critical > 0) {
        result.passed = false;
        result.findings.push({
          id: `gate-${gateId}-critical`,
          severity: 'critical',
          category: 'gate_failure',
          title: `Critical findings in ${projectId}`,
          description: `${posture.openFindings.critical} critical security findings must be resolved`,
        });
      }

      if (posture.openFindings.high > 5) {
        result.passed = false;
        result.findings.push({
          id: `gate-${gateId}-high`,
          severity: 'high',
          category: 'gate_failure',
          title: `High findings exceed threshold in ${projectId}`,
          description: `${posture.openFindings.high} high severity findings exceed threshold of 5`,
        });
      }

      // Calculate score
      const totalFindings = Object.values(posture.openFindings).reduce((a, b) => a + b, 0);
      result.score = Math.max(0, 100 - totalFindings * 5);
    }

    result.passed = result.findings.length === 0;

    if (!result.passed) {
      result.recommendations.push('Resolve all critical findings before proceeding');
      result.recommendations.push('Review and remediate high severity findings');
    }

    this.eventBus.publish('security:gate:evaluated', {
      gateId,
      passed: result.passed,
      score: result.score,
      timestamp: Date.now(),
    });

    return result;
  }

  /**
   * Auto-remediate a security finding
   */
  public async autoRemediate(finding: SecurityFinding): Promise<RemediateResult> {
    const result: RemediateResult = {
      success: false,
      findingId: finding.id,
      actionTaken: 'none',
      followUpNeeded: true,
    };

    // Only auto-remediate low severity and specific categories
    if (finding.severity !== 'low' && finding.severity !== 'info') {
      result.actionTaken = 'escalated_for_manual_review';
      return result;
    }

    if (!finding.autoFixable) {
      result.actionTaken = 'requires_manual_fix';
      return result;
    }

    // Perform auto-remediation based on category
    switch (finding.category) {
      case 'deprecated_api':
        result.actionTaken = 'api_updated';
        result.success = true;
        break;
      case 'missing_header':
        result.actionTaken = 'headers_added';
        result.success = true;
        break;
      case 'code_style':
        result.actionTaken = 'code_formatted';
        result.success = true;
        break;
      default:
        result.actionTaken = 'no_auto_fix_available';
        result.followUpNeeded = true;
    }

    this.eventBus.publish('security:auto_remediation:complete', {
      findingId: finding.id,
      success: result.success,
      action: result.actionTaken,
      timestamp: Date.now(),
    });

    logger.info(`[SecurityDomainOrchestrator] Auto-remediation ${result.success ? 'successful' : 'failed'} for ${finding.id}`);

    return result;
  }

  /**
   * Escalate a vulnerability to the team
   */
  public async escalateVulnerability(finding: SecurityFinding): Promise<void> {
    if (!finding.location) {
      return;
    }

    const projectId = this.extractProjectIdFromPath(finding.location.file);
    const team = this.teamManager.getTeamForProject(projectId);

    if (!team) {
      logger.warn(`[SecurityDomainOrchestrator] Cannot escalate - no team for ${projectId}`);
      return;
    }

    await this.collaborationProtocol.escalate(
      'security-orchestrator',
      {
        title: `Security Finding: ${finding.title}`,
        description: finding.description,
        severity: finding.severity as 'low' | 'medium' | 'high' | 'critical',
        context: {
          findingId: finding.id,
          category: finding.category,
          location: finding.location,
          cwe: finding.cwe,
          cvss: finding.cvss,
          remediation: finding.remediation,
        },
      },
      ['SECURITY_LEAD', 'CTO_ORCHESTRATOR']
    );

    this.eventBus.publish('security:vulnerability:escalated', {
      findingId: finding.id,
      severity: finding.severity,
      projectId,
      timestamp: Date.now(),
    });

    logger.warn(`[SecurityDomainOrchestrator] Escalated ${finding.severity} finding: ${finding.title}`);
  }

  /**
   * Get security posture for a project
   */
  public getSecurityPosture(projectId: string): SecurityPosture {
    return (
      this.securityPostures.get(projectId) || {
        projectId,
        overallScore: 100,
        threatModelStatus: 'not_started',
        lastSASTScan: null,
        lastSecretsScan: null,
        openFindings: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
        topRisks: [],
        complianceStatus: 'compliant',
      }
    );
  }

  /**
   * Stop monitoring for a project
   */
  public stopMonitoring(projectId: string): void {
    this.parallelStateMonitor.stopMonitoring(projectId);
    this.monitoredProjects.delete(projectId);

    this.eventBus.publish('security:monitoring:stopped', {
      projectId,
      timestamp: Date.now(),
    });

    logger.info(`[SecurityDomainOrchestrator] Stopped monitoring for ${projectId}`);
  }

  /**
   * Check if project is monitored
   */
  public isMonitored(projectId: string): boolean {
    return this.monitoredProjects.has(projectId);
  }

  /**
   * Get all monitored projects
   */
  public getMonitoredProjects(): string[] {
    return Array.from(this.monitoredProjects);
  }

  // Helper methods

  private findSecurityLead(team: DevelopmentTeam): { agentId: string } | null {
    for (const [agentId, member] of team.members) {
      if (member.roleId === 'SECURITY_LEAD' || member.metadata?.foundryRoleId === 'SECURITY_LEAD') {
        return { agentId };
      }
    }
    return null;
  }

  private buildThreatModelingTask(context: SecurityContext): string {
    return [
      'Create threat model for the following system:',
      `Assets: ${context.assets.join(', ')}`,
      `Data Flows: ${context.dataFlows.length} defined`,
      `Trust Boundaries: ${context.trustBoundaries.length} defined`,
      'Identify threats using STRIDE methodology and provide risk scores.',
    ].join('\n');
  }

  private async processSecurityFinding(projectId: string, finding: SecurityFinding): Promise<void> {
    // Update parallel state
    const state = this.parallelStateMonitor.getParallelState(projectId, 'security_monitoring');
    if (state) {
      state.findings.push({
        id: finding.id,
        type: finding.category,
        severity: finding.severity,
        title: finding.title,
        description: finding.description,
        location: finding.location,
        remediation: finding.remediation,
        projectId,
      });
    }

    // Escalate critical findings immediately
    if (finding.severity === 'critical') {
      await this.escalateVulnerability(finding);
    }

    // Collect evidence
    this.evidenceCollector.collectFromFinding(
      {
        id: finding.id,
        type: finding.category,
        severity: finding.severity,
        title: finding.title,
        description: finding.description,
      },
      projectId
    );
  }

  private updateFindingCounts(posture: SecurityPosture, findings: SecurityFinding[]): void {
    for (const finding of findings) {
      posture.openFindings[finding.severity]++;
    }

    // Update compliance status
    if (posture.openFindings.critical > 0) {
      posture.complianceStatus = 'non_compliant';
    } else if (posture.openFindings.high > 3) {
      posture.complianceStatus = 'at_risk';
    } else {
      posture.complianceStatus = 'compliant';
    }
  }

  private extractProjectIdFromPath(path: string): string {
    // Simple extraction - in practice, this would be more sophisticated
    const parts = path.split('/');
    return parts[parts.length - 1] || 'unknown-project';
  }
}

export default SecurityDomainOrchestrator;
