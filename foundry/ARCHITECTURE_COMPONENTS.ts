/**
 * AEGIS FOUNDRY - Enterprise Component Designs
 * 
 * This file contains detailed TypeScript interfaces and implementation guidance
 * for building the enterprise-grade autonomous development team system.
 */

// ============================================================================
// CORE ORCHESTRATION
// ============================================================================

/**
 * Federated Meta-Orchestrator
 * Coordinates multiple domain orchestrators for enterprise-scale operations
 */
export interface IMetaOrchestrator {
  readonly projectId: string;
  readonly stateMachine: IEnterpriseStateMachine;
  readonly auditTrail: IAuditTrail;
  readonly rbac: IRBACManager;
  
  // Domain orchestrators
  readonly securityDomain: ISecurityDomainOrchestrator;
  readonly featureDomain: IFeatureDomainOrchestrator;
  readonly releaseDomain: IReleaseDomainOrchestrator;
  
  // Lifecycle management
  initialize(config: ProjectConfig): Promise<void>;
  dispatch(event: EnterpriseStateEvent, payload?: unknown): Promise<void>;
  getCurrentState(): StateSnapshot;
  
  // Cross-domain coordination
  coordinateDomains(request: CoordinationRequest): Promise<CoordinationResult>;
  escalateToHuman(escalation: HumanEscalationRequest): Promise<HumanEscalationResponse>;
}

export interface CoordinationRequest {
  sourceDomain: DomainType;
  targetDomains: DomainType[];
  action: string;
  payload: unknown;
  requiresConsensus: boolean;
  timeout: number;
}

export interface CoordinationResult {
  success: boolean;
  domainResponses: DomainResponse[];
  consensusReached: boolean;
  evidence: Evidence[];
}

export type DomainType = 'security' | 'feature' | 'release' | 'compliance';

// ============================================================================
// STATE MACHINE - ENTERPRISE EDITION
// ============================================================================

/**
 * Enterprise State Machine with Parallel States
 * Supports concurrent state tracks for continuous monitoring
 */
export interface IEnterpriseStateMachine {
  readonly currentPhase: EnterprisePhase;
  readonly parallelStates: ParallelState[];
  readonly history: StateTransition[];
  
  dispatch(event: EnterpriseStateEvent, payload?: unknown): Promise<void>;
  can(event: EnterpriseStateEvent): boolean;
  getAvailableTransitions(): Array<{ event: EnterpriseStateEvent; target: EnterprisePhase }>;
  
  // Parallel state management
  activateParallelState(state: ParallelStateType): void;
  deactivateParallelState(state: ParallelStateType): void;
  getParallelStateStatus(state: ParallelStateType): ParallelStateStatus;
  
  // Sub-state machines
  enterSubMachine(machineId: string, initialState: string): void;
  exitSubMachine(machineId: string): void;
}

export type EnterprisePhase =
  // Primary flow
  | 'idle'
  | 'phase_0_discovery'
  | 'phase_1_architecture'
  | 'phase_2_security_foundation'
  | 'phase_3_compliance_review'
  | 'phase_4_feature_loop'
  | 'phase_5_integration_testing'
  | 'phase_6_security_validation'
  | 'phase_7_compliance_validation'
  | 'phase_8_hardening'
  | 'phase_9_staging_deploy'
  | 'phase_10_release_readiness'
  | 'phase_11_release_approval'
  | 'phase_12_release_execution'
  | 'phase_13_post_release'
  | 'released'
  // Special states
  | 'remediation'
  | 'paused'
  | 'aborted';

export type ParallelStateType = 
  | 'security_monitoring'
  | 'compliance_monitoring'
  | 'observability'
  | 'cost_monitoring';

export type ParallelStateStatus = 'active' | 'inactive' | 'error';

export interface ParallelState {
  type: ParallelStateType;
  status: ParallelStateStatus;
  lastCheck: number;
  metrics: Record<string, number>;
}

export interface StateTransition {
  id: string;
  timestamp: number;
  from: EnterprisePhase;
  to: EnterprisePhase;
  event: EnterpriseStateEvent;
  actor: string; // Agent or human ID
  evidenceIds: string[];
  signature: string;
}

export type EnterpriseStateEvent =
  | 'INIT_PROJECT'
  | 'LOAD_CONTEXT'
  | 'SET_ARTIFACT_PATH'
  | 'ADD_TASK'
  | 'ASSIGN_TASK'
  | 'START_PHASE'
  | 'COMPLETE_TASK'
  | 'REQUEST_REVIEW'
  | 'RUN_GATES'
  | 'GATES_PASSED'
  | 'GATES_FAILED'
  | 'START_REMEDIATION'
  | 'COMPLETE_REMEDIATION'
  | 'START_FEATURE_LOOP'
  | 'COMPLETE_FEATURE'
  | 'APPROVE_PHASE'
  | 'REQUEST_RELEASE'
  | 'APPROVE_RELEASE'
  | 'REJECT_RELEASE'
  | 'EXECUTE_DEPLOYMENT'
  | 'DEPLOYMENT_SUCCESS'
  | 'DEPLOYMENT_FAILURE'
  | 'ROLLBACK_INITIATED'
  | 'ROLLBACK_COMPLETE'
  | 'ESCALATE_TO_HUMAN'
  | 'HUMAN_APPROVAL'
  | 'HUMAN_REJECTION'
  | 'PAUSE'
  | 'RESUME'
  | 'ABORT';

// ============================================================================
// RBAC - ROLE-BASED ACCESS CONTROL
// ============================================================================

/**
 * Enterprise RBAC System
 * Fine-grained permissions with conditions and approval workflows
 */
export interface IRBACManager {
  // Role management
  registerRole(role: Role): void;
  getRole(roleId: string): Role | undefined;
  listRoles(): Role[];
  
  // Permission checking
  hasPermission(identity: AgentIdentity, permission: Permission): boolean;
  checkPermission(identity: AgentIdentity, permission: Permission): PermissionCheckResult;
  
  // Veto checking
  canVeto(identity: AgentIdentity, gate: string): boolean;
  
  // Approval workflows
  requestApproval(request: ApprovalRequest): Promise<ApprovalRequestResult>;
  getPendingApprovals(roleId?: string): ApprovalRequest[];
}

export interface Permission {
  resource: 'gate' | 'phase' | 'artifact' | 'task' | 'deployment' | 'evidence' | 'audit';
  action: 'execute' | 'approve' | 'veto' | 'view' | 'create' | 'delete' | 'modify';
  scope: 'project' | 'organization' | 'global';
  conditions?: PermissionConditions;
}

export interface PermissionConditions {
  requireSecondaryApproval?: string[];  // Role IDs that must also approve
  escalationThreshold?: number;          // Auto-escalate after N failures
  timeWindow?: number;                   // Approval only valid for X hours
  requireEvidence?: string[];           // Required evidence types
  maxRiskLevel?: 'low' | 'medium' | 'high'; // Max risk level allowed
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  vetoGates?: string[];
  approvalRequired?: string[];
  conditions?: RoleConditions;
}

export interface RoleConditions {
  maxConcurrentTasks?: number;
  allowedHours?: { start: number; end: number }; // 24h format
  requireHumanOversight?: boolean;
}

export interface AgentIdentity {
  roleId: string;
  agentId: string;
  agentName: string;
  credentials: JWTCredentials;
  sessionId: string;
  issuedAt: number;
  expiresAt: number;
  signature: string;
}

export interface JWTCredentials {
  token: string;
  algorithm: 'RS256' | 'ES256';
  publicKey: string;
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  requiredApprovals?: string[];
  conditions?: PermissionConditions;
}

export interface ApprovalRequest {
  id: string;
  requester: AgentIdentity;
  action: string;
  resource: string;
  evidence: Evidence[];
  requestedAt: number;
  timeout: number;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  approvers: ApproverDecision[];
}

export interface ApproverDecision {
  roleId: string;
  agentId?: string;
  decision: 'approved' | 'rejected';
  timestamp: number;
  signature: string;
  comments?: string;
}

export interface ApprovalRequestResult {
  requestId: string;
  status: 'submitted' | 'auto_approved' | 'rejected';
  requiredApprovers: string[];
  estimatedResponseTime: number;
}

// ============================================================================
// AUDIT TRAIL
// ============================================================================

/**
 * Immutable Audit Trail
 * Tamper-evident logging with hash chain verification
 */
export interface IAuditTrail {
  // Recording
  record(event: AuditEvent): Promise<AuditRecord>;
  recordAgentAction(action: AgentAction): Promise<AuditRecord>;
  recordStateTransition(transition: StateTransition): Promise<AuditRecord>;
  recordEvidenceCollected(evidence: Evidence): Promise<AuditRecord>;
  
  // Querying
  getRecords(filter: AuditFilter): Promise<AuditRecord[]>;
  getRecordsByProject(projectId: string): Promise<AuditRecord[]>;
  getRecordsByAgent(agentId: string): Promise<AuditRecord[]>;
  getRecordsByPhase(phase: EnterprisePhase): Promise<AuditRecord[]>;
  
  // Verification
  verifyIntegrity(): Promise<IntegrityReport>;
  verifyChain(fromRecordId?: string): Promise<ChainVerificationResult>;
  generateComplianceReport(framework: ComplianceFramework): Promise<ComplianceReport>;
}

export interface AuditEvent {
  type: string;
  actor: string;
  action: string;
  resource: string;
  projectId: string;
  phase: EnterprisePhase;
  metadata: Record<string, unknown>;
  timestamp: number;
}

export interface AuditRecord {
  id: string;
  event: AuditEvent;
  evidenceHash: string;
  signature: string;
  previousHash: string;
  chainIndex: number;
}

export interface AgentAction {
  agentId: string;
  roleId: string;
  action: string;
  taskId?: string;
  input: unknown;
  output: unknown;
  duration: number;
  success: boolean;
  error?: string;
  evidenceIds: string[];
}

export interface AuditFilter {
  projectId?: string;
  agentId?: string;
  phase?: EnterprisePhase;
  eventType?: string;
  startTime?: number;
  endTime?: number;
  limit?: number;
  offset?: number;
}

export interface IntegrityReport {
  valid: boolean;
  totalRecords: number;
  invalidRecords: string[];
  chainBreaks: ChainBreak[];
  lastVerified: number;
}

export interface ChainBreak {
  index: number;
  recordId: string;
  expectedHash: string;
  actualHash: string;
}

export interface ChainVerificationResult {
  valid: boolean;
  startRecord: string;
  endRecord: string;
  recordCount: number;
  breaks: ChainBreak[];
}

export type ComplianceFramework = 'SOC2' | 'GDPR' | 'HIPAA' | 'ISO27001' | 'PCI DSS';

export interface ComplianceReport {
  framework: ComplianceFramework;
  generatedAt: number;
  period: { start: number; end: number };
  controls: ControlStatus[];
  summary: {
    totalControls: number;
    compliant: number;
    nonCompliant: number;
    partial: number;
  };
  evidence: Evidence[];
}

export interface ControlStatus {
  controlId: string;
  controlName: string;
  status: 'compliant' | 'non_compliant' | 'partial';
  evidenceCount: number;
  lastVerified: number;
  notes?: string;
}

// ============================================================================
// DOMAIN ORCHESTRATORS
// ============================================================================

/**
 * Security Domain Orchestrator
 * Manages all security-related activities and gates
 */
export interface ISecurityDomainOrchestrator {
  readonly stateMachine: IEnterpriseStateMachine;
  readonly auditTrail: IAuditTrail;
  
  // Threat modeling
  initiateThreatModeling(context: SecurityContext): Promise<ThreatModelResult>;
  updateThreatModel(modelId: string, updates: ThreatModelUpdate): Promise<void>;
  
  // Security scanning
  runSASTScan(codebasePath: string): Promise<SASTScanResult>;
  runSCAScan(dependencies: Dependency[]): Promise<SCAScanResult>;
  runSecretsScan(repositoryPath: string): Promise<SecretsScanResult>;
  runIACScan(infraPath: string): Promise<IACScanResult>;
  runContainerScan(imageName: string): Promise<ContainerScanResult>;
  runDASTScan(targetUrl: string): Promise<DASTScanResult>;
  
  // Security gates
  evaluateSecurityGate(gateId: string, evidence: Evidence[]): Promise<GateEvaluationResult>;
  getSecurityPosture(): SecurityPosture;
  
  // Incident response
  createIncident(vulnerability: Vulnerability): Promise<SecurityIncident>;
  updateIncident(incidentId: string, update: IncidentUpdate): Promise<void>;
}

export interface SecurityContext {
  projectId: string;
  architecture: string;
  dataFlows: DataFlow[];
  trustBoundaries: TrustBoundary[];
  assets: Asset[];
}

export interface ThreatModelResult {
  modelId: string;
  threats: Threat[];
  mitigations: Mitigation[];
  riskScore: number;
  evidence: Evidence[];
}

export interface SecurityScanResult {
  scanId: string;
  scanner: string;
  findings: SecurityFinding[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  evidence: Evidence;
}

export type SASTScanResult = SecurityScanResult;
export type SCAScanResult = SecurityScanResult;
export type SecretsScanResult = SecurityScanResult;
export type IACScanResult = SecurityScanResult;
export type ContainerScanResult = SecurityScanResult;
export type DASTScanResult = SecurityScanResult;

export interface SecurityFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  title: string;
  description: string;
  location?: {
    file: string;
    line: number;
    column: number;
  };
  remediation?: string;
  cwe?: string;
  cvss?: number;
}

export interface SecurityPosture {
  overallScore: number;
  lastScan: number;
  openFindings: number;
  criticalOpen: number;
  gatesStatus: Record<string, 'passed' | 'failed' | 'pending'>;
  complianceStatus: Record<string, boolean>;
}

// ============================================================================

/**
 * Feature Domain Orchestrator
 * Manages feature development lifecycle
 */
export interface IFeatureDomainOrchestrator {
  readonly stateMachine: IEnterpriseStateMachine;
  readonly auditTrail: IAuditTrail;
  readonly backlog: IBacklogManager;
  
  // Feature lifecycle
  planFeature(request: FeaturePlanRequest): Promise<FeaturePlanResult>;
  startImplementation(featureId: string): Promise<void>;
  requestReview(featureId: string): Promise<void>;
  completeFeature(featureId: string): Promise<FeatureCompletionResult>;
  
  // Task management
  createTask(featureId: string, task: TaskDefinition): Promise<Task>;
  assignTask(taskId: string, agentId: string): Promise<void>;
  completeTask(taskId: string, evidence: Evidence[]): Promise<void>;
  failTask(taskId: string, reason: string): Promise<void>;
  
  // Code generation integration
  generateCode(taskId: string, spec: CodeSpec): Promise<CodeGenerationResult>;
  reviewCode(codeId: string): Promise<CodeReviewResult>;
}

export interface FeaturePlanRequest {
  title: string;
  description: string;
  acceptanceCriteria: string[];
  estimatedComplexity: 'low' | 'medium' | 'high';
  dependencies: string[];
}

export interface FeaturePlanResult {
  featureId: string;
  tasks: Task[];
  estimatedDuration: number;
  assignedAgents: string[];
  riskAssessment: RiskAssessment;
}

export interface Task {
  id: string;
  featureId: string;
  title: string;
  description: string;
  role: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
  evidence: string[];
  createdAt: number;
  updatedAt: number;
}

export interface TaskDefinition {
  title: string;
  description: string;
  role: string;
  priority: 'low' | 'medium' | 'high';
  estimatedHours: number;
  dependencies?: string[];
}

export interface CodeSpec {
  language: string;
  framework?: string;
  requirements: string[];
  constraints: string[];
  testRequirements: string[];
}

export interface CodeGenerationResult {
  success: boolean;
  files: GeneratedFile[];
  tests: GeneratedFile[];
  documentation: string;
  evidence: Evidence[];
}

export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

export interface CodeReviewResult {
  approved: boolean;
  findings: ReviewFinding[];
  suggestions: string[];
  reviewer: string;
}

export interface ReviewFinding {
  severity: 'critical' | 'major' | 'minor';
  category: string;
  message: string;
  location: string;
}

// ============================================================================

/**
 * Release Domain Orchestrator
 * Manages deployment and release processes
 */
export interface IReleaseDomainOrchestrator {
  readonly stateMachine: IEnterpriseStateMachine;
  readonly auditTrail: IAuditTrail;
  
  // Deployment
  createDeploymentPlan(request: DeploymentPlanRequest): Promise<DeploymentPlan>;
  executeDeployment(planId: string): Promise<DeploymentResult>;
  validateDeployment(deploymentId: string): Promise<ValidationResult>;
  
  // Rollback
  initiateRollback(deploymentId: string, reason: string): Promise<RollbackResult>;
  validateRollback(deploymentId: string): Promise<ValidationResult>;
  
  // Strategies
  setDeploymentStrategy(strategy: DeploymentStrategy): void;
  canaryDeployment(deploymentId: string, percentage: number): Promise<void>;
  promoteCanary(deploymentId: string): Promise<void>;
  
  // Monitoring
  getDeploymentStatus(deploymentId: string): DeploymentStatus;
  getHealthMetrics(deploymentId: string): HealthMetrics;
}

export interface DeploymentPlanRequest {
  environment: 'dev' | 'staging' | 'production';
  artifacts: string[];
  strategy: DeploymentStrategy;
  rollbackPolicy: RollbackPolicy;
  healthChecks: HealthCheckConfig[];
}

export type DeploymentStrategy = 
  | 'blue_green'
  | 'canary'
  | 'rolling'
  | 'recreate'
  | 'feature_flags';

export interface DeploymentPlan {
  planId: string;
  environment: string;
  steps: DeploymentStep[];
  estimatedDuration: number;
  rollbackSteps: DeploymentStep[];
}

export interface DeploymentStep {
  id: string;
  type: 'deploy' | 'test' | 'wait' | 'approve' | 'notify';
  description: string;
  timeout: number;
  dependencies: string[];
}

export interface DeploymentResult {
  deploymentId: string;
  status: 'success' | 'failure' | 'in_progress';
  stepsCompleted: number;
  totalSteps: number;
  evidence: Evidence[];
  errors?: string[];
}

export interface RollbackPolicy {
  automatic: boolean;
  triggers: RollbackTrigger[];
  maxRetries: number;
  approvalRequired: boolean;
}

export interface RollbackTrigger {
  metric: string;
  threshold: number;
  duration: number;
}

export interface RollbackResult {
  rollbackId: string;
  deploymentId: string;
  status: 'success' | 'failure' | 'in_progress';
  previousVersion: string;
  evidence: Evidence[];
}

export interface DeploymentStatus {
  deploymentId: string;
  state: 'pending' | 'deploying' | 'validating' | 'complete' | 'failed' | 'rolling_back';
  progress: number;
  currentStep: string;
  startTime: number;
  estimatedEndTime: number;
}

export interface HealthMetrics {
  errorRate: number;
  latency: { p50: number; p95: number; p99: number };
  throughput: number;
  cpuUsage: number;
  memoryUsage: number;
  customMetrics: Record<string, number>;
}

// ============================================================================
// EVIDENCE MANAGEMENT
// ============================================================================

/**
 * Enterprise Evidence Management
 * Cryptographic signing and chain of custody
 */
export interface IEvidenceManager {
  // Collection
  collect(evidence: EvidenceInput): Promise<Evidence>;
  collectFromCI(ciRunId: string, artifacts: string[]): Promise<Evidence[]>;
  collectFromScan(scanner: string, results: unknown): Promise<Evidence>;
  
  // Retrieval
  getEvidence(id: string): Promise<Evidence | null>;
  getEvidenceByProject(projectId: string): Promise<Evidence[]>;
  getEvidenceByPhase(projectId: string, phase: EnterprisePhase): Promise<Evidence[]>;
  getEvidenceByGate(projectId: string, gate: string): Promise<Evidence[]>;
  
  // Verification
  verifyEvidence(id: string): Promise<EvidenceVerificationResult>;
  verifyChain(evidenceIds: string[]): Promise<ChainVerificationResult>;
  
  // Compliance
  getEvidenceForCompliance(framework: ComplianceFramework): Promise<Evidence[]>;
  exportEvidencePackage(filter: EvidenceFilter): Promise<EvidencePackage>;
}

export interface Evidence {
  id: string;
  project_id: string;
  phase: EnterprisePhase;
  gate: string | null;
  task_id: string | null;
  type: EvidenceType;
  name: string;
  description: string | null;
  file_path: string | null;
  file_hash: string;
  ci_run_id: string | null;
  ci_url: string | null;
  content_json: string | null;
  content_summary: string | null;
  created_at: number;
  created_by: string;
  signature: string;
  previous_evidence_id: string | null;
  
  // Enterprise
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  retention_policy: string;
  compliance_frameworks: string[];
  tags: string[];
}

export type EvidenceType =
  | 'file'
  | 'ci_job'
  | 'test_report'
  | 'vuln_report'
  | 'audit_report'
  | 'config_ref'
  | 'doc_ref'
  | 'screenshot'
  | 'sast_report'
  | 'sca_report'
  | 'secrets_report'
  | 'iac_report'
  | 'container_report'
  | 'dast_report'
  | 'threat_model'
  | 'architecture_review'
  | 'compliance_attestation';

export interface EvidenceInput {
  project_id: string;
  phase: EnterprisePhase;
  type: EvidenceType;
  name: string;
  content: Buffer | string;
  metadata?: Record<string, unknown>;
}

export interface EvidenceVerificationResult {
  evidenceId: string;
  valid: boolean;
  signatureValid: boolean;
  hashValid: boolean;
  chainValid: boolean;
  timestamp: number;
}

export interface EvidenceFilter {
  projectId?: string;
  phase?: EnterprisePhase;
  gate?: string;
  type?: EvidenceType;
  startDate?: number;
  endDate?: number;
  complianceFramework?: ComplianceFramework;
}

export interface EvidencePackage {
  id: string;
  createdAt: number;
  evidence: Evidence[];
  auditTrail: AuditRecord[];
  manifest: EvidenceManifest;
  signature: string;
}

export interface EvidenceManifest {
  packageId: string;
  evidenceCount: number;
  totalSize: number;
  complianceFrameworks: string[];
  hashAlgorithm: string;
  evidenceHashes: Record<string, string>;
}

// ============================================================================
// GATES AND VALIDATION
// ============================================================================

/**
 * Enterprise Gate System
 * Extensible validation with risk assessment
 */
export interface IGateSystem {
  // Gate management
  registerGate(gate: GateDefinition): void;
  getGate(gateId: string): GateDefinition | undefined;
  listGates(phase?: EnterprisePhase): GateDefinition[];
  
  // Evaluation
  evaluateGate(gateId: string, context: GateContext): Promise<GateEvaluationResult>;
  evaluateAllGates(phase: EnterprisePhase, context: GateContext): Promise<GateEvaluationSummary>;
  
  // Validators
  registerValidator(name: string, validator: Validator): void;
  getValidator(name: string): Validator | undefined;
  
  // Risk assessment
  assessRisk(context: RiskContext): RiskAssessment;
}

export interface GateDefinition {
  id: string;
  name: string;
  description: string;
  phase: EnterprisePhase;
  required: boolean;
  checks: GateCheckDefinition[];
  approvalRequired?: string[];
  autoFailConditions?: AutoFailCondition[];
}

export interface GateCheckDefinition {
  id: string;
  name: string;
  evidenceType: EvidenceType;
  validator?: string;
  validatorParams?: Record<string, unknown>;
  mustMatch?: string[];
  required: boolean;
}

export interface GateContext {
  projectId: string;
  phase: EnterprisePhase;
  evidence: Evidence[];
  artifacts: Record<string, string>;
  riskAssessment: RiskAssessment;
}

export interface GateEvaluationResult {
  gateId: string;
  phase: EnterprisePhase;
  status: 'passed' | 'failed' | 'error' | 'pending_approval';
  checks: GateCheckResult[];
  evidenceIds: string[];
  timestamp: number;
  evaluatedBy: string;
  riskLevel: 'low' | 'medium' | 'high';
  requiredApprovals?: string[];
}

export interface GateCheckResult {
  checkId: string;
  status: 'passed' | 'failed' | 'error' | 'missing';
  evidenceId?: string;
  message: string;
  details?: unknown;
}

export interface GateEvaluationSummary {
  phase: EnterprisePhase;
  totalGates: number;
  passed: number;
  failed: number;
  pending: number;
  results: GateEvaluationResult[];
  canProceed: boolean;
}

export interface Validator {
  name: string;
  validate(evidence: Evidence, params?: Record<string, unknown>): Promise<ValidationResult>;
}

export interface ValidationResult {
  status: 'passed' | 'failed' | 'error';
  message: string;
  details?: unknown;
}

export interface AutoFailCondition {
  type: 'finding_severity' | 'finding_count' | 'test_coverage' | 'custom';
  threshold: number | string;
  scope: string;
}

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  factors: RiskFactor[];
  mitigationRequired: boolean;
}

export interface RiskFactor {
  category: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  mitigation?: string;
}

export interface RiskContext {
  filesChanged: string[];
  linesChanged: number;
  dependencies: string[];
  securityImpact: boolean;
  complianceImpact: boolean;
  breakingChange: boolean;
  testCoverage: number;
}

// ============================================================================
// COMPLIANCE FRAMEWORKS
// ============================================================================

/**
 * Compliance Automation
 * Framework-specific evidence collection and reporting
 */
export interface IComplianceManager {
  // Framework management
  registerFramework(framework: ComplianceFrameworkConfig): void;
  getFramework(name: ComplianceFramework): ComplianceFrameworkConfig | undefined;
  
  // Evidence collection
  collectEvidenceForFramework(framework: ComplianceFramework): Promise<Evidence[]>;
  mapEvidenceToControl(evidenceId: string, controlId: string): void;
  
  // Reporting
  generateReport(framework: ComplianceFramework, period: DateRange): Promise<ComplianceReport>;
  getControlStatus(framework: ComplianceFramework, controlId: string): ControlStatus;
  
  // Monitoring
  startContinuousMonitoring(framework: ComplianceFramework): void;
  getComplianceDrift(framework: ComplianceFramework): ComplianceDrift[];
}

export interface ComplianceFrameworkConfig {
  name: ComplianceFramework;
  version: string;
  controls: ControlDefinition[];
  evidenceRequirements: EvidenceRequirement[];
  reportingPeriod: 'monthly' | 'quarterly' | 'annual';
}

export interface ControlDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  evidenceTypes: EvidenceType[];
  validationRules: ValidationRule[];
}

export interface EvidenceRequirement {
  controlId: string;
  evidenceType: EvidenceType;
  frequency: 'continuous' | 'daily' | 'weekly' | 'monthly';
  retention: number; // days
}

export interface ValidationRule {
  type: 'presence' | 'format' | 'threshold' | 'custom';
  params: Record<string, unknown>;
}

export interface DateRange {
  start: number;
  end: number;
}

export interface ComplianceDrift {
  controlId: string;
  framework: ComplianceFramework;
  previousStatus: 'compliant' | 'non_compliant' | 'partial';
  currentStatus: 'compliant' | 'non_compliant' | 'partial';
  detectedAt: number;
  evidence: Evidence[];
}

// ============================================================================
// HUMAN-IN-THE-LOOP
// ============================================================================

/**
 * Human Escalation and Approval System
 */
export interface IHumanInTheLoop {
  // Escalation
  escalate(request: EscalationRequest): Promise<EscalationResult>;
  getPendingEscalations(): EscalationRequest[];
  respondToEscalation(escalationId: string, response: HumanResponse): Promise<void>;
  
  // Notifications
  notify(notification: Notification): Promise<void>;
  configureNotificationChannel(channel: NotificationChannel): void;
}

export interface EscalationRequest {
  id: string;
  type: 'approval' | 'review' | 'decision' | 'incident';
  priority: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  details: string;
  evidence: Evidence[];
  context: {
    projectId: string;
    phase: EnterprisePhase;
    gate?: string;
    riskLevel: string;
  };
  requestedRoles: string[];
  timeout: number;
  requestedAt: number;
}

export interface EscalationResult {
  escalationId: string;
  status: 'submitted' | 'auto_resolved';
  assignedTo?: string;
  estimatedResponseTime: number;
}

export interface HumanResponse {
  decision: 'approve' | 'reject' | 'request_info' | 'escalate';
  responder: string;
  comments: string;
  signature: string;
  timestamp: number;
}

export interface Notification {
  id: string;
  type: 'escalation' | 'alert' | 'update' | 'report';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  recipients: string[];
  channels: NotificationChannelType[];
  evidence?: Evidence[];
}

export type NotificationChannelType = 'slack' | 'email' | 'teams' | 'webhook' | 'tui';

export interface NotificationChannel {
  type: NotificationChannelType;
  config: SlackConfig | EmailConfig | TeamsConfig | WebhookConfig;
}

export interface SlackConfig {
  webhookUrl: string;
  channel: string;
  username: string;
}

export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  username: string;
  password: string;
  from: string;
}

export interface TeamsConfig {
  webhookUrl: string;
}

export interface WebhookConfig {
  url: string;
  headers: Record<string, string>;
}

// ============================================================================
// BACKLOG MANAGEMENT
// ============================================================================

/**
 * Enterprise Backlog Management
 */
export interface IBacklogManager {
  // Items
  createItem(item: BacklogItemInput): Promise<BacklogItem>;
  updateItem(itemId: string, updates: Partial<BacklogItem>): Promise<void>;
  deleteItem(itemId: string): Promise<void>;
  getItem(itemId: string): Promise<BacklogItem | null>;
  
  // Querying
  listItems(filter?: BacklogFilter): Promise<BacklogItem[]>;
  getItemsByPhase(phase: EnterprisePhase): Promise<BacklogItem[]>;
  getItemsByAssignee(agentId: string): Promise<BacklogItem[]>;
  
  // Prioritization
  prioritize(itemIds: string[]): void;
  getPrioritizedList(): BacklogItem[];
}

export interface BacklogItem {
  id: string;
  projectId: string;
  title: string;
  description: string;
  type: 'feature' | 'bug' | 'task' | 'spike';
  status: 'backlog' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  phase: EnterprisePhase;
  assignedTo?: string;
  storyPoints?: number;
  estimatedHours?: number;
  tags: string[];
  dependencies: string[];
  acceptanceCriteria: string[];
  evidence: string[];
  createdAt: number;
  updatedAt: number;
}

export interface BacklogItemInput {
  title: string;
  description: string;
  type: 'feature' | 'bug' | 'task' | 'spike';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  phase?: EnterprisePhase;
  storyPoints?: number;
  tags?: string[];
  acceptanceCriteria?: string[];
}

export interface BacklogFilter {
  status?: string;
  priority?: string;
  phase?: EnterprisePhase;
  assignedTo?: string;
  tags?: string[];
}

// ============================================================================
// PROJECT CONFIGURATION
// ============================================================================

export interface ProjectConfig {
  id: string;
  name: string;
  repoRoot: string;
  stakeholders: Stakeholder[];
  environments: string[];
  complianceTargets: ComplianceFramework[];
  riskTolerance: 'low' | 'medium' | 'high';
  
  // Security
  securityPolicy: SecurityPolicy;
  
  // Compliance
  compliancePolicy: CompliancePolicy;
  
  // Deployment
  deploymentPolicy: DeploymentPolicy;
  
  // Automation
  automationLevel: 'full' | 'assisted' | 'review_all';
  humanEscalationRules: HumanEscalationRule[];
}

export interface Stakeholder {
  role: string;
  name: string;
  email: string;
  slackHandle?: string;
  notificationPreferences: NotificationPreference[];
}

export interface NotificationPreference {
  eventType: string;
  channels: NotificationChannelType[];
}

export interface SecurityPolicy {
  sastEnabled: boolean;
  scaEnabled: boolean;
  secretsScanEnabled: boolean;
  iacScanEnabled: boolean;
  containerScanEnabled: boolean;
  dastEnabled: boolean;
  blockOnSeverity: ('critical' | 'high' | 'medium')[];
}

export interface CompliancePolicy {
  frameworks: ComplianceFramework[];
  evidenceRetentionDays: number;
  auditFrequency: 'continuous' | 'monthly' | 'quarterly';
  autoGenerateReports: boolean;
}

export interface DeploymentPolicy {
  requireApproval: boolean;
  approvalRoles: string[];
  deploymentStrategies: DeploymentStrategy[];
  rollbackAutomatic: boolean;
  healthCheckTimeout: number;
}

export interface HumanEscalationRule {
  trigger: 'risk_level' | 'gate_failure' | 'security_finding' | 'compliance_drift' | 'manual';
  condition: string;
  notifyRoles: string[];
  timeout: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface StateSnapshot {
  phase: EnterprisePhase;
  parallelStates: ParallelState[];
  context: StateContext;
  timestamp: number;
}

export interface StateContext {
  project: ProjectConfig;
  artifacts: Record<string, string | null>;
  backlog: { items: BacklogItem[] };
  current_phase: EnterprisePhase;
  current_feature_id: string | null;
  iteration: {
    phase_iteration: number;
    remediation_iteration: number;
  };
  evidence: { items: Evidence[] };
  last_gate_results: Record<string, GateEvaluationResult>;
}

export interface DomainResponse {
  domain: DomainType;
  success: boolean;
  result?: unknown;
  error?: string;
  evidence: Evidence[];
}

export interface HumanEscalationRequest {
  type: 'approval' | 'review' | 'decision';
  summary: string;
  details: string;
  evidence: Evidence[];
  requiredRoles: string[];
  timeout: number;
}

export interface HumanEscalationResponse {
  approved: boolean;
  responder: string;
  comments: string;
  signature: string;
  timestamp: number;
}

export interface FeatureCompletionResult {
  featureId: string;
  success: boolean;
  evidence: Evidence[];
  nextSteps: string[];
}

// Supporting types for security domain
interface Threat {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
}

interface Mitigation {
  threatId: string;
  description: string;
  status: 'planned' | 'implemented' | 'verified';
}

interface DataFlow {
  id: string;
  source: string;
  destination: string;
  dataType: string;
  protocol: string;
}

interface TrustBoundary {
  id: string;
  name: string;
  components: string[];
}

interface Asset {
  id: string;
  name: string;
  type: string;
  sensitivity: 'high' | 'medium' | 'low';
}

interface ThreatModelUpdate {
  threats?: Threat[];
  mitigations?: Mitigation[];
}

interface Dependency {
  name: string;
  version: string;
  type: 'direct' | 'transitive';
}

interface Vulnerability {
  id: string;
  cve?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  component: string;
  description: string;
}

interface SecurityIncident {
  id: string;
  vulnerability: Vulnerability;
  status: 'open' | 'investigating' | 'mitigated' | 'closed';
  createdAt: number;
}

interface IncidentUpdate {
  status?: 'open' | 'investigating' | 'mitigated' | 'closed';
  notes?: string;
  assignedTo?: string;
}

interface HealthCheckConfig {
  type: 'http' | 'tcp' | 'custom';
  endpoint?: string;
  expectedStatus?: number;
  timeout: number;
  retries: number;
}

// Export all types
export {};
