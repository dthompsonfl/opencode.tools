import { describe, it, expect, beforeEach } from 'vitest';
import { EventBus } from '../services/eventBus.js';
import { Action, Message, Agent, Gate, Artifact, TeamMember } from '../types/index.js';
import { reducer, initialState } from './reducer.js';

describe('Reducer', () => {
  beforeEach(() => {
    // Reset state before each test
  });

  describe('CHAT actions', () => {
    it('should handle CHAT_SEND_MESSAGE', () => {
      const action: Action = {
        type: 'CHAT_SEND_MESSAGE',
        payload: { content: 'Hello', role: 'user' },
      };

      const newState = reducer(initialState, action);

      expect(newState.chat.messages).toHaveLength(1);
      expect(newState.chat.messages[0]?.content).toBe('Hello');
      expect(newState.chat.messages[0]?.role).toBe('user');
      expect(newState.chat.inputValue).toBe('');
    });

    it('should handle CHAT_RECEIVE_MESSAGE', () => {
      const message: Message = {
        id: 'msg-1',
        role: 'cto',
        content: 'Hello!',
        timestamp: new Date(),
      };

      const action: Action = {
        type: 'CHAT_RECEIVE_MESSAGE',
        payload: message,
      };

      const newState = reducer(initialState, action);

      expect(newState.chat.messages).toHaveLength(1);
      expect(newState.chat.messages[0]?.content).toBe('Hello!');
    });

    it('should handle CHAT_SET_INPUT', () => {
      const action: Action = {
        type: 'CHAT_SET_INPUT',
        payload: 'new input',
      };

      const newState = reducer(initialState, action);

      expect(newState.chat.inputValue).toBe('new input');
    });

    it('should handle CHAT_SET_TYPING', () => {
      const action: Action = {
        type: 'CHAT_SET_TYPING',
        payload: { isTyping: true, agentId: 'agent-1' },
      };

      const newState = reducer(initialState, action);

      expect(newState.chat.isTyping).toBe(true);
      expect(newState.chat.typingAgentId).toBe('agent-1');
    });
  });

  describe('AGENT actions', () => {
    it('should handle AGENT_ADD', () => {
      const agent: Agent = {
        id: 'agent-1',
        name: 'Test Agent',
        role: 'Developer',
        status: 'running',
        progress: 0,
      };

      const action: Action = {
        type: 'AGENT_ADD',
        payload: agent,
      };

      const newState = reducer(initialState, action);

      expect(newState.agents).toHaveLength(1);
      expect(newState.agents[0]?.name).toBe('Test Agent');
      expect(newState.runtime.activeAgents).toBe(1);
    });

    it('should handle AGENT_UPDATE', () => {
      const agent: Agent = {
        id: 'agent-1',
        name: 'Test Agent',
        role: 'Developer',
        status: 'running',
        progress: 0,
      };

      let state = reducer(initialState, { type: 'AGENT_ADD', payload: agent });

      const updateAction: Action = {
        type: 'AGENT_UPDATE',
        payload: { id: 'agent-1', updates: { progress: 50 } },
      };

      state = reducer(state, updateAction);

      expect(state.agents[0]?.progress).toBe(50);
    });

    it('should handle AGENT_REMOVE', () => {
      const agent: Agent = {
        id: 'agent-1',
        name: 'Test Agent',
        role: 'Developer',
        status: 'running',
        progress: 0,
      };

      let state = reducer(initialState, { type: 'AGENT_ADD', payload: agent });
      state = reducer(state, { type: 'AGENT_REMOVE', payload: 'agent-1' });

      expect(state.agents).toHaveLength(0);
      expect(state.runtime.activeAgents).toBe(0);
    });
  });

  describe('GATE actions', () => {
    it('should handle GATE_ADD', () => {
      const gate: Gate = {
        id: 'gate-1',
        name: 'Test Gate',
        description: 'A test gate',
        status: 'pending',
        order: 1,
        checks: [],
      };

      const action: Action = {
        type: 'GATE_ADD',
        payload: gate,
      };

      const newState = reducer(initialState, action);

      expect(newState.gates).toHaveLength(1);
      expect(newState.gates[0]?.name).toBe('Test Gate');
    });
  });

  describe('PROJECT actions', () => {
    it('should handle PROJECT_SET_PHASE', () => {
      const action: Action = {
        type: 'PROJECT_SET_PHASE',
        payload: 'implementation',
      };

      const newState = reducer(initialState, action);

      expect(newState.project.phase).toBe('implementation');
    });

    it('should handle PROJECT_UPDATE', () => {
      const action: Action = {
        type: 'PROJECT_UPDATE',
        payload: { name: 'Updated Project' },
      };

      const newState = reducer(initialState, action);

      expect(newState.project.name).toBe('Updated Project');
    });
  });

  describe('FOCUS actions', () => {
    it('should handle SET_FOCUS', () => {
      const action: Action = {
        type: 'SET_FOCUS',
        payload: 'agents',
      };

      const newState = reducer(initialState, action);

      expect(newState.focus).toBe('agents');
    });
  });
});
