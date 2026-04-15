import { randomUUID } from 'crypto';
import { logger } from '../../runtime/logger';
import { EventBus, EventEnvelope } from '../orchestrator/event-bus';
import {
  CoworkDomainStore,
  WorkflowDefinitionRecord,
  WorkflowHistoryRecord,
  WorkflowInstanceRecord,
} from '../persistence';

export type WorkflowStatus = 'running' | 'completed' | 'failed' | 'paused';

export interface WorkflowStepDefinition {
  id: string;
  onEvent: string;
  nextStepId?: string;
  terminal?: boolean;
  metadata?: Record<string, unknown>;
  reducer?: (
    currentState: Record<string, unknown>,
    payload: unknown,
    envelope: EventEnvelope,
  ) => Promise<Record<string, unknown>> | Record<string, unknown>;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  version: number;
  triggerEvent: string;
  initialStepId: string;
  steps: WorkflowStepDefinition[];
  metadata?: Record<string, unknown>;
}

export interface WorkflowInstance {
  id: string;
  definitionId: string;
  definitionVersion: number;
  status: WorkflowStatus;
  currentStepId?: string;
  state: Record<string, unknown>;
  triggerEventId?: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface WorkflowHistoryEntry {
  id: string;
  instanceId: string;
  stepId?: string;
  transition: string;
  eventId?: string;
  payload: Record<string, unknown>;
  recordedAt: string;
}

const WORKFLOW_ENGINE_CONSUMER_ID = 'workflow-engine';
const WORKFLOW_DEFINITION_SCOPE_PREFIX = 'workflow_definition:';

export class WorkflowEngine {
  private static instance: WorkflowEngine | null = null;

  private readonly eventBus: EventBus;
  private readonly definitions = new Map<string, WorkflowDefinition>();
  private readonly instances = new Map<string, WorkflowInstanceRecord>();
  private readonly stepLookup = new Map<string, Map<string, WorkflowStepDefinition>>();

  private persistentStore: CoworkDomainStore | null = null;
  private unsubscribeEventBus: (() => void) | null = null;

  constructor(eventBus: EventBus = EventBus.getInstance()) {
    this.eventBus = eventBus;
  }

  public static getInstance(): WorkflowEngine {
    if (!WorkflowEngine.instance) {
      WorkflowEngine.instance = new WorkflowEngine();
    }

    return WorkflowEngine.instance;
  }

  public static resetForTests(): void {
    WorkflowEngine.instance = null;
  }

  public async configurePersistence(store: CoworkDomainStore): Promise<void> {
    this.persistentStore = store;
    await this.hydrateDefinitions();
    await this.hydrateRunningInstances();
  }

  public async registerDefinition(definition: WorkflowDefinition, persist = true): Promise<void> {
    this.definitions.set(buildDefinitionKey(definition.id, definition.version), definition);
    this.stepLookup.set(buildDefinitionKey(definition.id, definition.version), buildStepLookup(definition.steps));

    if (!persist || !this.persistentStore) {
      return;
    }

    await this.persistentStore.upsertWorkflowDefinition({
      definitionId: definition.id,
      version: definition.version,
      name: definition.name,
      triggerEventType: definition.triggerEvent,
      steps: definition.steps.map((step) => serializeStep(step)),
      metadata: definition.metadata ?? {},
    });
  }

  public getDefinitions(): WorkflowDefinition[] {
    return [...this.definitions.values()];
  }

  public getInstance(instanceId: string): WorkflowInstance | null {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      return null;
    }

    return mapWorkflowInstanceRecord(instance);
  }

  public getInstances(status?: WorkflowStatus): WorkflowInstance[] {
    const values = [...this.instances.values()];
    return values
      .filter((instance) => !status || instance.status === status)
      .map((instance) => mapWorkflowInstanceRecord(instance));
  }

  public start(): void {
    if (this.unsubscribeEventBus) {
      return;
    }

    this.unsubscribeEventBus = this.eventBus.subscribe(
      '*',
      (payload, envelope) => this.handleEvent(payload, envelope),
      {
        consumerId: WORKFLOW_ENGINE_CONSUMER_ID,
        durable: true,
        replayFromCheckpoint: true,
      },
    );
  }

  public stop(): void {
    if (!this.unsubscribeEventBus) {
      return;
    }

    this.unsubscribeEventBus();
    this.unsubscribeEventBus = null;
  }

  public async handleEvent(payload: unknown, envelope?: EventEnvelope): Promise<void> {
    if (!envelope) {
      return;
    }

    await this.startWorkflowsForEvent(payload, envelope);
    await this.advanceRunningWorkflows(payload, envelope);
  }

  public clearForTests(): void {
    this.stop();
    this.definitions.clear();
    this.instances.clear();
    this.stepLookup.clear();
    this.persistentStore = null;
  }

  private async hydrateDefinitions(): Promise<void> {
    if (!this.persistentStore) {
      return;
    }

    const persistedDefinitions = await this.persistentStore.listWorkflowDefinitions();
    for (const persistedDefinition of persistedDefinitions) {
      const key = buildDefinitionKey(persistedDefinition.definitionId, persistedDefinition.version);
      if (this.definitions.has(key)) {
        continue;
      }

      const hydrated = hydrateDefinition(persistedDefinition);
      this.definitions.set(key, hydrated);
      this.stepLookup.set(key, buildStepLookup(hydrated.steps));
    }
  }

  private async hydrateRunningInstances(): Promise<void> {
    if (!this.persistentStore) {
      return;
    }

    const runningInstances = await this.persistentStore.listWorkflowInstances('running');
    for (const instance of runningInstances) {
      this.instances.set(instance.instanceId, instance);
    }
  }

  private async startWorkflowsForEvent(payload: unknown, envelope: EventEnvelope): Promise<void> {
    const matchingDefinitions = this.getDefinitions().filter((definition) =>
      eventPatternMatches(definition.triggerEvent, envelope.event),
    );

    for (const definition of matchingDefinitions) {
      const instance = await this.createWorkflowInstance(definition, payload, envelope);
      await this.applyEventToInstance(instance, definition, payload, envelope);
    }
  }

  private async createWorkflowInstance(
    definition: WorkflowDefinition,
    payload: unknown,
    envelope: EventEnvelope,
  ): Promise<WorkflowInstanceRecord> {
    if (!this.persistentStore) {
      throw new Error('Workflow persistence store is not configured.');
    }

    const now = new Date().toISOString();
    const instanceId = randomUUID();
    const state = {
      triggerEvent: envelope.event,
      triggerPayload: payload,
      triggerOccurredAt: envelope.occurredAt,
    } as Record<string, unknown>;

    const instance = await this.persistentStore.upsertWorkflowInstance({
      instanceId,
      definitionId: definition.id,
      definitionVersion: definition.version,
      status: 'running',
      currentStepId: definition.initialStepId,
      state,
      triggerEventId: envelope.eventId,
      startedAt: now,
      updatedAt: now,
      completedAt: undefined,
    });

    this.instances.set(instance.instanceId, instance);

    await this.persistHistory({
      instanceId,
      stepId: definition.initialStepId,
      transition: 'workflow_started',
      eventId: envelope.eventId,
      payload: {
        event: envelope.event,
        state,
      },
    });

    logger.info('[WorkflowEngine] Started workflow instance', {
      definitionId: definition.id,
      definitionVersion: definition.version,
      instanceId,
      eventId: envelope.eventId,
      eventType: envelope.event,
    });

    return instance;
  }

  private async advanceRunningWorkflows(payload: unknown, envelope: EventEnvelope): Promise<void> {
    const runningInstances = [...this.instances.values()].filter((instance) => instance.status === 'running');

    for (const instance of runningInstances) {
      const definition = this.resolveDefinition(instance.definitionId, instance.definitionVersion);
      if (!definition) {
        continue;
      }

      if (instance.triggerEventId === envelope.eventId) {
        continue;
      }

      await this.applyEventToInstance(instance, definition, payload, envelope);
    }
  }

  private async applyEventToInstance(
    instance: WorkflowInstanceRecord,
    definition: WorkflowDefinition,
    payload: unknown,
    envelope: EventEnvelope,
  ): Promise<void> {
    const definitionKey = buildDefinitionKey(definition.id, definition.version);
    const steps = this.stepLookup.get(definitionKey);
    if (!steps || !instance.currentStepId) {
      return;
    }

    const step = steps.get(instance.currentStepId);
    if (!step || !eventPatternMatches(step.onEvent, envelope.event)) {
      return;
    }

    const reducedState = await Promise.resolve(
      step.reducer
        ? step.reducer(instance.state, payload, envelope)
        : {
            ...instance.state,
            lastEvent: envelope.event,
            lastEventId: envelope.eventId,
            lastEventPayload: payload,
            lastTransitionAt: envelope.occurredAt,
          },
    );

    const now = new Date().toISOString();
    const nextStepId = step.nextStepId;
    const status: WorkflowStatus = step.terminal || !nextStepId ? 'completed' : 'running';

    const updated = await this.persistWorkflowInstance({
      ...instance,
      status,
      currentStepId: status === 'running' ? nextStepId : undefined,
      state: reducedState,
      updatedAt: now,
      completedAt: status === 'completed' ? now : undefined,
    });

    this.instances.set(updated.instanceId, updated);

    await this.persistHistory({
      instanceId: updated.instanceId,
      stepId: step.id,
      transition: status === 'completed' ? 'step_completed_and_workflow_completed' : 'step_completed',
      eventId: envelope.eventId,
      payload: {
        event: envelope.event,
        nextStepId: updated.currentStepId,
        status,
      },
    });
  }

  private resolveDefinition(definitionId: string, version: number): WorkflowDefinition | null {
    return this.definitions.get(buildDefinitionKey(definitionId, version)) ?? null;
  }

  private async persistWorkflowInstance(instance: WorkflowInstanceRecord): Promise<WorkflowInstanceRecord> {
    if (!this.persistentStore) {
      throw new Error('Workflow persistence store is not configured.');
    }

    const persisted = await this.persistentStore.upsertWorkflowInstance({
      instanceId: instance.instanceId,
      definitionId: instance.definitionId,
      definitionVersion: instance.definitionVersion,
      status: instance.status,
      currentStepId: instance.currentStepId,
      state: instance.state,
      triggerEventId: instance.triggerEventId,
      startedAt: instance.startedAt,
      updatedAt: instance.updatedAt,
      completedAt: instance.completedAt,
    });

    return persisted;
  }

  private async persistHistory(history: {
    instanceId: string;
    stepId?: string;
    transition: string;
    eventId?: string;
    payload: Record<string, unknown>;
  }): Promise<WorkflowHistoryEntry> {
    if (!this.persistentStore) {
      throw new Error('Workflow persistence store is not configured.');
    }

    const persisted = await this.persistentStore.appendWorkflowHistory({
      instanceId: history.instanceId,
      stepId: history.stepId,
      transition: history.transition,
      eventId: history.eventId,
      payload: history.payload,
    });

    return mapWorkflowHistoryRecord(persisted);
  }
}

function buildDefinitionKey(definitionId: string, version: number): string {
  return `${WORKFLOW_DEFINITION_SCOPE_PREFIX}${definitionId}:${version}`;
}

function buildStepLookup(steps: WorkflowStepDefinition[]): Map<string, WorkflowStepDefinition> {
  const lookup = new Map<string, WorkflowStepDefinition>();
  for (const step of steps) {
    lookup.set(step.id, step);
  }

  return lookup;
}

function serializeStep(step: WorkflowStepDefinition): Record<string, unknown> {
  return {
    id: step.id,
    onEvent: step.onEvent,
    nextStepId: step.nextStepId,
    terminal: step.terminal ?? false,
    metadata: step.metadata ?? {},
  };
}

function hydrateDefinition(record: WorkflowDefinitionRecord): WorkflowDefinition {
  const steps = record.steps
    .map((step) => ({
      id: readString(step.id) ?? randomUUID(),
      onEvent: readString(step.onEvent) ?? '*',
      nextStepId: readString(step.nextStepId),
      terminal: step.terminal === true,
      metadata: isRecord(step.metadata) ? step.metadata : {},
    }))
    .filter((step) => step.id.length > 0 && step.onEvent.length > 0);

  const initialStepId = steps[0]?.id;
  if (!initialStepId) {
    throw new Error(`Workflow definition ${record.definitionId}@${record.version} has no valid steps.`);
  }

  return {
    id: record.definitionId,
    name: record.name,
    version: record.version,
    triggerEvent: record.triggerEventType,
    initialStepId,
    steps,
    metadata: record.metadata,
  };
}

function mapWorkflowInstanceRecord(instance: WorkflowInstanceRecord): WorkflowInstance {
  return {
    id: instance.instanceId,
    definitionId: instance.definitionId,
    definitionVersion: instance.definitionVersion,
    status: instance.status as WorkflowStatus,
    currentStepId: instance.currentStepId,
    state: instance.state,
    triggerEventId: instance.triggerEventId,
    startedAt: instance.startedAt,
    updatedAt: instance.updatedAt,
    completedAt: instance.completedAt,
  };
}

function mapWorkflowHistoryRecord(history: WorkflowHistoryRecord): WorkflowHistoryEntry {
  return {
    id: history.historyId,
    instanceId: history.instanceId,
    stepId: history.stepId,
    transition: history.transition,
    eventId: history.eventId,
    payload: history.payload,
    recordedAt: history.recordedAt,
  };
}

function eventPatternMatches(pattern: string, event: string): boolean {
  if (pattern === '*') {
    return true;
  }

  if (!pattern.includes('*')) {
    return pattern === event;
  }

  const regex = pattern
    .split(':')
    .map((segment) => (segment === '*' ? '[a-z0-9_-]+' : segment.replace(/[|\\{}()[\]^$+?.]/g, '\\$&')))
    .join(':');

  return new RegExp(`^${regex}$`).test(event);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
