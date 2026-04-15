import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { SessionPersistenceAdapter } from '../../../src/integration/session-persistence-adapter';
import { UnifiedStateStore } from '../../../src/integration/unified-state-store';
import {
  UNIFIED_STATE_VERSION,
  createInitialUnifiedState,
  type StateTransitionMetadata,
  type UnifiedStateEventPublisher,
} from '../../../src/integration/types';

class TestEventPublisher implements UnifiedStateEventPublisher {
  public readonly events: Array<{ event: string; payload: unknown }> = [];

  public publish(event: string, payload: unknown): void {
    this.events.push({ event, payload });
  }
}

describe('UnifiedStateStore', () => {
  const transition: StateTransitionMetadata = {
    projectId: 'proj-1',
    runId: 'run-1',
    sessionId: 'session-1',
    source: 'unit-test',
    timestamp: 10,
  };

  it('applies deterministic state transitions', () => {
    const createStore = (): UnifiedStateStore => {
      return new UnifiedStateStore({
        context: {
          projectId: 'proj-1',
          runId: 'run-1',
          sessionId: 'session-1',
        },
        now: () => 1,
      });
    };

    const storeA = createStore();
    const storeB = createStore();

    const actions = [
      { type: 'WORKFLOW_SET_PHASE' as const, phase: 'phase_1', status: 'running' as const },
      { type: 'RUNTIME_PATCH' as const, patch: { status: 'running' as const, activeAgentIds: ['pm'] } },
      { type: 'UI_PATCH' as const, patch: { view: 'dashboard', isHydrated: true } },
      {
        type: 'EVIDENCE_ADD' as const,
        item: {
          id: 'ev-1',
          type: 'artifact',
          summary: 'PRD generated',
          createdAt: 10,
          source: 'pm',
          data: { file: 'docs/prd.md' },
        },
      },
    ];

    for (const action of actions) {
      storeA.dispatch(action, transition);
      storeB.dispatch(action, transition);
    }

    expect(storeA.getSnapshot()).toEqual(storeB.getSnapshot());
    expect(storeA.getSnapshot().metadata.transitionCount).toBe(actions.length);
    expect(storeA.getSnapshot().workflow.phase).toBe('phase_1');
  });

  it('notifies subscribers and supports unsubscribe', () => {
    const publisher = new TestEventPublisher();
    const store = new UnifiedStateStore({
      context: {
        projectId: 'proj-1',
        runId: 'run-1',
        sessionId: 'session-1',
      },
      eventPublisher: publisher,
      now: () => 20,
    });

    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);

    store.dispatch({ type: 'WORKFLOW_SET_PHASE', phase: 'phase_2' }, { ...transition, timestamp: 20 });
    unsubscribe();
    store.dispatch({ type: 'WORKFLOW_SET_PHASE', phase: 'phase_3' }, { ...transition, timestamp: 21 });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(publisher.events.map((entry) => entry.event)).toEqual([
      'state:transition',
      'state:snapshot:updated',
      'state:transition',
      'state:snapshot:updated',
    ]);
  });
});

describe('SessionPersistenceAdapter', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `unified-state-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('saves and loads snapshots with round-trip fidelity', async () => {
    const adapter = new SessionPersistenceAdapter({
      basePath: tempDir,
      now: () => 100,
      snapshotIdFactory: () => 'snap-a',
    });
    const state = createInitialUnifiedState({
      projectId: 'project-alpha',
      runId: 'run-100',
      sessionId: 'session-100',
    }, 100);

    state.workflow.phase = 'phase_1';
    state.ui.view = 'chat';
    state.ui.isHydrated = true;

    await adapter.saveSnapshot(state, {
      projectId: 'project-alpha',
      runId: 'run-100',
      sessionId: 'session-100',
      savedAt: 100,
      source: 'test',
    });

    const latest = await adapter.loadLatestSnapshot('project-alpha');
    const list = await adapter.listSnapshots('project-alpha');

    expect(latest).not.toBeNull();
    expect(latest?.state).toEqual(state);
    expect(list).toHaveLength(1);
    expect(list[0].snapshotId).toContain('snap-a');
  });

  it('migrates older state versions to current schema version', async () => {
    const adapter = new SessionPersistenceAdapter({
      basePath: tempDir,
      now: () => 300,
    });

    const projectId = 'project-legacy';
    const projectDir = path.join(tempDir, projectId);
    fs.mkdirSync(projectDir, { recursive: true });

    const legacySnapshot = {
      snapshotId: 'legacy-1',
      metadata: {
        projectId,
        runId: 'legacy-run',
        sessionId: 'legacy-session',
        savedAt: 250,
      },
      state: {
        version: 0,
        workflow: {
          projectId,
          phase: 'phase_legacy',
          status: 'running',
        },
        runtime: {
          runId: 'legacy-run',
          sessionId: 'legacy-session',
          status: 'running',
        },
        ui: {
          sessionId: 'legacy-session',
          view: 'chat',
        },
        evidence: {
          items: [],
        },
      },
    };

    fs.writeFileSync(path.join(projectDir, 'legacy-1.json'), JSON.stringify(legacySnapshot, null, 2), 'utf8');

    const loaded = await adapter.loadLatestSnapshot(projectId);
    expect(loaded).not.toBeNull();

    if (!loaded) {
      throw new Error('Expected legacy snapshot to load');
    }

    const state = loaded.state;
    expect(state.version).toBe(UNIFIED_STATE_VERSION);
    expect(state.workflow.phase).toBe('phase_legacy');
    expect(state.runtime.runId).toBe('legacy-run');
    expect(state.ui.sessionId).toBe('legacy-session');
    expect(state.metadata.projectId).toBe(projectId);
  });

  it('rejects unsafe snapshot IDs from custom factories', async () => {
    const adapter = new SessionPersistenceAdapter({
      basePath: tempDir,
      now: () => 500,
      snapshotIdFactory: () => '../escape',
    });

    const state = createInitialUnifiedState({
      projectId: 'project-safe',
      runId: 'run-safe',
      sessionId: 'session-safe',
    }, 500);

    await expect(
      adapter.saveSnapshot(state, {
        projectId: 'project-safe',
        runId: 'run-safe',
        sessionId: 'session-safe',
        savedAt: 500,
      }),
    ).rejects.toThrow('Generated snapshot ID contains unsupported characters');
  });

  it('stores sanitized project IDs within the configured base path', async () => {
    const adapter = new SessionPersistenceAdapter({
      basePath: tempDir,
      now: () => 600,
      snapshotIdFactory: () => 'safe-id',
    });

    const state = createInitialUnifiedState({
      projectId: 'ignored',
      runId: 'run-600',
      sessionId: 'session-600',
    }, 600);

    await adapter.saveSnapshot(state, {
      projectId: '../../outside',
      runId: 'run-600',
      sessionId: 'session-600',
      savedAt: 600,
    });

    const baseEntries = fs.readdirSync(tempDir);
    expect(baseEntries).toContain('______outside');
    expect(path.resolve(tempDir, '______outside').startsWith(path.resolve(tempDir))).toBe(true);
  });
});
