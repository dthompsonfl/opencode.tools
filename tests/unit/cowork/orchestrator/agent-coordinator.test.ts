/**
 * Tests for AgentCoordinator
 */

import { AgentCoordinator } from '../../../../src/cowork/orchestrator/agent-coordinator';
import { Blackboard } from '../../../../src/cowork/orchestrator/blackboard';
import { EventBus, EventCallback } from '../../../../src/cowork/orchestrator/event-bus';

describe('AgentCoordinator', () => {
  let coordinator: AgentCoordinator;
  let eventBus: EventBus;
  let blackboard: Blackboard;

  beforeEach(() => {
    eventBus = EventBus.getInstance();
    blackboard = Blackboard.getInstance();
    blackboard.clear();
    coordinator = new AgentCoordinator(eventBus, blackboard, {
      directMessagePolicy: {
        defaultAllow: false,
        allowedRoutes: [{ from: 'agent-alpha', to: 'agent-beta' }],
      },
    });
  });

  describe('registration lifecycle', () => {
    it('should register, list, and unregister agents', () => {
      coordinator.registerAgent('agent-z');
      coordinator.registerAgent('agent-a');

      expect(coordinator.listActiveAgents()).toEqual(['agent-a', 'agent-z']);

      coordinator.unregisterAgent('agent-z');

      expect(coordinator.listActiveAgents()).toEqual(['agent-a']);
    });
  });

  describe('direct messaging', () => {
    it('should route inbox messages, emit events, and stop after unsubscribe', async () => {
      coordinator.registerAgent('agent-alpha');
      coordinator.registerAgent('agent-beta');

      const inboxMessages: Array<{ messageType: string; payload: unknown }> = [];
      const sentEvents: unknown[] = [];
      const receivedEvents: unknown[] = [];

      const onSent: EventCallback = payload => {
        sentEvents.push(payload);
      };
      const onReceived: EventCallback = payload => {
        receivedEvents.push(payload);
      };

      eventBus.subscribe('agent:message:sent', onSent);
      eventBus.subscribe('agent:message:received', onReceived);

      const unsubscribeInbox = coordinator.subscribeInbox('agent-beta', envelope => {
        inboxMessages.push({
          messageType: envelope.messageType,
          payload: envelope.payload
        });
      });

      const envelope = await coordinator.sendDirectMessage(
        'agent-alpha',
        'agent-beta',
        'task:update',
        {
          status: 'in_progress',
          runId: 'run-123',
          correlationId: 'corr-456'
        }
      );

      expect(typeof envelope.id).toBe('string');
      expect(envelope.id.length).toBeGreaterThan(0);
      expect(envelope.runId).toBe('run-123');
      expect(envelope.correlationId).toBe('corr-456');
      expect(inboxMessages).toHaveLength(1);
      expect(sentEvents).toHaveLength(1);
      expect(receivedEvents).toHaveLength(1);

      const artifacts = blackboard.getAllArtifacts();
      const messageArtifact = artifacts.find(
        artifact => {
          if (artifact.type !== 'agent_message') {
            return false;
          }

          if (typeof artifact.data !== 'object' || artifact.data === null) {
            return false;
          }

          return 'id' in artifact.data && artifact.data.id === envelope.id;
        }
      );

      expect(messageArtifact).toBeDefined();
      expect(messageArtifact?.source).toBe('agent-alpha');

      unsubscribeInbox();

      await coordinator.sendDirectMessage(
        'agent-alpha',
        'agent-beta',
        'task:update',
        { status: 'done' }
      );

      expect(inboxMessages).toHaveLength(1);
      expect(sentEvents).toHaveLength(2);
      expect(receivedEvents).toHaveLength(2);

      eventBus.unsubscribe('agent:message:sent', onSent);
      eventBus.unsubscribe('agent:message:received', onReceived);
    });

    it('rejects routes not present in allow list policy', async () => {
      coordinator.registerAgent('agent-alpha');
      coordinator.registerAgent('agent-beta');

      await expect(
        coordinator.sendDirectMessage('agent-beta', 'agent-alpha', 'task:update', { status: 'blocked' }),
      ).rejects.toThrow('Direct message not allowed');
    });
  });

  describe('coordinateParallel', () => {
    it('should respect concurrency, preserve deterministic order, and emit batch events', async () => {
      let inFlight = 0;
      let maxInFlight = 0;

      const batchStartEvents: unknown[] = [];
      const batchCompleteEvents: unknown[] = [];

      const onBatchStart: EventCallback = payload => {
        batchStartEvents.push(payload);
      };
      const onBatchComplete: EventCallback = payload => {
        batchCompleteEvents.push(payload);
      };

      eventBus.subscribe('coordination:batch:start', onBatchStart);
      eventBus.subscribe('coordination:batch:complete', onBatchComplete);

      const delay = async (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

      const results = await coordinator.coordinateParallel(
        [
          {
            taskId: 'task-1',
            agentId: 'agent-1',
            execute: async () => {
              inFlight += 1;
              maxInFlight = Math.max(maxInFlight, inFlight);
              await delay(30);
              inFlight -= 1;
              return 'first';
            }
          },
          {
            taskId: 'task-2',
            agentId: 'agent-2',
            execute: async () => {
              inFlight += 1;
              maxInFlight = Math.max(maxInFlight, inFlight);
              await delay(5);
              inFlight -= 1;
              return 'second';
            }
          },
          {
            taskId: 'task-3',
            agentId: 'agent-3',
            execute: async () => {
              inFlight += 1;
              maxInFlight = Math.max(maxInFlight, inFlight);
              await delay(1);
              inFlight -= 1;
              return 'third';
            }
          }
        ],
        {
          concurrency: 2,
          runId: 'batch-run-1',
          correlationId: 'batch-corr-1'
        }
      );

      expect(maxInFlight).toBeLessThanOrEqual(2);
      expect(results.map(result => result.taskId)).toEqual(['task-1', 'task-2', 'task-3']);
      expect(results.map(result => result.status)).toEqual(['fulfilled', 'fulfilled', 'fulfilled']);
      expect(results[0].value).toBe('first');
      expect(results[1].value).toBe('second');
      expect(results[2].value).toBe('third');

      expect(batchStartEvents).toHaveLength(1);
      expect(batchCompleteEvents).toHaveLength(1);
      expect((batchStartEvents[0] as { runId: string }).runId).toBe('batch-run-1');
      expect((batchCompleteEvents[0] as { taskCount: number }).taskCount).toBe(3);

      eventBus.unsubscribe('coordination:batch:start', onBatchStart);
      eventBus.unsubscribe('coordination:batch:complete', onBatchComplete);
    });
  });
});
