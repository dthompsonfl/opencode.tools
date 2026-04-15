import { EventBus } from './event-bus';
import {
  CoworkDomainStore,
  WorkspaceSnapshotRecord,
  initializeCoworkPersistence,
} from '../persistence';
import { logger } from '../../runtime/logger';

/**
 * Shared Context (Blackboard) for real-time collaboration.
 */

export interface Artifact<T = unknown> {
  id: string;
  type: string;
  key: string;
  data: T;
  source: string;
  timestamp: string;
  workspaceId: string;
  version: number;
}

export interface FeedbackEntry {
  id: string;
  from: string;
  targetId: string;
  content: string;
  severity: 'nit' | 'blocking' | 'critical';
  status: 'pending' | 'addressed';
  timestamp: string;
  workspaceId: string;
}

export type ProjectStatus = 'drafting' | 'planning' | 'implementing' | 'validating' | 'completed' | 'failed';

export class Blackboard {
  private static instance: Blackboard | null = null;

  private artifacts: Map<string, Artifact> = new Map();
  private artifactVersions: Map<string, number> = new Map();
  private feedbacks: FeedbackEntry[] = [];
  private state: ProjectStatus = 'drafting';
  private eventBus: EventBus;
  private persistenceStore: CoworkDomainStore | null = null;
  private pendingPersistenceWrites: Set<Promise<void>> = new Set();

  private constructor() {
    this.eventBus = EventBus.getInstance();
  }

  public static getInstance(): Blackboard {
    if (!Blackboard.instance) {
      Blackboard.instance = new Blackboard();
    }
    return Blackboard.instance;
  }

  public static resetForTests(): void {
    if (!Blackboard.instance) {
      return;
    }

    Blackboard.instance.artifacts.clear();
    Blackboard.instance.artifactVersions.clear();
    Blackboard.instance.feedbacks = [];
    Blackboard.instance.state = 'drafting';
    Blackboard.instance.persistenceStore = null;
    Blackboard.instance.pendingPersistenceWrites.clear();
    Blackboard.instance = null;
  }

  public async configurePersistence(
    store?: CoworkDomainStore,
    options: {
      hydrateFromStore?: boolean;
      initializeRuntime?: boolean;
      startDispatcher?: boolean;
    } = {},
  ): Promise<void> {
    if (store) {
      this.persistenceStore = store;
    } else if (options.initializeRuntime !== false) {
      this.persistenceStore = await initializeCoworkPersistence();
    }

    if (!this.persistenceStore) {
      return;
    }

    this.eventBus.configurePersistence(this.persistenceStore);
    if (options.startDispatcher !== false) {
      this.eventBus.startDispatcher();
    }

    if (options.hydrateFromStore !== false) {
      await this.hydrateFromPersistence();
    }
  }

  public async flushPersistence(): Promise<void> {
    if (this.pendingPersistenceWrites.size === 0) {
      return;
    }

    await Promise.all([...this.pendingPersistenceWrites]);
  }

  public getArtifact<T>(key: string, workspaceId = 'global'): T | undefined {
    return this.artifacts.get(scopeKey(workspaceId, key))?.data as T | undefined;
  }

  public getAllArtifacts(workspaceId?: string): Artifact[] {
    if (!workspaceId) {
      return Array.from(this.artifacts.values());
    }

    return Array.from(this.artifacts.values()).filter((artifact) => artifact.workspaceId === workspaceId);
  }

  public updateArtifact<T>(
    key: string,
    data: T,
    source: string,
    type: string,
    options: {
      workspaceId?: string;
      expectedVersion?: number;
      metadata?: Record<string, unknown>;
    } = {},
  ): void {
    const workspaceId = options.workspaceId ?? 'global';
    const compositeKey = scopeKey(workspaceId, key);
    const existing = this.artifacts.get(compositeKey);
    const previousVersion = this.artifactVersions.get(compositeKey) ?? 0;
    const nextVersion = previousVersion + 1;

    const artifact: Artifact<T> = {
      id: existing?.id ?? `${type}-${workspaceId}-${key}`,
      type,
      key,
      data,
      source,
      timestamp: new Date().toISOString(),
      workspaceId,
      version: nextVersion,
    };

    this.artifacts.set(compositeKey, artifact as Artifact);
    this.artifactVersions.set(compositeKey, nextVersion);

    this.eventBus.publish(`artifact:updated:${key}`, artifact, {
      aggregateType: 'blackboard',
      aggregateId: artifact.id,
    });
    this.eventBus.publish('artifact:any:updated', artifact, {
      aggregateType: 'blackboard',
      aggregateId: artifact.id,
    });
    this.eventBus.publish(nextVersion === 1 ? 'blackboard:entry:created' : 'blackboard:entry:updated', {
      workspaceId,
      artifactKey: key,
      artifactId: artifact.id,
      artifactType: type,
      source,
      version: nextVersion,
      timestamp: artifact.timestamp,
    }, {
      aggregateType: 'blackboard',
      aggregateId: artifact.id,
    });

    this.persistArtifact(key, artifact as Artifact<Record<string, unknown>>, {
      expectedVersion: options.expectedVersion ?? previousVersion,
      metadata: options.metadata,
    });
  }

  public addFeedback(
    from: string,
    targetId: string,
    content: string,
    severity: FeedbackEntry['severity'],
    options: {
      workspaceId?: string;
      metadata?: Record<string, unknown>;
    } = {},
  ): void {
    const workspaceId = options.workspaceId ?? 'global';
    const feedback: FeedbackEntry = {
      id: `fb-${Date.now()}`,
      from,
      targetId,
      content,
      severity,
      status: 'pending',
      timestamp: new Date().toISOString(),
      workspaceId,
    };
    this.feedbacks.push(feedback);
    this.eventBus.publish('feedback:added', feedback, {
      aggregateType: 'blackboard',
      aggregateId: feedback.id,
    });

    this.persistFeedback(feedback, options.metadata);
  }

  public getFeedbacks(workspaceId?: string): FeedbackEntry[] {
    if (!workspaceId) {
      return [...this.feedbacks];
    }

    return this.feedbacks.filter((feedback) => feedback.workspaceId === workspaceId);
  }

  public transitionTo(newState: ProjectStatus): void {
    const oldState = this.state;
    this.state = newState;
    this.eventBus.publish('state:transition', { from: oldState, to: newState }, {
      aggregateType: 'blackboard',
      aggregateId: 'state',
    });
  }

  public getState(): ProjectStatus {
    return this.state;
  }

  public async createSnapshot(
    workspaceId = 'global',
    createdBy = 'system',
    snapshotType = 'checkpoint',
    metadata: Record<string, unknown> = {},
  ): Promise<WorkspaceSnapshotRecord | null> {
    if (!this.persistenceStore) {
      return null;
    }

    const artifacts = this.getAllArtifacts(workspaceId);
    const feedbacks = this.getFeedbacks(workspaceId);
    const payload = {
      workspaceId,
      state: this.state,
      artifacts,
      feedbacks,
      createdAt: new Date().toISOString(),
    };

    return this.persistenceStore.saveWorkspaceSnapshot({
      workspaceId,
      snapshotType,
      payload,
      metadata,
      createdBy,
    });
  }

  public async listSnapshots(workspaceId = 'global', limit = 25): Promise<WorkspaceSnapshotRecord[]> {
    if (!this.persistenceStore) {
      return [];
    }

    return this.persistenceStore.listWorkspaceSnapshots(workspaceId, limit);
  }

  public clear(): void {
    this.artifacts.clear();
    this.artifactVersions.clear();
    this.feedbacks = [];
    this.state = 'drafting';
  }

  private persistArtifact(
    key: string,
    artifact: Artifact<Record<string, unknown>>,
    options: {
      expectedVersion: number;
      metadata?: Record<string, unknown>;
    },
  ): void {
    if (!this.persistenceStore) {
      return;
    }

    this.schedulePersistence('blackboard:artifact:upsert', async () => {
      await this.persistenceStore?.upsertBlackboardEntry({
        workspaceId: artifact.workspaceId,
        artifactKey: key,
        artifactId: artifact.id,
        artifactType: artifact.type,
        source: artifact.source,
        payload: {
          key,
          data: artifact.data,
          metadata: options.metadata ?? {},
          timestamp: artifact.timestamp,
          version: artifact.version,
        },
        expectedVersion: options.expectedVersion,
        timestamp: artifact.timestamp,
      });
    });
  }

  private persistFeedback(feedback: FeedbackEntry, metadata?: Record<string, unknown>): void {
    if (!this.persistenceStore) {
      return;
    }

    this.schedulePersistence('blackboard:feedback:upsert', async () => {
      await this.persistenceStore?.saveBlackboardFeedback({
        workspaceId: feedback.workspaceId,
        feedbackId: feedback.id,
        targetId: feedback.targetId,
        sourceActor: feedback.from,
        content: feedback.content,
        severity: feedback.severity,
        status: feedback.status,
        metadata: metadata ?? {},
        createdAt: feedback.timestamp,
        updatedAt: feedback.timestamp,
      });
    });
  }

  private schedulePersistence(operation: string, task: () => Promise<void>): void {
    const promise = task()
      .catch((error) => {
        logger.error('[Blackboard] Persistence operation failed', {
          operation,
          error: error instanceof Error ? error.message : String(error),
        });
      })
      .finally(() => {
        this.pendingPersistenceWrites.delete(promise);
      });

    this.pendingPersistenceWrites.add(promise);
  }

  private async hydrateFromPersistence(): Promise<void> {
    if (!this.persistenceStore) {
      return;
    }

    const persistedArtifacts = await this.persistenceStore.listBlackboardEntries();
    const persistedFeedback = new Map<string, FeedbackEntry>();

    this.artifacts.clear();
    this.artifactVersions.clear();
    this.feedbacks = [];

    for (const record of persistedArtifacts) {
      const payload = record.payload;
      const artifact: Artifact = {
        id: record.artifactId,
        type: record.artifactType,
        key: record.artifactKey,
        data: payload.data,
        source: record.source,
        timestamp: record.updatedAt,
        workspaceId: record.workspaceId,
        version: record.version,
      };
      this.artifacts.set(scopeKey(record.workspaceId, record.artifactKey), artifact);
      this.artifactVersions.set(scopeKey(record.workspaceId, record.artifactKey), record.version);
    }

    const workspaceIds = new Set(persistedArtifacts.map((entry) => entry.workspaceId));
    for (const workspaceId of workspaceIds) {
      const feedback = await this.persistenceStore.listBlackboardFeedback(workspaceId);
      for (const entry of feedback) {
        persistedFeedback.set(entry.feedbackId, {
          id: entry.feedbackId,
          from: entry.sourceActor,
          targetId: entry.targetId,
          content: entry.content,
          severity: entry.severity as FeedbackEntry['severity'],
          status: entry.status as FeedbackEntry['status'],
          timestamp: entry.createdAt,
          workspaceId,
        });
      }
    }

    this.feedbacks = [...persistedFeedback.values()];
  }
}

function scopeKey(workspaceId: string, key: string): string {
  return `${workspaceId}::${key}`;
}
