import { describe, it, expect } from 'vitest';
import { CTOAgent } from '../agents/CTOAgent.js';
import { MockLLMClient } from '../mock/mockLLM.js';
import { EventBus } from '../services/eventBus.js';
import { initialState } from '../store/reducer.js';

describe('CTOAgent', () => {
  it('should create CTO agent', () => {
    const mockLLM = new MockLLMClient();
    const eventBus = EventBus.getInstance();

    const agent = new CTOAgent('Test CTO', mockLLM, {
      state: initialState,
      eventBus,
    });

    expect(agent.getName()).toBe('Test CTO');
    expect(agent.getId()).toBeDefined();
  });

  it('should handle greeting message', async () => {
    const mockLLM = new MockLLMClient();
    const eventBus = EventBus.getInstance();
    const receivedMessages: unknown[] = [];

    eventBus.subscribe('chat:message:received', (payload) => {
      receivedMessages.push(payload);
    });

    const agent = new CTOAgent('Test CTO', mockLLM, {
      state: initialState,
      eventBus,
    });

    await agent.handleMessage('hello');

    expect(receivedMessages.length).toBeGreaterThan(0);
  });

  it('should handle status request', async () => {
    const mockLLM = new MockLLMClient();
    const eventBus = EventBus.getInstance();
    const receivedMessages: unknown[] = [];

    eventBus.subscribe('chat:message:received', (payload) => {
      receivedMessages.push(payload);
    });

    const agent = new CTOAgent('Test CTO', mockLLM, {
      state: initialState,
      eventBus,
    });

    await agent.handleMessage('what is the status?');

    expect(receivedMessages.length).toBeGreaterThan(0);
  });
});
