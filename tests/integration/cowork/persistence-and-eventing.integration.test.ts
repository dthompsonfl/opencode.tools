import * as path from 'path';
import { CoworkConfigManager } from '../../../src/cowork/config';
import { CollaborativeWorkspace } from '../../../src/cowork/collaboration/collaborative-workspace';
import { EventBus } from '../../../src/cowork/orchestrator/event-bus';
import { Blackboard } from '../../../src/cowork/orchestrator/blackboard';
import {
  CoworkDomainStore,
  CoworkPersistenceRuntime,
  PostgresPersistenceManager,
  initializeCoworkPersistence,
} from '../../../src/cowork/persistence';
import { WorkflowEngine, registerPhaseOneWorkflows } from '../../../src/cowork/workflow';
import {
  IsolatedDatabaseHandle,
  StartedPostgresHarness,
  createIsolatedDatabase,
  startPostgresHarness,
} from './postgres-test-harness';

describe('cowork integration: persistence, event bus, workflows', () => {
  jest.setTimeout(180000);

  let harness: StartedPostgresHarness | null = null;
  let dockerUnavailableReason: string | null = null;
  const databasesToCleanup: IsolatedDatabaseHandle[] = [];

  beforeAll(async () => {
    try {
      harness = await startPostgresHarness();
    } catch (error) {
      dockerUnavailableReason = error instanceof Error ? error.message : String(error);

      const shouldFailHard = process.env.CI === 'true' || process.env.COWORK_INTEGRATION_REQUIRE_DOCKER === 'true';
      if (shouldFailHard) {
        throw error;
      }

      // eslint-disable-next-line no-console
      console.warn(`[cowork integration] Skipping Docker-backed tests: ${dockerUnavailableReason}`);
    }
  });

  afterEach(async () => {
    EventBus.getInstance().resetForTests();
    CollaborativeWorkspace.resetForTests();
    Blackboard.resetForTests();
    WorkflowEngine.resetForTests();
    CoworkPersistenceRuntime.resetForTests();
    CoworkConfigManager.resetForTests();

    while (databasesToCleanup.length > 0) {
      const handle = databasesToCleanup.pop();
      if (handle) {
        await handle.drop();
      }
    }
  });

  afterAll(async () => {
    if (harness) {
      await harness.container.stop();
    }
  });

  it('applies all cowork migrations on a fresh postgres database', async () => {
    if (!harness) {
      return;
    }

    const database = await createTestDatabase('migrations');
    const manager = createManager(database.connectionString);

    await manager.migrate();

    const result = await manager.query<{ table_name: string }>(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name LIKE 'cowork_%'
       ORDER BY table_name ASC`,
    );

    const tableNames = result.rows.map((row) => row.table_name);
    expect(tableNames).toEqual(
      expect.arrayContaining([
        'cowork_migrations',
        'cowork_workspace_state',
        'cowork_blackboard_entry',
        'cowork_blackboard_feedback',
        'cowork_workspace_snapshot',
        'cowork_event_log',
        'cowork_event_consumer_checkpoint',
        'cowork_workflow_definition',
        'cowork_workflow_instance',
        'cowork_workflow_history',
      ]),
    );

    await manager.close();
  });

  it('supports repository CRUD, optimistic concurrency, and checkpoint storage', async () => {
    if (!harness) {
      return;
    }

    const database = await createTestDatabase('repo');
    const manager = createManager(database.connectionString);
    await manager.migrate();

    const store = new CoworkDomainStore(manager, {
      tenantId: 'tenant-integration',
      ownerId: 'owner-platform',
    });

    const workspace = await store.upsertWorkspace({
      workspaceId: 'ws-1',
      projectId: 'project-alpha',
      name: 'Main Workspace',
      status: 'active',
      createdBy: 'admin',
      members: ['admin'],
      artifactMap: {},
      metadata: { source: 'integration-test' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    expect(workspace.workspaceId).toBe('ws-1');

    const createdEntry = await store.upsertBlackboardEntry({
      workspaceId: 'ws-1',
      artifactKey: 'architecture.md',
      artifactId: 'artifact-ws-1-architecture',
      artifactType: 'document',
      source: 'architect',
      expectedVersion: 0,
      payload: {
        content: 'v1',
      },
    });

    expect(createdEntry.version).toBe(1);

    const updatedEntry = await store.upsertBlackboardEntry({
      workspaceId: 'ws-1',
      artifactKey: 'architecture.md',
      artifactId: 'artifact-ws-1-architecture',
      artifactType: 'document',
      source: 'architect',
      expectedVersion: 1,
      payload: {
        content: 'v2',
      },
    });

    expect(updatedEntry.version).toBe(2);

    const [concurrentA, concurrentB] = await Promise.allSettled([
      store.upsertBlackboardEntry({
        workspaceId: 'ws-1',
        artifactKey: 'architecture.md',
        artifactId: 'artifact-ws-1-architecture',
        artifactType: 'document',
        source: 'architect-a',
        expectedVersion: 2,
        payload: {
          content: 'v3-a',
        },
      }),
      store.upsertBlackboardEntry({
        workspaceId: 'ws-1',
        artifactKey: 'architecture.md',
        artifactId: 'artifact-ws-1-architecture',
        artifactType: 'document',
        source: 'architect-b',
        expectedVersion: 2,
        payload: {
          content: 'v3-b',
        },
      }),
    ]);

    const fulfilled = [concurrentA, concurrentB].filter((result) => result.status === 'fulfilled');
    const rejected = [concurrentA, concurrentB].filter((result) => result.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(String(rejected[0]?.reason)).toContain('BLACKBOARD_VERSION_CONFLICT');

    const feedback = await store.saveBlackboardFeedback({
      workspaceId: 'ws-1',
      feedbackId: 'fb-1',
      targetId: 'artifact-ws-1-architecture',
      sourceActor: 'reviewer',
      content: 'Looks good',
      severity: 'nit',
      status: 'pending',
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    expect(feedback.feedbackId).toBe('fb-1');

    const snapshot = await store.saveWorkspaceSnapshot({
      workspaceId: 'ws-1',
      snapshotType: 'checkpoint',
      payload: {
        marker: 'checkpoint-1',
      },
      metadata: {
        reason: 'integration-test',
      },
      createdBy: 'tester',
    });

    expect(snapshot.workspaceId).toBe('ws-1');

    await store.saveConsumerCheckpoint('consumer-1', 42, 'evt-42');
    const checkpoint = await store.getConsumerCheckpoint('consumer-1');
    expect(checkpoint).toBe(42);

    await manager.close();
  });

  it('wires CoworkConfigManager + PostgresPersistenceManager into workspace and blackboard paths', async () => {
    if (!harness) {
      return;
    }

    const database = await createTestDatabase('wiring');
    const manager = CoworkConfigManager.getInstance();

    await manager.load({
      environment: {
        NODE_ENV: 'test',
      },
      overrides: {
        tenant: {
          id: 'tenant-acme',
          name: 'Acme Tenant',
          ownerId: 'owner-acme',
        },
        persistence: {
          provider: 'postgres',
          postgres: {
            connectionString: database.connectionString,
            maxConnections: 8,
            idleTimeoutMs: 5000,
            connectionTimeoutMs: 5000,
            ssl: false,
            autoMigrate: true,
            migrationsDir: path.resolve(process.cwd(), 'src', 'cowork', 'persistence', 'migrations'),
          },
        },
      },
    });

    const store = await initializeCoworkPersistence({
      configManager: manager,
    });

    const workspace = CollaborativeWorkspace.getInstance();
    const blackboard = Blackboard.getInstance();

    await workspace.configurePersistence(store, {
      hydrateFromStore: true,
      initializeRuntime: false,
      startDispatcher: false,
    });
    await blackboard.configurePersistence(store, {
      hydrateFromStore: true,
      initializeRuntime: false,
      startDispatcher: false,
    });

    const createdWorkspace = workspace.createWorkspace('project-persistence', 'Persistence Workspace', 'admin');
    workspace.updateArtifact(createdWorkspace.id, 'architecture.md', { content: 'workspace-v1' }, 'designer', 'admin');
    workspace.addFeedback(
      createdWorkspace.id,
      'architecture.md',
      'reviewer',
      'Need more details',
      'Please include data flow.',
      'blocking',
    );

    blackboard.updateArtifact('architecture.md', { content: 'blackboard-v1' }, 'designer', 'document', {
      workspaceId: createdWorkspace.id,
    });
    blackboard.addFeedback('reviewer', 'architecture.md', 'Looks consistent', 'nit', {
      workspaceId: createdWorkspace.id,
    });

    await workspace.flushPersistence();
    await blackboard.flushPersistence();

    CollaborativeWorkspace.resetForTests();
    Blackboard.resetForTests();
    WorkflowEngine.resetForTests();
    EventBus.getInstance().resetForTests();

    const restoredWorkspace = CollaborativeWorkspace.getInstance();
    const restoredBlackboard = Blackboard.getInstance();

    await restoredWorkspace.configurePersistence(store, {
      hydrateFromStore: true,
      initializeRuntime: false,
      startDispatcher: false,
    });
    await restoredBlackboard.configurePersistence(store, {
      hydrateFromStore: true,
      initializeRuntime: false,
      startDispatcher: false,
    });

    const hydratedWorkspace = restoredWorkspace.getWorkspace(createdWorkspace.id);
    expect(hydratedWorkspace?.name).toBe('Persistence Workspace');
    expect(restoredWorkspace.getArtifact(createdWorkspace.id, 'architecture.md')).toEqual({ content: 'workspace-v1' });

    expect(restoredBlackboard.getArtifact('architecture.md', createdWorkspace.id)).toEqual({ content: 'blackboard-v1' });
    expect(restoredBlackboard.getFeedbacks(createdWorkspace.id)).toHaveLength(1);

    await CoworkPersistenceRuntime.getInstance().close();
  });

  it('persists events and resumes workflows after restart', async () => {
    if (!harness) {
      return;
    }

    const database = await createTestDatabase('events_workflows');
    const manager = createManager(database.connectionString);
    await manager.migrate();
    const store = new CoworkDomainStore(manager, {
      tenantId: 'tenant-events',
      ownerId: 'owner-events',
    });

    const eventBus = EventBus.getInstance();
    eventBus.configurePersistence(store);
    eventBus.startDispatcher(100, 50);

    const replayedEvents: string[] = [];
    const firstSubscription = eventBus.subscribe(
      'workspace:*',
      (_payload, envelope) => {
        if (envelope) {
          replayedEvents.push(`${envelope.event}:${envelope.version ?? 0}`);
        }
      },
      {
        consumerId: 'integration-consumer',
        durable: true,
        replayFromCheckpoint: true,
      },
    );

    await eventBus.publishAsync('workspace:created', { workspaceId: 'ws-replay' });
    await eventBus.publishAsync('workspace:member:added', { workspaceId: 'ws-replay' });
    await waitFor(() => replayedEvents.length >= 2);
    firstSubscription();

    await eventBus.publishAsync('workspace:artifact:updated', {
      workspaceId: 'ws-replay',
      artifactKey: 'doc.md',
    });

    const replayedAfterRestart: string[] = [];
    eventBus.subscribe(
      'workspace:*',
      (_payload, envelope) => {
        if (envelope) {
          replayedAfterRestart.push(envelope.event);
        }
      },
      {
        consumerId: 'integration-consumer',
        durable: true,
        replayFromCheckpoint: true,
      },
    );

    await waitFor(() => replayedAfterRestart.includes('workspace:artifact:updated'));

    const workflowEngine = WorkflowEngine.getInstance();
    await workflowEngine.configurePersistence(store);
    await registerPhaseOneWorkflows(workflowEngine);
    workflowEngine.start();

    await eventBus.publishAsync('workspace:created', { workspaceId: 'ws-workflow' });
    await waitFor(() => workflowEngine.getInstances('running').length >= 1);

    const runningInstance = workflowEngine.getInstances('running').find((instance) => instance.definitionId === 'workspace-provisioning');
    expect(runningInstance).toBeDefined();

    workflowEngine.stop();
    WorkflowEngine.resetForTests();

    const resumedEngine = WorkflowEngine.getInstance();
    await resumedEngine.configurePersistence(store);
    await registerPhaseOneWorkflows(resumedEngine);
    resumedEngine.start();

    await eventBus.publishAsync('workspace:member:added', { workspaceId: 'ws-workflow' });
    await eventBus.publishAsync('workspace:artifact:updated', {
      workspaceId: 'ws-workflow',
      artifactKey: 'bootstrap.md',
    });

    await waitFor(() =>
      resumedEngine
        .getInstances('completed')
        .some((instance) => instance.id === runningInstance?.id),
    );

    const persistedCompleted = await store.listWorkflowInstances('completed');
    expect(persistedCompleted.some((instance) => instance.instanceId === runningInstance?.id)).toBe(true);

    resumedEngine.stop();
    eventBus.stopDispatcher();
    await manager.close();
  });

  async function createTestDatabase(prefix: string): Promise<IsolatedDatabaseHandle> {
    if (!harness) {
      throw new Error(dockerUnavailableReason ?? 'Docker runtime unavailable for integration tests.');
    }

    const database = await createIsolatedDatabase(harness, prefix);
    databasesToCleanup.push(database);
    return database;
  }
});

function createManager(connectionString: string): PostgresPersistenceManager {
  return new PostgresPersistenceManager({
    connectionString,
    maxConnections: 8,
    idleTimeoutMs: 5000,
    connectionTimeoutMs: 5000,
    ssl: false,
    migrationsDir: path.resolve(process.cwd(), 'src', 'cowork', 'persistence', 'migrations'),
    applicationName: 'cowork-integration-tests',
  });
}

async function waitFor(assertion: () => boolean, timeoutMs = 15000, intervalMs = 100): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (assertion()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Timed out after ${timeoutMs}ms while waiting for condition.`);
}
