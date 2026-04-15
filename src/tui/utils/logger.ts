import { Message } from '../types';

export const createLogMessage = (content: string): Message => ({
  id: Date.now().toString() + Math.random(),
  role: 'log',
  content,
  timestamp: Date.now(),
});

export const createUserMessage = (content: string): Message => ({
  id: Date.now().toString() + Math.random(),
  role: 'user',
  content,
  timestamp: Date.now(),
});

export const createAgentMessage = (content: string): Message => ({
  id: Date.now().toString() + Math.random(),
  role: 'agent',
  content,
  timestamp: Date.now(),
});

export const createSystemMessage = (content: string): Message => ({
  id: Date.now().toString() + Math.random(),
  role: 'system',
  content,
  timestamp: Date.now(),
});
