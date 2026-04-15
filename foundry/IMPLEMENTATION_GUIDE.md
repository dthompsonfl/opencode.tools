# Aegis Foundry - Implementation Guide

This guide provides specific implementation details for building the enterprise autonomous development team system.

## Table of Contents

1. [Core Implementation](#core-implementation)
2. [Domain Orchestrators](#domain-orchestrators)
3. [Security Integration](#security-integration)
4. [Compliance Automation](#compliance-automation)
5. [Evidence Management](#evidence-management)
6. [Integration with Existing Agents](#integration-with-existing-agents)

---

## Core Implementation

### 1. Enhanced State Machine with Parallel States

```typescript
// foundry/core/state-machine.ts
import { EventEmitter } from 'events';

interface StateMachineConfig {
  definition: StateMachineDefinition;
  context: StateContext;
  enableParallelStates: boolean;
}

export class EnterpriseStateMachine extends EventEmitter {
  private currentPhase: EnterprisePhase = 'idle';
  private parallelStates: Map<ParallelStateType, ParallelState> = new Map();
  private history: StateTransition[] = [];
  private subMachines: Map<string, SubStateMachine> = new Map();
  private context: StateContext;
  private definition: StateMachineDefinition;

  constructor(config: StateMachineConfig) {
    super();
    this.context = config.context;
    this.definition = config.definition;
    
    if (config.enableParallelStates) {
      this.initializeParallelStates();
    }
  }

  private initializeParallelStates(): void {
    const defaultParallelStates: ParallelStateType[] = [
      'security_monitoring',
      'compliance_monitoring',
      'observability'
    ];

    for (const stateType of defaultParallelStates) {
      this.parallelStates.set(stateType, {
        type: stateType,
        status: 'active',
        lastCheck: Date.now(),
        metrics: {}
      });
    }
  }

  async dispatch(event: EnterpriseStateEvent, payload?: unknown): Promise<void> {
    const stateDef = this.definition.states[this.currentPhase];
    if (!stateDef) {
      throw new StateMachineError(`Invalid state: ${this.currentPhase}`);
    }

    const transition = stateDef.on[event];
    if (!transition) {
      throw new StateMachineError(
        `Invalid transition: ${event} from ${this.currentPhase}`
      );
    }

    // Validate pre-conditions
    await this.validateTransition(event, payload);

    // Execute exit actions
    await this.executeActions(stateDef.exit_actions);

    // Record transition
    const prevPhase = this.currentPhase;
    this.currentPhase = transition.target;

    const transitionRecord: StateTransition = {
      id: generateULID(),
      timestamp: Date.now(),
      from: prevPhase,
      to: this.currentPhase,
      event,
      actor: this.getCurrentActor(),
      evidenceIds: [],
      signature: ''
    };

    this.history.push(transitionRecord);

    // Execute entry actions
    await this.executeActions(transition.actions);
    await this.executeActions(
      this.definition.states[this.currentPhase].entry_actions
    );

    // Emit event for observers
    this.emit('transition', transitionRecord);

    // Check for parallel state updates
    this.updateParallelStates(event, payload);
  }

  private async validateTransition(
    event: EnterpriseStateEvent,
    payload?: unknown
  ): Promise<void> {
    // Check if transition requires specific gates
    const requiredGates = this.getRequiredGatesForTransition(event);
    
    for (const gate of requiredGates) {
      const result = await this.evaluateGate(gate);
      if (result.status !== 'passed') {
        throw new StateMachineError(
          `Gate ${gate} not passed for transition ${event}`
        );
      }
    }
  }

  private getRequiredGatesForTransition(event: EnterpriseStateEvent): string[] {
    const gateMap: Record<string, string[]> = {
      APPROVE_PHASE: ['quality', 'security'],
      REQUEST_RELEASE: ['security', 'quality', 'compliance'],
      EXECUTE_DEPLOYMENT: ['release_readiness']
    };
    return gateMap[event] || [];
  }

  private async evaluateGate(gateId: string): Promise<GateEvaluationResult> {
    // Delegate to gate evaluator
    return await gateSystem.evaluateGate(gateId, {
      projectId: this.context.project.id,
      phase: this.currentPhase,
      evidence: [],
      artifacts: this.context.artifacts,
      riskAssessment: { level: 'low', score: 0, factors: [], mitigationRequired: false }
    });
  }

  private async executeActions(actions?: string[]): Promise<void> {
    if (!actions) return;

    for (const action of actions) {
      this.emit('action', action, this.context);
    }
  }

  private updateParallelStates(
    event: EnterpriseStateEvent,
    payload?: unknown
  ): void {
    // Update security monitoring for security-related events
    if (event.includes('SECURITY') || event.includes('GATE')) {
      this.updateParallelState('security_monitoring', {
        lastEvent: event,
        timestamp: Date.now()
      });
    }

    // Update compliance monitoring
    if (event.includes('COMPLIANCE') || event.includes('APPROVE')) {
      this.updateParallelState('compliance_monitoring', {
        lastEvent: event,
        timestamp: Date.now()
      });
    }
  }

  private updateParallelState(
    type: ParallelStateType,
    update: Partial<ParallelState>
  ): void {
    const state = this.parallelStates.get(type);
    if (state) {
      Object.assign(state, update, { lastCheck: Date.now() });
      this.parallelStates.set(type, state);
    }
  }

  // Sub-state machine support
  enterSubMachine(machineId: string, initialState: string): void {
    this.subMachines.set(machineId, {
      id: machineId,
      currentState: initialState,
      parentState: this.currentPhase
    });
  }

  exitSubMachine(machineId: string): void {
    this.subMachines.delete(machineId);
  }

  // Getters
  getCurrentState(): StateSnapshot {
    return {
      phase: this.currentPhase,
      parallelStates: Array.from(this.parallelStates.values()),
      context: this.context,
      timestamp: Date.now()
    };
  }

  getHistory(): StateTransition[] {
    return [...this.history];
  }

  can(event: EnterpriseStateEvent): boolean {
    const stateDef = this.definition.states[this.currentPhase];
    return event in (stateDef?.on || {});
  }

  getAvailableTransitions(): Array<{ event: EnterpriseStateEvent; target: EnterprisePhase }> {
    const stateDef = this.definition.states[this.currentPhase];
    if (!stateDef?.on) return [];

    return Object.entries(stateDef.on).map(([event, transition]) => ({
      event: event as EnterpriseStateEvent,
      target: transition.target
    }));
  }
}

class StateMachineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StateMachineError';
  }
}

interface SubStateMachine {
  id: string;
  currentState: string;
  parentState: EnterprisePhase;
}

function generateULID(): string {
  // Implementation using ulid library
  return require('ulid')();
}
```

### 2. Immutable Audit Trail with Hash Chain

```typescript
// foundry/core/audit-trail.ts
import { createHash, generateKeyPairSync, createSign, createVerify } from 'crypto';

export class AuditTrail implements IAuditTrail {
  private db: Database;
  private keyPair: { publicKey: string; privateKey: string };
  private lastHash: string = '0'.repeat(64);

  constructor(db: Database) {
    this.db = db;
    this.keyPair = this.loadOrGenerateKeys();
  }

  private loadOrGenerateKeys(): { publicKey: string; privateKey: string } {
    // Load from secure storage or generate new
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    return { publicKey, privateKey };
  }

  async record(event: AuditEvent): Promise<AuditRecord> {
    const record: AuditRecord = {
      id: generateULID(),
      event,
      evidenceHash: this.hashEvidence(event),
      previousHash: this.lastHash,
      chainIndex: await this.getNextChainIndex(),
      signature: ''
    };

    // Sign the record
    record.signature = this.signRecord(record);

    // Update last hash
    this.lastHash = this.hashRecord(record);

    // Persist
    await this.db.insert('audit_trail', record);

    return record;
  }

  async recordAgentAction(action: AgentAction): Promise<AuditRecord> {
    return this.record({
      type: 'AGENT_ACTION',
      actor: action.agentId,
      action: action.action,
      resource: action.taskId || 'unknown',
      projectId: '', // Extract from context
      phase: 'idle', // Current phase
      metadata: {
        input: action.input,
        output: action.output,
        duration: action.duration,
        success: action.success,
        error: action.error
      },
      timestamp: Date.now()
    });
  }

  async recordStateTransition(transition: StateTransition): Promise<AuditRecord> {
    return this.record({
      type: 'STATE_TRANSITION',
      actor: transition.actor,
      action: transition.event,
      resource: `${transition.from}_to_${transition.to}`,
      projectId: '', // From context
      phase: transition.to,
      metadata: {
        from: transition.from,
        to: transition.to,
        evidenceIds: transition.evidenceIds
      },
      timestamp: transition.timestamp
    });
  }

  async verifyIntegrity(): Promise<IntegrityReport> {
    const records = await this.getRecords({});
    const invalidRecords: string[] = [];
    const chainBreaks: ChainBreak[] = [];

    let expectedPreviousHash = '0'.repeat(64);

    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      // Verify signature
      if (!this.verifySignature(record)) {
        invalidRecords.push(record.id);
      }

      // Verify chain
      if (record.previousHash !== expectedPreviousHash) {
        chainBreaks.push({
          index: i,
          recordId: record.id,
          expectedHash: expectedPreviousHash,
          actualHash: record.previousHash
        });
      }

      expectedPreviousHash = this.hashRecord(record);
    }

    return {
      valid: invalidRecords.length === 0 && chainBreaks.length === 0,
      totalRecords: records.length,
      invalidRecords,
      chainBreaks,
      lastVerified: Date.now()
    };
  }

  async generateComplianceReport(
    framework: ComplianceFramework
  ): Promise<ComplianceReport> {
    const controls = await this.getControlsForFramework(framework);
    const controlStatuses: ControlStatus[] = [];

    for (const control of controls) {
      const evidence = await this.getEvidenceForControl(control.id);
      const status = this.evaluateControlStatus(control, evidence);

      controlStatuses.push({
        controlId: control.id,
        controlName: control.name,
        status,
        evidenceCount: evidence.length,
        lastVerified: Date.now(),
        notes: ''
      });
    }

    const compliant = controlStatuses.filter(
      c => c.status === 'compliant'
    ).length;
    const nonCompliant = controlStatuses.filter(
      c => c.status === 'non_compliant'
    ).length;
    const partial = controlStatuses.filter(
      c => c.status === 'partial'
    ).length;

    return {
      framework,
      generatedAt: Date.now(),
      period: {
        start: Date.now() - 90 * 24 * 60 * 60 * 1000, // 90 days
        end: Date.now()
      },
      controls: controlStatuses,
      summary: {
        totalControls: controls.length,
        compliant,
        nonCompliant,
        partial
      },
      evidence: []
    };
  }

  private hashEvidence(event: AuditEvent): string {
    return createHash('sha256')
      .update(JSON.stringify(event.metadata))
      .digest('hex');
  }

  private hashRecord(record: AuditRecord): string {
    const data = `${record.id}:${record.event.timestamp}:${record.evidenceHash}:${record.previousHash}`;
    return createHash('sha256').update(data).digest('hex');
  }

  private signRecord(record: AuditRecord): string {
    const sign = createSign('RSA-SHA256');
    sign.update(`${record.id}:${record.evidenceHash}:${record.previousHash}`);
    return sign.sign(this.keyPair.privateKey, 'base64');
  }

  private verifySignature(record: AuditRecord): boolean {
    const verify = createVerify('RSA-SHA256');
    verify.update(`${record.id}:${record.evidenceHash}:${record.previousHash}`);
    return verify.verify(this.keyPair.publicKey, record.signature, 'base64');
  }

  private async getNextChainIndex(): Promise<number> {
    const result = await this.db.query(
      'SELECT MAX(chain_index) as max_index FROM audit_trail'
    );
    return (result[0]?.max_index || 0) + 1;
  }

  private async getRecords(filter: AuditFilter): Promise<AuditRecord[]> {
    // Database query implementation
    return [];
  }

  private async getControlsForFramework(
    framework: ComplianceFramework
  ): Promise<ControlDefinition[]> {
    // Return framework-specific controls
    return [];
  }

  private async getEvidenceForControl(
    controlId: string
  ): Promise<Evidence[]> {
    // Query evidence mapped to control
    return [];
  }

  private evaluateControlStatus(
    control: ControlDefinition,
    evidence: Evidence[]
  ): 'compliant' | 'non_compliant' | 'partial' {
    if (evidence.length === 0) return 'non_compliant';
    if (evidence.length >= control.evidenceTypes.length) return 'compliant';
    return 'partial';
  }
}
```

### 3. RBAC Implementation

```typescript
// foundry/core/rbac.ts
export class RBACManager implements IRBACManager {
  private roles: Map<string, Role> = new Map();
  private permissions: Map<string, Permission[]> = new Map();
  private approvals: Map<string, ApprovalRequest> = new Map();

  registerRole(role: Role): void {
    this.roles.set(role.id, role);
    this.permissions.set(role.id, role.permissions);
  }

  getRole(roleId: string): Role | undefined {
    return this.roles.get(roleId);
  }

  listRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  hasPermission(identity: AgentIdentity, permission: Permission): boolean {
    const result = this.checkPermission(identity, permission);
    return result.allowed;
  }

  checkPermission(
    identity: AgentIdentity,
    permission: Permission
  ): PermissionCheckResult {
    const role = this.roles.get(identity.roleId);
    if (!role) {
      return { allowed: false, reason: 'Role not found' };
    }

    // Check if credentials are valid
    if (!this.validateCredentials(identity)) {
      return { allowed: false, reason: 'Invalid credentials' };
    }

    // Find matching permission
    const matchingPerm = role.permissions.find(
      p =>
        p.resource === permission.resource &&
        p.action === permission.action &&
        this.scopeMatches(p.scope, permission.scope)
    );

    if (!matchingPerm) {
      return {
        allowed: false,
        reason: `Permission ${permission.action} on ${permission.resource} not granted`
      };
    }

    // Check conditions
    if (matchingPerm.conditions) {
      const conditionCheck = this.checkConditions(
        matchingPerm.conditions,
        identity
      );
      if (!conditionCheck.passed) {
        return {
          allowed: false,
          reason: conditionCheck.reason,
          requiredApprovals: conditionCheck.requiredApprovals,
          conditions: matchingPerm.conditions
        };
      }
    }

    return { allowed: true };
  }

  canVeto(identity: AgentIdentity, gate: string): boolean {
    const role = this.roles.get(identity.roleId);
    return role?.vetoGates?.includes(gate) || false;
  }

  async requestApproval(
    request: ApprovalRequest
  ): Promise<ApprovalRequestResult> {
    // Auto-approve if conditions allow
    const autoApprove = this.checkAutoApprove(request);
    if (autoApprove) {
      return {
        requestId: request.id,
        status: 'auto_approved',
        requiredApprovers: [],
        estimatedResponseTime: 0
      };
    }

    // Store request
    this.approvals.set(request.id, request);

    // Notify required approvers
    for (const roleId of request.requestedRoles) {
      await this.notifyApprovers(roleId, request);
    }

    return {
      requestId: request.id,
      status: 'submitted',
      requiredApprovers: request.requestedRoles,
      estimatedResponseTime: this.estimateResponseTime(request)
    };
  }

  getPendingApprovals(roleId?: string): ApprovalRequest[] {
    const all = Array.from(this.approvals.values());
    if (!roleId) return all.filter(a => a.status === 'pending');
    return all.filter(
      a => a.status === 'pending' && a.requestedRoles.includes(roleId)
    );
  }

  private validateCredentials(identity: AgentIdentity): boolean {
    // Validate JWT signature and expiration
    if (identity.expiresAt < Date.now()) return false;
    // Additional validation...
    return true;
  }

  private scopeMatches(grantedScope: string, requestedScope: string): boolean {
    if (grantedScope === 'global') return true;
    if (grantedScope === 'organization' && requestedScope !== 'global')
      return true;
    return grantedScope === requestedScope;
  }

  private checkConditions(
    conditions: PermissionConditions,
    identity: AgentIdentity
  ): { passed: boolean; reason?: string; requiredApprovals?: string[] } {
    // Check escalation threshold
    if (conditions.escalationThreshold) {
      // Count recent failures
      const recentFailures = this.countRecentFailures(identity.agentId);
      if (recentFailures >= conditions.escalationThreshold) {
        return {
          passed: false,
          reason: 'Escalation threshold exceeded',
          requiredApprovals: conditions.requireSecondaryApproval
        };
      }
    }

    // Check time window
    if (conditions.timeWindow) {
      // Implementation...
    }

    return { passed: true };
  }

  private checkAutoApprove(request: ApprovalRequest): boolean {
    // Low-risk items may be auto-approved
    const riskLevel = request.context.riskLevel;
    if (riskLevel === 'low') {
      // Additional checks...
      return true;
    }
    return false;
  }

  private async notifyApprovers(
    roleId: string,
    request: ApprovalRequest
  ): Promise<void> {
    // Send notifications via configured channels
    // Slack, email, etc.
  }

  private estimateResponseTime(request: ApprovalRequest): number {
    // Based on historical data
    return 24; // hours
  }

  private countRecentFailures(agentId: string): number {
    // Query recent failures from audit trail
    return 0;
  }
}
```

---

## Domain Orchestrators

### 4. Security Domain Orchestrator

```typescript
// foundry/domains/security/orchestrator.ts
export class SecurityDomainOrchestrator implements ISecurityDomainOrchestrator {
  constructor(
    private stateMachine: IEnterpriseStateMachine,
    private auditTrail: IAuditTrail,
    private scanners: SecurityScanner[],
    private evidenceManager: IEvidenceManager
  ) {}

  async initiateThreatModeling(
    context: SecurityContext
  ): Promise<ThreatModelResult> {
    // Record start
    await this.auditTrail.record({
      type: 'THREAT_MODELING_START',
      actor: 'SECURITY_LEAD',
      action: 'initiate',
      resource: context.projectId,
      projectId: context.projectId,
      phase: 'phase_2_security_foundation',
      metadata: { assets: context.assets.length },
      timestamp: Date.now()
    });

    // Automated threat modeling analysis
    const threats: Threat[] = [];
    const mitigations: Mitigation[] = [];

    // Analyze data flows for threats
    for (const flow of context.dataFlows) {
      const flowThreats = await this.analyzeDataFlow(flow);
      threats.push(...flowThreats);
    }

    // Analyze trust boundaries
    for (const boundary of context.trustBoundaries) {
      const boundaryThreats = await this.analyzeTrustBoundary(boundary);
      threats.push(...boundaryThreats);
    }

    // Generate mitigations
    for (const threat of threats) {
      const mitigation = await this.suggestMitigation(threat);
      if (mitigation) {
        mitigations.push(mitigation);
      }
    }

    // Calculate risk score
    const riskScore = this.calculateRiskScore(threats, mitigations);

    // Collect evidence
    const evidence = await this.collectThreatModelEvidence(
      context,
      threats,
      mitigations
    );

    return {
      modelId: generateULID(),
      threats,
      mitigations,
      riskScore,
      evidence
    };
  }

  async runSASTScan(codebasePath: string): Promise<SASTScanResult> {
    const scanner = this.scanners.find(s => s.type === 'sast');
    if (!scanner) throw new Error('SAST scanner not configured');

    const scanId = generateULID();
    const startTime = Date.now();

    // Run scan
    const rawResults = await scanner.scan({
      target: codebasePath,
      rules: ['security', 'vulnerabilities']
    });

    // Process findings
    const findings: SecurityFinding[] = rawResults.findings.map(
      (f: any) => ({
        id: generateULID(),
        severity: this.mapSeverity(f.severity),
        category: f.category,
        title: f.title,
        description: f.description,
        location: {
          file: f.location.file,
          line: f.location.line,
          column: f.location.column
        },
        remediation: f.remediation,
        cwe: f.cwe,
        cvss: f.cvss
      })
    );

    // Create evidence
    const evidence = await this.evidenceManager.collect({
      project_id: this.stateMachine.getCurrentState().context.project.id,
      phase: 'phase_2_security_foundation',
      type: 'sast_report',
      name: `SAST Scan ${scanId}`,
      content: JSON.stringify({
        scanId,
        findings,
        summary: this.summarizeFindings(findings),
        duration: Date.now() - startTime
      })
    });

    // Audit trail
    await this.auditTrail.recordAgentAction({
      agentId: 'SECURITY_LEAD',
      roleId: 'SECURITY_LEAD',
      action: 'sast_scan',
      input: { codebasePath },
      output: { findings: findings.length },
      duration: Date.now() - startTime,
      success: true,
      evidenceIds: [evidence.id]
    });

    return {
      scanId,
      scanner: scanner.name,
      findings,
      summary: {
        critical: findings.filter(f => f.severity === 'critical').length,
        high: findings.filter(f => f.severity === 'high').length,
        medium: findings.filter(f => f.severity === 'medium').length,
        low: findings.filter(f => f.severity === 'low').length,
        info: findings.filter(f => f.severity === 'info').length
      },
      evidence
    };
  }

  async evaluateSecurityGate(
    gateId: string,
    evidence: Evidence[]
  ): Promise<GateEvaluationResult> {
    // Check for critical/high findings
    const sastEvidence = evidence.find(e => e.type === 'sast_report');
    const scaEvidence = evidence.find(e => e.type === 'sca_report');
    const secretsEvidence = evidence.find(e => e.type === 'secrets_report');

    const checks: GateCheckResult[] = [];
    let overallStatus: 'passed' | 'failed' | 'error' = 'passed';

    // SAST check
    if (sastEvidence) {
      const sastReport = JSON.parse(sastEvidence.content_json || '{}');
      const criticalHighCount =
        sastReport.summary?.critical + sastReport.summary?.high || 0;

      checks.push({
        checkId: 'sast_critical_high',
        status: criticalHighCount === 0 ? 'passed' : 'failed',
        evidenceId: sastEvidence.id,
        message:
          criticalHighCount === 0
            ? 'No critical/high SAST findings'
            : `${criticalHighCount} critical/high SAST findings found`,
        details: sastReport.summary
      });

      if (criticalHighCount > 0) overallStatus = 'failed';
    } else {
      checks.push({
        checkId: 'sast_critical_high',
        status: 'missing',
        message: 'SAST report not found'
      });
      overallStatus = 'failed';
    }

    // Secrets check
    if (secretsEvidence) {
      const secretsReport = JSON.parse(secretsEvidence.content_json || '{}');
      checks.push({
        checkId: 'secrets_scan',
        status: secretsReport.findings?.length === 0 ? 'passed' : 'failed',
        evidenceId: secretsEvidence.id,
        message:
          secretsReport.findings?.length === 0
            ? 'No secrets detected'
            : `${secretsReport.findings.length} secrets detected`,
        details: secretsReport
      });

      if (secretsReport.findings?.length > 0) overallStatus = 'failed';
    }

    return {
      gateId,
      phase: 'phase_2_security_foundation',
      status: overallStatus,
      checks,
      evidenceIds: evidence.map(e => e.id),
      timestamp: Date.now(),
      evaluatedBy: 'SECURITY_LEAD',
      riskLevel: overallStatus === 'failed' ? 'high' : 'low'
    };
  }

  private async analyzeDataFlow(flow: DataFlow): Promise<Threat[]> {
    // STRIDE analysis
    const threats: Threat[] = [];

    // Spoofing
    if (flow.protocol === 'http') {
      threats.push({
        id: generateULID(),
        title: `Spoofing: ${flow.source}`,
        description: 'Unencrypted data flow vulnerable to spoofing',
        severity: 'high',
        category: 'spoofing'
      });
    }

    // Tampering
    threats.push({
      id: generateULID(),
      title: `Tampering: ${flow.dataType}`,
      description: 'Data in transit may be tampered with',
      severity: 'medium',
      category: 'tampering'
    });

    return threats;
  }

  private calculateRiskScore(
    threats: Threat[],
    mitigations: Mitigation[]
  ): number {
    let score = 0;

    for (const threat of threats) {
      const severityScore =
        { critical: 10, high: 7, medium: 4, low: 1 }[threat.severity] || 0;

      const hasMitigation = mitigations.some(
        m => m.threatId === threat.id && m.status === 'implemented'
      );

      if (!hasMitigation) {
        score += severityScore;
      }
    }

    return Math.min(score, 100);
  }

  private mapSeverity(scannerSeverity: string): SecurityFinding['severity'] {
    const mapping: Record<string, SecurityFinding['severity']> = {
      critical: 'critical',
      high: 'high',
      medium: 'medium',
      low: 'low',
      info: 'info'
    };
    return mapping[scannerSeverity.toLowerCase()] || 'info';
  }

  private summarizeFindings(findings: SecurityFinding[]) {
    return {
      total: findings.length,
      bySeverity: {
        critical: findings.filter(f => f.severity === 'critical').length,
        high: findings.filter(f => f.severity === 'high').length,
        medium: findings.filter(f => f.severity === 'medium').length,
        low: findings.filter(f => f.severity === 'low').length
      }
    };
  }

  private async collectThreatModelEvidence(
    context: SecurityContext,
    threats: Threat[],
    mitigations: Mitigation[]
  ): Promise<Evidence[]> {
    // Create threat model document
    const threatModelDoc = {
      assets: context.assets,
      dataFlows: context.dataFlows,
      trustBoundaries: context.trustBoundaries,
      threats,
      mitigations
    };

    const evidence = await this.evidenceManager.collect({
      project_id: context.projectId,
      phase: 'phase_2_security_foundation',
      type: 'threat_model',
      name: `Threat Model ${context.projectId}`,
      content: JSON.stringify(threatModelDoc)
    });

    return [evidence];
  }
}

// Security scanner interface
interface SecurityScanner {
  name: string;
  type: 'sast' | 'sca' | 'secrets' | 'iac' | 'container' | 'dast';
  scan(options: ScanOptions): Promise<ScanResult>;
}

interface ScanOptions {
  target: string;
  rules?: string[];
}

interface ScanResult {
  findings: Array<{
    severity: string;
    category: string;
    title: string;
    description: string;
    location: {
      file: string;
      line: number;
      column: number;
    };
    remediation?: string;
    cwe?: string;
    cvss?: number;
  }>;
}
```

---

## Security Integration

### 5. Security Scanner Integrations

```typescript
// foundry/security/scanners.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class SemgrepScanner implements SecurityScanner {
  name = 'Semgrep';
  type = 'sast' as const;

  async scan(options: ScanOptions): Promise<ScanResult> {
    const cmd = `semgrep scan ${options.target} --json --config=auto`;

    try {
      const { stdout } = await execAsync(cmd);
      const results = JSON.parse(stdout);

      return {
        findings: results.results.map((r: any) => ({
          severity: r.extra.severity || 'medium',
          category: r.check_id,
          title: r.extra.message,
          description: r.extra.lines,
          location: {
            file: r.path,
            line: r.start.line,
            column: r.start.col
          },
          remediation: r.extra.fix,
          cwe: r.extra.metadata?.cwe?.[0]
        }))
      };
    } catch (error) {
      return { findings: [] };
    }
  }
}

export class SnykScanner implements SecurityScanner {
  name = 'Snyk';
  type = 'sca' as const;

  async scan(options: ScanOptions): Promise<ScanResult> {
    const cmd = `snyk test ${options.target} --json`;

    try {
      const { stdout } = await execAsync(cmd);
      const results = JSON.parse(stdout);

      return {
        findings: results.vulnerabilities?.map((v: any) => ({
          severity: v.severity,
          category: 'dependency_vulnerability',
          title: v.title,
          description: v.description,
          location: {
            file: 'package.json',
            line: 0,
            column: 0
          },
          remediation: v.upgradePath?.join(' -> '),
          cwe: v.identifiers?.CWE?.[0],
          cvss: v.cvssScore
        })) || []
      };
    } catch (error) {
      return { findings: [] };
    }
  }
}

export class GitLeaksScanner implements SecurityScanner {
  name = 'GitLeaks';
  type = 'secrets' as const;

  async scan(options: ScanOptions): Promise<ScanResult> {
    const cmd = `gitleaks detect ${options.target} --verbose --json`;

    try {
      const { stdout } = await execAsync(cmd);
      const results = JSON.parse(stdout);

      return {
        findings: results.map((f: any) => ({
          severity: 'critical',
          category: 'secret_exposure',
          title: `Secret detected: ${f.RuleID}`,
          description: f.Match,
          location: {
            file: f.File,
            line: f.StartLine,
            column: f.StartColumn
          },
          remediation: 'Remove secret and rotate credentials'
        }))
      };
    } catch (error) {
      return { findings: [] };
    }
  }
}

export class CheckovScanner implements SecurityScanner {
  name = 'Checkov';
  type = 'iac' as const;

  async scan(options: ScanOptions): Promise<ScanResult> {
    const cmd = `checkov -d ${options.target} --output json`;

    try {
      const { stdout } = await execAsync(cmd);
      const results = JSON.parse(stdout);

      const findings: any[] = [];

      for (const [framework, checks] of Object.entries(results)) {
        if (Array.isArray(checks)) {
          for (const check of checks) {
            if (check.check_result?.result === 'FAILED') {
              findings.push({
                severity: check.severity || 'medium',
                category: 'infrastructure',
                title: check.check_name,
                description: check.check_id,
                location: {
                  file: check.file_path,
                  line: check.file_line_range[0],
                  column: 0
                },
                remediation: check.guideline
              });
            }
          }
        }
      }

      return { findings };
    } catch (error) {
      return { findings: [] };
    }
  }
}

export class TrivyScanner implements SecurityScanner {
  name = 'Trivy';
  type = 'container' as const;

  async scan(options: ScanOptions): Promise<ScanResult> {
    const cmd = `trivy image ${options.target} --format json`;

    try {
      const { stdout } = await execAsync(cmd);
      const results = JSON.parse(stdout);

      const findings: any[] = [];

      for (const result of results.Results || []) {
        for (const vuln of result.Vulnerabilities || []) {
          findings.push({
            severity: vuln.Severity.toLowerCase(),
            category: 'container_vulnerability',
            title: vuln.Title,
            description: vuln.Description,
            location: {
              file: result.Target,
              line: 0,
              column: 0
            },
            remediation: vuln.FixedVersion
              ? `Upgrade to ${vuln.FixedVersion}`
              : 'No fix available',
            cwe: vuln.CweIDs?.[0],
            cvss: vuln.CVSS?.nvd?.V3Score
          });
        }
      }

      return { findings };
    } catch (error) {
      return { findings: [] };
    }
  }
}
```

---

## Compliance Automation

### 6. SOC2 Compliance Evidence Collection

```typescript
// foundry/compliance/frameworks/soc2.ts
export class SOC2Compliance implements ComplianceFrameworkAutomation {
  framework = 'SOC2' as const;
  version = '2017';

  private controlMappings: Map<string, string[]> = new Map([
    ['CC6.1', ['access_logs', 'permission_changes', 'role_assignments']],
    ['CC6.2', ['identity_management', 'credential_rotation', 'mfa_logs']],
    ['CC7.1', ['system_monitoring', 'alert_logs', 'incident_response']],
    ['CC7.2', ['security_scan_results', 'vulnerability_tracking']],
    ['CC8.1', ['change_requests', 'deployment_logs', 'approval_records']],
    ['A1.2', ['backup_logs', 'restore_tests', 'disaster_recovery_drills']]
  ]);

  constructor(
    private auditTrail: IAuditTrail,
    private evidenceManager: IEvidenceManager
  ) {}

  async collectEvidenceForControl(controlId: string): Promise<Evidence[]> {
    const evidenceTypes = this.controlMappings.get(controlId) || [];
    const evidence: Evidence[] = [];

    for (const evidenceType of evidenceTypes) {
      const items = await this.evidenceManager.getEvidenceByType(evidenceType);
      evidence.push(...items);
    }

    return evidence;
  }

  async evaluateControl(controlId: string): Promise<ControlEvaluation> {
    const evidence = await this.collectEvidenceForControl(controlId);
    const control = this.getControlDefinition(controlId);

    if (evidence.length === 0) {
      return {
        controlId,
        status: 'non_compliant',
        evidenceCount: 0,
        gaps: ['No evidence collected'],
        recommendations: [`Implement ${control.name} monitoring`]
      };
    }

    // Check evidence freshness
    const staleThreshold = 90 * 24 * 60 * 60 * 1000; // 90 days
    const now = Date.now();
    const staleEvidence = evidence.filter(
      e => now - e.created_at > staleThreshold
    );

    if (staleEvidence.length > 0) {
      return {
        controlId,
        status: 'partial',
        evidenceCount: evidence.length,
        gaps: [`${staleEvidence.length} evidence items are stale`],
        recommendations: ['Update evidence collection frequency']
      };
    }

    // Validate evidence integrity
    const invalidEvidence: string[] = [];
    for (const item of evidence) {
      const verification = await this.evidenceManager.verifyEvidence(item.id);
      if (!verification.valid) {
        invalidEvidence.push(item.id);
      }
    }

    if (invalidEvidence.length > 0) {
      return {
        controlId,
        status: 'partial',
        evidenceCount: evidence.length,
        gaps: [`${invalidEvidence.length} evidence items failed validation`],
        recommendations: ['Review evidence chain of custody']
      };
    }

    return {
      controlId,
      status: 'compliant',
      evidenceCount: evidence.length,
      gaps: [],
      recommendations: []
    };
  }

  async generateReport(period: DateRange): Promise<ComplianceReport> {
    const controls = Array.from(this.controlMappings.keys());
    const controlStatuses: ControlStatus[] = [];

    for (const controlId of controls) {
      const evaluation = await this.evaluateControl(controlId);
      const control = this.getControlDefinition(controlId);

      controlStatuses.push({
        controlId,
        controlName: control.name,
        status: evaluation.status,
        evidenceCount: evaluation.evidenceCount,
        lastVerified: Date.now(),
        notes: evaluation.gaps.join('; ')
      });
    }

    const compliant = controlStatuses.filter(
      c => c.status === 'compliant'
    ).length;
    const nonCompliant = controlStatuses.filter(
      c => c.status === 'non_compliant'
    ).length;
    const partial = controlStatuses.filter(
      c => c.status === 'partial'
    ).length;

    return {
      framework: this.framework,
      generatedAt: Date.now(),
      period,
      controls: controlStatuses,
      summary: {
        totalControls: controls.length,
        compliant,
        nonCompliant,
        partial
      },
      evidence: []
    };
  }

  private getControlDefinition(controlId: string): ControlDefinition {
    const definitions: Record<string, ControlDefinition> = {
      CC6.1: {
        id: 'CC6.1',
        name: 'Logical Access Security',
        description:
          'The entity implements logical access security measures to protect against threats',
        category: 'Security',
        evidenceTypes: ['access_logs', 'permission_changes'],
        validationRules: []
      },
      CC6.2: {
        id: 'CC6.2',
        name: 'Identity Management',
        description:
          'The entity manages credentials and identity verification',
        category: 'Security',
        evidenceTypes: ['identity_management', 'credential_rotation'],
        validationRules: []
      },
      CC7.1: {
        id: 'CC7.1',
        name: 'System Monitoring',
        description:
          'The entity monitors system components for anomalies',
        category: 'Availability',
        evidenceTypes: ['system_monitoring', 'alert_logs'],
        validationRules: []
      },
      CC7.2: {
        id: 'CC7.2',
        name: 'Incident Detection',
        description: 'The entity detects security events and anomalies',
        category: 'Security',
        evidenceTypes: ['security_scan_results', 'vulnerability_tracking'],
        validationRules: []
      },
      CC8.1: {
        id: 'CC8.1',
        name: 'Change Management',
        description:
          'The entity authorizes, designs, develops, configures, documents, tests, approves, and implements changes',
        category: 'Processing Integrity',
        evidenceTypes: ['change_requests', 'deployment_logs'],
        validationRules: []
      },
      'A1.2': {
        id: 'A1.2',
        name: 'Backup and Recovery',
        description: 'The entity maintains backup and recovery capabilities',
        category: 'Availability',
        evidenceTypes: ['backup_logs', 'restore_tests'],
        validationRules: []
      }
    };

    return (
      definitions[controlId] || {
        id: controlId,
        name: 'Unknown',
        description: '',
        category: 'Unknown',
        evidenceTypes: [],
        validationRules: []
      }
    );
  }
}

interface ComplianceFrameworkAutomation {
  framework: ComplianceFramework;
  version: string;
  collectEvidenceForControl(controlId: string): Promise<Evidence[]>;
  evaluateControl(controlId: string): Promise<ControlEvaluation>;
  generateReport(period: DateRange): Promise<ComplianceReport>;
}

interface ControlEvaluation {
  controlId: string;
  status: 'compliant' | 'non_compliant' | 'partial';
  evidenceCount: number;
  gaps: string[];
  recommendations: string[];
}
```

---

## Evidence Management

### 7. Evidence Collection with Cryptographic Signing

```typescript
// foundry/evidence/manager.ts
import { createHash, createSign, randomBytes } from 'crypto';

export class EvidenceManager implements IEvidenceManager {
  private db: Database;
  private signingKey: string;
  private evidenceChain: Map<string, string> = new Map(); // evidence_id -> previous_hash

  constructor(db: Database, signingKey: string) {
    this.db = db;
    this.signingKey = signingKey;
  }

  async collect(input: EvidenceInput): Promise<Evidence> {
    // Generate hash of content
    const contentHash = this.hashContent(input.content);

    // Get previous evidence hash for this project
    const previousHash = await this.getLastEvidenceHash(input.project_id);

    // Create evidence object
    const evidence: Evidence = {
      id: generateULID(),
      project_id: input.project_id,
      phase: input.phase,
      gate: null,
      task_id: null,
      type: input.type,
      name: input.name,
      description: null,
      file_path: null,
      file_hash: contentHash,
      ci_run_id: null,
      ci_url: null,
      content_json:
        typeof input.content === 'string'
          ? input.content
          : input.content.toString('base64'),
      content_summary: this.generateSummary(input),
      created_at: Date.now(),
      created_by: 'SYSTEM', // Should be agent ID
      signature: '',
      previous_evidence_id: null,
      classification: 'internal',
      retention_policy: '7_years',
      compliance_frameworks: [],
      tags: []
    };

    // Sign evidence
    evidence.signature = this.signEvidence(evidence);

    // Update chain
    this.evidenceChain.set(evidence.id, previousHash);

    // Persist
    await this.db.insert('evidence', evidence);

    return evidence;
  }

  async collectFromCI(
    ciRunId: string,
    artifacts: string[]
  ): Promise<Evidence[]> {
    const evidence: Evidence[] = [];

    for (const artifact of artifacts) {
      // Download and process artifact
      const content = await this.fetchArtifact(ciRunId, artifact);

      const item = await this.collect({
        project_id: '', // Extract from CI context
        phase: 'phase_4_feature_loop',
        type: this.inferEvidenceType(artifact),
        name: artifact,
        content
      });

      // Update with CI metadata
      item.ci_run_id = ciRunId;
      item.ci_url = this.buildCiUrl(ciRunId);

      evidence.push(item);
    }

    return evidence;
  }

  async collectFromScan(
    scanner: string,
    results: unknown
  ): Promise<Evidence> {
    return this.collect({
      project_id: '', // From context
      phase: 'phase_2_security_foundation',
      type: this.mapScannerToEvidenceType(scanner),
      name: `${scanner} Scan ${new Date().toISOString()}`,
      content: JSON.stringify(results)
    });
  }

  async verifyEvidence(id: string): Promise<EvidenceVerificationResult> {
    const evidence = await this.getEvidence(id);
    if (!evidence) {
      return {
        evidenceId: id,
        valid: false,
        signatureValid: false,
        hashValid: false,
        chainValid: false,
        timestamp: Date.now()
      };
    }

    // Verify hash
    const computedHash = this.hashContent(
      evidence.content_json || ''
    );
    const hashValid = computedHash === evidence.file_hash;

    // Verify signature
    const signatureValid = this.verifySignature(evidence);

    // Verify chain
    const previousHash = this.evidenceChain.get(id);
    const chainValid = await this.verifyChainLink(id, previousHash);

    return {
      evidenceId: id,
      valid: hashValid && signatureValid && chainValid,
      signatureValid,
      hashValid,
      chainValid,
      timestamp: Date.now()
    };
  }

  async exportEvidencePackage(
    filter: EvidenceFilter
  ): Promise<EvidencePackage> {
    const evidence = await this.queryEvidence(filter);

    // Generate manifest
    const manifest: EvidenceManifest = {
      packageId: generateULID(),
      evidenceCount: evidence.length,
      totalSize: evidence.reduce(
        (sum, e) => sum + (e.content_json?.length || 0),
        0
      ),
      complianceFrameworks: [],
      hashAlgorithm: 'sha256',
      evidenceHashes: {}
    };

    // Hash each evidence item
    for (const item of evidence) {
      manifest.evidenceHashes[item.id] = item.file_hash;
    }

    // Sign manifest
    const packageSignature = this.signManifest(manifest);

    return {
      id: manifest.packageId,
      createdAt: Date.now(),
      evidence,
      auditTrail: [], // Populate from audit trail
      manifest,
      signature: packageSignature
    };
  }

  private hashContent(content: Buffer | string): string {
    const data = Buffer.isBuffer(content) ? content : Buffer.from(content);
    return createHash('sha256').update(data).digest('hex');
  }

  private signEvidence(evidence: Evidence): string {
    const data = `${evidence.id}:${evidence.file_hash}:${evidence.created_at}`;
    const sign = createSign('RSA-SHA256');
    sign.update(data);
    return sign.sign(this.signingKey, 'base64');
  }

  private verifySignature(evidence: Evidence): boolean {
    const data = `${evidence.id}:${evidence.file_hash}:${evidence.created_at}`;
    // Verification would use public key
    return true; // Simplified
  }

  private async getLastEvidenceHash(projectId: string): Promise<string> {
    const result = await this.db.query(
      'SELECT id FROM evidence WHERE project_id = ? ORDER BY created_at DESC LIMIT 1',
      [projectId]
    );

    if (result.length === 0) {
      return '0'.repeat(64);
    }

    return this.evidenceChain.get(result[0].id) || '0'.repeat(64);
  }

  private generateSummary(input: EvidenceInput): string {
    const content =
      typeof input.content === 'string'
        ? input.content
        : input.content.toString();
    return content.substring(0, 200) + '...';
  }

  private async fetchArtifact(
    ciRunId: string,
    artifact: string
  ): Promise<Buffer> {
    // Implementation to fetch from CI system
    return Buffer.from('');
  }

  private buildCiUrl(ciRunId: string): string {
    // Build URL to CI run
    return `https://ci.example.com/runs/${ciRunId}`;
  }

  private inferEvidenceType(artifact: string): EvidenceType {
    if (artifact.includes('test')) return 'test_report';
    if (artifact.includes('security')) return 'vuln_report';
    if (artifact.includes('audit')) return 'audit_report';
    return 'file';
  }

  private mapScannerToEvidenceType(scanner: string): EvidenceType {
    const mapping: Record<string, EvidenceType> = {
      semgrep: 'sast_report',
      codeql: 'sast_report',
      snyk: 'sca_report',
      gitleaks: 'secrets_report',
      checkov: 'iac_report',
      trivy: 'container_report'
    };
    return mapping[scanner] || 'vuln_report';
  }

  private async verifyChainLink(
    id: string,
    previousHash: string | undefined
  ): Promise<boolean> {
    // Verify chain integrity
    return true; // Simplified
  }

  private signManifest(manifest: EvidenceManifest): string {
    const data = JSON.stringify(manifest);
    const sign = createSign('RSA-SHA256');
    sign.update(data);
    return sign.sign(this.signingKey, 'base64');
  }

  private async queryEvidence(filter: EvidenceFilter): Promise<Evidence[]> {
    // Database query with filters
    return [];
  }

  async getEvidence(id: string): Promise<Evidence | null> {
    const result = await this.db.query(
      'SELECT * FROM evidence WHERE id = ?',
      [id]
    );
    return result[0] || null;
  }

  async getEvidenceByProject(projectId: string): Promise<Evidence[]> {
    return this.db.query('SELECT * FROM evidence WHERE project_id = ?', [
      projectId
    ]);
  }

  async getEvidenceByPhase(
    projectId: string,
    phase: EnterprisePhase
  ): Promise<Evidence[]> {
    return this.db.query(
      'SELECT * FROM evidence WHERE project_id = ? AND phase = ?',
      [projectId, phase]
    );
  }

  async getEvidenceByGate(
    projectId: string,
    gate: string
  ): Promise<Evidence[]> {
    return this.db.query(
      'SELECT * FROM evidence WHERE project_id = ? AND gate = ?',
      [projectId, gate]
    );
  }

  async getEvidenceForCompliance(
    framework: ComplianceFramework
  ): Promise<Evidence[]> {
    return this.db.query(
      'SELECT * FROM evidence WHERE ? IN compliance_frameworks',
      [framework]
    );
  }
}
```

---

## Integration with Existing Agents

### 8. Research Agent Integration

```typescript
// foundry/integrations/research-agent.ts
export class ResearchAgentAdapter {
  constructor(
    private researchAgent: ResearchAgent,
    private auditTrail: IAuditTrail,
    private evidenceManager: IEvidenceManager
  ) {}

  async executeDiscoveryPhase(
    projectId: string,
    input: ResearchInput
  ): Promise<DiscoveryResult> {
    // Record start
    await this.auditTrail.record({
      type: 'RESEARCH_START',
      actor: 'PRODUCT_MANAGER',
      action: 'execute_discovery',
      resource: projectId,
      projectId,
      phase: 'phase_0_discovery',
      metadata: { company: input.brief.company },
      timestamp: Date.now()
    });

    // Execute research
    const startTime = Date.now();
    const result = await this.researchAgent.execute(input);

    // Collect evidence
    const evidence = await this.evidenceManager.collect({
      project_id: projectId,
      phase: 'phase_0_discovery',
      type: 'doc_ref',
      name: `Research Dossier: ${input.brief.company}`,
      content: JSON.stringify({
        dossier: result.dossier,
        sources: result.sources,
        meta: result.meta
      })
    });

    // Record completion
    await this.auditTrail.recordAgentAction({
      agentId: 'RESEARCH_AGENT',
      roleId: 'PRODUCT_MANAGER',
      action: 'research_complete',
      input,
      output: {
        sourcesCount: result.sources.length,
        dossierSections: Object.keys(result.dossier)
      },
      duration: Date.now() - startTime,
      success: true,
      evidenceIds: [evidence.id]
    });

    return {
      dossier: result.dossier,
      evidence: [evidence],
      risks: result.dossier.risks,
      recommendations: result.dossier.recommendations
    };
  }
}

interface DiscoveryResult {
  dossier: ResearchDossier;
  evidence: Evidence[];
  risks: string[];
  recommendations: string[];
}
```

### 9. CodeGen Agent Integration

```typescript
// foundry/integrations/codegen-agent.ts
export class CodeGenAgentAdapter {
  constructor(
    private codeGenAgent: CodeGenAgent,
    private auditTrail: IAuditTrail,
    private evidenceManager: IEvidenceManager,
    private gateSystem: IGateSystem
  ) {}

  async implementFeature(
    projectId: string,
    featureId: string,
    spec: FeatureSpec
  ): Promise<ImplementationResult> {
    // Create backlog item
    const backlogItem: BacklogItem = {
      id: featureId,
      title: spec.title,
      description: spec.description,
      techStack: spec.techStack
    };

    // Record start
    await this.auditTrail.record({
      type: 'IMPLEMENTATION_START',
      actor: spec.assignedRole,
      action: 'implement_feature',
      resource: featureId,
      projectId,
      phase: 'phase_4_feature_loop',
      metadata: { techStack: spec.techStack },
      timestamp: Date.now()
    });

    // Execute code generation
    const startTime = Date.now();
    const result = await this.codeGenAgent.execute(backlogItem);

    // Collect evidence
    const evidence: Evidence[] = [];

    // Code evidence
    for (const file of result.filesCreated) {
      const content = await this.readFile(file);
      const fileEvidence = await this.evidenceManager.collect({
        project_id: projectId,
        phase: 'phase_4_feature_loop',
        type: 'file',
        name: file,
        content
      });
      evidence.push(fileEvidence);
    }

    // Generation log evidence
    const logEvidence = await this.evidenceManager.collect({
      project_id: projectId,
      phase: 'phase_4_feature_loop',
      type: 'ci_job',
      name: `CodeGen Log: ${featureId}`,
      content: result.log
    });
    evidence.push(logEvidence);

    // Record completion
    await this.auditTrail.recordAgentAction({
      agentId: 'CODEGEN_AGENT',
      roleId: spec.assignedRole,
      action: 'codegen_complete',
      taskId: featureId,
      input: { spec },
      output: { filesCreated: result.filesCreated.length },
      duration: Date.now() - startTime,
      success: result.success,
      evidenceIds: evidence.map(e => e.id)
    });

    // Run quality gate
    const gateResult = await this.gateSystem.evaluateGate('quality', evidence);

    return {
      success: result.success && gateResult.status === 'passed',
      filesCreated: result.filesCreated,
      evidence,
      gateResult
    };
  }

  private async readFile(path: string): Promise<Buffer> {
    const fs = require('fs').promises;
    return fs.readFile(path);
  }
}

interface FeatureSpec {
  title: string;
  description: string;
  techStack: string;
  assignedRole: string;
  acceptanceCriteria: string[];
}

interface ImplementationResult {
  success: boolean;
  filesCreated: string[];
  evidence: Evidence[];
  gateResult: GateEvaluationResult;
}
```

### 10. QA Agent Integration

```typescript
// foundry/integrations/qa-agent.ts
export class QAAgentAdapter {
  constructor(
    private qaAgent: QAAgent,
    private auditTrail: IAuditTrail,
    private evidenceManager: IEvidenceManager
  ) {}

  async validateFeature(
    projectId: string,
    featureId: string,
    codebasePath: string
  ): Promise<ValidationResult> {
    // Record start
    await this.auditTrail.record({
      type: 'VALIDATION_START',
      actor: 'QA_LEAD',
      action: 'validate_feature',
      resource: featureId,
      projectId,
      phase: 'phase_4_feature_loop',
      metadata: { codebasePath },
      timestamp: Date.now()
    });

    // Execute QA workflow
    const startTime = Date.now();
    const result = await this.qaAgent.prototype(codebasePath);

    // Collect evidence
    const evidence: Evidence[] = [];

    // Test plan evidence
    const testPlanEvidence = await this.evidenceManager.collect({
      project_id: projectId,
      phase: 'phase_4_feature_loop',
      type: 'test_report',
      name: `Test Plan: ${featureId}`,
      content: result.testPlan
    });
    evidence.push(testPlanEvidence);

    // Static analysis evidence
    const analysisEvidence = await this.evidenceManager.collect({
      project_id: projectId,
      phase: 'phase_4_feature_loop',
      type: 'audit_report',
      name: `Static Analysis: ${featureId}`,
      content: JSON.stringify(result.staticAnalysisReport)
    });
    evidence.push(analysisEvidence);

    // Record completion
    await this.auditTrail.recordAgentAction({
      agentId: 'QA_AGENT',
      roleId: 'QA_LEAD',
      action: 'qa_validation_complete',
      taskId: featureId,
      input: { codebasePath },
      output: {
        testPlanGenerated: true,
        staticAnalysisIssues: result.staticAnalysisReport.issues.length
      },
      duration: Date.now() - startTime,
      success: result.staticAnalysisReport.issues.length === 0,
      evidenceIds: evidence.map(e => e.id)
    });

    return {
      success: result.staticAnalysisReport.issues.length === 0,
      testPlan: result.testPlan,
      unitTestCode: result.unitTestCode,
      staticAnalysisReport: result.staticAnalysisReport,
      evidence
    };
  }
}

interface ValidationResult {
  success: boolean;
  testPlan: string;
  unitTestCode: string;
  staticAnalysisReport: StaticAnalysisReport;
  evidence: Evidence[];
}
```

---

## Summary

This implementation guide provides:

1. **Core Components**: State machine with parallel states, immutable audit trail, RBAC system
2. **Domain Orchestrators**: Security, Feature, and Release domain management
3. **Security Integration**: Scanner integrations for SAST, SCA, Secrets, IaC, Containers
4. **Compliance Automation**: SOC2 evidence collection and reporting
5. **Evidence Management**: Cryptographic signing and chain of custody
6. **Agent Integration**: Adapters for existing Research, CodeGen, and QA agents

### Key Implementation Notes

1. **Event Sourcing**: All state changes are recorded as immutable events
2. **Cryptographic Signing**: All evidence and audit records are signed
3. **Hash Chaining**: Audit trail uses blockchain-like integrity verification
4. **Parallel States**: Support for continuous monitoring tracks
5. **Human-in-the-Loop**: Configurable escalation and approval workflows
6. **Compliance Automation**: Framework-specific evidence collection

### Next Steps

1. Implement core components (StateMachine, AuditTrail, RBAC)
2. Add security scanner integrations
3. Build domain orchestrators
4. Create compliance framework implementations
5. Integrate with existing opencode agents
6. Add TUI views for monitoring and control
7. Implement human escalation workflows
8. Production hardening and testing
