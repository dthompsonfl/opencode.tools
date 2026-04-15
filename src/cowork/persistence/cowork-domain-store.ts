import { randomUUID } from 'crypto';
import { CoworkConfig } from '../config';
import { logger } from '../../runtime/logger';
import { CoworkPersistenceError } from './errors';
import { PostgresPersistenceManager } from './postgres/postgres-manager';
import type { QueryResultRow } from './postgres';

export interface TenantScope {
  tenantId: string;
  ownerId: string;
}

export interface WorkspaceRecord {
  tenantId: string;
  ownerId: string;
  workspaceId: string;
  projectId: string;
  name: string;
  description?: string;
  status: string;
  createdBy: string;
  members: string[];
  artifactMap: Record<string, string>;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  deletedAt?: string;
}

export interface BlackboardEntryRecord {
  tenantId: string;
  ownerId: string;
  workspaceId: string;
  artifactKey: string;
  artifactId: string;
  artifactType: string;
  source: string;
  version: number;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface BlackboardEntryUpsertInput {
  workspaceId: string;
  artifactKey: string;
  artifactId: string;
  artifactType: string;
  source: string;
  payload: Record<string, unknown>;
  expectedVersion?: number;
  timestamp?: string;
}

export interface BlackboardFeedbackRecord {
  tenantId: string;
  ownerId: string;
  workspaceId: string;
  feedbackId: string;
  targetId: string;
  sourceActor: string;
  content: string;
  severity: string;
  status: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceSnapshotRecord {
  tenantId: string;
  ownerId: string;
  workspaceId: string;
  snapshotId: string;
  snapshotType: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
}

export interface EventAppendInput {
  eventId?: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
}

export interface PersistedEventRecord {
  version: number;
  eventId: string;
  tenantId: string;
  ownerId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  occurredAt: string;
  createdAt: string;
}

export interface WorkflowDefinitionRecord {
  tenantId: string;
  definitionId: string;
  version: number;
  name: string;
  triggerEventType: string;
  steps: Array<Record<string, unknown>>;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowInstanceRecord {
  tenantId: string;
  ownerId: string;
  instanceId: string;
  definitionId: string;
  definitionVersion: number;
  status: string;
  currentStepId?: string;
  state: Record<string, unknown>;
  triggerEventId?: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface WorkflowHistoryRecord {
  tenantId: string;
  instanceId: string;
  historyId: string;
  stepId?: string;
  transition: string;
  eventId?: string;
  payload: Record<string, unknown>;
  recordedAt: string;
}

interface WorkspaceRow extends QueryResultRow {
  tenant_id: string;
  owner_id: string;
  workspace_id: string;
  project_id: string;
  name: string;
  description: string | null;
  status: string;
  created_by: string;
  members: unknown;
  artifact_map: unknown;
  metadata: unknown;
  created_at: string | Date;
  updated_at: string | Date;
  closed_at: string | Date | null;
  deleted_at: string | Date | null;
}

interface BlackboardEntryRow extends QueryResultRow {
  tenant_id: string;
  owner_id: string;
  workspace_id: string;
  artifact_key: string;
  artifact_id: string;
  artifact_type: string;
  source: string;
  version: string | number;
  payload: unknown;
  created_at: string | Date;
  updated_at: string | Date;
  deleted_at: string | Date | null;
}

interface BlackboardFeedbackRow extends QueryResultRow {
  tenant_id: string;
  owner_id: string;
  workspace_id: string;
  feedback_id: string;
  target_id: string;
  source_actor: string;
  content: string;
  severity: string;
  status: string;
  metadata: unknown;
  created_at: string | Date;
  updated_at: string | Date;
}

interface SnapshotRow extends QueryResultRow {
  tenant_id: string;
  owner_id: string;
  workspace_id: string;
  snapshot_id: string;
  snapshot_type: string;
  payload: unknown;
  metadata: unknown;
  created_by: string;
  created_at: string | Date;
}

interface EventRow extends QueryResultRow {
  version: string | number;
  event_id: string;
  tenant_id: string;
  owner_id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  payload: unknown;
  metadata: unknown;
  occurred_at: string | Date;
  created_at: string | Date;
}

interface CheckpointRow extends QueryResultRow {
  last_event_version: string | number;
}

interface WorkflowDefinitionRow extends QueryResultRow {
  tenant_id: string;
  definition_id: string;
  version: string | number;
  name: string;
  trigger_event_type: string;
  steps: unknown;
  metadata: unknown;
  created_at: string | Date;
  updated_at: string | Date;
}

interface WorkflowInstanceRow extends QueryResultRow {
  tenant_id: string;
  owner_id: string;
  instance_id: string;
  definition_id: string;
  definition_version: string | number;
  status: string;
  current_step_id: string | null;
  state: unknown;
  trigger_event_id: string | null;
  started_at: string | Date;
  updated_at: string | Date;
  completed_at: string | Date | null;
}

interface WorkflowHistoryRow extends QueryResultRow {
  tenant_id: string;
  instance_id: string;
  history_id: string;
  step_id: string | null;
  transition: string;
  event_id: string | null;
  payload: unknown;
  recorded_at: string | Date;
}

export class CoworkDomainStore {
  constructor(
    private readonly manager: PostgresPersistenceManager,
    private readonly scope: TenantScope,
  ) {}

  public static fromConfig(manager: PostgresPersistenceManager, config: CoworkConfig): CoworkDomainStore {
    return new CoworkDomainStore(manager, {
      tenantId: config.tenant.id,
      ownerId: config.tenant.ownerId,
    });
  }

  public getTenantScope(): TenantScope {
    return {
      tenantId: this.scope.tenantId,
      ownerId: this.scope.ownerId,
    };
  }

  public async upsertWorkspace(record: Omit<WorkspaceRecord, 'tenantId' | 'ownerId'>): Promise<WorkspaceRecord> {
    const now = record.updatedAt || new Date().toISOString();
    const createdAt = record.createdAt || now;
    const result = await this.manager.query<WorkspaceRow>(
      `INSERT INTO cowork_workspace_state (
        tenant_id,
        owner_id,
        workspace_id,
        project_id,
        name,
        description,
        status,
        created_by,
        members,
        artifact_map,
        metadata,
        created_at,
        updated_at,
        closed_at,
        deleted_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11::jsonb, $12::timestamptz, $13::timestamptz, $14::timestamptz, $15::timestamptz
      )
      ON CONFLICT (tenant_id, workspace_id) DO UPDATE SET
        owner_id = EXCLUDED.owner_id,
        project_id = EXCLUDED.project_id,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        status = EXCLUDED.status,
        created_by = EXCLUDED.created_by,
        members = EXCLUDED.members,
        artifact_map = EXCLUDED.artifact_map,
        metadata = EXCLUDED.metadata,
        updated_at = EXCLUDED.updated_at,
        closed_at = EXCLUDED.closed_at,
        deleted_at = EXCLUDED.deleted_at
      RETURNING
        tenant_id,
        owner_id,
        workspace_id,
        project_id,
        name,
        description,
        status,
        created_by,
        members,
        artifact_map,
        metadata,
        created_at,
        updated_at,
        closed_at,
        deleted_at`,
      [
        this.scope.tenantId,
        this.scope.ownerId,
        record.workspaceId,
        record.projectId,
        record.name,
        record.description ?? null,
        record.status,
        record.createdBy,
        record.members,
        record.artifactMap,
        record.metadata,
        createdAt,
        now,
        record.closedAt ?? null,
        record.deletedAt ?? null,
      ],
    );

    return mapWorkspaceRow(result.rows[0]);
  }

  public async getWorkspace(workspaceId: string): Promise<WorkspaceRecord | null> {
    const result = await this.manager.query<WorkspaceRow>(
      `SELECT
        tenant_id,
        owner_id,
        workspace_id,
        project_id,
        name,
        description,
        status,
        created_by,
        members,
        artifact_map,
        metadata,
        created_at,
        updated_at,
        closed_at,
        deleted_at
      FROM cowork_workspace_state
      WHERE tenant_id = $1 AND workspace_id = $2
      LIMIT 1`,
      [this.scope.tenantId, workspaceId],
    );

    return result.rows.length === 0 ? null : mapWorkspaceRow(result.rows[0]);
  }

  public async listWorkspaces(projectId?: string, includeDeleted = false): Promise<WorkspaceRecord[]> {
    const values: unknown[] = [this.scope.tenantId];
    const clauses: string[] = ['tenant_id = $1'];
    if (projectId) {
      values.push(projectId);
      clauses.push(`project_id = $${values.length}`);
    }
    if (!includeDeleted) {
      clauses.push('deleted_at IS NULL');
    }

    const result = await this.manager.query<WorkspaceRow>(
      `SELECT
        tenant_id,
        owner_id,
        workspace_id,
        project_id,
        name,
        description,
        status,
        created_by,
        members,
        artifact_map,
        metadata,
        created_at,
        updated_at,
        closed_at,
        deleted_at
      FROM cowork_workspace_state
      WHERE ${clauses.join(' AND ')}
      ORDER BY updated_at DESC`,
      values,
    );

    return result.rows.map(mapWorkspaceRow);
  }

  public async upsertBlackboardEntry(input: BlackboardEntryUpsertInput): Promise<BlackboardEntryRecord> {
    if (input.expectedVersion === undefined) {
      return this.upsertBlackboardEntryWithoutExpectation(input);
    }

    if (input.expectedVersion < 0) {
      throw new CoworkPersistenceError('expectedVersion must be a non-negative integer.', 'INVALID_EXPECTED_VERSION', {
        expectedVersion: input.expectedVersion,
      });
    }

    if (input.expectedVersion === 0) {
      return this.insertBlackboardEntryWithVersion(input, 1);
    }

    const now = input.timestamp ?? new Date().toISOString();
    const result = await this.manager.query<BlackboardEntryRow>(
      `UPDATE cowork_blackboard_entry
      SET
        owner_id = $4,
        artifact_id = $5,
        artifact_type = $6,
        source = $7,
        version = $8,
        payload = $9::jsonb,
        updated_at = $10::timestamptz,
        deleted_at = NULL
      WHERE tenant_id = $1
        AND workspace_id = $2
        AND artifact_key = $3
        AND version = $11
      RETURNING
        tenant_id,
        owner_id,
        workspace_id,
        artifact_key,
        artifact_id,
        artifact_type,
        source,
        version,
        payload,
        created_at,
        updated_at,
        deleted_at`,
      [
        this.scope.tenantId,
        input.workspaceId,
        input.artifactKey,
        this.scope.ownerId,
        input.artifactId,
        input.artifactType,
        input.source,
        input.expectedVersion + 1,
        input.payload,
        now,
        input.expectedVersion,
      ],
    );

    if (result.rows.length === 0) {
      throw new CoworkPersistenceError(
        `Version conflict while updating blackboard entry ${input.workspaceId}/${input.artifactKey}.`,
        'BLACKBOARD_VERSION_CONFLICT',
        {
          workspaceId: input.workspaceId,
          artifactKey: input.artifactKey,
          expectedVersion: input.expectedVersion,
        },
      );
    }

    return mapBlackboardEntryRow(result.rows[0]);
  }

  public async getBlackboardEntry(workspaceId: string, artifactKey: string): Promise<BlackboardEntryRecord | null> {
    const result = await this.manager.query<BlackboardEntryRow>(
      `SELECT
        tenant_id,
        owner_id,
        workspace_id,
        artifact_key,
        artifact_id,
        artifact_type,
        source,
        version,
        payload,
        created_at,
        updated_at,
        deleted_at
      FROM cowork_blackboard_entry
      WHERE tenant_id = $1
        AND workspace_id = $2
        AND artifact_key = $3
        AND deleted_at IS NULL
      LIMIT 1`,
      [this.scope.tenantId, workspaceId, artifactKey],
    );

    return result.rows.length === 0 ? null : mapBlackboardEntryRow(result.rows[0]);
  }

  public async listBlackboardEntries(workspaceId?: string): Promise<BlackboardEntryRecord[]> {
    const values: unknown[] = [this.scope.tenantId];
    const clauses: string[] = ['tenant_id = $1', 'deleted_at IS NULL'];
    if (workspaceId) {
      values.push(workspaceId);
      clauses.push(`workspace_id = $${values.length}`);
    }

    const result = await this.manager.query<BlackboardEntryRow>(
      `SELECT
        tenant_id,
        owner_id,
        workspace_id,
        artifact_key,
        artifact_id,
        artifact_type,
        source,
        version,
        payload,
        created_at,
        updated_at,
        deleted_at
      FROM cowork_blackboard_entry
      WHERE ${clauses.join(' AND ')}
      ORDER BY updated_at DESC`,
      values,
    );

    return result.rows.map(mapBlackboardEntryRow);
  }

  public async saveBlackboardFeedback(
    feedback: Omit<BlackboardFeedbackRecord, 'tenantId' | 'ownerId'>,
  ): Promise<BlackboardFeedbackRecord> {
    const createdAt = feedback.createdAt || new Date().toISOString();
    const updatedAt = feedback.updatedAt || createdAt;
    const result = await this.manager.query<BlackboardFeedbackRow>(
      `INSERT INTO cowork_blackboard_feedback (
        tenant_id,
        owner_id,
        workspace_id,
        feedback_id,
        target_id,
        source_actor,
        content,
        severity,
        status,
        metadata,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::timestamptz, $12::timestamptz
      )
      ON CONFLICT (tenant_id, workspace_id, feedback_id) DO UPDATE SET
        source_actor = EXCLUDED.source_actor,
        content = EXCLUDED.content,
        severity = EXCLUDED.severity,
        status = EXCLUDED.status,
        metadata = EXCLUDED.metadata,
        updated_at = EXCLUDED.updated_at
      RETURNING
        tenant_id,
        owner_id,
        workspace_id,
        feedback_id,
        target_id,
        source_actor,
        content,
        severity,
        status,
        metadata,
        created_at,
        updated_at`,
      [
        this.scope.tenantId,
        this.scope.ownerId,
        feedback.workspaceId,
        feedback.feedbackId,
        feedback.targetId,
        feedback.sourceActor,
        feedback.content,
        feedback.severity,
        feedback.status,
        feedback.metadata,
        createdAt,
        updatedAt,
      ],
    );

    return mapFeedbackRow(result.rows[0]);
  }

  public async listBlackboardFeedback(workspaceId: string, targetId?: string): Promise<BlackboardFeedbackRecord[]> {
    const values: unknown[] = [this.scope.tenantId, workspaceId];
    const clauses: string[] = ['tenant_id = $1', 'workspace_id = $2'];
    if (targetId) {
      values.push(targetId);
      clauses.push(`target_id = $${values.length}`);
    }

    const result = await this.manager.query<BlackboardFeedbackRow>(
      `SELECT
        tenant_id,
        owner_id,
        workspace_id,
        feedback_id,
        target_id,
        source_actor,
        content,
        severity,
        status,
        metadata,
        created_at,
        updated_at
      FROM cowork_blackboard_feedback
      WHERE ${clauses.join(' AND ')}
      ORDER BY created_at ASC`,
      values,
    );

    return result.rows.map(mapFeedbackRow);
  }

  public async saveWorkspaceSnapshot(
    snapshot: Omit<WorkspaceSnapshotRecord, 'tenantId' | 'ownerId' | 'snapshotId' | 'createdAt'> & {
      snapshotId?: string;
      createdAt?: string;
    },
  ): Promise<WorkspaceSnapshotRecord> {
    const snapshotId = snapshot.snapshotId ?? randomUUID();
    const createdAt = snapshot.createdAt ?? new Date().toISOString();
    const result = await this.manager.query<SnapshotRow>(
      `INSERT INTO cowork_workspace_snapshot (
        tenant_id,
        owner_id,
        workspace_id,
        snapshot_id,
        snapshot_type,
        payload,
        metadata,
        created_by,
        created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9::timestamptz
      )
      RETURNING
        tenant_id,
        owner_id,
        workspace_id,
        snapshot_id,
        snapshot_type,
        payload,
        metadata,
        created_by,
        created_at`,
      [
        this.scope.tenantId,
        this.scope.ownerId,
        snapshot.workspaceId,
        snapshotId,
        snapshot.snapshotType,
        snapshot.payload,
        snapshot.metadata,
        snapshot.createdBy,
        createdAt,
      ],
    );

    return mapSnapshotRow(result.rows[0]);
  }

  public async listWorkspaceSnapshots(workspaceId: string, limit = 25): Promise<WorkspaceSnapshotRecord[]> {
    const boundedLimit = Math.max(1, Math.min(Math.floor(limit), 500));
    const result = await this.manager.query<SnapshotRow>(
      `SELECT
        tenant_id,
        owner_id,
        workspace_id,
        snapshot_id,
        snapshot_type,
        payload,
        metadata,
        created_by,
        created_at
      FROM cowork_workspace_snapshot
      WHERE tenant_id = $1 AND workspace_id = $2
      ORDER BY created_at DESC
      LIMIT ${boundedLimit}`,
      [this.scope.tenantId, workspaceId],
    );

    return result.rows.map(mapSnapshotRow);
  }

  public async appendEvent(input: EventAppendInput): Promise<PersistedEventRecord> {
    const eventId = input.eventId ?? randomUUID();
    const occurredAt = input.occurredAt ?? new Date().toISOString();

    const result = await this.manager.query<EventRow>(
      `INSERT INTO cowork_event_log (
        event_id,
        tenant_id,
        owner_id,
        aggregate_type,
        aggregate_id,
        event_type,
        payload,
        metadata,
        occurred_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::timestamptz
      )
      RETURNING
        version,
        event_id,
        tenant_id,
        owner_id,
        aggregate_type,
        aggregate_id,
        event_type,
        payload,
        metadata,
        occurred_at,
        created_at`,
      [
        eventId,
        this.scope.tenantId,
        this.scope.ownerId,
        input.aggregateType,
        input.aggregateId,
        input.eventType,
        input.payload,
        input.metadata ?? {},
        occurredAt,
      ],
    );

    return mapEventRow(result.rows[0]);
  }

  public async listEventsSince(afterVersion = 0, limit = 250): Promise<PersistedEventRecord[]> {
    const boundedLimit = Math.max(1, Math.min(Math.floor(limit), 1000));
    const result = await this.manager.query<EventRow>(
      `SELECT
        version,
        event_id,
        tenant_id,
        owner_id,
        aggregate_type,
        aggregate_id,
        event_type,
        payload,
        metadata,
        occurred_at,
        created_at
      FROM cowork_event_log
      WHERE tenant_id = $1
        AND version > $2
      ORDER BY version ASC
      LIMIT ${boundedLimit}`,
      [this.scope.tenantId, afterVersion],
    );

    return result.rows.map(mapEventRow);
  }

  public async getConsumerCheckpoint(consumerId: string): Promise<number> {
    const result = await this.manager.query<CheckpointRow>(
      `SELECT last_event_version
      FROM cowork_event_consumer_checkpoint
      WHERE tenant_id = $1 AND consumer_id = $2
      LIMIT 1`,
      [this.scope.tenantId, consumerId],
    );

    if (result.rows.length === 0) {
      return 0;
    }

    return coerceNumber(result.rows[0].last_event_version, 'last_event_version');
  }

  public async saveConsumerCheckpoint(consumerId: string, lastEventVersion: number, lastEventId?: string): Promise<void> {
    await this.manager.query(
      `INSERT INTO cowork_event_consumer_checkpoint (
        tenant_id,
        consumer_id,
        last_event_version,
        last_event_id,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, NOW()
      )
      ON CONFLICT (tenant_id, consumer_id) DO UPDATE SET
        last_event_version = EXCLUDED.last_event_version,
        last_event_id = EXCLUDED.last_event_id,
        updated_at = NOW()`,
      [this.scope.tenantId, consumerId, lastEventVersion, lastEventId ?? null],
    );
  }

  public async upsertWorkflowDefinition(
    definition: Omit<WorkflowDefinitionRecord, 'tenantId' | 'createdAt' | 'updatedAt'> & {
      createdAt?: string;
      updatedAt?: string;
    },
  ): Promise<WorkflowDefinitionRecord> {
    const now = new Date().toISOString();
    const createdAt = definition.createdAt ?? now;
    const updatedAt = definition.updatedAt ?? now;

    const result = await this.manager.query<WorkflowDefinitionRow>(
      `INSERT INTO cowork_workflow_definition (
        tenant_id,
        definition_id,
        version,
        name,
        trigger_event_type,
        steps,
        metadata,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::timestamptz, $9::timestamptz
      )
      ON CONFLICT (tenant_id, definition_id, version) DO UPDATE SET
        name = EXCLUDED.name,
        trigger_event_type = EXCLUDED.trigger_event_type,
        steps = EXCLUDED.steps,
        metadata = EXCLUDED.metadata,
        updated_at = EXCLUDED.updated_at
      RETURNING
        tenant_id,
        definition_id,
        version,
        name,
        trigger_event_type,
        steps,
        metadata,
        created_at,
        updated_at`,
      [
        this.scope.tenantId,
        definition.definitionId,
        definition.version,
        definition.name,
        definition.triggerEventType,
        definition.steps,
        definition.metadata,
        createdAt,
        updatedAt,
      ],
    );

    return mapWorkflowDefinitionRow(result.rows[0]);
  }

  public async listWorkflowDefinitions(): Promise<WorkflowDefinitionRecord[]> {
    const result = await this.manager.query<WorkflowDefinitionRow>(
      `SELECT
        tenant_id,
        definition_id,
        version,
        name,
        trigger_event_type,
        steps,
        metadata,
        created_at,
        updated_at
      FROM cowork_workflow_definition
      WHERE tenant_id = $1
      ORDER BY definition_id ASC, version DESC`,
      [this.scope.tenantId],
    );

    return result.rows.map(mapWorkflowDefinitionRow);
  }

  public async upsertWorkflowInstance(
    instance: Omit<WorkflowInstanceRecord, 'tenantId' | 'ownerId'>,
  ): Promise<WorkflowInstanceRecord> {
    const result = await this.manager.query<WorkflowInstanceRow>(
      `INSERT INTO cowork_workflow_instance (
        tenant_id,
        owner_id,
        instance_id,
        definition_id,
        definition_version,
        status,
        current_step_id,
        state,
        trigger_event_id,
        started_at,
        updated_at,
        completed_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10::timestamptz, $11::timestamptz, $12::timestamptz
      )
      ON CONFLICT (tenant_id, instance_id) DO UPDATE SET
        owner_id = EXCLUDED.owner_id,
        definition_id = EXCLUDED.definition_id,
        definition_version = EXCLUDED.definition_version,
        status = EXCLUDED.status,
        current_step_id = EXCLUDED.current_step_id,
        state = EXCLUDED.state,
        trigger_event_id = EXCLUDED.trigger_event_id,
        updated_at = EXCLUDED.updated_at,
        completed_at = EXCLUDED.completed_at
      RETURNING
        tenant_id,
        owner_id,
        instance_id,
        definition_id,
        definition_version,
        status,
        current_step_id,
        state,
        trigger_event_id,
        started_at,
        updated_at,
        completed_at`,
      [
        this.scope.tenantId,
        this.scope.ownerId,
        instance.instanceId,
        instance.definitionId,
        instance.definitionVersion,
        instance.status,
        instance.currentStepId ?? null,
        instance.state,
        instance.triggerEventId ?? null,
        instance.startedAt,
        instance.updatedAt,
        instance.completedAt ?? null,
      ],
    );

    return mapWorkflowInstanceRow(result.rows[0]);
  }

  public async getWorkflowInstance(instanceId: string): Promise<WorkflowInstanceRecord | null> {
    const result = await this.manager.query<WorkflowInstanceRow>(
      `SELECT
        tenant_id,
        owner_id,
        instance_id,
        definition_id,
        definition_version,
        status,
        current_step_id,
        state,
        trigger_event_id,
        started_at,
        updated_at,
        completed_at
      FROM cowork_workflow_instance
      WHERE tenant_id = $1 AND instance_id = $2
      LIMIT 1`,
      [this.scope.tenantId, instanceId],
    );

    return result.rows.length === 0 ? null : mapWorkflowInstanceRow(result.rows[0]);
  }

  public async listWorkflowInstances(status?: string): Promise<WorkflowInstanceRecord[]> {
    const values: unknown[] = [this.scope.tenantId];
    const clauses: string[] = ['tenant_id = $1'];
    if (status) {
      values.push(status);
      clauses.push(`status = $${values.length}`);
    }

    const result = await this.manager.query<WorkflowInstanceRow>(
      `SELECT
        tenant_id,
        owner_id,
        instance_id,
        definition_id,
        definition_version,
        status,
        current_step_id,
        state,
        trigger_event_id,
        started_at,
        updated_at,
        completed_at
      FROM cowork_workflow_instance
      WHERE ${clauses.join(' AND ')}
      ORDER BY updated_at DESC`,
      values,
    );

    return result.rows.map(mapWorkflowInstanceRow);
  }

  public async appendWorkflowHistory(
    history: Omit<WorkflowHistoryRecord, 'tenantId' | 'historyId' | 'recordedAt'> & {
      historyId?: string;
      recordedAt?: string;
    },
  ): Promise<WorkflowHistoryRecord> {
    const historyId = history.historyId ?? randomUUID();
    const recordedAt = history.recordedAt ?? new Date().toISOString();
    const result = await this.manager.query<WorkflowHistoryRow>(
      `INSERT INTO cowork_workflow_history (
        tenant_id,
        instance_id,
        history_id,
        step_id,
        transition,
        event_id,
        payload,
        recorded_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7::jsonb, $8::timestamptz
      )
      RETURNING
        tenant_id,
        instance_id,
        history_id,
        step_id,
        transition,
        event_id,
        payload,
        recorded_at`,
      [
        this.scope.tenantId,
        history.instanceId,
        historyId,
        history.stepId ?? null,
        history.transition,
        history.eventId ?? null,
        history.payload,
        recordedAt,
      ],
    );

    return mapWorkflowHistoryRow(result.rows[0]);
  }

  public async listWorkflowHistory(instanceId: string): Promise<WorkflowHistoryRecord[]> {
    const result = await this.manager.query<WorkflowHistoryRow>(
      `SELECT
        tenant_id,
        instance_id,
        history_id,
        step_id,
        transition,
        event_id,
        payload,
        recorded_at
      FROM cowork_workflow_history
      WHERE tenant_id = $1
        AND instance_id = $2
      ORDER BY recorded_at ASC`,
      [this.scope.tenantId, instanceId],
    );

    return result.rows.map(mapWorkflowHistoryRow);
  }

  private async upsertBlackboardEntryWithoutExpectation(
    input: BlackboardEntryUpsertInput,
  ): Promise<BlackboardEntryRecord> {
    const now = input.timestamp ?? new Date().toISOString();
    const result = await this.manager.query<BlackboardEntryRow>(
      `INSERT INTO cowork_blackboard_entry (
        tenant_id,
        owner_id,
        workspace_id,
        artifact_key,
        artifact_id,
        artifact_type,
        source,
        version,
        payload,
        created_at,
        updated_at,
        deleted_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, 1, $8::jsonb, $9::timestamptz, $10::timestamptz, NULL
      )
      ON CONFLICT (tenant_id, workspace_id, artifact_key) DO UPDATE SET
        owner_id = EXCLUDED.owner_id,
        artifact_id = EXCLUDED.artifact_id,
        artifact_type = EXCLUDED.artifact_type,
        source = EXCLUDED.source,
        version = cowork_blackboard_entry.version + 1,
        payload = EXCLUDED.payload,
        updated_at = EXCLUDED.updated_at,
        deleted_at = NULL
      RETURNING
        tenant_id,
        owner_id,
        workspace_id,
        artifact_key,
        artifact_id,
        artifact_type,
        source,
        version,
        payload,
        created_at,
        updated_at,
        deleted_at`,
      [
        this.scope.tenantId,
        this.scope.ownerId,
        input.workspaceId,
        input.artifactKey,
        input.artifactId,
        input.artifactType,
        input.source,
        input.payload,
        now,
        now,
      ],
    );

    return mapBlackboardEntryRow(result.rows[0]);
  }

  private async insertBlackboardEntryWithVersion(
    input: BlackboardEntryUpsertInput,
    version: number,
  ): Promise<BlackboardEntryRecord> {
    const now = input.timestamp ?? new Date().toISOString();
    const result = await this.manager.query<BlackboardEntryRow>(
      `INSERT INTO cowork_blackboard_entry (
        tenant_id,
        owner_id,
        workspace_id,
        artifact_key,
        artifact_id,
        artifact_type,
        source,
        version,
        payload,
        created_at,
        updated_at,
        deleted_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::timestamptz, $11::timestamptz, NULL
      )
      ON CONFLICT DO NOTHING
      RETURNING
        tenant_id,
        owner_id,
        workspace_id,
        artifact_key,
        artifact_id,
        artifact_type,
        source,
        version,
        payload,
        created_at,
        updated_at,
        deleted_at`,
      [
        this.scope.tenantId,
        this.scope.ownerId,
        input.workspaceId,
        input.artifactKey,
        input.artifactId,
        input.artifactType,
        input.source,
        version,
        input.payload,
        now,
        now,
      ],
    );

    if (result.rows.length > 0) {
      return mapBlackboardEntryRow(result.rows[0]);
    }

    throw new CoworkPersistenceError(
      `Version conflict while creating blackboard entry ${input.workspaceId}/${input.artifactKey}.`,
      'BLACKBOARD_VERSION_CONFLICT',
      {
        workspaceId: input.workspaceId,
        artifactKey: input.artifactKey,
        expectedVersion: 0,
      },
    );
  }
}

function mapWorkspaceRow(row: WorkspaceRow): WorkspaceRecord {
  return {
    tenantId: row.tenant_id,
    ownerId: row.owner_id,
    workspaceId: row.workspace_id,
    projectId: row.project_id,
    name: row.name,
    description: row.description ?? undefined,
    status: row.status,
    createdBy: row.created_by,
    members: asStringArray(row.members),
    artifactMap: asStringRecord(row.artifact_map),
    metadata: asObject(row.metadata),
    createdAt: normalizeTimestamp(row.created_at),
    updatedAt: normalizeTimestamp(row.updated_at),
    closedAt: row.closed_at ? normalizeTimestamp(row.closed_at) : undefined,
    deletedAt: row.deleted_at ? normalizeTimestamp(row.deleted_at) : undefined,
  };
}

function mapBlackboardEntryRow(row: BlackboardEntryRow): BlackboardEntryRecord {
  return {
    tenantId: row.tenant_id,
    ownerId: row.owner_id,
    workspaceId: row.workspace_id,
    artifactKey: row.artifact_key,
    artifactId: row.artifact_id,
    artifactType: row.artifact_type,
    source: row.source,
    version: coerceNumber(row.version, 'version'),
    payload: asObject(row.payload),
    createdAt: normalizeTimestamp(row.created_at),
    updatedAt: normalizeTimestamp(row.updated_at),
    deletedAt: row.deleted_at ? normalizeTimestamp(row.deleted_at) : undefined,
  };
}

function mapFeedbackRow(row: BlackboardFeedbackRow): BlackboardFeedbackRecord {
  return {
    tenantId: row.tenant_id,
    ownerId: row.owner_id,
    workspaceId: row.workspace_id,
    feedbackId: row.feedback_id,
    targetId: row.target_id,
    sourceActor: row.source_actor,
    content: row.content,
    severity: row.severity,
    status: row.status,
    metadata: asObject(row.metadata),
    createdAt: normalizeTimestamp(row.created_at),
    updatedAt: normalizeTimestamp(row.updated_at),
  };
}

function mapSnapshotRow(row: SnapshotRow): WorkspaceSnapshotRecord {
  return {
    tenantId: row.tenant_id,
    ownerId: row.owner_id,
    workspaceId: row.workspace_id,
    snapshotId: row.snapshot_id,
    snapshotType: row.snapshot_type,
    payload: asObject(row.payload),
    metadata: asObject(row.metadata),
    createdBy: row.created_by,
    createdAt: normalizeTimestamp(row.created_at),
  };
}

function mapEventRow(row: EventRow): PersistedEventRecord {
  return {
    version: coerceNumber(row.version, 'version'),
    eventId: row.event_id,
    tenantId: row.tenant_id,
    ownerId: row.owner_id,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    eventType: row.event_type,
    payload: asObject(row.payload),
    metadata: asObject(row.metadata),
    occurredAt: normalizeTimestamp(row.occurred_at),
    createdAt: normalizeTimestamp(row.created_at),
  };
}

function mapWorkflowDefinitionRow(row: WorkflowDefinitionRow): WorkflowDefinitionRecord {
  return {
    tenantId: row.tenant_id,
    definitionId: row.definition_id,
    version: coerceNumber(row.version, 'version'),
    name: row.name,
    triggerEventType: row.trigger_event_type,
    steps: asStepArray(row.steps),
    metadata: asObject(row.metadata),
    createdAt: normalizeTimestamp(row.created_at),
    updatedAt: normalizeTimestamp(row.updated_at),
  };
}

function mapWorkflowInstanceRow(row: WorkflowInstanceRow): WorkflowInstanceRecord {
  return {
    tenantId: row.tenant_id,
    ownerId: row.owner_id,
    instanceId: row.instance_id,
    definitionId: row.definition_id,
    definitionVersion: coerceNumber(row.definition_version, 'definition_version'),
    status: row.status,
    currentStepId: row.current_step_id ?? undefined,
    state: asObject(row.state),
    triggerEventId: row.trigger_event_id ?? undefined,
    startedAt: normalizeTimestamp(row.started_at),
    updatedAt: normalizeTimestamp(row.updated_at),
    completedAt: row.completed_at ? normalizeTimestamp(row.completed_at) : undefined,
  };
}

function mapWorkflowHistoryRow(row: WorkflowHistoryRow): WorkflowHistoryRecord {
  return {
    tenantId: row.tenant_id,
    instanceId: row.instance_id,
    historyId: row.history_id,
    stepId: row.step_id ?? undefined,
    transition: row.transition,
    eventId: row.event_id ?? undefined,
    payload: asObject(row.payload),
    recordedAt: normalizeTimestamp(row.recorded_at),
  };
}

function normalizeTimestamp(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    logger.warn('[CoworkDomainStore] Unable to parse timestamp, preserving original value', {
      value,
    });
    return String(value);
  }

  return parsed.toISOString();
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function asStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const input = value as Record<string, unknown>;
  const output: Record<string, string> = {};
  for (const [key, nestedValue] of Object.entries(input)) {
    if (typeof nestedValue === 'string') {
      output[key] = nestedValue;
    }
  }

  return output;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

function asStepArray(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item));
}

function coerceNumber(value: string | number, field: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new CoworkPersistenceError(`Unable to parse numeric field ${field}.`, 'INVALID_NUMERIC_FIELD', {
      field,
      value,
    });
  }

  return parsed;
}
