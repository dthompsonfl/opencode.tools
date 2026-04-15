/**
 * Agent Coordinator
 *
 * Multi-agent synchronization and direct messaging primitives.
 */

import { v4 as uuidv4 } from 'uuid';
import { Blackboard } from './blackboard';
import { EventBus } from './event-bus';
import {
  authorizeDirectMessage,
  sanitizeEventPayload,
  type DirectMessagePolicy,
} from '../../security/event-guardrails';

export interface CoordinateTask<T = unknown> {
  taskId: string;
  agentId: string;
  execute: () => Promise<T> | T;
  runId?: string;
  correlationId?: string;
}

export interface CoordinateParallelOptions {
  concurrency?: number;
  runId?: string;
  correlationId?: string;
}

export interface CoordinatedTaskResult<T = unknown> {
  taskId: string;
  agentId: string;
  index: number;
  status: 'fulfilled' | 'rejected';
  value?: T;
  error?: unknown;
  runId?: string;
  correlationId?: string;
}

export interface DirectMessageEnvelope<T = unknown> {
  id: string;
  from: string;
  to: string;
  messageType: string;
  payload: T;
  timestamp: string;
  runId?: string;
  correlationId?: string;
}

export type InboxCallback<T = unknown> = (envelope: DirectMessageEnvelope<T>) => void | Promise<void>;

interface MessageMetadata {
  runId?: string;
  correlationId?: string;
}

export interface AgentCoordinatorOptions {
  directMessagePolicy?: DirectMessagePolicy;
}

/**
 * AgentCoordinator
 */
export class AgentCoordinator {
  private readonly eventBus: EventBus;
  private readonly blackboard: Blackboard;
  private readonly activeAgents: Set<string>;
  private readonly inboxSubscribers: Map<string, Set<InboxCallback>>;
  private readonly directMessagePolicy: DirectMessagePolicy;

  constructor(eventBus?: EventBus, blackboard?: Blackboard, options: AgentCoordinatorOptions = {}) {
    this.eventBus = eventBus || EventBus.getInstance();
    this.blackboard = blackboard || Blackboard.getInstance();
    this.activeAgents = new Set<string>();
    this.inboxSubscribers = new Map<string, Set<InboxCallback>>();
    this.directMessagePolicy = options.directMessagePolicy ?? { defaultAllow: false, allowedRoutes: [] };
  }

  public registerAgent(agentId: string): void {
    this.activeAgents.add(agentId);
  }

  public unregisterAgent(agentId: string): void {
    this.activeAgents.delete(agentId);
    this.inboxSubscribers.delete(agentId);
  }

  public isAgentRegistered(agentId: string): boolean {
    return this.activeAgents.has(agentId);
  }

  public listActiveAgents(): string[] {
    return Array.from(this.activeAgents).sort((a, b) => a.localeCompare(b));
  }

  public async coordinateParallel<T>(
    tasks: CoordinateTask<T>[],
    options?: CoordinateParallelOptions
  ): Promise<CoordinatedTaskResult<T>[]> {
    const startedAt = new Date().toISOString();
    const safeConcurrency = this.resolveConcurrency(options?.concurrency);
    const batchRunId = options?.runId;
    const batchCorrelationId = options?.correlationId;

    this.eventBus.publish('coordination:batch:start', {
      taskCount: tasks.length,
      concurrency: safeConcurrency,
      runId: batchRunId,
      correlationId: batchCorrelationId,
      timestamp: startedAt
    });

    if (tasks.length === 0) {
      this.eventBus.publish('coordination:batch:complete', {
        taskCount: 0,
        fulfilledCount: 0,
        rejectedCount: 0,
        runId: batchRunId,
        correlationId: batchCorrelationId,
        timestamp: new Date().toISOString()
      });

      return [];
    }

    const results: Array<CoordinatedTaskResult<T> | undefined> = new Array(tasks.length);
    let nextIndex = 0;

    const runWorker = async (): Promise<void> => {
      while (true) {
        const taskIndex = nextIndex;
        nextIndex += 1;

        if (taskIndex >= tasks.length) {
          return;
        }

        const task = tasks[taskIndex];
        const taskRunId = task.runId || batchRunId;
        const taskCorrelationId = task.correlationId || batchCorrelationId;

        try {
          const value = await task.execute();
          results[taskIndex] = {
            taskId: task.taskId,
            agentId: task.agentId,
            index: taskIndex,
            status: 'fulfilled',
            value,
            runId: taskRunId,
            correlationId: taskCorrelationId
          };
        } catch (error) {
          results[taskIndex] = {
            taskId: task.taskId,
            agentId: task.agentId,
            index: taskIndex,
            status: 'rejected',
            error,
            runId: taskRunId,
            correlationId: taskCorrelationId
          };
        }
      }
    };

    const workerCount = Math.min(safeConcurrency, tasks.length);
    await Promise.all(Array.from({ length: workerCount }, () => runWorker()));

    const orderedResults = results.filter((result): result is CoordinatedTaskResult<T> => Boolean(result));
    const fulfilledCount = orderedResults.filter(result => result.status === 'fulfilled').length;
    const rejectedCount = orderedResults.length - fulfilledCount;

    this.eventBus.publish('coordination:batch:complete', {
      taskCount: orderedResults.length,
      fulfilledCount,
      rejectedCount,
      runId: batchRunId,
      correlationId: batchCorrelationId,
      timestamp: new Date().toISOString()
    });

    return orderedResults;
  }

  public async sendDirectMessage<T>(
    from: string,
    to: string,
    messageType: string,
    payload: T
  ): Promise<DirectMessageEnvelope<T>> {
    if (!this.activeAgents.has(from)) {
      throw new Error(`Sender agent "${from}" is not registered`);
    }

    if (!this.activeAgents.has(to)) {
      throw new Error(`Recipient agent "${to}" is not registered`);
    }

    if (!authorizeDirectMessage(from, to, this.directMessagePolicy)) {
      throw new Error(`Direct message not allowed from "${from}" to "${to}"`);
    }

    const sanitizedPayload = sanitizeEventPayload(payload) as T;
    const metadata = this.extractMessageMetadata(sanitizedPayload);
    const envelope: DirectMessageEnvelope<T> = {
      id: uuidv4(),
      from,
      to,
      messageType,
      payload: sanitizedPayload,
      timestamp: new Date().toISOString(),
      runId: metadata.runId,
      correlationId: metadata.correlationId
    };

    this.blackboard.updateArtifact(
      `agent_message:${to}:${envelope.id}`,
      envelope,
      from,
      'agent_message'
    );

    this.eventBus.publish('agent:message:sent', envelope);

    const subscribers = this.inboxSubscribers.get(to);
    if (subscribers && subscribers.size > 0) {
      const deliveries = Array.from(subscribers).map(async callback => callback(envelope));
      await Promise.all(deliveries);
    }

    this.eventBus.publish('agent:message:received', envelope);
    return envelope;
  }

  public subscribeInbox(agentId: string, callback: InboxCallback): () => void {
    if (!this.inboxSubscribers.has(agentId)) {
      this.inboxSubscribers.set(agentId, new Set<InboxCallback>());
    }

    this.inboxSubscribers.get(agentId)!.add(callback);

    return () => {
      const subscribers = this.inboxSubscribers.get(agentId);
      if (!subscribers) {
        return;
      }

      subscribers.delete(callback);
      if (subscribers.size === 0) {
        this.inboxSubscribers.delete(agentId);
      }
    };
  }

  private resolveConcurrency(requested?: number): number {
    if (!requested || Number.isNaN(requested)) {
      return 1;
    }

    return Math.max(1, Math.floor(requested));
  }

  private extractMessageMetadata(payload: unknown): MessageMetadata {
    if (!this.isRecord(payload)) {
      return {};
    }

    const directRunId = this.readString(payload, 'runId');
    const directCorrelationId = this.readString(payload, 'correlationId');

    if (directRunId || directCorrelationId) {
      return {
        runId: directRunId,
        correlationId: directCorrelationId
      };
    }

    const metadata = payload.metadata;
    if (!this.isRecord(metadata)) {
      return {};
    }

    return {
      runId: this.readString(metadata, 'runId'),
      correlationId: this.readString(metadata, 'correlationId')
    };
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private readString(record: Record<string, unknown>, key: string): string | undefined {
    const value = record[key];
    return typeof value === 'string' ? value : undefined;
  }
}
