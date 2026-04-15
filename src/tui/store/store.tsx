import * as React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Session, Message, AgentActivity } from '../types';
import { sessionStore } from '../utils/session-store';
import { EventBus } from '../../cowork/orchestrator/event-bus';
import type { EventCallback } from '../../cowork/orchestrator/event-bus';
import { SessionPersistenceAdapter } from '../../integration/session-persistence-adapter';
import { createInitialUnifiedState } from '../../integration/types';

const TUI_STATE_PROJECT_ID = 'tui-global-state';
const TUI_STATE_RUN_ID = 'tui-runtime';
const tuiSnapshotAdapter = new SessionPersistenceAdapter();


export interface State {
  sessions: Session[];
  activeSessionId: string | null;
  view: 'home' | 'chat' | 'dashboard';
  isLoaded: boolean;
}

export type Action =
  | { type: 'LOAD_SESSIONS'; sessions: Session[] }
  | { type: 'CREATE_SESSION'; agentId: string; agentName: string }
  | { type: 'SELECT_SESSION'; sessionId: string }
  | { type: 'UPDATE_SESSION_NAME'; sessionId: string; name: string }
  | { type: 'ADD_MESSAGE'; sessionId: string; message: Message }
  | { type: 'UPDATE_ANSWERS'; sessionId: string; answers: Record<string, any> }
  | { type: 'SET_STATUS'; sessionId: string; status: Session['status'] }
  | { type: 'SET_ACTIVITIES'; sessionId: string; activities: AgentActivity[] }
  | { type: 'UPDATE_ACTIVITY'; sessionId: string; activity: Partial<AgentActivity> & { agentId: string } }
  | { type: 'ADD_ACTIVITY'; sessionId: string; activity: AgentActivity }
  | { type: 'SET_VIEW'; view: State['view'] }
  | { type: 'GO_HOME' }
  | { type: 'DELETE_SESSION'; sessionId: string }
  // EventBus integration actions
  | { type: 'AGENT_START'; sessionId: string; agentId: string; task: string }
  | { type: 'AGENT_PROGRESS'; sessionId: string; agentId: string; progress: number; message?: string }
  | { type: 'AGENT_COMPLETE'; sessionId: string; agentId: string; output?: unknown }
  | { type: 'AGENT_ERROR'; sessionId: string; agentId: string; error: string }
  | { type: 'ARTIFACT_UPDATED'; sessionId: string; key: string; source: string }
  | { type: 'WORKFLOW_START'; sessionId: string; projectName: string }
  | { type: 'WORKFLOW_PHASE_CHANGE'; sessionId: string; phase: string };

const initialState: State = {
  sessions: [],
  activeSessionId: null,
  view: 'home',
  isLoaded: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOAD_SESSIONS':
      return { ...state, sessions: action.sessions, isLoaded: true };

    case 'CREATE_SESSION':
      const newSession: Session = {
        id: uuidv4(),
        name: `${action.agentName} ${new Date().toLocaleDateString()}`,
        agentId: action.agentId,
        messages: [],
        answers: {},
        status: 'idle',
        activities: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      return {
        ...state,
        sessions: [newSession, ...state.sessions],
        activeSessionId: newSession.id,
        view: 'chat',
      };

    case 'SELECT_SESSION':
      return { ...state, activeSessionId: action.sessionId, view: 'chat' };

    case 'SET_VIEW':
      return { ...state, view: action.view };

    case 'GO_HOME':
      return { ...state, activeSessionId: null, view: 'home' };

    case 'UPDATE_SESSION_NAME':
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.sessionId ? { ...s, name: action.name, updatedAt: Date.now() } : s
        ),
      };

    case 'ADD_MESSAGE':
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.sessionId
            ? { ...s, messages: [...s.messages, action.message], updatedAt: Date.now() }
            : s
        ),
      };

    case 'UPDATE_ANSWERS':
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.sessionId
            ? { ...s, answers: action.answers, updatedAt: Date.now() }
            : s
        ),
      };

    case 'SET_STATUS':
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.sessionId ? { ...s, status: action.status, updatedAt: Date.now() } : s
        ),
      };

    case 'SET_ACTIVITIES':
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.sessionId ? { ...s, activities: action.activities, updatedAt: Date.now() } : s
        ),
      };

    case 'UPDATE_ACTIVITY':
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.sessionId
            ? {
                ...s,
                activities: s.activities.map((a) =>
                  a.agentId === action.activity.agentId ? { ...a, ...action.activity } : a
                ),
                updatedAt: Date.now(),
              }
            : s
        ),
      };

    case 'ADD_ACTIVITY':
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.sessionId
            ? {
                ...s,
                activities: [...s.activities, action.activity],
                updatedAt: Date.now(),
              }
            : s
        ),
      };

    // EventBus integration reducer cases
    case 'AGENT_START':
      if (!state.sessions.some((session) => session.id === action.sessionId)) {
        const createdSession: Session = {
          id: action.sessionId,
          name: `Foundry Session ${new Date().toLocaleDateString()}`,
          agentId: action.agentId,
          messages: [],
          answers: {},
          status: 'running',
          activities: [
            {
              agentId: action.agentId,
              agentName: action.agentId,
              status: 'thinking',
              lastLog: `Started: ${action.task}`,
              progress: 0,
            },
          ],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        return {
          ...state,
          sessions: [createdSession, ...state.sessions],
          activeSessionId: state.activeSessionId || createdSession.id,
        };
      }

      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.sessionId
            ? {
                ...s,
                activities: [
                  ...s.activities,
                  {
                    agentId: action.agentId,
                    agentName: action.agentId,
                    status: 'thinking',
                    lastLog: `Started: ${action.task}`,
                    progress: 0,
                  },
                ],
                status: 'running',
                updatedAt: Date.now(),
              }
            : s
        ),
      };

    case 'AGENT_PROGRESS':
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.sessionId
            ? {
                ...s,
                activities: s.activities.map((a) =>
                  a.agentId === action.agentId
                    ? { ...a, progress: action.progress, lastLog: action.message || a.lastLog }
                    : a
                ),
                updatedAt: Date.now(),
              }
            : s
        ),
      };

    case 'AGENT_COMPLETE':
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.sessionId
            ? {
                ...s,
                activities: s.activities.map((a) =>
                  a.agentId === action.agentId
                    ? { ...a, status: 'success', lastLog: 'Completed successfully' }
                    : a
                ),
                updatedAt: Date.now(),
              }
            : s
        ),
      };

    case 'AGENT_ERROR':
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.sessionId
            ? {
                ...s,
                activities: s.activities.map((a) =>
                  a.agentId === action.agentId
                    ? { ...a, status: 'failed', lastLog: `Error: ${action.error}` }
                    : a
                ),
                status: 'failed',
                updatedAt: Date.now(),
              }
            : s
        ),
      };

    case 'ARTIFACT_UPDATED':
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.sessionId
            ? {
                ...s,
                messages: [
                  ...s.messages,
                  {
                    id: uuidv4(),
                    role: 'system',
                    content: `📦 Artifact updated: ${action.key} (by ${action.source})`,
                    timestamp: Date.now(),
                  },
                ],
                updatedAt: Date.now(),
              }
            : s
        ),
      };

    case 'WORKFLOW_START':
      if (!state.sessions.some((session) => session.id === action.sessionId)) {
        const createdSession: Session = {
          id: action.sessionId,
          name: action.projectName,
          agentId: 'foundry',
          messages: [
            {
              id: uuidv4(),
              role: 'system',
              content: `Workflow attached: ${action.projectName}`,
              timestamp: Date.now(),
            },
          ],
          answers: {},
          status: 'running',
          activities: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        return {
          ...state,
          sessions: [createdSession, ...state.sessions],
          activeSessionId: state.activeSessionId || createdSession.id,
        };
      }

      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.sessionId
            ? {
                ...s,
                name: action.projectName,
                status: 'running',
                messages: [
                  ...s.messages,
                  {
                    id: uuidv4(),
                    role: 'system',
                    content: `🚀 Workflow started: ${action.projectName}`,
                    timestamp: Date.now(),
                  },
                ],
                updatedAt: Date.now(),
              }
            : s
        ),
      };

    case 'WORKFLOW_PHASE_CHANGE':
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.sessionId
            ? {
                ...s,
                messages: [
                  ...s.messages,
                  {
                    id: uuidv4(),
                    role: 'system',
                    content: `🔄 Phase transition: ${action.phase}`,
                    timestamp: Date.now(),
                  },
                ],
                updatedAt: Date.now(),
              }
            : s
        ),
      };

    case 'DELETE_SESSION':
      return {
        ...state,
        sessions: state.sessions.filter(s => s.id !== action.sessionId),
        activeSessionId: state.activeSessionId === action.sessionId ? null : state.activeSessionId,
        view: state.activeSessionId === action.sessionId ? 'home' : state.view
      };

    default:
      return state;
  }
}

export const StoreContext = React.createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export const StoreProvider: React.FC = ({ children }) => {
  const [state, dispatch] = React.useReducer(reducer, initialState);

  // Load sessions on mount
  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const index = sessionStore.getIndex();
        const loadedSessions: Session[] = [];

        // Load full sessions for the most recent ones
        for (const item of index.slice(0, 20)) {
          const full = sessionStore.loadSession(item.id);
          if (full) {
            loadedSessions.push(full);
          }
        }

        if (cancelled) {
          return;
        }

        dispatch({ type: 'LOAD_SESSIONS', sessions: loadedSessions });

        const snapshot = await tuiSnapshotAdapter.loadLatestSnapshot(TUI_STATE_PROJECT_ID);
        if (!snapshot || cancelled) {
          return;
        }

        const uiData = snapshot.state.ui.data as Record<string, unknown>;
        const restoredSessionId = typeof uiData.activeSessionId === 'string'
          ? uiData.activeSessionId
          : null;
        const restoredView = typeof uiData.view === 'string'
          ? uiData.view
          : null;

        if (restoredSessionId && loadedSessions.some((session) => session.id === restoredSessionId)) {
          dispatch({ type: 'SELECT_SESSION', sessionId: restoredSessionId });
        }

        if (
          restoredView === 'home' ||
          restoredView === 'chat' ||
          restoredView === 'dashboard'
        ) {
          dispatch({ type: 'SET_VIEW', view: restoredView });
        }
      } catch (err) {
        console.error('Failed to load sessions', err);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  // Save sessions on change
  React.useEffect(() => {
    if (!state.isLoaded) return;
    
    // Save active session if it changed
    if (state.activeSessionId) {
      const active = state.sessions.find(s => s.id === state.activeSessionId);
      if (active) {
        sessionStore.saveSession(active);
      }
    }

    const persistSnapshot = async (): Promise<void> => {
      const sessionId = state.activeSessionId || 'tui-default-session';
      const snapshotState = createInitialUnifiedState({
        projectId: TUI_STATE_PROJECT_ID,
        runId: TUI_STATE_RUN_ID,
        sessionId,
      }, Date.now());

      snapshotState.ui.view = state.view;
      snapshotState.ui.isHydrated = state.isLoaded;
      snapshotState.ui.data = {
        activeSessionId: state.activeSessionId,
        sessionCount: state.sessions.length,
        view: state.view,
      };

      snapshotState.runtime.status = state.sessions.some((session) => session.status === 'running' || session.status === 'refining')
        ? 'running'
        : 'idle';
      snapshotState.runtime.activeAgentIds = state.sessions
        .filter((session) => session.status === 'running' || session.status === 'refining')
        .map((session) => session.agentId);
      snapshotState.runtime.lastHeartbeatAt = Date.now();
      snapshotState.runtime.data = {
        activeSessionId: state.activeSessionId,
      };

      await tuiSnapshotAdapter.saveSnapshot(snapshotState, {
        projectId: TUI_STATE_PROJECT_ID,
        runId: TUI_STATE_RUN_ID,
        sessionId,
        savedAt: Date.now(),
        source: 'tui.store',
        label: 'ui-state',
      });
    };

    void persistSnapshot();
  }, [state.sessions, state.activeSessionId, state.isLoaded, state.view]);

  // Subscribe to EventBus for real-time updates
  React.useEffect(() => {
    if (!state.isLoaded) return;

    const eventBus = EventBus.getInstance();
    const unsubscribers: Array<() => void> = [];

    // Subscribe to agent start events
    const agentStartHandler: EventCallback = (payload) => {
      const { agentId, task, context, sessionId: payloadSessionId } = payload as {
        agentId: string;
        task: string;
        context?: { sessionId?: string };
        sessionId?: string;
      };
      const sessionId = payloadSessionId || context?.sessionId || state.activeSessionId;
      if (sessionId) {
        dispatch({ type: 'AGENT_START', sessionId, agentId, task });
      }
    };
    eventBus.subscribe('agent:start', agentStartHandler);
    unsubscribers.push(() => eventBus.unsubscribe('agent:start', agentStartHandler));

    // Subscribe to agent progress events
    const agentProgressHandler: EventCallback = (payload) => {
      const { agentId, percent, message, context, sessionId: payloadSessionId } = payload as {
        agentId: string;
        percent: number;
        message?: string;
        context?: { sessionId?: string };
        sessionId?: string;
      };
      const sessionId = payloadSessionId || context?.sessionId || state.activeSessionId;
      if (sessionId) {
        dispatch({ type: 'AGENT_PROGRESS', sessionId, agentId, progress: percent, message });
      }
    };
    eventBus.subscribe('agent:progress', agentProgressHandler);
    unsubscribers.push(() => eventBus.unsubscribe('agent:progress', agentProgressHandler));

    // Subscribe to structured streaming events
    const agentStreamHandler: EventCallback = (payload) => {
      const { agentId, type, step, payload: streamPayload, sessionId: payloadSessionId } = payload as {
        agentId: string;
        type: string;
        step: number;
        payload?: unknown;
        sessionId?: string;
      };
      const sessionId = payloadSessionId || state.activeSessionId;
      if (!sessionId) {
        return;
      }

      const streamDetails = (() => {
        if (typeof streamPayload === 'string') {
          return streamPayload;
        }

        if (streamPayload === null || streamPayload === undefined) {
          return 'no payload';
        }

        try {
          const serialized = JSON.stringify(streamPayload);
          return serialized.length > 240 ? `${serialized.slice(0, 240)}...` : serialized;
        } catch {
          return '[unserializable payload]';
        }
      })();

      dispatch({
        type: 'ADD_MESSAGE',
        sessionId,
        message: {
          id: uuidv4(),
          role: 'log',
          content: `[stream] ${agentId} step ${step}: ${type} ${streamDetails}`,
          timestamp: Date.now(),
        },
      });
    };
    eventBus.subscribe('agent:stream', agentStreamHandler);
    unsubscribers.push(() => eventBus.unsubscribe('agent:stream', agentStreamHandler));

    // Subscribe to agent complete events
    const agentCompleteHandler: EventCallback = (payload) => {
      const { agentId, output, context, sessionId: payloadSessionId } = payload as {
        agentId: string;
        output?: unknown;
        context?: { sessionId?: string };
        sessionId?: string;
      };
      const sessionId = payloadSessionId || context?.sessionId || state.activeSessionId;
      if (sessionId) {
        dispatch({ type: 'AGENT_COMPLETE', sessionId, agentId, output });
      }
    };
    eventBus.subscribe('agent:complete', agentCompleteHandler);
    unsubscribers.push(() => eventBus.unsubscribe('agent:complete', agentCompleteHandler));

    // Subscribe to agent error events
    const agentErrorHandler: EventCallback = (payload) => {
      const { agentId, error, context, sessionId: payloadSessionId } = payload as {
        agentId: string;
        error: string;
        context?: { sessionId?: string };
        sessionId?: string;
      };
      const sessionId = payloadSessionId || context?.sessionId || state.activeSessionId;
      if (sessionId) {
        dispatch({ type: 'AGENT_ERROR', sessionId, agentId, error });
      }
    };
    eventBus.subscribe('agent:error', agentErrorHandler);
    unsubscribers.push(() => eventBus.unsubscribe('agent:error', agentErrorHandler));

    // Subscribe to artifact updates
    const artifactHandler: EventCallback = (payload) => {
      const { key, source, context, sessionId: payloadSessionId } = payload as {
        key: string;
        source: string;
        context?: { sessionId?: string };
        sessionId?: string;
      };
      const sessionId = payloadSessionId || context?.sessionId || state.activeSessionId;
      if (sessionId) {
        dispatch({ type: 'ARTIFACT_UPDATED', sessionId, key, source });
      }
    };
    eventBus.subscribe('artifact:any:updated', artifactHandler);
    unsubscribers.push(() => eventBus.unsubscribe('artifact:any:updated', artifactHandler));

    // Subscribe to workflow events
    const workflowStartHandler: EventCallback = (payload) => {
      const { projectName, sessionId: workflowSessionId } = payload as {
        projectName: string;
        sessionId?: string;
      };
      const sessionId = workflowSessionId || state.activeSessionId;
      if (sessionId) {
        dispatch({ type: 'WORKFLOW_START', sessionId, projectName });
      }
    };
    eventBus.subscribe('workflow:start', workflowStartHandler);
    unsubscribers.push(() => eventBus.unsubscribe('workflow:start', workflowStartHandler));

    // Subscribe to state transitions
    const stateTransitionHandler: EventCallback = (payload) => {
      const typedPayload = payload as {
        from?: string;
        to?: string;
        reason?: string;
        context?: { sessionId?: string };
        sessionId?: string;
      };
      const sessionId = typedPayload.sessionId || typedPayload.context?.sessionId || state.activeSessionId;
      const phase = typedPayload.to || typedPayload.reason;
      if (sessionId && phase) {
        dispatch({ type: 'WORKFLOW_PHASE_CHANGE', sessionId, phase });
      }
    };
    eventBus.subscribe('state:transition', stateTransitionHandler);
    unsubscribers.push(() => eventBus.unsubscribe('state:transition', stateTransitionHandler));

    const workflowPhaseHandler: EventCallback = (payload) => {
      const typedPayload = payload as {
        to: string;
        sessionId?: string;
      };
      const sessionId = typedPayload.sessionId || state.activeSessionId;
      if (sessionId && typedPayload.to) {
        dispatch({ type: 'WORKFLOW_PHASE_CHANGE', sessionId, phase: typedPayload.to });
      }
    };
    eventBus.subscribe('workflow:phase_changed', workflowPhaseHandler);
    unsubscribers.push(() => eventBus.unsubscribe('workflow:phase_changed', workflowPhaseHandler));

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [state.isLoaded, state.activeSessionId]);

  // Handle deletion sync
  const customDispatch = React.useMemo(() => {
    return (action: Action) => {
      if (action.type === 'DELETE_SESSION') {
        sessionStore.deleteSession(action.sessionId);
      }
      dispatch(action);
    };
  }, [dispatch]);

  return (
    <StoreContext.Provider value={{ state, dispatch: customDispatch as React.Dispatch<Action> }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = React.useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
