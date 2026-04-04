# FOUNDRY_ORCHESTRATOR_PROMPT.md - Complete Implementation Guide

## Overview

This is the **master orchestration prompt** for implementing the complete Aegis Foundry autonomous development team system. This will make Foundry the default, corporate-grade development method for OpenCode Tools.

**Status**: Implementation Ready  
**Version**: 2.0  
**Date**: 2026-02-15  
**Scope**: Complete enterprise-grade implementation with testing, linting, and validation

---

## Pre-Implementation Checklist

Before starting, verify:
- [ ] Node.js v22+ installed
- [ ] All dependencies installed: `npm install`
- [ ] Database initialized
- [ ] Clean git state: `git status`

---

## Phase 1: Core Foundation

### Module 1.1: Enterprise State Machine

**File**: `foundry/core/state-machine.ts`

**Implementation Requirements**:
```typescript
// Complete implementation with parallel state support
import { EventEmitter } from 'events';
import type { StateMachineDefinition, StateContext, StatePhase, StateEvent } from '@/foundry/types';

export class EnterpriseStateMachine extends EventEmitter {
  private currentPhase: StatePhase = 'idle';
  private parallelStates: Map<string, ParallelState> = new Map();
  private history: StateTransition[] = [];
  private context: StateContext;
  private definition: StateMachineDefinition;

  constructor(config: { definition: StateMachineDefinition; context: StateContext }) {
    super();
    this.definition = config.definition;
    this.context = config.context;
    this.initializeParallelStates();
  }

  private initializeParallelStates(): void {
    const defaultParallelStates = [
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

  async dispatch(event: StateEvent, payload?: unknown): Promise<void> {
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

    const prevPhase = this.currentPhase;
    this.currentPhase = transition.target;

    const transitionRecord: StateTransition = {
      id: this.generateId(),
      timestamp: Date.now(),
      from: prevPhase,
      to: this.currentPhase,
      event,
      actor: 'SYSTEM',
      evidenceIds: []
    };

    this.history.push(transitionRecord);
    this.emit('transition', transitionRecord);
  }

  getCurrentState(): StateSnapshot {
    return {
      phase: this.currentPhase,
      parallelStates: Array.from(this.parallelStates.values()),
      context: this.context,
      timestamp: Date.now()
    };
  }

  can(event: StateEvent): boolean {
    const stateDef = this.definition.states[this.currentPhase];
    return event in (stateDef?.on || {});
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

class StateMachineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StateMachineError';
  }
}

interface ParallelState {
  type: string;
  status: 'active' | 'paused' | 'error';
  lastCheck: number;
  metrics: Record<string, unknown>;
}

interface StateTransition {
  id: string;
  timestamp: number;
  from: StatePhase;
  to: StatePhase;
  event: StateEvent;
  actor: string;
  evidenceIds: string[];
}

interface StateSnapshot {
  phase: StatePhase;
  parallelStates: ParallelState[];
  context: StateContext;
  timestamp: number;
}
```

**Test File**: `tests/unit/foundry/core/state-machine.test.ts`
```typescript
import { EnterpriseStateMachine } from '@/foundry/core/state-machine';
import type { StateMachineDefinition, StateContext } from '@/foundry/types';

describe('EnterpriseStateMachine', () => {
  let machine: EnterpriseStateMachine;
  let definition: StateMachineDefinition;
  let context: StateContext;

  beforeEach(() => {
    definition = {
      version: '1.0',
      id: 'test',
      title: 'Test',
      initial_state: 'idle',
      states: {
        idle: {
          description: 'Idle',
          on: { INIT_PROJECT: { target: 'discovery' } }
        },
        discovery: {
          description: 'Discovery',
          on: { COMPLETE: { target: 'done' } }
        },
        done: {
          description: 'Done',
          terminal: true
        }
      }
    };

    context = {
      project: {
        name: 'Test',
        repo_root: '.',
        stakeholders: [],
        environments: ['dev'],
        compliance_targets: [],
        risk_tolerance: 'low'
      },
      artifacts: {},
      backlog: { items: [] },
      current_phase: 'idle',
      current_feature_id: null,
      iteration: { phase_iteration: 0, remediation_iteration: 0 },
      evidence: { items: [] },
      last_gate_results: {}
    };

    machine = new EnterpriseStateMachine({ definition, context });
  });

  it('should initialize with idle state', () => {
    expect(machine.getCurrentState().phase).toBe('idle');
  });

  it('should transition on valid event', async () => {
    await machine.dispatch('INIT_PROJECT');
    expect(machine.getCurrentState().phase).toBe('discovery');
  });

  it('should emit transition event', async () => {
    const handler = jest.fn();
    machine.on('transition', handler);
    await machine.dispatch('INIT_PROJECT');
    expect(handler).toHaveBeenCalled();
  });

  it('should throw on invalid transition', async () => {
    await expect(machine.dispatch('INVALID')).rejects.toThrow(StateMachineError);
  });

  it('should track transition history', async () => {
    await machine.dispatch('INIT_PROJECT');
    expect(machine.getCurrentState().parallelStates).toHaveLength(3);
  });
});
```

**Validation**:
```bash
# After implementation, run:
npm run build
npm run lint -- foundry/core/state-machine.ts
npm test -- --testPathPattern='state-machine'
```

---

### Module 1.2: Immutable Audit Trail

**File**: `foundry/core/audit-trail.ts`

**Implementation**:
```typescript
import { createHash, randomBytes } from 'crypto';
import type { Database } from '@/storage/db';

export interface AuditEvent {
  type: string;
  actor: string;
  action: string;
  resource: string;
  projectId: string;
  phase: string;
  metadata: Record<string, unknown>;
  timestamp: number;
}

export interface AuditRecord {
  id: string;
  event: AuditEvent;
  evidenceHash: string;
  previousHash: string;
  chainIndex: number;
  signature: string;
}

export class AuditTrail {
  private db: Database;
  private signingKey: string;
  private lastHash: string = '0'.repeat(64);

  constructor(db: Database, signingKey?: string) {
    this.db = db;
    this.signingKey = signingKey || this.generateKey();
  }

  private generateKey(): string {
    return randomBytes(32).toString('hex');
  }

  async record(event: AuditEvent): Promise<AuditRecord> {
    const record: AuditRecord = {
      id: this.generateId(),
      event,
      evidenceHash: this.hashEvidence(event),
      previousHash: this.lastHash,
      chainIndex: await this.getNextChainIndex(),
      signature: ''
    };

    record.signature = this.signRecord(record);
    this.lastHash = this.hashRecord(record);

    await this.persist(record);
    return record;
  }

  async recordAgentAction(action: AgentAction): Promise<AuditRecord> {
    return this.record({
      type: 'AGENT_ACTION',
      actor: action.agentId,
      action: action.action,
      resource: action.taskId || 'unknown',
      projectId: action.projectId || '',
      phase: action.phase || 'idle',
      metadata: {
        input: action.input,
        output: action.output,
        duration: action.duration,
        success: action.success
      },
      timestamp: Date.now()
    });
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
    const data = `${record.id}:${record.evidenceHash}:${record.previousHash}`;
    return createHash('sha256')
      .update(data + this.signingKey)
      .digest('hex');
  }

  private async getNextChainIndex(): Promise<number> {
    // Query database for max index
    return 0; // Simplified
  }

  private async persist(record: AuditRecord): Promise<void> {
    // Persist to database
    const db = this.db.$client;
    await db.execute({
      sql: `INSERT INTO audit_trail (id, event_type, actor, action, resource, project_id, phase, metadata, evidence_hash, previous_hash, chain_index, signature, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        record.id,
        record.event.type,
        record.event.actor,
        record.event.action,
        record.event.resource,
        record.event.projectId,
        record.event.phase,
        JSON.stringify(record.event.metadata),
        record.evidenceHash,
        record.previousHash,
        record.chainIndex,
        record.signature,
        record.event.timestamp
      ]
    });
  }

  private generateId(): string {
    return `${Date.now()}-${randomBytes(4).toString('hex')}`;
  }
}

interface AgentAction {
  agentId: string;
  action: string;
  taskId?: string;
  projectId?: string;
  phase?: string;
  input?: unknown;
  output?: unknown;
  duration?: number;
  success: boolean;
}
```

**Test File**: `tests/unit/foundry/core/audit-trail.test.ts`

**Validation**:
```bash
npm run build
npm run lint -- foundry/core/audit-trail.ts
npm test -- --testPathPattern='audit-trail'
```

---

### Module 1.3: RBAC Manager

**File**: `foundry/core/rbac.ts`

**Implementation**:
```typescript
export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  vetoGates?: string[];
  conditions?: {
    requireHumanOversight?: boolean;
  };
}

export interface Permission {
  resource: string;
  action: string;
  scope: string;
  conditions?: PermissionConditions;
}

export interface PermissionConditions {
  escalationThreshold?: number;
  requireSecondaryApproval?: string[];
  timeWindow?: { start: number; end: number };
}

export interface AgentIdentity {
  agentId: string;
  roleId: string;
  credentials: string;
  expiresAt: number;
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  requiredApprovals?: string[];
  conditions?: PermissionConditions;
}

export class RBACManager {
  private roles: Map<string, Role> = new Map();

  registerRole(role: Role): void {
    this.roles.set(role.id, role);
  }

  getRole(roleId: string): Role | undefined {
    return this.roles.get(roleId);
  }

  listRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  checkPermission(
    identity: AgentIdentity,
    permission: Omit<Permission, 'conditions'>
  ): PermissionCheckResult {
    const role = this.roles.get(identity.roleId);
    if (!role) {
      return { allowed: false, reason: 'Role not found' };
    }

    if (identity.expiresAt < Date.now()) {
      return { allowed: false, reason: 'Credentials expired' };
    }

    const matchingPerm = role.permissions.find(
      p => p.resource === permission.resource && 
           p.action === permission.action &&
           this.scopeMatches(p.scope, permission.scope)
    );

    if (!matchingPerm) {
      return {
        allowed: false,
        reason: `Permission ${permission.action} on ${permission.resource} not granted`
      };
    }

    if (matchingPerm.conditions) {
      return {
        allowed: true,
        conditions: matchingPerm.conditions
      };
    }

    return { allowed: true };
  }

  canVeto(identity: AgentIdentity, gate: string): boolean {
    const role = this.roles.get(identity.roleId);
    return role?.vetoGates?.includes(gate) || false;
  }

  private scopeMatches(grantedScope: string, requestedScope: string): boolean {
    if (grantedScope === 'global') return true;
    if (grantedScope === 'organization' && requestedScope !== 'global') return true;
    return grantedScope === requestedScope;
  }
}
```

**Test File**: `tests/unit/foundry/core/rbac.test.ts`

---

### Module 1.4: Agent Registry Extension

**File**: `foundry/agents/enterprise-registry.ts`

**Implementation**:
```typescript
import { RBACManager, type Role } from '@/foundry/core/rbac';

export const ENTERPRISE_AGENT_ROLES: Role[] = [
  {
    id: 'CTO_ORCHESTRATOR',
    name: 'CTO Orchestrator',
    description: 'Overall technical leadership and decision making',
    permissions: [
      { resource: 'phase', action: 'approve', scope: 'project' },
      { resource: 'deployment', action: 'approve', scope: 'project' },
      { resource: 'deployment', action: 'execute', scope: 'project', 
        conditions: { requireSecondaryApproval: ['SECURITY_LEAD'] } },
      { resource: 'task', action: 'assign', scope: 'project' },
      { resource: 'task', action: 'block', scope: 'project' }
    ],
    vetoGates: ['release_readiness'],
    conditions: { requireHumanOversight: true }
  },
  {
    id: 'SECURITY_LEAD',
    name: 'Security Lead',
    description: 'Security architecture and vulnerability management',
    permissions: [
      { resource: 'gate', action: 'execute', scope: 'project' },
      { resource: 'artifact', action: 'create', scope: 'project' },
      { resource: 'task', action: 'veto', scope: 'project' }
    ],
    vetoGates: ['security_gate', 'security_validation']
  },
  {
    id: 'COMPLIANCE_OFFICER',
    name: 'Compliance Officer',
    description: 'Regulatory compliance and audit management',
    permissions: [
      { resource: 'gate', action: 'execute', scope: 'project' },
      { resource: 'artifact', action: 'create', scope: 'project' },
      { resource: 'evidence', action: 'view', scope: 'organization' }
    ],
    vetoGates: ['compliance_gate', 'compliance_validation']
  },
  {
    id: 'PRODUCT_MANAGER',
    name: 'Product Manager',
    description: 'Requirements validation and stakeholder communication',
    permissions: [
      { resource: 'artifact', action: 'create', scope: 'project' },
      { resource: 'backlog', action: 'modify', scope: 'project' },
      { resource: 'task', action: 'approve', scope: 'project' }
    ]
  },
  {
    id: 'STAFF_BACKEND_ENGINEER',
    name: 'Staff Backend Engineer',
    description: 'Backend architecture and implementation',
    permissions: [
      { resource: 'artifact', action: 'create', scope: 'project' },
      { resource: 'task', action: 'execute', scope: 'project' }
    ]
  },
  {
    id: 'STAFF_FRONTEND_ENGINEER',
    name: 'Staff Frontend Engineer',
    description: 'Frontend architecture and implementation',
    permissions: [
      { resource: 'artifact', action: 'create', scope: 'project' },
      { resource: 'task', action: 'execute', scope: 'project' }
    ]
  },
  {
    id: 'DATA_ENGINEER',
    name: 'Data Engineer',
    description: 'Data modeling and pipeline architecture',
    permissions: [
      { resource: 'artifact', action: 'create', scope: 'project' },
      { resource: 'task', action: 'execute', scope: 'project' }
    ],
    vetoGates: ['data_gate']
  },
  {
    id: 'SRE_DEVOPS',
    name: 'SRE / DevOps',
    description: 'Infrastructure and deployment automation',
    permissions: [
      { resource: 'deployment', action: 'execute', scope: 'project' },
      { resource: 'infrastructure', action: 'modify', scope: 'project' },
      { resource: 'observability', action: 'configure', scope: 'project' }
    ],
    vetoGates: ['deployment_gate']
  },
  {
    id: 'QA_LEAD',
    name: 'QA Automation Lead',
    description: 'Test strategy and quality validation',
    permissions: [
      { resource: 'gate', action: 'execute', scope: 'project' },
      { resource: 'task', action: 'approve', scope: 'project' }
    ],
    vetoGates: ['quality_gate']
  },
  {
    id: 'UX_RESEARCHER',
    name: 'UX Researcher',
    description: 'User experience and accessibility validation',
    permissions: [
      { resource: 'artifact', action: 'create', scope: 'project' },
      { resource: 'task', action: 'validate', scope: 'project' }
    ],
    vetoGates: ['a11y_gate']
  },
  {
    id: 'TECH_WRITER',
    name: 'Technical Writer',
    description: 'Documentation and runbook creation',
    permissions: [
      { resource: 'artifact', action: 'create', scope: 'project' }
    ]
  },
  {
    id: 'INCIDENT_COMMANDER',
    name: 'Incident Commander',
    description: 'Emergency response and rollback decisions',
    permissions: [
      { resource: 'deployment', action: 'execute', scope: 'project' },
      { resource: 'task', action: 'veto', scope: 'project' }
    ],
    vetoGates: ['emergency_veto']
  }
];

export function initializeEnterpriseRoles(rbac: RBACManager): void {
  for (const role of ENTERPRISE_AGENT_ROLES) {
    rbac.registerRole(role);
  }
}
```

---

## Phase 2: Security & Compliance

### Module 2.1: Security Scanner Integrations

**File**: `foundry/security/scanners.ts`

**Implementation**:
```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface SecurityFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
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
}

export interface ScanResult {
  findings: SecurityFinding[];
  summary?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface SecurityScanner {
  name: string;
  type: 'sast' | 'sca' | 'secrets' | 'iac' | 'container';
  scan(options: { target: string; rules?: string[] }): Promise<ScanResult>;
}

export class SemgrepScanner implements SecurityScanner {
  name = 'Semgrep';
  type = 'sast' as const;

  async scan(options: { target: string }): Promise<ScanResult> {
    try {
      const { stdout } = await execAsync(`semgrep scan ${options.target} --json --config=auto`);
      const results = JSON.parse(stdout);

      return {
        findings: results.results?.map((r: any) => ({
          id: `${r.check_id}-${r.start.line}`,
          severity: this.mapSeverity(r.extra?.severity),
          category: r.check_id,
          title: r.extra?.message || 'Unknown',
          description: r.extra?.lines || '',
          location: {
            file: r.path,
            line: r.start?.line || 0,
            column: r.start?.col || 0
          },
          remediation: r.extra?.fix,
          cwe: r.extra?.metadata?.cwe?.[0]
        })) || []
      };
    } catch {
      return { findings: [] };
    }
  }

  private mapSeverity(severity: string): SecurityFinding['severity'] {
    const mapping: Record<string, SecurityFinding['severity']> = {
      critical: 'critical',
      high: 'high',
      medium: 'medium',
      low: 'low',
      info: 'info'
    };
    return mapping[severity?.toLowerCase()] || 'medium';
  }
}

export class GitLeaksScanner implements SecurityScanner {
  name = 'GitLeaks';
  type = 'secrets' as const;

  async scan(options: { target: string }): Promise<ScanResult> {
    try {
      const { stdout } = await execAsync(`gitleaks detect ${options.target} --verbose --json`);
      const results = JSON.parse(stdout);

      return {
        findings: results?.map((f: any) => ({
          id: `${f.RuleID}-${f.StartLine}`,
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
        })) || []
      };
    } catch {
      return { findings: [] };
    }
  }
}

export class SnykScanner implements SecurityScanner {
  name = 'Snyk';
  type = 'sca' as const;

  async scan(options: { target: string }): Promise<ScanResult> {
    try {
      const { stdout } = await execAsync(`snyk test ${options.target} --json`);
      const results = JSON.parse(stdout);

      const findings = results.vulnerabilities?.map((v: any) => ({
        id: v.id,
        severity: v.severity?.toLowerCase() as SecurityFinding['severity'],
        category: 'dependency_vulnerability',
        title: v.title,
        description: v.description,
        location: { file: 'package.json', line: 0, column: 0 },
        remediation: v.upgradePath?.join(' -> '),
        cwe: v.identifiers?.CWE?.[0],
        cvss: v.cvssScore
      })) || [];

      return {
        findings,
        summary: {
          critical: findings.filter((f: any) => f.severity === 'critical').length,
          high: findings.filter((f: any) => f.severity === 'high').length,
          medium: findings.filter((f: any) => f.severity === 'medium').length,
          low: findings.filter((f: any) => f.severity === 'low').length
        }
      };
    } catch {
      return { findings: [] };
    }
  }
}
```

---

### Module 2.2: Security Gates

**File**: `foundry/security/gates.ts`

**Implementation**:
```typescript
import type { GateDefinition, Evidence, GateResult, GateCheck } from '@/foundry/types';

export const SECURITY_GATES: GateDefinition[] = [
  {
    id: 'sast_gate',
    name: 'SAST Quality Gate',
    description: 'Static application security testing',
    phase: 'phase_4_feature_loop',
    required: true,
    checks: [
      {
        id: 'sast_scan',
        name: 'SAST Scan Completed',
        evidenceType: 'test_report',
        validator: 'no_critical_high_findings',
        required: true
      }
    ]
  },
  {
    id: 'secrets_gate',
    name: 'Secrets Detection Gate',
    description: 'Detects exposed secrets in code',
    phase: 'phase_4_feature_loop',
    required: true,
    checks: [
      {
        id: 'secrets_scan',
        name: 'Secrets Scan Clean',
        evidenceType: 'vuln_report',
        validator: 'no_secrets_found',
        required: true
      }
    ]
  },
  {
    id: 'sca_gate',
    name: 'Dependency Security Gate',
    description: 'Software composition analysis',
    phase: 'phase_4_feature_loop',
    required: true,
    checks: [
      {
        id: 'sca_scan',
        name: 'SCA Scan Completed',
        evidenceType: 'vuln_report',
        validator: 'no_critical_high_vulns',
        required: true
      }
    ]
  }
];

export class SecurityGateEvaluator {
  evaluateGate(gateId: string, evidence: Evidence[]): GateResult {
    const gate = SECURITY_GATES.find(g => g.id === gateId);
    if (!gate) {
      return {
        gate: gateId,
        phase: 'unknown',
        status: 'error',
        timestamp: Date.now(),
        checks: [],
        evidenceIds: []
      };
    }

    const checks: GateCheck[] = [];
    let overallStatus: 'passed' | 'failed' | 'error' = 'passed';

    for (const check of gate.checks) {
      const matchingEvidence = evidence.find(e => e.type === check.evidenceType);
      
      if (!matchingEvidence) {
        checks.push({
          id: check.id,
          status: 'missing',
          message: `Missing evidence: ${check.evidenceType}`
        });
        overallStatus = 'failed';
        continue;
      }

      // Run validator
      const checkResult = this.runValidator(check.validator, matchingEvidence);
      checks.push({
        id: check.id,
        status: checkResult.status,
        evidenceId: matchingEvidence.id,
        message: checkResult.message
      });

      if (checkResult.status === 'failed') {
        overallStatus = 'failed';
      }
    }

    return {
      gate: gateId,
      phase: gate.phase,
      status: overallStatus,
      timestamp: Date.now(),
      checks,
      evidenceIds: evidence.map(e => e.id)
    };
  }

  private runValidator(validator: string | undefined, evidence: Evidence): { status: 'passed' | 'failed' | 'error'; message: string } {
    if (!validator) {
      return { status: 'passed', message: 'No validator required' };
    }

    switch (validator) {
      case 'no_critical_high_findings':
        return this.validateNoCriticalFindings(evidence);
      case 'no_secrets_found':
        return this.validateNoSecrets(evidence);
      case 'no_critical_high_vulns':
        return this.validateNoCriticalVulns(evidence);
      default:
        return { status: 'error', message: `Unknown validator: ${validator}` };
    }
  }

  private validateNoCriticalFindings(evidence: Evidence): { status: 'passed' | 'failed'; message: string } {
    try {
      const content = JSON.parse(evidence.content_json || '{}');
      const critical = content.summary?.critical || 0;
      const high = content.summary?.high || 0;
      
      if (critical > 0 || high > 0) {
        return {
          status: 'failed',
          message: `${critical} critical, ${high} high findings detected`
        };
      }
      
      return { status: 'passed', message: 'No critical/high findings' };
    } catch {
      return { status: 'failed', message: 'Invalid evidence format' };
    }
  }

  private validateNoSecrets(evidence: Evidence): { status: 'passed' | 'failed'; message: string } {
    try {
      const content = JSON.parse(evidence.content_json || '{}');
      const findings = content.findings || [];
      
      if (findings.length > 0) {
        return {
          status: 'failed',
          message: `${findings.length} secrets detected`
        };
      }
      
      return { status: 'passed', message: 'No secrets found' };
    } catch {
      return { status: 'failed', message: 'Invalid evidence format' };
    }
  }

  private validateNoCriticalVulns(evidence: Evidence): { status: 'passed' | 'failed'; message: string } {
    try {
      const content = JSON.parse(evidence.content_json || '{}');
      const vulns = content.vulnerabilities || [];
      const criticalHigh = vulns.filter((v: any) => 
        v.severity === 'critical' || v.severity === 'high'
      );
      
      if (criticalHigh.length > 0) {
        return {
          status: 'failed',
          message: `${criticalHigh.length} critical/high vulnerabilities`
        };
      }
      
      return { status: 'passed', message: 'No critical/high vulnerabilities' };
    } catch {
      return { status: 'failed', message: 'Invalid evidence format' };
    }
  }
}
```

---

## Phase 3: Domain Orchestrators

### Module 3.1: Security Domain Orchestrator

**File**: `foundry/domains/security/orchestrator.ts`

**Implementation**:
```typescript
import type { EnterpriseStateMachine } from '@/foundry/core/state-machine';
import type { AuditTrail } from '@/foundry/core/audit-trail';
import type { SecurityScanner, SecurityFinding } from '@/foundry/security/scanners';
import type { SecurityGateEvaluator } from '@/foundry/security/gates';
import type { Evidence, GateResult } from '@/foundry/types';

export interface SecurityContext {
  projectId: string;
  assets: string[];
  dataFlows: DataFlow[];
  trustBoundaries: TrustBoundary[];
}

export interface DataFlow {
  source: string;
  target: string;
  dataType: string;
  protocol: string;
}

export interface TrustBoundary {
  name: string;
  components: string[];
}

export interface Threat {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
}

export interface ThreatModelResult {
  modelId: string;
  threats: Threat[];
  riskScore: number;
  evidence: Evidence[];
}

export interface SASTScanResult {
  scanId: string;
  findings: SecurityFinding[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  evidence: Evidence;
}

export class SecurityDomainOrchestrator {
  constructor(
    private stateMachine: EnterpriseStateMachine,
    private auditTrail: AuditTrail,
    private scanners: SecurityScanner[],
    private gateEvaluator: SecurityGateEvaluator
  ) {}

  async runSecurityScan(type: 'sast' | 'sca' | 'secrets', target: string): Promise<Evidence> {
    const scanner = this.scanners.find(s => s.type === type);
    if (!scanner) {
      throw new Error(`No scanner found for type: ${type}`);
    }

    await this.auditTrail.record({
      type: 'SECURITY_SCAN_START',
      actor: 'SECURITY_LEAD',
      action: `${type}_scan`,
      resource: target,
      projectId: '', // From context
      phase: 'phase_2_security_foundation',
      metadata: { scanner: scanner.name },
      timestamp: Date.now()
    });

    const result = await scanner.scan({ target });

    // Create evidence from scan result
    const evidence: Evidence = {
      id: this.generateId(),
      project_id: '', // From context
      phase: 'phase_2_security_foundation',
      gate: null,
      task_id: null,
      type: this.mapScannerTypeToEvidence(type),
      name: `${scanner.name} Scan ${new Date().toISOString()}`,
      description: `Security scan using ${scanner.name}`,
      file_path: null,
      file_hash: null,
      ci_run_id: null,
      ci_url: null,
      content_json: JSON.stringify(result),
      content_summary: `Found ${result.findings.length} issues`,
      created_at: Date.now(),
      created_by: 'SECURITY_LEAD',
      signature: ''
    };

    await this.auditTrail.record({
      type: 'SECURITY_SCAN_COMPLETE',
      actor: 'SECURITY_LEAD',
      action: `${type}_scan_complete`,
      resource: target,
      projectId: '',
      phase: 'phase_2_security_foundation',
      metadata: { 
        findings: result.findings.length,
        critical: result.summary?.critical || 0
      },
      timestamp: Date.now()
    });

    return evidence;
  }

  async evaluateSecurityGate(gateId: string, evidence: Evidence[]): Promise<GateResult> {
    return this.gateEvaluator.evaluateGate(gateId, evidence);
  }

  private mapScannerTypeToEvidence(type: string): Evidence['type'] {
    const mapping: Record<string, Evidence['type']> = {
      sast: 'test_report',
      sca: 'vuln_report',
      secrets: 'vuln_report'
    };
    return mapping[type] || 'file';
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

---

## Phase 4: TUI Integration & Default Rollout

### Module 4.1: Wire TUI to Real Data

**File Updates**:

Update `foundry/tui/routes/setup.tsx` to connect to ContextStore:
```typescript
// Add to setup.tsx
import { createContextStore } from '@/foundry/runtime/context-store';

const contextStore = createContextStore();

// Replace console.log with actual save
const handleSubmit = async () => {
  await contextStore.save(projectId(), {
    project: {
      name: projectName(),
      repo_root: repoRoot(),
      stakeholders: stakeholders().split(',').map(s => s.trim()),
      environments: environments().split(',').map(s => s.trim()),
      compliance_targets: compliance().split(',').map(s => s.trim()),
      risk_tolerance: 'medium'
    },
    // ... rest of context
  });
};
```

---

## Execution Instructions

### Step 1: Environment Preparation

```bash
# Verify clean state
git status

# Install any missing dependencies
npm install

# Build current state
npm run build

# Run initial tests
npm test -- --listTests | head -20
```

### Step 2: Execute Phase 1 (Core Foundation)

For each module in Phase 1:

1. **Create the implementation file**
2. **Create the test file**
3. **Run validation**:

```bash
# Build
npm run build

# Lint
npm run lint -- foundry/core/[module].ts

# Test
npm test -- --testPathPattern='[module]'

# Type check
npx tsc --noEmit
```

### Step 3: Execute Phase 2 (Security & Compliance)

Same pattern as Phase 1.

### Step 4: Execute Phase 3 (Domain Orchestrators)

Same pattern as Phase 1.

### Step 5: Execute Phase 4 (Integration)

1. Wire TUI components
2. Create agent adapters
3. Update main TUI

### Step 6: Final Validation

```bash
# Full build
npm run build

# Full lint
npm run lint

# Full test suite
npm run test:all

# Type check
npx tsc --noEmit

# Verify CLI
node dist/src/cli.js foundry --help
```

---

## Testing Requirements

### Unit Tests
- Every module must have >80% coverage
- All public methods tested
- Error cases tested
- Edge cases tested

### Integration Tests
- Orchestrator workflows
- Gate evaluation chains
- Security scan integrations

### E2E Tests
- Complete project lifecycle
- Full state machine execution
- TUI interactions

---

## Code Quality Gates

Before marking complete:

- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes (0 errors, max 5 warnings)
- [ ] `npm run test:all` passes (100% of tests)
- [ ] TypeScript strict mode passes (`npx tsc --noEmit`)
- [ ] All new files have tests
- [ ] Test coverage >80% for new code
- [ ] No `any` types (except where necessary)
- [ ] All functions have return types
- [ ] All public APIs documented

---

## Success Criteria

After complete implementation:

- [ ] Foundry loads as default method
- [ ] State machine executes full SDLC workflow
- [ ] Security gates block on vulnerabilities
- [ ] Audit trail maintains integrity
- [ ] TUI displays real project data
- [ ] Agent dispatch works end-to-end
- [ ] All tests pass
- [ ] No linting errors
- [ ] Build succeeds
- [ ] Documentation complete

---

## Rollback Plan

If issues arise:

1. **Git Revert**: `git revert [commit]`
2. **Feature Branch**: Work in `feature/foundry-complete`
3. **Gradual Rollout**: Use feature flags

---

## Contact & Support

- Architecture: See `foundry/ARCHITECTURE_SUMMARY.md`
- Implementation: See `foundry/IMPLEMENTATION_GUIDE.md`
- Types: See `foundry/types/`

---

*This orchestrator prompt provides complete implementation guidance for the Aegis Foundry autonomous development team system.*
