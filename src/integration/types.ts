export const UNIFIED_STATE_VERSION = 1;

export type WorkflowStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed';
export type RuntimeStatus = 'idle' | 'running' | 'waiting' | 'completed' | 'failed';

export interface TransitionContext {
  projectId: string;
  runId: string;
  sessionId: string;
}

export interface UnifiedStateMetadata extends TransitionContext {
  createdAt: number;
  updatedAt: number;
  transitionCount: number;
}

export interface WorkflowState {
  projectId: string;
  phase: string;
  status: WorkflowStatus;
  lastTransitionAt: number;
  data: Record<string, unknown>;
}

export interface RuntimeState {
  runId: string;
  sessionId: string;
  status: RuntimeStatus;
  activeAgentIds: string[];
  startedAt: number;
  lastHeartbeatAt: number;
  data: Record<string, unknown>;
}

export interface UiState {
  sessionId: string;
  view: string;
  isHydrated: boolean;
  notifications: string[];
  data: Record<string, unknown>;
}

export interface EvidenceItem {
  id: string;
  type: string;
  summary: string;
  createdAt: number;
  source: string;
  data: Record<string, unknown>;
}

export interface EvidenceState {
  items: EvidenceItem[];
  lastUpdatedAt: number;
}

export interface UnifiedState {
  version: number;
  metadata: UnifiedStateMetadata;
  workflow: WorkflowState;
  runtime: RuntimeState;
  ui: UiState;
  evidence: EvidenceState;
}

export type UnifiedStateAction =
  | { type: 'WORKFLOW_SET_PHASE'; phase: string; status?: WorkflowStatus }
  | { type: 'WORKFLOW_PATCH'; patch: Partial<Omit<WorkflowState, 'projectId'>> }
  | { type: 'RUNTIME_PATCH'; patch: Partial<RuntimeState> }
  | { type: 'UI_PATCH'; patch: Partial<UiState> }
  | { type: 'EVIDENCE_ADD'; item: EvidenceItem }
  | { type: 'EVIDENCE_UPSERT'; item: EvidenceItem }
  | { type: 'EVIDENCE_REMOVE'; evidenceId: string }
  | { type: 'HYDRATE_SNAPSHOT'; state: UnifiedState };

export interface StateTransitionMetadata extends TransitionContext {
  source?: string;
  reason?: string;
  timestamp?: number;
}

export interface UnifiedStateTransition {
  id: number;
  actionType: UnifiedStateAction['type'];
  timestamp: number;
  metadata: StateTransitionMetadata;
}

export interface UnifiedStateListener {
  (nextState: UnifiedState, prevState: UnifiedState, transition: UnifiedStateTransition): void;
}

export interface UnifiedStateEventPublisher {
  publish(event: string, payload: unknown): void;
}

export interface SnapshotMetadata extends TransitionContext {
  savedAt: number;
  source?: string;
  label?: string;
}

export interface UnifiedStateSnapshot {
  snapshotId: string;
  metadata: SnapshotMetadata;
  state: UnifiedState;
}

export interface SnapshotDescriptor {
  snapshotId: string;
  projectId: string;
  runId: string;
  sessionId: string;
  savedAt: number;
  version: number;
}

export interface UnifiedStatePersistenceAdapter {
  saveSnapshot(state: UnifiedState, metadata: SnapshotMetadata): Promise<UnifiedStateSnapshot>;
  loadLatestSnapshot(projectId: string): Promise<UnifiedStateSnapshot | null>;
  listSnapshots(projectId: string): Promise<SnapshotDescriptor[]>;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

function asEvidenceItems(value: unknown): EvidenceItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const items: EvidenceItem[] = [];
  for (const entry of value) {
    const record = asRecord(entry);
    items.push({
      id: asString(record.id, ''),
      type: asString(record.type, 'unknown'),
      summary: asString(record.summary, ''),
      createdAt: asNumber(record.createdAt, 0),
      source: asString(record.source, 'unknown'),
      data: asRecord(record.data),
    });
  }

  return items.filter((item) => item.id.length > 0);
}

export function createInitialUnifiedState(context: TransitionContext, now: number = Date.now()): UnifiedState {
  return {
    version: UNIFIED_STATE_VERSION,
    metadata: {
      projectId: context.projectId,
      runId: context.runId,
      sessionId: context.sessionId,
      createdAt: now,
      updatedAt: now,
      transitionCount: 0,
    },
    workflow: {
      projectId: context.projectId,
      phase: 'idle',
      status: 'idle',
      lastTransitionAt: now,
      data: {},
    },
    runtime: {
      runId: context.runId,
      sessionId: context.sessionId,
      status: 'idle',
      activeAgentIds: [],
      startedAt: now,
      lastHeartbeatAt: now,
      data: {},
    },
    ui: {
      sessionId: context.sessionId,
      view: 'home',
      isHydrated: false,
      notifications: [],
      data: {},
    },
    evidence: {
      items: [],
      lastUpdatedAt: now,
    },
  };
}

export function migrateUnifiedState(input: unknown, fallbackContext: TransitionContext, now: number = Date.now()): UnifiedState {
  const root = asRecord(input);
  const version = asNumber(root.version, 0);

  if (version > UNIFIED_STATE_VERSION) {
    throw new Error(`Unsupported unified state version: ${version}`);
  }

  const metadataRecord = asRecord(root.metadata);
  const workflowRecord = asRecord(root.workflow);
  const runtimeRecord = asRecord(root.runtime);
  const uiRecord = asRecord(root.ui);
  const evidenceRecord = asRecord(root.evidence);

  const projectId = asString(
    metadataRecord.projectId,
    asString(workflowRecord.projectId, fallbackContext.projectId),
  );
  const runId = asString(metadataRecord.runId, asString(runtimeRecord.runId, fallbackContext.runId));
  const sessionId = asString(
    metadataRecord.sessionId,
    asString(uiRecord.sessionId, asString(runtimeRecord.sessionId, fallbackContext.sessionId)),
  );

  const createdAt = asNumber(metadataRecord.createdAt, now);
  const updatedAt = asNumber(metadataRecord.updatedAt, now);

  return {
    version: UNIFIED_STATE_VERSION,
    metadata: {
      projectId,
      runId,
      sessionId,
      createdAt,
      updatedAt,
      transitionCount: asNumber(metadataRecord.transitionCount, 0),
    },
    workflow: {
      projectId,
      phase: asString(workflowRecord.phase, 'idle'),
      status: asString(workflowRecord.status, 'idle') as WorkflowStatus,
      lastTransitionAt: asNumber(workflowRecord.lastTransitionAt, updatedAt),
      data: asRecord(workflowRecord.data),
    },
    runtime: {
      runId,
      sessionId,
      status: asString(runtimeRecord.status, 'idle') as RuntimeStatus,
      activeAgentIds: asStringArray(runtimeRecord.activeAgentIds),
      startedAt: asNumber(runtimeRecord.startedAt, createdAt),
      lastHeartbeatAt: asNumber(runtimeRecord.lastHeartbeatAt, updatedAt),
      data: asRecord(runtimeRecord.data),
    },
    ui: {
      sessionId,
      view: asString(uiRecord.view, 'home'),
      isHydrated: Boolean(uiRecord.isHydrated),
      notifications: asStringArray(uiRecord.notifications),
      data: asRecord(uiRecord.data),
    },
    evidence: {
      items: asEvidenceItems(evidenceRecord.items),
      lastUpdatedAt: asNumber(evidenceRecord.lastUpdatedAt, updatedAt),
    },
  };
}
