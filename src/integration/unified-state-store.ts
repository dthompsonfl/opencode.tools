import { EventBus } from '../cowork/orchestrator/event-bus';
import {
  createInitialUnifiedState,
  migrateUnifiedState,
  type StateTransitionMetadata,
  type TransitionContext,
  type UnifiedState,
  type UnifiedStateAction,
  type UnifiedStateEventPublisher,
  type UnifiedStateListener,
  type UnifiedStateTransition,
} from './types';

export interface UnifiedStateStoreOptions {
  context: TransitionContext;
  initialState?: UnifiedState;
  eventPublisher?: UnifiedStateEventPublisher;
  now?: () => number;
}

function cloneState(state: UnifiedState): UnifiedState {
  return JSON.parse(JSON.stringify(state)) as UnifiedState;
}

export function unifiedStateReducer(state: UnifiedState, action: UnifiedStateAction, now: number): UnifiedState {
  switch (action.type) {
    case 'WORKFLOW_SET_PHASE':
      return {
        ...state,
        workflow: {
          ...state.workflow,
          phase: action.phase,
          status: action.status ?? state.workflow.status,
          lastTransitionAt: now,
        },
      };

    case 'WORKFLOW_PATCH':
      return {
        ...state,
        workflow: {
          ...state.workflow,
          ...action.patch,
          projectId: state.workflow.projectId,
          data: {
            ...state.workflow.data,
            ...(action.patch.data ?? {}),
          },
        },
      };

    case 'RUNTIME_PATCH':
      return {
        ...state,
        runtime: {
          ...state.runtime,
          ...action.patch,
          runId: state.runtime.runId,
          sessionId: state.runtime.sessionId,
          data: {
            ...state.runtime.data,
            ...(action.patch.data ?? {}),
          },
        },
      };

    case 'UI_PATCH':
      return {
        ...state,
        ui: {
          ...state.ui,
          ...action.patch,
          sessionId: state.ui.sessionId,
          data: {
            ...state.ui.data,
            ...(action.patch.data ?? {}),
          },
        },
      };

    case 'EVIDENCE_ADD':
      return {
        ...state,
        evidence: {
          items: [...state.evidence.items, action.item],
          lastUpdatedAt: now,
        },
      };

    case 'EVIDENCE_UPSERT': {
      const index = state.evidence.items.findIndex((item) => item.id === action.item.id);
      if (index < 0) {
        return {
          ...state,
          evidence: {
            items: [...state.evidence.items, action.item],
            lastUpdatedAt: now,
          },
        };
      }

      return {
        ...state,
        evidence: {
          items: state.evidence.items.map((item) => (item.id === action.item.id ? action.item : item)),
          lastUpdatedAt: now,
        },
      };
    }

    case 'EVIDENCE_REMOVE':
      return {
        ...state,
        evidence: {
          items: state.evidence.items.filter((item) => item.id !== action.evidenceId),
          lastUpdatedAt: now,
        },
      };

    case 'HYDRATE_SNAPSHOT':
      return migrateUnifiedState(action.state, {
        projectId: state.metadata.projectId,
        runId: state.metadata.runId,
        sessionId: state.metadata.sessionId,
      }, now);

    default:
      return state;
  }
}

export class UnifiedStateStore {
  private state: UnifiedState;
  private transitionId = 0;
  private readonly listeners = new Set<UnifiedStateListener>();
  private readonly now: () => number;
  private readonly eventPublisher: UnifiedStateEventPublisher;

  constructor(options: UnifiedStateStoreOptions) {
    this.now = options.now ?? (() => Date.now());
    this.eventPublisher = options.eventPublisher ?? EventBus.getInstance();
    const baseState = options.initialState
      ? migrateUnifiedState(options.initialState, options.context, this.now())
      : createInitialUnifiedState(options.context, this.now());
    this.state = cloneState(baseState);
  }

  public getSnapshot(): UnifiedState {
    return cloneState(this.state);
  }

  public subscribe(listener: UnifiedStateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public dispatch(action: UnifiedStateAction, metadata: StateTransitionMetadata): UnifiedState {
    this.assertTransitionMetadata(metadata);

    const transitionTimestamp = metadata.timestamp ?? this.now();
    const previousState = cloneState(this.state);
    const reducedState = unifiedStateReducer(previousState, action, transitionTimestamp);
    const nextState: UnifiedState = {
      ...reducedState,
      metadata: {
        ...reducedState.metadata,
        projectId: metadata.projectId,
        runId: metadata.runId,
        sessionId: metadata.sessionId,
        updatedAt: transitionTimestamp,
        transitionCount: previousState.metadata.transitionCount + 1,
      },
      workflow: {
        ...reducedState.workflow,
        projectId: metadata.projectId,
      },
      runtime: {
        ...reducedState.runtime,
        runId: metadata.runId,
        sessionId: metadata.sessionId,
      },
      ui: {
        ...reducedState.ui,
        sessionId: metadata.sessionId,
      },
    };

    this.state = cloneState(nextState);

    const transition: UnifiedStateTransition = {
      id: ++this.transitionId,
      actionType: action.type,
      timestamp: transitionTimestamp,
      metadata,
    };

    this.emitTransition(action, nextState, transition);
    for (const listener of this.listeners) {
      listener(cloneState(nextState), previousState, transition);
    }

    return cloneState(nextState);
  }

  private assertTransitionMetadata(metadata: StateTransitionMetadata): void {
    const current = this.state.metadata;
    if (metadata.projectId !== current.projectId) {
      throw new Error(`projectId mismatch in state transition: expected ${current.projectId}, got ${metadata.projectId}`);
    }

    if (metadata.runId !== current.runId) {
      throw new Error(`runId mismatch in state transition: expected ${current.runId}, got ${metadata.runId}`);
    }

    if (metadata.sessionId !== current.sessionId) {
      throw new Error(`sessionId mismatch in state transition: expected ${current.sessionId}, got ${metadata.sessionId}`);
    }
  }

  private emitTransition(action: UnifiedStateAction, nextState: UnifiedState, transition: UnifiedStateTransition): void {
    const payload = {
      type: action.type,
      timestamp: transition.timestamp,
      context: {
        projectId: transition.metadata.projectId,
        runId: transition.metadata.runId,
        sessionId: transition.metadata.sessionId,
      },
      metadata: {
        source: transition.metadata.source,
        reason: transition.metadata.reason,
      },
      stateVersion: nextState.version,
      transitionCount: nextState.metadata.transitionCount,
    };

    this.eventPublisher.publish('state:transition', payload);
    this.eventPublisher.publish('state:snapshot:updated', {
      context: payload.context,
      stateVersion: nextState.version,
      updatedAt: nextState.metadata.updatedAt,
    });
  }
}
