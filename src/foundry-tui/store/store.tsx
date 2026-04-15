import * as React from 'react';
import { useFoundryEvents } from '../hooks/useFoundryEvents';
import {
  AgentRuntime,
  ArtifactRecord,
  CollaborationEntry,
  FoundryAction,
  FoundryDispatch,
  FoundryState,
  QualityGate,
  TeamMember,
} from '../types';

interface FoundryStoreContextValue {
  state: FoundryState;
  dispatch: FoundryDispatch;
}

const initialState: FoundryState = {
  screen: 'dashboard',
  phase: 'intake',
  connection: 'disconnected',
  projectIntake: {
    name: '',
    industry: '',
    description: '',
    completionCriteria: '',
  },
  projects: [],
  agents: [],
  team: [
    { id: 'cto', name: 'CTO Orchestrator', role: 'Technical Leadership', status: 'available' },
    { id: 'pm', name: 'Product Manager', role: 'Planning', status: 'available' },
    { id: 'qa', name: 'QA Lead', role: 'Quality', status: 'available' },
  ],
  feed: [],
  artifacts: [],
  qualityGates: [
    { id: 'build', name: 'Build Gate', status: 'pending', detail: 'Awaiting execution', updatedAt: Date.now() },
    { id: 'test', name: 'Test Gate', status: 'pending', detail: 'Awaiting execution', updatedAt: Date.now() },
    { id: 'security', name: 'Security Gate', status: 'pending', detail: 'Awaiting execution', updatedAt: Date.now() },
    { id: 'docs', name: 'Docs Gate', status: 'pending', detail: 'Awaiting execution', updatedAt: Date.now() },
  ],
  conversation: {
    query: '',
    lastExportAt: null,
    exportNote: 'No export triggered',
  },
  executionErrors: [],
};

const FoundryStoreContext = React.createContext<FoundryStoreContextValue | null>(null);

export function FoundryStoreProvider(props: { children: React.ReactNode }): JSX.Element {
  const [state, dispatch] = React.useReducer(reducer, initialState);

  useFoundryEvents(dispatch);

  const value = React.useMemo<FoundryStoreContextValue>(() => ({ state, dispatch }), [state]);

  return <FoundryStoreContext.Provider value={value}>{props.children}</FoundryStoreContext.Provider>;
}

export function useFoundryStore(): FoundryStoreContextValue {
  const context = React.useContext(FoundryStoreContext);
  if (!context) {
    throw new Error('useFoundryStore must be used within FoundryStoreProvider');
  }
  return context;
}

function reducer(state: FoundryState, action: FoundryAction): FoundryState {
  switch (action.type) {
    case 'SET_SCREEN':
      return { ...state, screen: action.screen };

    case 'SET_CONNECTION_STATUS':
      return { ...state, connection: action.connection };

    case 'SET_PHASE':
      return { ...state, phase: action.phase };

    case 'UPDATE_INTAKE_FIELD':
      return {
        ...state,
        projectIntake: {
          ...state.projectIntake,
          [action.field]: action.value,
        },
      };

    case 'SUBMIT_INTAKE': {
      const projectName = state.projectIntake.name.trim();
      if (!projectName) {
        return state;
      }

      const projectId = `project-${Date.now()}`;
      const project = {
        id: projectId,
        name: projectName,
        industry: state.projectIntake.industry.trim() || 'General',
        status: 'active' as const,
        createdAt: Date.now(),
      };

      const entry: CollaborationEntry = {
        id: `feed-${projectId}`,
        event: 'project:intake:submitted',
        actor: 'operator',
        message: `Intake submitted for ${projectName}`,
        timestamp: Date.now(),
      };

      return {
        ...state,
        projects: [project, ...state.projects],
        projectIntake: {
          name: '',
          industry: '',
          description: '',
          completionCriteria: '',
        },
        phase: 'planning',
        feed: [entry, ...state.feed].slice(0, 120),
      };
    }

    case 'UPSERT_AGENT': {
      const agents = upsertById(state.agents, action.agent);
      const member: TeamMember = {
        id: action.agent.id,
        name: action.agent.name,
        role: action.agent.role,
        status: mapAgentToTeamStatus(action.agent.status),
      };

      return {
        ...state,
        agents,
        team: upsertById(state.team, member),
      };
    }

    case 'UPSERT_TEAM_MEMBER':
      return {
        ...state,
        team: upsertById(state.team, action.member),
      };

    case 'ADD_FEED_ENTRY':
      return {
        ...state,
        feed: [action.entry, ...state.feed].slice(0, 120),
      };

    case 'UPSERT_ARTIFACT':
      return {
        ...state,
        artifacts: upsertById(state.artifacts, action.artifact)
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .slice(0, 80),
      };

    case 'UPSERT_QUALITY_GATE':
      return {
        ...state,
        qualityGates: upsertById(state.qualityGates, action.gate).sort((a, b) => a.name.localeCompare(b.name)),
      };

    case 'SET_CONVERSATION_QUERY':
      return {
        ...state,
        conversation: {
          ...state.conversation,
          query: action.query,
        },
      };

    case 'REQUEST_CONVERSATION_EXPORT':
      return {
        ...state,
        conversation: {
          ...state.conversation,
          lastExportAt: Date.now(),
          exportNote: action.note,
        },
      };

    case 'APPEND_EXECUTION_ERROR':
      return {
        ...state,
        executionErrors: [action.message, ...state.executionErrors].slice(0, 20),
      };

    default:
      return state;
  }
}

function upsertById<T extends { id: string }>(collection: T[], value: T): T[] {
  const index = collection.findIndex((item) => item.id === value.id);
  if (index < 0) {
    return [value, ...collection];
  }

  const next = [...collection];
  next[index] = value;
  return next;
}

function mapAgentToTeamStatus(status: AgentRuntime['status']): TeamMember['status'] {
  if (status === 'busy') {
    return 'busy';
  }
  if (status === 'blocked') {
    return 'blocked';
  }
  if (status === 'completed') {
    return 'available';
  }
  return 'available';
}

export type { FoundryState, FoundryAction, FoundryDispatch, QualityGate, ArtifactRecord, CollaborationEntry };
