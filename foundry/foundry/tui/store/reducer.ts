import { v4 as uuidv4 } from 'uuid';
import {
  FoundryTUIState,
  ChatState,
  ProjectContext,
  RuntimeState,
  Agent,
  Gate,
  Artifact,
  TeamMember,
  Message,
  ProjectPhase,
  AgentStatus,
  GateStatus,
  FocusArea,
  CTOPersonality,
} from '../types/index.js';

// Action Types
export type Action =
  | { type: 'CHAT_SEND_MESSAGE'; payload: { content: string; role?: 'user' | 'system' } }
  | { type: 'CHAT_RECEIVE_MESSAGE'; payload: Message }
  | { type: 'CHAT_SET_INPUT'; payload: string }
  | { type: 'CHAT_SET_TYPING'; payload: { isTyping: boolean; agentId?: string } }
  | { type: 'CHAT_ADD_SUGGESTION'; payload: string }
  | { type: 'CHAT_CLEAR_SUGGESTIONS' }
  | { type: 'CHAT_ADD_COMMAND_HISTORY'; payload: string }
  | { type: 'PROJECT_SET_PHASE'; payload: ProjectPhase }
  | { type: 'PROJECT_UPDATE'; payload: Partial<ProjectContext> }
  | { type: 'RUNTIME_UPDATE'; payload: Partial<RuntimeState> }
  | { type: 'AGENT_ADD'; payload: Agent }
  | { type: 'AGENT_UPDATE'; payload: { id: string; updates: Partial<Agent> } }
  | { type: 'AGENT_REMOVE'; payload: string }
  | { type: 'AGENT_SET_STATUS'; payload: { id: string; status: AgentStatus } }
  | { type: 'AGENT_SET_PROGRESS'; payload: { id: string; progress: number } }
  | { type: 'GATE_ADD'; payload: Gate }
  | { type: 'GATE_UPDATE'; payload: { id: string; updates: Partial<Gate> } }
  | { type: 'GATE_SET_STATUS'; payload: { id: string; status: GateStatus } }
  | { type: 'ARTIFACT_ADD'; payload: Artifact }
  | { type: 'ARTIFACT_UPDATE'; payload: { id: string; updates: Partial<Artifact> } }
  | { type: 'TEAM_ADD'; payload: TeamMember }
  | { type: 'TEAM_UPDATE'; payload: { id: string; updates: Partial<TeamMember> } }
  | { type: 'SET_FOCUS'; payload: FocusArea }
  | { type: 'SET_CTO_PERSONALITY'; payload: CTOPersonality }
  | { type: 'TOGGLE_HELP' }
  | { type: 'TOGGLE_PROJECT_SELECTOR' }
  | { type: 'SET_ERROR'; payload: string | undefined }
  | { type: 'RESET_STATE' };

// Initial State
export const initialChatState: ChatState = {
  messages: [],
  inputValue: '',
  isTyping: false,
  suggestions: [],
  commandHistory: [],
  historyIndex: -1,
};

export const initialProjectContext: ProjectContext = {
  id: uuidv4(),
  name: 'New Project',
  description: 'A new Foundry project',
  phase: 'discovery',
  status: 'active',
  startDate: new Date(),
  goals: [],
  constraints: [],
};

export const initialRuntimeState: RuntimeState = {
  isConnected: true,
  activeAgents: 0,
  pendingTasks: 0,
  completedTasks: 0,
  errors: [],
};

export const initialState: FoundryTUIState = {
  chat: initialChatState,
  project: initialProjectContext,
  runtime: initialRuntimeState,
  agents: [],
  gates: [],
  artifacts: [],
  team: [],
  focus: 'chat',
  ctoPersonality: {
    name: 'CTO',
    style: 'strategic',
    verbosity: 'balanced',
    proactivity: 70,
  },
  isHelpVisible: false,
  isProjectSelectorVisible: false,
};

// Reducer
export function reducer(state: FoundryTUIState, action: Action): FoundryTUIState {
  switch (action.type) {
    case 'CHAT_SEND_MESSAGE': {
      const message: Message = {
        id: uuidv4(),
        role: action.payload.role ?? 'user',
        content: action.payload.content,
        timestamp: new Date(),
      };
      return {
        ...state,
        chat: {
          ...state.chat,
          messages: [...state.chat.messages, message],
          inputValue: '',
        },
      };
    }

    case 'CHAT_RECEIVE_MESSAGE':
      return {
        ...state,
        chat: {
          ...state.chat,
          messages: [...state.chat.messages, action.payload],
        },
      };

    case 'CHAT_SET_INPUT':
      return {
        ...state,
        chat: {
          ...state.chat,
          inputValue: action.payload,
        },
      };

    case 'CHAT_SET_TYPING':
      return {
        ...state,
        chat: {
          ...state.chat,
          isTyping: action.payload.isTyping,
          typingAgentId: action.payload.agentId,
        },
      };

    case 'CHAT_ADD_SUGGESTION':
      if (state.chat.suggestions.includes(action.payload)) {
        return state;
      }
      return {
        ...state,
        chat: {
          ...state.chat,
          suggestions: [...state.chat.suggestions, action.payload],
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

    case 'CHAT_ADD_COMMAND_HISTORY':
      return {
        ...state,
        chat: {
          ...state.chat,
          commandHistory: [action.payload, ...state.chat.commandHistory].slice(0, 50),
          historyIndex: -1,
        },
      };

    case 'PROJECT_SET_PHASE':
      return {
        ...state,
        project: {
          ...state.project,
          phase: action.payload,
        },
      };

    case 'PROJECT_UPDATE':
      return {
        ...state,
        project: {
          ...state.project,
          ...action.payload,
        },
      };

    case 'RUNTIME_UPDATE':
      return {
        ...state,
        runtime: {
          ...state.runtime,
          ...action.payload,
        },
      };

    case 'AGENT_ADD':
      return {
        ...state,
        agents: [...state.agents, action.payload],
        runtime: {
          ...state.runtime,
          activeAgents: state.runtime.activeAgents + 1,
        },
      };

    case 'AGENT_UPDATE':
      return {
        ...state,
        agents: state.agents.map((agent) =>
          agent.id === action.payload.id ? { ...agent, ...action.payload.updates } : agent
        ),
      };

    case 'AGENT_REMOVE':
      return {
        ...state,
        agents: state.agents.filter((agent) => agent.id !== action.payload),
        runtime: {
          ...state.runtime,
          activeAgents: Math.max(0, state.runtime.activeAgents - 1),
        },
      };

    case 'AGENT_SET_STATUS':
      return {
        ...state,
        agents: state.agents.map((agent) =>
          agent.id === action.payload.id ? { ...agent, status: action.payload.status } : agent
        ),
      };

    case 'AGENT_SET_PROGRESS':
      return {
        ...state,
        agents: state.agents.map((agent) =>
          agent.id === action.payload.id ? { ...agent, progress: action.payload.progress } : agent
        ),
      };

    case 'GATE_ADD':
      return {
        ...state,
        gates: [...state.gates, action.payload],
      };

    case 'GATE_UPDATE':
      return {
        ...state,
        gates: state.gates.map((gate) =>
          gate.id === action.payload.id ? { ...gate, ...action.payload.updates } : gate
        ),
      };

    case 'GATE_SET_STATUS':
      return {
        ...state,
        gates: state.gates.map((gate) =>
          gate.id === action.payload.id ? { ...gate, status: action.payload.status } : gate
        ),
      };

    case 'ARTIFACT_ADD':
      return {
        ...state,
        artifacts: [...state.artifacts, action.payload],
      };

    case 'ARTIFACT_UPDATE':
      return {
        ...state,
        artifacts: state.artifacts.map((artifact) =>
          artifact.id === action.payload.id
            ? { ...artifact, ...action.payload.updates }
            : artifact
        ),
      };

    case 'TEAM_ADD':
      return {
        ...state,
        team: [...state.team, action.payload],
      };

    case 'TEAM_UPDATE':
      return {
        ...state,
        team: state.team.map((member) =>
          member.id === action.payload.id ? { ...member, ...action.payload.updates } : member
        ),
      };

    case 'SET_FOCUS':
      return {
        ...state,
        focus: action.payload,
      };

    case 'SET_CTO_PERSONALITY':
      return {
        ...state,
        ctoPersonality: action.payload,
      };

    case 'TOGGLE_HELP':
      return {
        ...state,
        isHelpVisible: !state.isHelpVisible,
      };

    case 'TOGGLE_PROJECT_SELECTOR':
      return {
        ...state,
        isProjectSelectorVisible: !state.isProjectSelectorVisible,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };

    case 'RESET_STATE':
      return initialState;

    default:
      return state;
  }
}
