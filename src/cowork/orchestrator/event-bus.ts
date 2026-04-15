/**
 * Event Bus for Inter-Agent Communication.
 */

import { logger } from '../../runtime/logger';
import { isSafeEventName, sanitizeEventPayload } from '../../security/event-guardrails';
import { CoworkDomainStore, PersistedEventRecord } from '../persistence';

export interface EventEnvelope {
  eventId: string;
  version?: number;
  event: string;
  payload: unknown;
  metadata: Record<string, unknown>;
  occurredAt: string;
}

export type EventCallback = (payload: unknown, envelope?: EventEnvelope) => void | Promise<void>;

export interface EventSubscriptionOptions {
  consumerId?: string;
  durable?: boolean;
  replayFromCheckpoint?: boolean;
}

interface Subscriber {
  id: string;
  pattern: string;
  isPattern: boolean;
  callback: EventCallback;
  consumerId?: string;
  durable: boolean;
  regex?: RegExp;
}

const SAFE_SUBSCRIPTION_PATTERN = /^[a-z0-9*]+(?::[a-z0-9_*.-]+)*$/;
const DEFAULT_REPLAY_BATCH_SIZE = 250;
const DEFAULT_DISPATCHER_INTERVAL_MS = 750;

export class EventBus {
  private static instance: EventBus;

  private listeners: Map<string, Set<EventCallback>> = new Map();
  private subscribers: Map<string, Subscriber> = new Map();
  private persistentStore: CoworkDomainStore | null = null;
  private dispatcherTimer: NodeJS.Timeout | null = null;
  private dispatcherInFlight = false;
  private replayBatchSize = DEFAULT_REPLAY_BATCH_SIZE;

  private constructor() {}

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }

    return EventBus.instance;
  }

  public publish(event: string, payload: unknown, metadata: Record<string, unknown> = {}): void {
    void this.publishAsync(event, payload, metadata).catch((error) => {
      logger.error('[EventBus] Failed to publish event', {
        event,
        error: formatError(error),
      });
    });
  }

  public async publishAsync(
    event: string,
    payload: unknown,
    metadata: Record<string, unknown> = {},
  ): Promise<EventEnvelope | null> {
    if (!isSafeEventName(event)) {
      logger.warn('[EventBus] Rejected unsafe event name', { event });
      return null;
    }

    const sanitizedPayload = sanitizeEventPayload(payload);
    const occurredAt = new Date().toISOString();
    let envelope: EventEnvelope;

    if (this.persistentStore) {
      const persisted = await this.persistentStore.appendEvent({
        aggregateType: readString(metadata.aggregateType) ?? inferAggregateType(event),
        aggregateId: readString(metadata.aggregateId) ?? inferAggregateId(event, sanitizedPayload),
        eventType: event,
        payload: coerceObjectPayload(sanitizedPayload),
        metadata,
        occurredAt,
      });
      envelope = mapPersistedEventToEnvelope(persisted);
    } else {
      envelope = {
        eventId: readString(metadata.eventId) ?? `evt-${Date.now()}`,
        event,
        payload: sanitizedPayload,
        metadata,
        occurredAt,
      };
    }

    await this.dispatchEnvelope(envelope);
    return envelope;
  }

  public subscribe(
    eventOrPattern: string,
    callback: EventCallback,
    options: EventSubscriptionOptions = {},
  ): () => void {
    if (!isSafeSubscription(eventOrPattern)) {
      logger.warn('[EventBus] Rejected subscribe to unsafe event name/pattern', {
        eventOrPattern,
      });
      return () => undefined;
    }

    if (!this.listeners.has(eventOrPattern)) {
      this.listeners.set(eventOrPattern, new Set());
    }
    this.listeners.get(eventOrPattern)?.add(callback);

    const subscriberId = `${eventOrPattern}:${Date.now()}:${Math.random().toString(16).slice(2, 8)}`;
    const isPattern = eventOrPattern.includes('*');
    const durable = Boolean(options.durable && options.consumerId && this.persistentStore);

    const subscriber: Subscriber = {
      id: subscriberId,
      pattern: eventOrPattern,
      isPattern,
      callback,
      consumerId: options.consumerId,
      durable,
      regex: isPattern ? compilePattern(eventOrPattern) : undefined,
    };
    this.subscribers.set(subscriberId, subscriber);

    if (durable && options.replayFromCheckpoint) {
      void this.replaySubscriber(subscriber).catch((error) => {
        logger.error('[EventBus] Failed to replay subscriber backlog', {
          subscriberId,
          pattern: eventOrPattern,
          consumerId: options.consumerId,
          error: formatError(error),
        });
      });
    }

    return () => {
      this.unsubscribe(eventOrPattern, callback);
      this.subscribers.delete(subscriberId);
    };
  }

  public unsubscribe(eventOrPattern: string, callback: EventCallback): void {
    const eventListeners = this.listeners.get(eventOrPattern);
    if (eventListeners) {
      eventListeners.delete(callback);
      if (eventListeners.size === 0) {
        this.listeners.delete(eventOrPattern);
      }
    }

    for (const [subscriberId, subscriber] of this.subscribers.entries()) {
      if (subscriber.pattern === eventOrPattern && subscriber.callback === callback) {
        this.subscribers.delete(subscriberId);
      }
    }
  }

  public listenerCount(eventOrPattern: string): number {
    return this.listeners.get(eventOrPattern)?.size ?? 0;
  }

  public configurePersistence(store: CoworkDomainStore): void {
    this.persistentStore = store;
  }

  public clearPersistence(): void {
    this.persistentStore = null;
    this.stopDispatcher();
  }

  public startDispatcher(intervalMs = DEFAULT_DISPATCHER_INTERVAL_MS, replayBatchSize = DEFAULT_REPLAY_BATCH_SIZE): void {
    if (this.dispatcherTimer) {
      return;
    }

    this.replayBatchSize = Math.max(1, Math.floor(replayBatchSize));
    const safeInterval = Math.max(100, Math.floor(intervalMs));

    this.dispatcherTimer = setInterval(() => {
      void this.dispatchDurableBacklog();
    }, safeInterval);
  }

  public stopDispatcher(): void {
    if (!this.dispatcherTimer) {
      return;
    }

    clearInterval(this.dispatcherTimer);
    this.dispatcherTimer = null;
  }

  public async replayConsumer(consumerId: string): Promise<number> {
    const durableSubscribers = [...this.subscribers.values()].filter(
      (subscriber) => subscriber.durable && subscriber.consumerId === consumerId,
    );

    let delivered = 0;
    for (const subscriber of durableSubscribers) {
      delivered += await this.replaySubscriber(subscriber);
    }

    return delivered;
  }

  public resetForTests(): void {
    this.listeners.clear();
    this.subscribers.clear();
    this.clearPersistence();
  }

  private async dispatchEnvelope(envelope: EventEnvelope): Promise<void> {
    const matches = [...this.subscribers.values()].filter((subscriber) => eventMatches(subscriber, envelope.event));

    for (const subscriber of matches) {
      try {
        await Promise.resolve(subscriber.callback(envelope.payload, envelope));
        if (subscriber.durable && subscriber.consumerId && this.persistentStore && envelope.version !== undefined) {
          await this.persistentStore.saveConsumerCheckpoint(
            subscriber.consumerId,
            envelope.version,
            envelope.eventId,
          );
        }
      } catch (error) {
        logger.error('[EventBus] Error in listener callback', {
          event: envelope.event,
          subscriberId: subscriber.id,
          consumerId: subscriber.consumerId,
          error: formatError(error),
        });
      }
    }
  }

  private async dispatchDurableBacklog(): Promise<void> {
    if (this.dispatcherInFlight || !this.persistentStore) {
      return;
    }

    this.dispatcherInFlight = true;
    try {
      const durableSubscribers = [...this.subscribers.values()].filter((subscriber) => subscriber.durable);
      for (const subscriber of durableSubscribers) {
        await this.replaySubscriber(subscriber);
      }
    } finally {
      this.dispatcherInFlight = false;
    }
  }

  private async replaySubscriber(subscriber: Subscriber): Promise<number> {
    if (!this.persistentStore || !subscriber.consumerId) {
      return 0;
    }

    let checkpoint = await this.persistentStore.getConsumerCheckpoint(subscriber.consumerId);
    let delivered = 0;

    while (true) {
      const events = await this.persistentStore.listEventsSince(checkpoint, this.replayBatchSize);
      if (events.length === 0) {
        break;
      }

      for (const persistedEvent of events) {
        const envelope = mapPersistedEventToEnvelope(persistedEvent);
        checkpoint = envelope.version ?? checkpoint;

        if (!eventMatches(subscriber, envelope.event)) {
          await this.persistentStore.saveConsumerCheckpoint(
            subscriber.consumerId,
            checkpoint,
            envelope.eventId,
          );
          continue;
        }

        try {
          await Promise.resolve(subscriber.callback(envelope.payload, envelope));
          delivered += 1;
          await this.persistentStore.saveConsumerCheckpoint(
            subscriber.consumerId,
            checkpoint,
            envelope.eventId,
          );
        } catch (error) {
          logger.error('[EventBus] Durable replay failed for subscriber', {
            subscriberId: subscriber.id,
            consumerId: subscriber.consumerId,
            event: envelope.event,
            version: envelope.version,
            error: formatError(error),
          });
          return delivered;
        }
      }

      if (events.length < this.replayBatchSize) {
        break;
      }
    }

    return delivered;
  }
}

function eventMatches(subscriber: Subscriber, event: string): boolean {
  if (subscriber.isPattern) {
    if (!subscriber.regex) {
      return false;
    }

    return subscriber.regex.test(event);
  }

  return subscriber.pattern === event;
}

function isSafeSubscription(eventOrPattern: string): boolean {
  if (eventOrPattern.includes('*')) {
    return SAFE_SUBSCRIPTION_PATTERN.test(eventOrPattern);
  }

  return isSafeEventName(eventOrPattern);
}

function compilePattern(pattern: string): RegExp {
  if (pattern === '*') {
    return /^.+$/;
  }

  const escaped = pattern
    .split(':')
    .map((segment) => {
      if (segment === '*') {
        return '[a-z0-9_-]+';
      }

      return segment.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
    })
    .join(':');

  return new RegExp(`^${escaped}$`);
}

function mapPersistedEventToEnvelope(event: PersistedEventRecord): EventEnvelope {
  return {
    eventId: event.eventId,
    version: event.version,
    event: event.eventType,
    payload: event.payload,
    metadata: event.metadata,
    occurredAt: event.occurredAt,
  };
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function inferAggregateType(event: string): string {
  if (event.includes(':')) {
    return event.split(':')[0];
  }

  return 'event';
}

function inferAggregateId(event: string, payload: unknown): string {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const payloadRecord = payload as Record<string, unknown>;
    const candidateKeys = ['workspaceId', 'artifactId', 'id', 'threadId', 'instanceId'];
    for (const key of candidateKeys) {
      const value = payloadRecord[key];
      if (typeof value === 'string' && value.length > 0) {
        return value;
      }
    }
  }

  return event;
}

function coerceObjectPayload(payload: unknown): Record<string, unknown> {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }

  return { value: payload };
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
