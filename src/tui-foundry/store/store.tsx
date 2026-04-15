/**
 * Foundry TUI - React Context Store
 * Centralized state management with reducer pattern
 */

import * as React from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  FoundryState,
  FoundryAction,
  Project,
  Message,
  ChatThread,
  CollaborationEntry,
  LLMProvider,
} from '../types';
import {
  DEFAULT_LLM_CONFIG,
  DEFAULT_SETTINGS,
  SCREEN_ORDER,
  PHASE_LABELS,
} from '../types';
import { useEventBus } from '../hooks/useEventBus';
import { TuiRuntime } from '../runtime/tui-runtime';
import { configManager } from '../../tui/llm/config';
import type { ProviderType } from '../../tui/llm/types';

// =============================================================================
// Initial State
// =============================================================================

const initialChatState = {
  messages: [],
  threads: [{
    id: 'main',
    title: 'Main Chat',
    participants: ['user', 'cto'],
    messageCount: 0,
    lastActivity: Date.now(),
    isActive: true,
  }],
  activeThreadId: 'main',
  inputValue: '',
  isTyping: false,
  typingAgentId: undefined,
  suggestions: [],
  commandHistory: [],
  historyIndex: -1,
  showMentions: false,
  mentionQuery: '',
};

const initialNavigationState = {
  currentScreen: 'dashboard' as const,
  breadcrumbs: [{ label: 'Dashboard', screen: 'dashboard' as const }],
  focusedPanel: 'main' as const,
};

const initialProjectIntake = {
  name: '',
  industry: '',
  description: '',
  completionCriteria: '',
  stakeholders: [],
  priority: 'medium' as const,
};

export const initialState: FoundryState = {
  screen: 'dashboard',
  phase: 'intake',
  connection: 'connecting',
  navigation: initialNavigationState,
  projects: [],
  activeProjectId: undefined,
  projectIntake: initialProjectIntake,
  agents: [],
  team: [
    {
      id: 'cto',
      name: 'CTO Orchestrator',
      role: 'cto',
      roleLabel: 'CTO Orchestrator',
      status: 'available',
      availability: 100,
      isActive: true,
      joinedAt: Date.now(),
      lastActivity: Date.now(),
    },
    {
      id: 'pm',
      name: 'Product Manager',
      role: 'pm',
      roleLabel: 'Product Manager',
      status: 'available',
      availability: 100,
      isActive: true,
      joinedAt: Date.now(),
      lastActivity: Date.now(),
    },
    {
      id: 'architect',
      name: 'System Architect',
      role: 'architect',
      roleLabel: 'System Architect',
      status: 'available',
      availability: 100,
      isActive: true,
      joinedAt: Date.now(),
      lastActivity: Date.now(),
    },
  ],
  chat: initialChatState,
  feed: [],
  artifacts: [],
  qualityGates: [
    {
      id: 'build',
      name: 'Build Gate',
      description: 'Code compilation and build verification',
      status: 'pending',
      order: 1,
      detail: 'Awaiting execution',
      checks: [],
      updatedAt: Date.now(),
    },
    {
      id: 'test',
      name: 'Test Gate',
      description: 'Unit and integration test execution',
      status: 'pending',
      order: 2,
      detail: 'Awaiting execution',
      checks: [],
      updatedAt: Date.now(),
    },
    {
      id: 'security',
      name: 'Security Gate',
      description: 'Security vulnerability scanning',
      status: 'pending',
      order: 3,
      detail: 'Awaiting execution',
      checks: [],
      updatedAt: Date.now(),
    },
    {
      id: 'docs',
      name: 'Documentation Gate',
      description: 'Documentation completeness check',
      status: 'pending',
      order: 4,
      detail: 'Awaiting execution',
      checks: [],
      updatedAt: Date.now(),
    },
  ],
  executionStreams: [],
  executionErrors: [],
  llmConfig: DEFAULT_LLM_CONFIG,
  providers: {},
  settings: DEFAULT_SETTINGS,
  isHelpVisible: false,
  isLoading: false,
  error: undefined,
};

// =============================================================================
// Reducer
// =============================================================================

function reducer(state: FoundryState, action: FoundryAction): FoundryState {
  switch (action.type) {
    // Navigation
    case 'SET_SCREEN': {
      const breadcrumbs = [...state.navigation.breadcrumbs];
      const existingIndex = breadcrumbs.findIndex(b => b.screen === action.screen);
      
      if (existingIndex >= 0) {
        breadcrumbs.splice(existingIndex + 1);
      } else {
        breadcrumbs.push({
          label: action.screen.charAt(0).toUpperCase() + action.screen.slice(1),
          screen: action.screen,
        });
      }
      
      return {
        ...state,
        screen: action.screen,
        navigation: {
          ...state.navigation,
          currentScreen: action.screen,
          previousScreen: state.navigation.currentScreen,
          breadcrumbs: breadcrumbs.slice(-5), // Keep last 5
        },
      };
    }

    case 'NAVIGATE_BACK': {
      const breadcrumbs = [...state.navigation.breadcrumbs];
      if (breadcrumbs.length > 1) {
        breadcrumbs.pop();
        const previous = breadcrumbs[breadcrumbs.length - 1];
        return {
          ...state,
          screen: previous.screen,
          navigation: {
            ...state.navigation,
            currentScreen: previous.screen,
            breadcrumbs,
          },
        };
      }
      return state;
    }

    case 'SET_FOCUSED_PANEL':
      return {
        ...state,
        navigation: {
          ...state.navigation,
          focusedPanel: action.panel,
        },
      };

    // Connection
    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        connection: action.connection,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.error,
      };

    // Phase
    case 'SET_PHASE':
      return {
        ...state,
        phase: action.phase,
      };

    case 'ADVANCE_PHASE': {
      const phases = ['intake', 'planning', 'delegation', 'execution', 'quality', 'release'] as const;
      const currentIndex = phases.indexOf(state.phase);
      const nextPhase = phases[currentIndex + 1];
      if (nextPhase) {
        return {
          ...state,
          phase: nextPhase,
        };
      }
      return state;
    }

    // Projects
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

      const projectId = `project-${uuidv4()}`;
      const project: Project = {
        id: projectId,
        name: projectName,
        industry: state.projectIntake.industry.trim() || 'General',
        description: state.projectIntake.description,
        status: 'active',
        phase: 'planning',
        priority: state.projectIntake.priority,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        completionCriteria: state.projectIntake.completionCriteria,
        stakeholders: state.projectIntake.stakeholders,
        agentIds: [],
        metrics: {
          tasksTotal: 0,
          tasksCompleted: 0,
          tasksFailed: 0,
          artifactsCreated: 0,
          gatesPassed: 0,
          gatesFailed: 0,
        },
      };

      const entry: CollaborationEntry = {
        id: `feed-${uuidv4()}`,
        type: 'project:start',
        event: 'project:intake:submitted',
        actor: 'user',
        message: `Intake submitted for "${projectName}"`,
        timestamp: Date.now(),
      };

      return {
        ...state,
        projects: [project, ...state.projects],
        activeProjectId: projectId,
        projectIntake: initialProjectIntake,
        phase: 'planning',
        feed: [entry, ...state.feed].slice(0, 100),
      };
    }

    case 'SET_ACTIVE_PROJECT':
      return {
        ...state,
        activeProjectId: action.projectId,
      };

    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: state.projects.map(p =>
          p.id === action.projectId ? { ...p, ...action.updates, updatedAt: Date.now() } : p
        ),
      };

    case 'DELETE_PROJECT':
      return {
        ...state,
        projects: state.projects.filter(p => p.id !== action.projectId),
        activeProjectId: state.activeProjectId === action.projectId ? undefined : state.activeProjectId,
      };

    // Agents
    case 'UPSERT_AGENT': {
      const existingIndex = state.agents.findIndex(a => a.id === action.agent.id);
      if (existingIndex >= 0) {
        const agents = [...state.agents];
        agents[existingIndex] = { ...agents[existingIndex], ...action.agent, updatedAt: Date.now() };
        return {
          ...state,
          agents,
        };
      }
      return {
        ...state,
        agents: [...state.agents, { ...action.agent, updatedAt: Date.now() }],
      };
    }

    case 'UPDATE_AGENT_STATUS':
      return {
        ...state,
        agents: state.agents.map(a =>
          a.id === action.agentId
            ? { ...a, status: action.status, progress: action.progress ?? a.progress, updatedAt: Date.now() }
            : a
        ),
      };

    case 'REMOVE_AGENT':
      return {
        ...state,
        agents: state.agents.filter(a => a.id !== action.agentId),
      };

    case 'DELEGATE_TASK':
      // This action is handled by middleware/effects
      return state;

    // Team
    case 'UPSERT_TEAM_MEMBER': {
      const existingIndex = state.team.findIndex(m => m.id === action.member.id);
      if (existingIndex >= 0) {
        const team = [...state.team];
        team[existingIndex] = { ...team[existingIndex], ...action.member, lastActivity: Date.now() };
        return {
          ...state,
          team,
        };
      }
      return {
        ...state,
        team: [...state.team, { ...action.member, lastActivity: Date.now() }],
      };
    }

    case 'UPDATE_MEMBER_STATUS':
      return {
        ...state,
        team: state.team.map(m =>
          m.id === action.memberId ? { ...m, status: action.status, lastActivity: Date.now() } : m
        ),
      };

    // Chat
    case 'CHAT_SEND_MESSAGE': {
      const message: Message = {
        id: uuidv4(),
        role: action.role ?? 'user',
        content: action.content,
        timestamp: Date.now(),
      };

      // Extract mentions
      const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
      const mentions: string[] = [];
      let match;
      while ((match = mentionRegex.exec(action.content)) !== null) {
        mentions.push(match[1]);
      }
      if (mentions.length > 0) {
        message.mentions = mentions;
      }

      return {
        ...state,
        chat: {
          ...state.chat,
          messages: [...state.chat.messages, message],
          inputValue: '',
          commandHistory: [action.content, ...state.chat.commandHistory].slice(0, 50),
        },
      };
    }

    case 'CHAT_RECEIVE_MESSAGE':
      return {
        ...state,
        chat: {
          ...state.chat,
          messages: [...state.chat.messages, action.message],
        },
      };

    case 'CHAT_SET_INPUT':
      // Check for mentions
      const mentionMatch = action.value.match(/@([a-zA-Z0-9_]*)$/);
      return {
        ...state,
        chat: {
          ...state.chat,
          inputValue: action.value,
          showMentions: !!mentionMatch,
          mentionQuery: mentionMatch ? mentionMatch[1] : '',
        },
      };

    case 'CHAT_SET_TYPING':
      return {
        ...state,
        chat: {
          ...state.chat,
          isTyping: action.isTyping,
          typingAgentId: action.agentId,
        },
      };

    case 'CHAT_ADD_SUGGESTION':
      if (state.chat.suggestions.includes(action.suggestion)) {
        return state;
      }
      return {
        ...state,
        chat: {
          ...state.chat,
          suggestions: [...state.chat.suggestions, action.suggestion].slice(0, 5),
        },
      };

    case 'CHAT_CLEAR_SUGGESTIONS':
      return {
        ...state,
        chat: {
          ...state.chat,
          suggestions: [],
        },
      };

    case 'CHAT_SET_ACTIVE_THREAD':
      return {
        ...state,
        chat: {
          ...state.chat,
          activeThreadId: action.threadId,
        },
      };

    case 'CHAT_CREATE_THREAD': {
      const thread: ChatThread = {
        id: uuidv4(),
        title: action.title,
        participants: action.participants,
        messageCount: 0,
        lastActivity: Date.now(),
        isActive: true,
      };
      return {
        ...state,
        chat: {
          ...state.chat,
          threads: [...state.chat.threads, thread],
          activeThreadId: thread.id,
        },
      };
    }

    // Feed
    case 'ADD_FEED_ENTRY':
      return {
        ...state,
        feed: [action.entry, ...state.feed].slice(0, 100),
      };

    case 'CLEAR_FEED':
      return {
        ...state,
        feed: [],
      };

    // Artifacts
    case 'UPSERT_ARTIFACT': {
      const existingIndex = state.artifacts.findIndex(a => a.id === action.artifact.id);
      if (existingIndex >= 0) {
        const artifacts = [...state.artifacts];
        artifacts[existingIndex] = { ...artifacts[existingIndex], ...action.artifact };
        return {
          ...state,
          artifacts: artifacts.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 80),
        };
      }
      return {
        ...state,
        artifacts: [action.artifact, ...state.artifacts].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 80),
      };
    }

    case 'DELETE_ARTIFACT':
      return {
        ...state,
        artifacts: state.artifacts.filter(a => a.id !== action.artifactId),
      };

    // Quality Gates
    case 'UPSERT_QUALITY_GATE': {
      const existingIndex = state.qualityGates.findIndex(g => g.id === action.gate.id);
      if (existingIndex >= 0) {
        const gates = [...state.qualityGates];
        gates[existingIndex] = { ...gates[existingIndex], ...action.gate };
        return {
          ...state,
          qualityGates: gates.sort((a, b) => a.order - b.order),
        };
      }
      return {
        ...state,
        qualityGates: [...state.qualityGates, action.gate].sort((a, b) => a.order - b.order),
      };
    }

    case 'RUN_GATE':
      return {
        ...state,
        qualityGates: state.qualityGates.map(g =>
          g.id === action.gateId
            ? { ...g, status: 'running', startedAt: Date.now(), updatedAt: Date.now() }
            : g
        ),
      };

    case 'RESET_GATE':
      return {
        ...state,
        qualityGates: state.qualityGates.map(g =>
          g.id === action.gateId
            ? { ...g, status: 'pending', startedAt: undefined, completedAt: undefined, updatedAt: Date.now() }
            : g
        ),
      };

    // Execution
    case 'ADD_EXECUTION_LOG': {
      const streamIndex = state.executionStreams.findIndex(s => s.id === action.streamId);
      if (streamIndex >= 0) {
        const streams = [...state.executionStreams];
        streams[streamIndex] = {
          ...streams[streamIndex],
          logs: [...streams[streamIndex].logs, action.log].slice(-1000),
        };
        return {
          ...state,
          executionStreams: streams,
        };
      }
      return {
        ...state,
        executionStreams: [
          ...state.executionStreams,
          {
            id: action.streamId,
            name: action.streamId,
            status: 'running',
            progress: 0,
            logs: [action.log],
            startTime: Date.now(),
          },
        ],
      };
    }

    case 'APPEND_EXECUTION_ERROR':
      return {
        ...state,
        executionErrors: [action.message, ...state.executionErrors].slice(0, 20),
      };

    case 'CLEAR_EXECUTION_ERRORS':
      return {
        ...state,
        executionErrors: [],
      };

    // Settings
    case 'UPDATE_PROVIDER_CONFIG':
      return {
        ...state,
        providers: {
          ...state.providers,
          [action.provider]: {
            ...(state.providers[action.provider] || DEFAULT_LLM_CONFIG),
            ...action.config,
            provider: action.provider as LLMProvider // Ensure provider type matches
          }
        }
      };

    case 'UPDATE_LLM_CONFIG':
      return {
        ...state,
        llmConfig: { ...state.llmConfig, ...action.config },
      };

    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.settings },
      };

    // UI
    case 'TOGGLE_HELP':
      return {
        ...state,
        isHelpVisible: !state.isHelpVisible,
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.isLoading,
      };

    case 'RESET_STATE':
      return initialState;

    default:
      return state;
  }
}

// =============================================================================
// Context
// =============================================================================

interface StoreContextValue {
  state: FoundryState;
  dispatch: (action: FoundryAction) => void;
}

const StoreContext = React.createContext<StoreContextValue | null>(null);

// =============================================================================
// Provider
// =============================================================================

export function StoreProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [state, dispatch] = React.useReducer(reducer, initialState);

  // Initialize runtime and Cowork integration once
  React.useEffect(() => {
    void TuiRuntime.getInstance().initialize(dispatch);
  }, [dispatch]);

  // Sync LLM config to global manager
  React.useEffect(() => {
    if (state.llmConfig && state.llmConfig.provider) {
      configManager.setProviderConfig(state.llmConfig.provider as unknown as ProviderType, state.llmConfig);
    }
  }, [state.llmConfig]);

  const value = React.useMemo(
    () => ({ state, dispatch }),
    [state]
  );

  return React.createElement(StoreContext.Provider, { value }, children);
}

// =============================================================================
// Hooks
// =============================================================================

export function useStore(): StoreContextValue {
  const context = React.useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within StoreProvider');
  }
  return context;
}

export function useDispatch(): (action: FoundryAction) => void {
  const { dispatch } = useStore();
  return dispatch;
}

export function useSelector<T>(selector: (state: FoundryState) => T): T {
  const { state } = useStore();
  return selector(state);
}
