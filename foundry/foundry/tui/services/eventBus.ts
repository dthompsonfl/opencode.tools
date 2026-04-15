import { EventCallback, EventEnvelope } from '../types/index.js';

export class EventBus {
  private static instance: EventBus;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private subscribers: Map<string, { pattern: string; callback: EventCallback; regex?: RegExp }> = new Map();
  private history: EventEnvelope[] = [];
  private maxHistorySize = 1000;

  private constructor() {}

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public publish(event: string, payload: unknown, metadata: Record<string, unknown> = {}): void {
    const envelope: EventEnvelope = {
      eventId: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      event,
      payload,
      metadata: {
        ...metadata,
        publishedAt: new Date().toISOString(),
      },
      occurredAt: new Date().toISOString(),
    };

    // Add to history
    this.history.push(envelope);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    // Direct listeners
    const directListeners = this.listeners.get(event);
    if (directListeners) {
      directListeners.forEach((callback) => {
        try {
          void Promise.resolve(callback(payload, envelope));
        } catch (error) {
          console.error(`[EventBus] Error in listener for ${event}:`, error);
        }
      });
    }

    // Pattern subscribers
    this.subscribers.forEach((subscriber) => {
      if (subscriber.regex && subscriber.regex.test(event)) {
        try {
          void Promise.resolve(subscriber.callback(payload, envelope));
        } catch (error) {
          console.error(`[EventBus] Error in subscriber for ${subscriber.pattern}:`, error);
        }
      }
    });
  }

  public subscribe(
    eventOrPattern: string,
    callback: EventCallback
  ): () => void {
    const isPattern = eventOrPattern.includes('*');
    const subscriberId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    if (isPattern) {
      const regex = this.compilePattern(eventOrPattern);
      this.subscribers.set(subscriberId, {
        pattern: eventOrPattern,
        callback,
        regex,
      });
    } else {
      if (!this.listeners.has(eventOrPattern)) {
        this.listeners.set(eventOrPattern, new Set());
      }
      this.listeners.get(eventOrPattern)!.add(callback);
    }

    return () => {
      if (isPattern) {
        this.subscribers.delete(subscriberId);
      } else {
        const eventListeners = this.listeners.get(eventOrPattern);
        if (eventListeners) {
          eventListeners.delete(callback);
          if (eventListeners.size === 0) {
            this.listeners.delete(eventOrPattern);
          }
        }
      }
    };
  }

  public unsubscribe(event: string, callback: EventCallback): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  public listenerCount(eventOrPattern: string): number {
    if (eventOrPattern.includes('*')) {
      return this.subscribers.size;
    }
    return this.listeners.get(eventOrPattern)?.size ?? 0;
  }

  public getHistory(eventPattern?: string): EventEnvelope[] {
    if (!eventPattern) {
      return [...this.history];
    }

    const regex = this.compilePattern(eventPattern);
    return this.history.filter((envelope) => regex.test(envelope.event));
  }

  public clearHistory(): void {
    this.history = [];
  }

  public resetForTests(): void {
    this.listeners.clear();
    this.subscribers.clear();
    this.history = [];
  }

  private compilePattern(pattern: string): RegExp {
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
}

export const eventBus = EventBus.getInstance();
