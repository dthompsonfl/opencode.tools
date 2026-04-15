# API Reference

Complete API documentation for the Foundry-Cowork Integration.

Production deliverable policy baseline: `docs/PRODUCTION_DELIVERABLE_POLICY.md`.

## Table of Contents

- [CollaborativeWorkspace](#collaborativeworkspace)
- [TeamManager](#teammanager)
- [CollaborationProtocol](#collaborationprotocol)
- [ParallelStateMonitor](#parallelstatemonitor)
- [TaskRouter](#taskrouter)
- [EvidenceCollector](#evidencecollector)
- [Deliverable Scope Policy](#deliverable-scope-policy)
- [Domain Orchestrators](#domain-orchestrators)
- [Integration Bridge](#integration-bridge)

---

## Deliverable Scope Policy

### Module: `src/foundry/deliverable-scope.ts`

- `evaluateRepositoryDeliverableScope(repoRoot, options)` evaluates changed artifacts against code/docs/tests scope.
- `evaluateDeliverableScope(paths, options)` classifies provided paths and returns included/excluded reports.
- `FoundryExecutionRequest.enforceDeliverableScope` defaults to strict enforcement in Foundry orchestration.
- `FoundryExecutionReport.deliverableScopeReport` exposes release-scope verification results, including `blockingExcluded`.

Validation command: `npm run validate:deliverable-scope`

## CollaborativeWorkspace

**Location**: `src/cowork/collaboration/collaborative-workspace.ts`

Singleton workspace manager for project-scoped collaboration.

### Class: CollaborativeWorkspace

#### getInstance(): CollaborativeWorkspace

Returns the singleton instance.

```typescript
const workspace = CollaborativeWorkspace.getInstance();
```

#### createWorkspace(projectId: string, name: string, createdBy: string, options?: WorkspaceOptions): ProjectWorkspace

Creates a new project workspace.

**Parameters**:
- `projectId` (string): Unique project identifier
- `name` (string): Workspace name
- `createdBy` (string): User/agent creating the workspace
- `options` (WorkspaceOptions, optional): Additional configuration

**Returns**: `ProjectWorkspace`

**Example**:
```typescript
const ws = workspace.createWorkspace(
  'proj-123',
  'Payment Service',
  'architect-agent',
  { description: 'Payment gateway service workspace' }
);
```

#### getWorkspace(workspaceId: string): ProjectWorkspace | undefined

Retrieves a workspace by ID.

#### updateArtifact(workspaceId: string, artifactKey: string, data: unknown, agentId: string, roleId: string): ArtifactVersion

Creates or updates an artifact with automatic versioning.

**Parameters**:
- `workspaceId` (string): Target workspace
- `artifactKey` (string): Unique artifact identifier (e.g., 'architecture.md')
- `data` (unknown): Artifact content
- `agentId` (string): Agent making the change
- `roleId` (string): Role of the agent

**Returns**: `ArtifactVersion` with version number and timestamp

**Example**:
```typescript
const version = workspace.updateArtifact(
  ws.id,
  'api-design.md',
  { content: '## API Endpoints...' },
  'architect-1',
  'architect'
);
console.log(`Created version ${version.versionNumber}`);
```

#### getArtifact(workspaceId: string, artifactKey: string, version?: number): ArtifactVersion | undefined

Retrieves an artifact, optionally at a specific version.

#### addFeedback(workspaceId: string, artifactKey: string, fromAgentId: string, title: string, content: string, severity?: FeedbackSeverity): FeedbackThread

Adds feedback to an artifact.

**Parameters**:
- `severity`: 'nit' | 'suggestion' | 'blocking' | 'critical' (default: 'suggestion')

**Example**:
```typescript
const feedback = workspace.addFeedback(
  ws.id,
  'api-design.md',
  'security-agent',
  'Missing rate limiting',
  'Add rate limiting to prevent abuse',
  'blocking'
);
```

#### resolveFeedback(workspaceId: string, artifactKey: string, feedbackId: string, agentId: string): void

Marks feedback as resolved.

#### rollbackArtifact(workspaceId: string, artifactKey: string, toVersion: number, agentId: string): ArtifactVersion

Rolls back an artifact to a previous version.

#### detectConflicts(workspaceId: string, agentId: string): Conflict[]

Detects concurrent editing conflicts.

#### resolveConflict(conflictId: string, strategy: ConflictResolutionStrategy, resolverId: string, reason?: string): Conflict

Resolves a conflict using specified strategy.

**Strategies**:
- `'last-write-wins'`: Accept most recent version
- `'merge'`: Attempt to merge versions
- `'reject'`: Reject both versions
- `'manual'`: Mark for manual resolution

#### generateCompliancePackage(workspaceId: string, generatedBy: string): CompliancePackage

Generates a compliance package with all artifacts and feedback.

**Returns**: `CompliancePackage` with signatures and metadata

#### getWorkspaceMetrics(workspaceId: string): WorkspaceMetrics

Returns metrics for the workspace.

**Metrics**:
- `artifactCount`: Number of artifacts
- `versionCount`: Total versions across all artifacts
- `feedbackCount`: Total feedback items
- `pendingFeedback`: Unresolved feedback count
- `activeConflicts`: Number of unresolved conflicts
- `memberCount`: Workspace members
- `lastActivity`: ISO timestamp of last activity

### Types

#### ProjectWorkspace

```typescript
interface ProjectWorkspace {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  status: 'active' | 'archived' | 'frozen' | 'merging';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  members: string[];
  artifacts: Map<string, string>;
  metadata?: Record<string, unknown>;
}
```

#### ArtifactVersion

```typescript
interface ArtifactVersion {
  versionId: string;
  artifactId: string;
  artifactKey: string;
  versionNumber: number;
  data: unknown;
  createdAt: string;
  createdBy: string;
  roleId: string;
  workspaceId: string;
  previousVersion?: number;
  changeDescription?: string;
  metadata?: Record<string, unknown>;
}
```

#### FeedbackThread

```typescript
interface FeedbackThread {
  id: string;
  artifactId: string;
  artifactKey: string;
  workspaceId: string;
  fromAgentId: string;
  title: string;
  content: string;
  severity: 'nit' | 'suggestion' | 'blocking' | 'critical';
  status: 'pending' | 'addressed' | 'wontfix' | 'in_progress';
  createdAt: string;
  updatedAt: string;
  replies: FeedbackReply[];
  tags: string[];
  location?: {
    file?: string;
    line?: number;
    column?: number;
  };
}
```

---

## TeamManager

**Location**: `src/cowork/team/team-manager.ts`

Manages team formation, health monitoring, and member lifecycle.

### Class: TeamManager

#### getInstance(): TeamManager

Returns the singleton instance.

#### formTeam(request: TeamFormationRequest): DevelopmentTeam

Forms a new development team.

**Parameters**:
```typescript
interface TeamFormationRequest {
  projectId: string;
  projectName: string;
  leadRoleId: string;
  requiredCapabilities: string[];
  optionalCapabilities?: string[];
  maxTeamSize?: number;
}
```

**Returns**: `DevelopmentTeam`

**Example**:
```typescript
const team = teamManager.formTeam({
  projectId: 'payment-service',
  projectName: 'Payment Gateway',
  leadRoleId: 'architect',
  requiredCapabilities: ['typescript', 'security'],
  optionalCapabilities: ['performance'],
  maxTeamSize: 5
});
```

#### getTeam(teamId: string): DevelopmentTeam | undefined

Retrieves a team by ID.

#### getTeamForProject(projectId: string): DevelopmentTeam | undefined

Gets the team assigned to a project.

#### addMember(teamId: string, roleId: string, agentId: string, capabilities: string[]): TeamMember

Adds a member to a team.

#### removeMember(teamId: string, agentId: string): void

Removes a member from a team.

#### updateMemberStatus(teamId: string, agentId: string, status: MemberStatus, reason?: string): void

Updates a member's status.

**Statuses**:
- `'active'`: Member is working normally
- `'idle'`: Member is available but not assigned
- `'busy'`: Member is at capacity
- `'offline'`: Member is unavailable
- `'error'`: Member encountered an error

#### getTeamHealth(teamId: string): TeamHealth

Returns comprehensive health metrics.

**Returns**:
```typescript
interface TeamHealth {
  teamId: string;
  overallStatus: 'healthy' | 'degraded' | 'critical';
  timestamp: number;
  memberHealth: MemberHealth[];
  summary: {
    total: number;
    active: number;
    idle: number;
    busy: number;
    offline: number;
    error: number;
  };
  issues: string[];
}
```

#### checkTeamHealth(teamId: string): TeamHealth

Performs health check and publishes events if issues found.

#### promoteToLead(teamId: string, agentId: string): void

Promotes a member to team lead.

#### dissolveTeam(teamId: string, reason?: string): void

Dissolves a team and cleans up resources.

### Events

TeamManager publishes these events to EventBus:

- `team:forming` - Team formation started
- `team:formed` - Team successfully formed
- `team:dissolved` - Team dissolved
- `team:status_changed` - Team status changed
- `member:joined` - Member added to team
- `member:left` - Member removed from team
- `member:status_changed` - Member status updated
- `member:promoted` - Member promoted to lead
- `team:health_check` - Health check performed
- `team:health_degraded` - Team health degraded
- `team:health_critical` - Team health critical

---

## CollaborationProtocol

**Location**: `src/cowork/team/collaboration-protocol.ts`

Enables agent-to-agent communication and coordination.

### Class: CollaborationProtocol

#### getInstance(): CollaborationProtocol

Returns the singleton instance.

#### sendMessage(fromAgentId: string, toAgentId: string, content: string, options?: MessageOptions): CollaborationMessage

Sends a direct message between agents.

**Parameters**:
```typescript
interface MessageOptions {
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  requiresAck?: boolean;
  metadata?: Record<string, unknown>;
}
```

**Example**:
```typescript
const msg = protocol.sendMessage(
  'dev-agent-1',
  'architect-agent',
  'Can you review my API design?',
  { priority: 'high', requiresAck: true }
);
```

#### requestHelp(fromAgentId: string, request: HelpRequest): HelpRequestTicket

Requests help from the team.

**Parameters**:
```typescript
interface HelpRequest {
  title: string;
  description: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  requiredCapabilities?: string[];
  timeout?: number;
}
```

**Example**:
```typescript
const ticket = protocol.requestHelp('dev-agent-1', {
  title: 'OAuth implementation help',
  description: 'Need help with PKCE flow',
  priority: 'high',
  requiredCapabilities: ['security', 'oauth']
});
```

#### offerHelp(agentId: string, ticketId: string): void

Offers to help with a request.

#### acceptHelp(ticketId: string, helperAgentId: string): void

Accepts a help offer.

#### resolveHelpRequest(ticketId: string, resolution: HelpResolution): void

Resolves a help request.

#### coordinateReview(artifactId: string, reviewerIds: string[], options?: ReviewOptions): ReviewSession

Coordinates a review session.

**Parameters**:
```typescript
interface ReviewOptions {
  reviewType: 'code' | 'security' | 'architecture' | 'general';
  deadline?: number;
  urgency?: 'low' | 'normal' | 'high';
  requiredApprovals?: number;
}
```

**Returns**: `ReviewSession` with ID and status

#### submitReview(sessionId: string, reviewerId: string, review: ReviewSubmission): void

Submits a review.

**ReviewSubmission**:
```typescript
interface ReviewSubmission {
  feedback: string;
  decision: 'approve' | 'reject' | 'needs_work';
  findings?: ReviewFinding[];
  suggestions?: string[];
}

interface ReviewFinding {
  severity: 'info' | 'warning' | 'critical';
  location?: string;
  description: string;
}
```

#### escalateIssue(fromAgentId: string, issue: EscalationIssue): EscalationTicket

Escalates an issue to human operators.

**Parameters**:
```typescript
interface EscalationIssue {
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'security' | 'compliance' | 'technical' | 'other';
  context?: Record<string, unknown>;
  suggestedAction?: string;
}
```

**Example**:
```typescript
const escalation = protocol.escalateIssue('security-agent', {
  title: 'Potential data leak',
  description: 'Found unencrypted PII in logs',
  severity: 'critical',
  category: 'security',
  suggestedAction: 'Review and rotate logs immediately'
});
```

#### acknowledgeEscalation(ticketId: string, userId: string): void

Acknowledges an escalation (human operator).

#### resolveEscalation(ticketId: string, resolution: EscalationResolution): void

Resolves an escalation.

#### broadcastMessage(fromAgentId: string, teamId: string, content: string, options?: BroadcastOptions): BroadcastMessage

Broadcasts a message to the entire team.

**Example**:
```typescript
protocol.broadcastMessage(
  'architect-agent',
  team.id,
  'Sprint planning starts now',
  { priority: 'normal', category: 'announcement' }
);
```

#### getMessagesForAgent(agentId: string): CollaborationMessage[]

Gets all messages for an agent.

#### getHelpRequests(teamId?: string): HelpRequestTicket[]

Gets help requests (optionally filtered by team).

#### getPendingEscalations(): EscalationTicket[]

Gets all pending escalations requiring human attention.

---

## ParallelStateMonitor

**Location**: `src/cowork/monitoring/parallel-state-monitor.ts`

Continuously monitors project state across multiple dimensions.

### Class: ParallelStateMonitor

#### getInstance(): ParallelStateMonitor

Returns the singleton instance.

#### monitorProject(projectId: string, team: DevelopmentTeam, config: MonitoringConfig): void

Starts monitoring a project.

**Parameters**:
```typescript
interface MonitoringConfig {
  security?: {
    enabled: boolean;
    scanInterval?: number;
    autoEscalate?: boolean;
  };
  compliance?: {
    enabled: boolean;
    regulation?: string;
    checkInterval?: number;
  };
  observability?: {
    enabled: boolean;
    metrics?: string[];
    anomalyThreshold?: number;
  };
}
```

**Example**:
```typescript
monitor.monitorProject('payment-service', team, {
  security: {
    enabled: true,
    scanInterval: 60000,
    autoEscalate: true
  },
  compliance: {
    enabled: true,
    regulation: 'PCI-DSS'
  },
  observability: {
    enabled: true,
    metrics: ['performance', 'errors', 'throughput']
  }
});
```

#### stopMonitoring(projectId: string): void

Stops monitoring a project.

#### pauseMonitoring(projectId: string): void

Pauses monitoring (preserves state).

#### resumeMonitoring(projectId: string): void

Resumes paused monitoring.

#### getProjectStatus(projectId: string): ProjectMonitoringStatus

Gets current monitoring status.

**Returns**:
```typescript
interface ProjectMonitoringStatus {
  projectId: string;
  isMonitoring: boolean;
  overallHealth: 'healthy' | 'degraded' | 'critical';
  agents: AgentStatus[];
  lastUpdate: number;
  alerts: Alert[];
  metrics: Record<string, number>;
}
```

#### subscribe(projectId: string, callback: MonitoringCallback): () => void

Subscribes to monitoring events.

**Returns**: Unsubscribe function

**Example**:
```typescript
const unsubscribe = monitor.subscribe('payment-service', (event) => {
  console.log(`[${event.type}] ${event.message}`);
  
  if (event.type === 'security:vulnerability:detected') {
    alertSecurityTeam(event.payload);
  }
});

// Later: unsubscribe()
```

#### getMetrics(projectId: string): MonitoringMetrics

Gets all collected metrics.

#### triggerManualCheck(projectId: string, checkType: CheckType): Promise<CheckResult>

Triggers a manual check.

**CheckTypes**: `'security' | 'compliance' | 'observability' | 'all'`

### Monitoring Agents

#### SecurityMonitoringAgent

Automatically scans for:
- Vulnerabilities in code
- Dependency security issues
- Configuration weaknesses
- Secret exposure

**Events**:
- `security:scan:started`
- `security:scan:completed`
- `security:vulnerability:detected`
- `security:vulnerability:critical`

#### ComplianceMonitoringAgent

Monitors compliance with:
- Regulatory requirements (SOX, GDPR, PCI-DSS)
- Internal policies
- Audit trail completeness

**Events**:
- `compliance:check:started`
- `compliance:check:completed`
- `compliance:violation:detected`

#### ObservabilityAgent

Collects and analyzes:
- Performance metrics
- Error rates
- Throughput
- Latency

**Events**:
- `observability:metrics:collected`
- `observability:anomaly:detected`
- `observability:threshold:exceeded`

---

## TaskRouter

**Location**: `src/cowork/routing/task-router.ts`

Intelligent task routing with priority queues and load balancing.

### Class: TaskRouter

#### getInstance(): TaskRouter

Returns the singleton instance.

#### routeTask(task: Task, team: DevelopmentTeam): TaskAssignment

Routes a task to the best available agent.

**Parameters**:
```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  requiredCapabilities: string[];
  estimatedEffort?: number;
  deadline?: number;
  dependencies?: string[];
}
```

**Returns**: `TaskAssignment` with assigned agent and queue position

**Example**:
```typescript
const assignment = taskRouter.routeTask({
  id: 'task-123',
  title: 'Implement OAuth',
  description: 'Add OAuth2 authentication',
  priority: 'high',
  requiredCapabilities: ['security', 'typescript'],
  estimatedEffort: 4
}, team);

console.log(`Assigned to: ${assignment.agentId}`);
console.log(`Queue position: ${assignment.queuePosition}`);
```

#### getQueueStatus(teamId: string): QueueStatus

Gets the current queue status for a team.

**Returns**:
```typescript
interface QueueStatus {
  teamId: string;
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
  averageWaitTime: number;
  averageProcessingTime: number;
}
```

#### getAgentWorkload(agentId: string): WorkloadStatus

Gets current workload for an agent.

**Returns**:
```typescript
interface WorkloadStatus {
  agentId: string;
  assignedTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  capacity: number;
  utilization: number;
  estimatedAvailability: number;
}
```

#### retryFailedTask(taskId: string): TaskAssignment

Retries a failed task.

#### cancelTask(taskId: string, reason?: string): void

Cancels a pending task.

#### rebalanceTeam(teamId: string): RebalanceResult

Redistributes tasks across team members.

### CapabilityMatcher

**Location**: `src/cowork/routing/capability-matcher.ts`

Matches tasks to agents based on capabilities.

#### findBestMatch(task: Task, candidates: TeamMember[]): MatchResult

Finds the best matching agent for a task.

**Returns**:
```typescript
interface MatchResult {
  agentId: string;
  score: number;
  matchedCapabilities: string[];
  missingCapabilities: string[];
  confidence: 'high' | 'medium' | 'low';
}
```

---

## EvidenceCollector

**Location**: `src/cowork/evidence/collector.ts`

Automatically collects and signs evidence for audit trails.

### Class: EvidenceCollector

#### getInstance(): EvidenceCollector

Returns the singleton instance.

#### configure(options: EvidenceOptions): void

Configures the collector.

**Parameters**:
```typescript
interface EvidenceOptions {
  privateKeyPath?: string;
  publicKeyPath?: string;
  autoCollect?: boolean;
  eventTypes?: string[];
  retentionDays?: number;
}
```

#### collect(event: SignableEvent): EvidenceItem

Manually collects evidence from an event.

**Example**:
```typescript
const evidence = collector.collect({
  type: 'agent:action',
  timestamp: Date.now(),
  agentId: 'security-agent',
  action: 'vulnerability:scan',
  result: { vulnerabilitiesFound: 0 },
  projectId: 'payment-service'
});

console.log(`Evidence ID: ${evidence.id}`);
console.log(`Signature: ${evidence.signature}`);
```

#### exportCompliancePackage(projectId: string): ComplianceEvidencePackage

Exports a compliance package.

**Returns**:
```typescript
interface ComplianceEvidencePackage {
  packageId: string;
  projectId: string;
  generatedAt: number;
  generatedBy: string;
  items: EvidenceItem[];
  summary: {
    totalItems: number;
    byType: Record<string, number>;
    byAgent: Record<string, number>;
    dateRange: { start: number; end: number };
  };
  signatures: string[];
  verificationHash: string;
}
```

#### verifyEvidence(projectId: string, evidenceId: string): boolean

Verifies a single evidence item's signature.

#### verifyEvidenceChain(projectId: string): boolean

Verifies the entire evidence chain for a project.

#### getEvidenceForProject(projectId: string): EvidenceItem[]

Gets all evidence for a project.

#### getEvidenceByType(projectId: string, type: string): EvidenceItem[]

Gets evidence filtered by type.

### Signer

**Location**: `src/cowork/evidence/signer.ts`

Cryptographic signing using RSA-SHA256.

#### generateKeyPair(): Promise<KeyPair>

Generates a new RSA key pair.

#### sign(data: SignableEvent, privateKey: string): string

Signs data and returns signature.

#### verify(data: SignableEvent, signature: string, publicKey: string): boolean

Verifies a signature.

---

## Domain Orchestrators

### SecurityDomainOrchestrator

**Location**: `src/foundry/domains/security/security-orchestrator.ts`

Orchestrates security-focused execution.

#### executeSecureProject(projectId: string, options: SecurityOptions): Promise<SecurityResult>

Executes a project with security focus.

**Options**:
```typescript
interface SecurityOptions {
  threatModeling?: boolean;
  dependencyScanning?: boolean;
  vulnerabilityScanning?: boolean;
  complianceChecks?: string[];
  securityReview?: boolean;
}
```

**Returns**:
```typescript
interface SecurityResult {
  success: boolean;
  phases: PhaseResult[];
  teamActivities: TeamActivity[];
  findings: SecurityFinding[];
  metrics: {
    securityScore: number;
    vulnerabilitiesFound: number;
    vulnerabilitiesFixed: number;
    complianceScore: number;
  };
  evidence?: EvidenceItem[];
}
```

### FeatureDomainOrchestrator

**Location**: `src/foundry/domains/feature/feature-orchestrator.ts`

Orchestrates feature development.

#### executeFeatureProject(projectId: string, featureSpec: FeatureSpec): Promise<FeatureResult>

Executes feature development.

### ReleaseDomainOrchestrator

**Location**: `src/foundry/domains/release/release-orchestrator.ts`

Orchestrates release management.

#### executeReleaseProject(projectId: string, releaseConfig: ReleaseConfig): Promise<ReleaseResult>

Executes release with gating.

---

## Integration Bridge

### FoundryCollaborationBridge

**Location**: `src/foundry/integration/collaboration-bridge.ts`

Main integration point between Foundry and Cowork.

#### constructor(foundryOrchestrator?: FoundryOrchestrator)

Creates a new bridge instance.

#### initialize(): Promise<void>

Initializes all components.

#### executeProject(projectId: string, options: ExecutionOptions): Promise<ExecutionResult>

Executes a project with full integration.

**Options**:
```typescript
interface ExecutionOptions {
  mode?: 'research' | 'docs' | 'architect' | 'code' | 'full';
  enableMonitoring?: boolean;
  enableEvidence?: boolean;
  teamFormation?: TeamFormationOptions;
}
```

**Returns**:
```typescript
interface ExecutionResult {
  success: boolean;
  projectId: string;
  duration: number;
  phases: PhaseResult[];
  teamActivities: TeamActivity[];
  agentResults: AgentResult[];
  evidence?: EvidenceItem[];
  monitoringAlerts?: Alert[];
  escalations?: EscalationTicket[];
  teamPerformance: TeamPerformance;
}
```

#### executePhase(projectId: string, phase: string, tasks: Task[]): Promise<PhaseResult>

Executes a single phase with parallel task execution.

#### getTeamActivities(projectId: string): TeamActivity[]

Gets all team activities for a project.

#### getHealthStatus(): BridgeHealthStatus

Gets comprehensive health status.

**Returns**:
```typescript
interface BridgeHealthStatus {
  healthy: boolean;
  components: {
    foundryOrchestrator: boolean;
    coworkOrchestrator: boolean;
    teamManager: boolean;
    parallelStateMonitor: boolean;
    evidenceCollector: boolean;
    collaborationProtocol: boolean;
  };
  missing: string[];
}
```

### FoundryTeamAdapter

**Location**: `src/foundry/integration/team-adapter.ts`

Adapts Foundry roles to Cowork teams.

#### adaptRolesToTeam(foundryRoles: FoundryRole[]): DevelopmentTeam

Converts Foundry roles to a development team.

#### extractCapabilities(role: FoundryRole): string[]

Extracts capabilities from a role definition.

## Event Types

### System Events

```typescript
// Agent lifecycle
'agent:start' | 'agent:progress' | 'agent:complete' | 'agent:error'

// Team events
'team:forming' | 'team:formed' | 'team:dissolved'
'team:status_changed' | 'team:health_check'
'team:health_degraded' | 'team:health_critical'

// Member events
'member:joined' | 'member:left' | 'member:status_changed' | 'member:promoted'

// Collaboration events
'collaboration:message:sent' | 'collaboration:help:requested'
'collaboration:help:offered' | 'collaboration:help:accepted'
'collaboration:review:started' | 'collaboration:review:completed'
'collaboration:escalation:created' | 'collaboration:escalation:resolved'

// Monitoring events
'monitoring:started' | 'monitoring:stopped' | 'monitoring:status_changed'
'security:scan:started' | 'security:scan:completed' | 'security:vulnerability:detected'
'compliance:check:started' | 'compliance:check:completed' | 'compliance:violation:detected'
'observability:metrics:collected' | 'observability:anomaly:detected'

// Evidence events
'evidence:collected' | 'evidence:exported' | 'evidence:verified'

// Workspace events
'workspace:created' | 'workspace:status_changed'
'artifact:version:created' | 'artifact:version:updated' | 'artifact:version:rollback'
'feedback:thread:created' | 'feedback:thread:resolved' | 'feedback:thread:escalated'
'workspace:conflict:detected' | 'workspace:conflict:resolved'
'workspace:compliance:package_generated'
```

## Usage Patterns

### Pattern 1: Simple Project Execution

```typescript
const bridge = new FoundryCollaborationBridge();
await bridge.initialize();

const result = await bridge.executeProject('my-project', {
  mode: 'full',
  enableMonitoring: true,
  enableEvidence: true
});

if (result.success) {
  console.log('Project completed successfully');
}
```

### Pattern 2: Custom Monitoring

```typescript
const monitor = ParallelStateMonitor.getInstance();

monitor.monitorProject(projectId, team, {
  security: { enabled: true, autoEscalate: true },
  compliance: { enabled: true, regulation: 'SOX' }
});

monitor.subscribe(projectId, (event) => {
  if (event.type === 'security:vulnerability:critical') {
    // Handle critical vulnerability
  }
});
```

### Pattern 3: Evidence Collection

```typescript
const collector = EvidenceCollector.getInstance();

collector.configure({
  privateKeyPath: './keys/private.pem',
  autoCollect: true
});

// Evidence collected automatically
// Export when needed
const pkg = collector.exportCompliancePackage(projectId);
```

### Pattern 4: Team Collaboration

```typescript
const protocol = CollaborationProtocol.getInstance();

// Request help
protocol.requestHelp(agentId, {
  title: 'Need security review',
  description: 'Review auth implementation',
  priority: 'high',
  requiredCapabilities: ['security']
});

// Coordinate review
protocol.coordinateReview(artifactId, reviewers, {
  reviewType: 'security',
  deadline: Date.now() + 86400000
});
```
