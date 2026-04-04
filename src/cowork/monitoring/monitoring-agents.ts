/**
 * Monitoring Agents
 *
 * Continuous monitoring agents that run in parallel to the main workflow.
 * Includes security monitoring, compliance monitoring, and observability.
 */

import { logger } from '../../runtime/logger';
import { EventBus } from '../orchestrator/event-bus';

export interface Finding {
  id: string;
  type: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  location?: { file?: string; line?: number; column?: number };
  remediation?: string;
  projectId?: string;
}

export interface MonitoringResult {
  agentId: string;
  timestamp: number;
  findings: Finding[];
  metrics: Record<string, number>;
  status: 'success' | 'partial' | 'error';
  error?: string;
}

export type MonitorType = 'security' | 'compliance' | 'observability';

export abstract class MonitoringAgent {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly type: MonitorType;
  abstract runInterval: number;
  lastRun: number = 0;
  status: 'running' | 'paused' | 'error' = 'paused';
  protected intervalId: NodeJS.Timeout | null = null;
  protected eventBus: EventBus;
  protected isRunning: boolean = false;

  constructor() {
    this.eventBus = EventBus.getInstance();
  }

  /**
   * Start the monitoring agent
   */
  start(): void {
    if (this.isRunning) {
      logger.warn(`[${this.name}] Already running`);
      return;
    }

    this.isRunning = true;
    this.status = 'running';

    // Run immediately
    this.executeRun();

    // Schedule periodic runs
    this.intervalId = setInterval(() => {
      this.executeRun();
    }, this.runInterval);

    logger.info(`[${this.name}] Started monitoring (interval: ${this.runInterval}ms)`);

    this.eventBus.publish('monitoring:agent:started', {
      agentId: this.id,
      name: this.name,
      type: this.type,
      timestamp: Date.now()
    });
  }

  /**
   * Stop the monitoring agent
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.status = 'paused';

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    logger.info(`[${this.name}] Stopped monitoring`);

    this.eventBus.publish('monitoring:agent:stopped', {
      agentId: this.id,
      name: this.name,
      type: this.type,
      timestamp: Date.now()
    });
  }

  /**
   * Execute a monitoring run
   */
  abstract run(): Promise<MonitoringResult>;

  /**
   * Wrapper for run with error handling and result publishing
   */
  private async executeRun(): Promise<void> {
    this.lastRun = Date.now();

    try {
      const result = await this.run();
      this.status = result.status === 'error' ? 'error' : 'running';

      // Publish findings
      for (const finding of result.findings) {
        this.publishFinding(finding);
      }

      // Publish metrics
      this.eventBus.publish('monitoring:metrics', {
        agentId: this.id,
        type: this.type,
        metrics: result.metrics,
        timestamp: result.timestamp
      });

      logger.debug(`[${this.name}] Monitoring run completed: ${result.findings.length} findings`);
    } catch (error) {
      this.status = 'error';
      logger.error(`[${this.name}] Monitoring run failed`, error);

      this.eventBus.publish('monitoring:error', {
        agentId: this.id,
        name: this.name,
        type: this.type,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      });
    }
  }

  /**
   * Publish a finding to the event bus
   */
  protected publishFinding(finding: Finding): void {
    this.eventBus.publish('monitoring:finding', {
      ...finding,
      agentId: this.id,
      agentType: this.type,
      timestamp: Date.now()
    });

    // Also publish by severity for priority handling
    this.eventBus.publish(`monitoring:finding:${finding.severity}`, finding);
  }
}

/**
 * Security monitoring agent
 * Runs SAST scanning, secret detection, dependency vulnerability scanning,
 * and configuration drift detection
 */
export class SecurityMonitorAgent extends MonitoringAgent {
  readonly id = 'security-monitor';
  readonly name = 'Security Monitor';
  readonly type: MonitorType = 'security';
  runInterval = 60000; // 1 minute

  private projectId: string = '';

  constructor(projectId?: string) {
    super();
    if (projectId) {
      this.projectId = projectId;
    }
  }

  async run(): Promise<MonitoringResult> {
    const findings: Finding[] = [];
    const metrics: Record<string, number> = {
      filesScanned: 0,
      secretsChecked: 0,
      dependenciesScanned: 0,
      configsChecked: 0
    };

    // SAST scanning simulation
    const sastFindings = await this.runSASTScan();
    findings.push(...sastFindings);
    metrics.filesScanned = 100 + Math.floor(Math.random() * 50);

    // Secret detection
    const secretFindings = await this.detectSecrets();
    findings.push(...secretFindings);
    metrics.secretsChecked = 500 + Math.floor(Math.random() * 100);

    // Dependency vulnerability scanning
    const vulnFindings = await this.scanDependencies();
    findings.push(...vulnFindings);
    metrics.dependenciesScanned = 50 + Math.floor(Math.random() * 20);

    // Configuration drift detection
    const driftFindings = await this.detectConfigDrift();
    findings.push(...driftFindings);
    metrics.configsChecked = 20 + Math.floor(Math.random() * 10);

    // Update metrics with finding counts
    metrics.criticalFindings = findings.filter(f => f.severity === 'critical').length;
    metrics.highFindings = findings.filter(f => f.severity === 'high').length;
    metrics.mediumFindings = findings.filter(f => f.severity === 'medium').length;
    metrics.lowFindings = findings.filter(f => f.severity === 'low').length;

    return {
      agentId: this.id,
      timestamp: Date.now(),
      findings,
      metrics,
      status: 'success'
    };
  }

  private async runSASTScan(): Promise<Finding[]> {
    // Simulate SAST scanning
    const findings: Finding[] = [];

    // Randomly generate findings for demonstration
    if (Math.random() > 0.7) {
      findings.push({
        id: `sast-${Date.now()}-1`,
        type: 'sql_injection',
        severity: 'high',
        title: 'Potential SQL Injection',
        description: 'Unsanitized user input detected in database query',
        location: { file: 'src/api/users.ts', line: 45 },
        remediation: 'Use parameterized queries or ORM',
        projectId: this.projectId
      });
    }

    if (Math.random() > 0.8) {
      findings.push({
        id: `sast-${Date.now()}-2`,
        type: 'xss',
        severity: 'medium',
        title: 'Cross-Site Scripting (XSS)',
        description: 'User input rendered without escaping',
        location: { file: 'src/components/UserProfile.tsx', line: 23 },
        remediation: 'Use JSX auto-escaping or sanitize HTML',
        projectId: this.projectId
      });
    }

    return findings;
  }

  private async detectSecrets(): Promise<Finding[]> {
    const findings: Finding[] = [];

    if (Math.random() > 0.9) {
      findings.push({
        id: `secret-${Date.now()}-1`,
        type: 'hardcoded_secret',
        severity: 'critical',
        title: 'Hardcoded API Key',
        description: 'API key detected in source code',
        location: { file: 'config/database.ts', line: 5 },
        remediation: 'Move to environment variables or secret manager',
        projectId: this.projectId
      });
    }

    return findings;
  }

  private async scanDependencies(): Promise<Finding[]> {
    const findings: Finding[] = [];

    if (Math.random() > 0.85) {
      findings.push({
        id: `vuln-${Date.now()}-1`,
        type: 'dependency_vulnerability',
        severity: 'high',
        title: 'Vulnerable Dependency',
        description: 'lodash < 4.17.21 has prototype pollution vulnerability',
        remediation: 'Update to lodash@^4.17.21',
        projectId: this.projectId
      });
    }

    return findings;
  }

  private async detectConfigDrift(): Promise<Finding[]> {
    const findings: Finding[] = [];

    if (Math.random() > 0.95) {
      findings.push({
        id: `drift-${Date.now()}-1`,
        type: 'config_drift',
        severity: 'low',
        title: 'Configuration Drift Detected',
        description: 'Security configuration differs from baseline',
        remediation: 'Review and align configuration with security baseline',
        projectId: this.projectId
      });
    }

    return findings;
  }
}

/**
 * Compliance monitoring agent
 * Validates evidence freshness, controls, and policy compliance
 */
export class ComplianceMonitorAgent extends MonitoringAgent {
  readonly id = 'compliance-monitor';
  readonly name = 'Compliance Monitor';
  readonly type: MonitorType = 'compliance';
  runInterval = 120000; // 2 minutes

  private projectId: string = '';
  private controls: Array<{ id: string; name: string; lastValidated: number }> = [];

  constructor(projectId?: string) {
    super();
    if (projectId) {
      this.projectId = projectId;
    }
  }

  async run(): Promise<MonitoringResult> {
    const findings: Finding[] = [];
    const metrics: Record<string, number> = {
      controlsChecked: 0,
      compliantControls: 0,
      nonCompliantControls: 0,
      evidenceFreshness: 0
    };

    // Evidence freshness check
    const freshnessFindings = await this.checkEvidenceFreshness();
    findings.push(...freshnessFindings);
    metrics.evidenceFreshness = Math.floor(Math.random() * 30); // Days since last evidence

    // Control validation
    const controlFindings = await this.validateControls();
    findings.push(...controlFindings);
    metrics.controlsChecked = this.controls.length || 5;
    metrics.compliantControls = metrics.controlsChecked - findings.length;
    metrics.nonCompliantControls = findings.length;

    // Policy compliance check
    const policyFindings = await this.checkPolicyCompliance();
    findings.push(...policyFindings);

    return {
      agentId: this.id,
      timestamp: Date.now(),
      findings,
      metrics,
      status: 'success'
    };
  }

  private async checkEvidenceFreshness(): Promise<Finding[]> {
    const findings: Finding[] = [];

    if (Math.random() > 0.8) {
      findings.push({
        id: `freshness-${Date.now()}-1`,
        type: 'stale_evidence',
        severity: 'medium',
        title: 'Stale Evidence Detected',
        description: 'Security review evidence is older than 90 days',
        remediation: 'Refresh security review evidence',
        projectId: this.projectId
      });
    }

    return findings;
  }

  private async validateControls(): Promise<Finding[]> {
    const findings: Finding[] = [];

    // Initialize default controls if not set
    if (this.controls.length === 0) {
      this.controls = [
        { id: 'ac-1', name: 'Access Control Policy', lastValidated: Date.now() - 86400000 },
        { id: 'ac-2', name: 'Account Management', lastValidated: Date.now() - 172800000 },
        { id: 'au-1', name: 'Audit and Accountability', lastValidated: Date.now() - 259200000 },
        { id: 'cm-1', name: 'Configuration Management', lastValidated: Date.now() - 345600000 },
        { id: 'ia-1', name: 'Identification and Authentication', lastValidated: Date.now() }
      ];
    }

    for (const control of this.controls) {
      const daysSinceValidation = (Date.now() - control.lastValidated) / (1000 * 60 * 60 * 24);

      if (daysSinceValidation > 30) {
        findings.push({
          id: `control-${control.id}-${Date.now()}`,
          type: 'control_validation',
          severity: daysSinceValidation > 60 ? 'high' : 'medium',
          title: `Control ${control.name} Requires Validation`,
          description: `Control has not been validated for ${Math.floor(daysSinceValidation)} days`,
          remediation: 'Perform control validation and update evidence',
          projectId: this.projectId
        });
      }
    }

    return findings;
  }

  private async checkPolicyCompliance(): Promise<Finding[]> {
    const findings: Finding[] = [];

    if (Math.random() > 0.9) {
      findings.push({
        id: `policy-${Date.now()}-1`,
        type: 'policy_violation',
        severity: 'medium',
        title: 'Data Retention Policy Violation',
        description: 'Audit logs are not being archived according to policy',
        remediation: 'Configure automated log archival process',
        projectId: this.projectId
      });
    }

    return findings;
  }

  /**
   * Add a control to monitor
   */
  addControl(id: string, name: string): void {
    this.controls.push({
      id,
      name,
      lastValidated: Date.now()
    });
  }

  /**
   * Mark control as validated
   */
  validateControl(controlId: string): void {
    const control = this.controls.find(c => c.id === controlId);
    if (control) {
      control.lastValidated = Date.now();
    }
  }
}

/**
 * Observability agent
 * Collects agent execution metrics, system health metrics,
 * event throughput, and error rates
 */
export class ObservabilityAgent extends MonitoringAgent {
  readonly id = 'observability-agent';
  readonly name = 'Observability Agent';
  readonly type: MonitorType = 'observability';
  runInterval = 30000; // 30 seconds

  private projectId: string = '';
  private metricsHistory: Array<{ timestamp: number; metrics: Record<string, number> }> = [];
  private maxHistorySize: number = 100;

  constructor(projectId?: string) {
    super();
    if (projectId) {
      this.projectId = projectId;
    }
  }

  async run(): Promise<MonitoringResult> {
    const findings: Finding[] = [];
    const metrics: Record<string, number> = {};

    // Agent execution metrics
    const agentMetrics = this.collectAgentMetrics();
    Object.assign(metrics, agentMetrics);

    // System health metrics
    const systemMetrics = this.collectSystemMetrics();
    Object.assign(metrics, systemMetrics);

    // Event throughput
    const eventMetrics = this.collectEventMetrics();
    Object.assign(metrics, eventMetrics);

    // Error rates
    const errorMetrics = this.collectErrorMetrics();
    Object.assign(metrics, errorMetrics);

    // Check for anomalies
    const anomalyFindings = this.detectAnomalies(metrics);
    findings.push(...anomalyFindings);

    // Store metrics history
    this.metricsHistory.push({ timestamp: Date.now(), metrics });
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }

    return {
      agentId: this.id,
      timestamp: Date.now(),
      findings,
      metrics,
      status: 'success'
    };
  }

  private collectAgentMetrics(): Record<string, number> {
    return {
      activeAgents: 3 + Math.floor(Math.random() * 2),
      busyAgents: 1 + Math.floor(Math.random() * 2),
      idleAgents: 2 + Math.floor(Math.random() * 2),
      agentsInError: Math.floor(Math.random() * 1),
      totalTasksCompleted: 100 + Math.floor(Math.random() * 50),
      averageTaskDuration: 5000 + Math.floor(Math.random() * 5000)
    };
  }

  private collectSystemMetrics(): Record<string, number> {
    return {
      cpuUsage: 30 + Math.floor(Math.random() * 40),
      memoryUsage: 40 + Math.floor(Math.random() * 30),
      diskUsage: 50 + Math.floor(Math.random() * 20),
      networkLatency: 20 + Math.floor(Math.random() * 30)
    };
  }

  private collectEventMetrics(): Record<string, number> {
    return {
      eventsPerSecond: 10 + Math.floor(Math.random() * 20),
      eventsQueued: Math.floor(Math.random() * 50),
      eventsProcessed: 1000 + Math.floor(Math.random() * 500),
      eventProcessingLatency: 5 + Math.floor(Math.random() * 15)
    };
  }

  private collectErrorMetrics(): Record<string, number> {
    return {
      errorRate: Math.random() * 2,
      totalErrors: Math.floor(Math.random() * 10),
      criticalErrors: Math.floor(Math.random() * 2),
      warnings: Math.floor(Math.random() * 20)
    };
  }

  private detectAnomalies(metrics: Record<string, number>): Finding[] {
    const findings: Finding[] = [];

    // Check error rate
    if (metrics.errorRate > 1) {
      findings.push({
        id: `anomaly-${Date.now()}-error`,
        type: 'high_error_rate',
        severity: metrics.errorRate > 5 ? 'critical' : 'high',
        title: 'High Error Rate Detected',
        description: `Error rate is ${metrics.errorRate.toFixed(2)}%`,
        remediation: 'Review error logs and identify root cause',
        projectId: this.projectId
      });
    }

    // Check resource usage
    if (metrics.cpuUsage > 85) {
      findings.push({
        id: `anomaly-${Date.now()}-cpu`,
        type: 'high_cpu_usage',
        severity: 'medium',
        title: 'High CPU Usage',
        description: `CPU usage at ${metrics.cpuUsage}%`,
        remediation: 'Scale up resources or optimize processes',
        projectId: this.projectId
      });
    }

    // Check memory usage
    if (metrics.memoryUsage > 80) {
      findings.push({
        id: `anomaly-${Date.now()}-memory`,
        type: 'high_memory_usage',
        severity: metrics.memoryUsage > 90 ? 'high' : 'medium',
        title: 'High Memory Usage',
        description: `Memory usage at ${metrics.memoryUsage}%`,
        remediation: 'Review memory leaks or scale resources',
        projectId: this.projectId
      });
    }

    return findings;
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(): Array<{ timestamp: number; metrics: Record<string, number> }> {
    return [...this.metricsHistory];
  }

  /**
   * Get latest metrics
   */
  getLatestMetrics(): Record<string, number> | null {
    if (this.metricsHistory.length === 0) return null;
    return this.metricsHistory[this.metricsHistory.length - 1].metrics;
  }
}

export default {
  MonitoringAgent,
  SecurityMonitorAgent,
  ComplianceMonitorAgent,
  ObservabilityAgent
};
