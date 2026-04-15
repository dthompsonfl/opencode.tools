import React, { createContext, useContext, useReducer, ReactNode, useCallback } from 'react';
import { FoundryTUIState, Action } from '../types/index.js';
import { reducer, initialState } from './reducer.js';

interface StoreContextType {
  state: FoundryTUIState;
  dispatch: React.Dispatch<Action>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

interface StoreProviderProps {
  children: ReactNode;
  initialState?: FoundryTUIState;
}

export function StoreProvider({ children, initialState: customInitialState }: StoreProviderProps): React.ReactElement {
  const [state, dispatch] = useReducer(reducer, customInitialState ?? initialState);

  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextType {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}

export function useDispatch(): React.Dispatch<Action> {
  const { dispatch } = useStore();
  return dispatch;
}

export function useSelector<T>(selector: (state: FoundryTUIState) => T): T {
  const { state } = useStore();
  return selector(state);
}

export function useChat(): {
  messages: FoundryTUIState['chat']['messages'];
  inputValue: string;
  isTyping: boolean;
  suggestions: string[];
  sendMessage: (content: string) => void;
  setInput: (value: string) => void;
} {
  const { state, dispatch } = useStore();

  const sendMessage = useCallback(
    (content: string) => {
      dispatch({ type: 'CHAT_SEND_MESSAGE', payload: { content } });
    },
    [dispatch]
  );

  const setInput = useCallback(
    (value: string) => {
      dispatch({ type: 'CHAT_SET_INPUT', payload: value });
    },
    [dispatch]
  );

  return {
    messages: state.chat.messages,
    inputValue: state.chat.inputValue,
    isTyping: state.chat.isTyping,
    suggestions: state.chat.suggestions,
    sendMessage,
    setInput,
  };
}

export function useProject(): {
  project: FoundryTUIState['project'];
  updateProject: (updates: Partial<FoundryTUIState['project']>) => void;
  setPhase: (phase: FoundryTUIState['project']['phase']) => void;
} {
  const { state, dispatch } = useStore();

  const updateProject = useCallback(
    (updates: Partial<FoundryTUIState['project']>) => {
      dispatch({ type: 'PROJECT_UPDATE', payload: updates });
    },
    [dispatch]
  );

  const setPhase = useCallback(
    (phase: FoundryTUIState['project']['phase']) => {
      dispatch({ type: 'PROJECT_SET_PHASE', payload: phase });
    },
    [dispatch]
  );

  return {
    project: state.project,
    updateProject,
    setPhase,
  };
}

export function useAgents(): {
  agents: FoundryTUIState['agents'];
  addAgent: (agent: FoundryTUIState['agents'][0]) => void;
  updateAgent: (id: string, updates: Partial<FoundryTUIState['agents'][0]>) => void;
  removeAgent: (id: string) => void;
} {
  const { state, dispatch } = useStore();

  const addAgent = useCallback(
    (agent: FoundryTUIState['agents'][0]) => {
      dispatch({ type: 'AGENT_ADD', payload: agent });
    },
    [dispatch]
  );

  const updateAgent = useCallback(
    (id: string, updates: Partial<FoundryTUIState['agents'][0]>) => {
      dispatch({ type: 'AGENT_UPDATE', payload: { id, updates } });
    },
    [dispatch]
  );

  const removeAgent = useCallback(
    (id: string) => {
      dispatch({ type: 'AGENT_REMOVE', payload: id });
    },
    [dispatch]
  );

  return {
    agents: state.agents,
    addAgent,
    updateAgent,
    removeAgent,
  };
}
