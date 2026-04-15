import { useEffect, useCallback } from 'react';
import { eventBus } from '../services/eventBus.js';
import { FoundryTUIState, Action, Message } from '../types/index.js';

export function useEventBus(dispatch: React.Dispatch<Action>): void {
  useEffect(() => {
    // Subscribe to chat events
    const unsubscribeMessages = eventBus.subscribe('chat:message:received', (payload) => {
      const message = payload as Message;
      dispatch({
        type: 'CHAT_RECEIVE_MESSAGE',
        payload: {
          ...message,
          timestamp: new Date(message.timestamp),
        },
      });
    });

    const unsubscribeTypingStart = eventBus.subscribe('chat:typing:start', (payload) => {
      const { agentId } = payload as { agentId: string };
      dispatch({
        type: 'CHAT_SET_TYPING',
        payload: { isTyping: true, agentId },
      });
    });

    const unsubscribeTypingStop = eventBus.subscribe('chat:typing:stop', () => {
      dispatch({
        type: 'CHAT_SET_TYPING',
        payload: { isTyping: false },
      });
    });

    const unsubscribeSuggestions = eventBus.subscribe('chat:suggestion:add', (payload) => {
      const { suggestion } = payload as { suggestion: string };
      dispatch({
        type: 'CHAT_ADD_SUGGESTION',
        payload: suggestion,
      });
    });

    // Subscribe to agent events
    const unsubscribeAgentProgress = eventBus.subscribe('agent:progress', (payload) => {
      const { agentId, progress } = payload as { agentId: string; progress: number };
      dispatch({
        type: 'AGENT_SET_PROGRESS',
        payload: { id: agentId, progress },
      });
    });

    const unsubscribeAgentCompleted = eventBus.subscribe('agent:completed', (payload) => {
      const { agentId } = payload as { agentId: string };
      dispatch({
        type: 'AGENT_SET_STATUS',
        payload: { id: agentId, status: 'completed' },
      });
    });

    // Subscribe to gate events
    const unsubscribeGateStatus = eventBus.subscribe('gate:status:changed', (payload) => {
      const { gateId, status } = payload as { gateId: string; status: FoundryTUIState['gates'][0]['status'] };
      dispatch({
        type: 'GATE_SET_STATUS',
        payload: { id: gateId, status },
      });
    });

    // Subscribe to focus events
    const unsubscribeFocus = eventBus.subscribe('SET_FOCUS', (payload) => {
      const focus = (payload as { payload: FoundryTUIState['focus'] }).payload;
      dispatch({ type: 'SET_FOCUS', payload: focus });
    });

    return () => {
      unsubscribeMessages();
      unsubscribeTypingStart();
      unsubscribeTypingStop();
      unsubscribeSuggestions();
      unsubscribeAgentProgress();
      unsubscribeAgentCompleted();
      unsubscribeGateStatus();
      unsubscribeFocus();
    };
  }, [dispatch]);
}
