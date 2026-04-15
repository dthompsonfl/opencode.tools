/**
 * EventBusBridge
 *
 * Connects FoundryCollaborationHub with Cowork EventBus to enable
 * real-time message flow between Foundry and Cowork systems.
 *
 * This bridge ensures that:
 * - Foundry messages are published to Cowork EventBus
 * - Cowork events are captured and stored in Foundry CollaborationHub
 * - TUI and other subscribers receive all collaboration messages
 */

import type { FoundryMessage } from '../../foundry/contracts';
import { FoundryCollaborationHub } from '../../foundry/collaboration-hub';
import { EventBus, EventCallback } from './event-bus';

function toRecord(payload: unknown): Record<string, unknown> {
  return payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : {};
}

export interface BridgeOptions {
  /** Enable bidirectional bridging (default: true) */
  bidirectional?: boolean;
  /** Event prefix for Foundry messages (default: 'foundry:') */
  foundryPrefix?: string;
  /** Event name for collaboration messages (default: 'collaboration:message') */
  collaborationEvent?: string;
}

/**
 * EventBusBridge connects Foundry's CollaborationHub with Cowork's EventBus
 */
export class EventBusBridge {
  private eventBus: EventBus;
  private collaborationHub: FoundryCollaborationHub;
  private options: Required<BridgeOptions>;
  private unsubscribers: Array<() => void> = [];
  private isBridging = false;

  constructor(
    eventBus: EventBus = EventBus.getInstance(),
    collaborationHub: FoundryCollaborationHub = new FoundryCollaborationHub(),
    options: BridgeOptions = {}
  ) {
    this.eventBus = eventBus;
    this.collaborationHub = collaborationHub;
    this.options = {
      bidirectional: options.bidirectional ?? true,
      foundryPrefix: options.foundryPrefix ?? 'foundry:',
      collaborationEvent: options.collaborationEvent ?? 'collaboration:message',
    };
  }

  /**
   * Start bridging between Foundry and EventBus
   */
  public start(): void {
    if (this.isBridging) {
      return;
    }

    this.isBridging = true;

    // Bridge Foundry messages → EventBus
    this.bridgeFoundryToEventBus();

    // Bridge EventBus → Foundry (if bidirectional)
    if (this.options.bidirectional) {
      this.bridgeEventBusToFoundry();
    }
  }

  /**
   * Stop bridging
   */
  public stop(): void {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers = [];
    this.isBridging = false;
  }

  /**
   * Check if bridging is active
   */
  public isActive(): boolean {
    return this.isBridging;
  }

  /**
   * Get the collaboration hub
   */
  public getCollaborationHub(): FoundryCollaborationHub {
    return this.collaborationHub;
  }

  /**
   * Get the event bus
   */
  public getEventBus(): EventBus {
    return this.eventBus;
  }

  /**
   * Publish a message through both systems
   */
  public publishMessage(
    from: string,
    topic: string,
    content: string,
    metadata?: Record<string, unknown>
  ): FoundryMessage {
    // Publish to Foundry CollaborationHub
    const message = this.collaborationHub.broadcast(from, topic, content, metadata);

    // Also publish to EventBus for real-time subscribers
    this.eventBus.publish(this.options.collaborationEvent, {
      type: 'foundry_message',
      message,
      timestamp: new Date().toISOString(),
    });

    // Publish topic-specific event
    this.eventBus.publish(`${this.options.foundryPrefix}${topic}`, {
      from,
      content,
      metadata,
      messageId: message.id,
    });

    return message;
  }

  /**
   * Subscribe to collaboration messages
   */
  public onMessage(callback: (message: FoundryMessage) => void): () => void {
    const handler: EventCallback = (payload) => {
      const record = toRecord(payload);
      if (record.type === 'foundry_message' && record.message) {
        callback(record.message as FoundryMessage);
      }
    };

    this.eventBus.subscribe(this.options.collaborationEvent, handler);

    return () => {
      this.eventBus.unsubscribe(this.options.collaborationEvent, handler);
    };
  }

  /**
   * Subscribe to specific topic messages
   */
  public onTopic(
    topic: string,
    callback: (payload: { from: string; content: string; metadata?: Record<string, unknown> }) => void
  ): () => void {
    const eventName = `${this.options.foundryPrefix}${topic}`;

    const handler: EventCallback = (payload) => {
      const record = toRecord(payload);
      callback({
        from: typeof record.from === 'string' ? record.from : 'unknown',
        content: typeof record.content === 'string' ? record.content : '',
        metadata: toRecord(record.metadata),
      });
    };

    this.eventBus.subscribe(eventName, handler);

    return () => {
      this.eventBus.unsubscribe(eventName, handler);
    };
  }

  /**
   * Bridge Foundry CollaborationHub messages to EventBus
   */
  private bridgeFoundryToEventBus(): void {
    // Override the broadcast method to also publish to EventBus
    const originalBroadcast = this.collaborationHub.broadcast.bind(this.collaborationHub);

    this.collaborationHub.broadcast = (
      from: string,
      topic: string,
      content: string,
      metadata?: Record<string, unknown>
    ): FoundryMessage => {
      // Call original method
      const message = originalBroadcast(from, topic, content, metadata);

      // Publish to EventBus
      this.eventBus.publish(this.options.collaborationEvent, {
        type: 'foundry_message',
        message,
        timestamp: new Date().toISOString(),
      });

      // Publish topic-specific event
      this.eventBus.publish(`${this.options.foundryPrefix}${topic}`, {
        from,
        content,
        metadata,
        messageId: message.id,
      });

      return message;
    };
  }

  /**
   * Bridge EventBus events to Foundry CollaborationHub
   */
  private bridgeEventBusToFoundry(): void {
    // Listen for agent events and store them in CollaborationHub
    const agentEvents = ['agent:start', 'agent:complete', 'agent:error', 'agent:progress'];

    for (const eventName of agentEvents) {
      const handler: EventCallback = (payload) => {
        const payloadRecord = toRecord(payload);
        const content = this.formatAgentEventContent(eventName, payload);
        this.collaborationHub.broadcast('COWORK_SYSTEM', eventName, content, {
          ...payloadRecord,
          eventType: eventName,
        });
      };

      this.eventBus.subscribe(eventName, handler);
      this.unsubscribers.push(() => this.eventBus.unsubscribe(eventName, handler));
    }

    // Listen for artifact updates
    const artifactHandler: EventCallback = (payload) => {
      const payloadRecord = toRecord(payload);
      const key = typeof payloadRecord.key === 'string' ? payloadRecord.key : 'unknown';
      const content = `Artifact updated: ${key}`;
      this.collaborationHub.broadcast('COWORK_SYSTEM', 'artifact:updated', content, payloadRecord);
    };

    this.eventBus.subscribe('artifact:any:updated', artifactHandler);
    this.unsubscribers.push(() => this.eventBus.unsubscribe('artifact:any:updated', artifactHandler));

    // Listen for state transitions
    const stateHandler: EventCallback = (payload) => {
      const payloadRecord = toRecord(payload);
      const from = typeof payloadRecord.from === 'string' ? payloadRecord.from : 'unknown';
      const to = typeof payloadRecord.to === 'string' ? payloadRecord.to : 'unknown';
      const content = `State transition: ${from} → ${to}`;
      this.collaborationHub.broadcast('COWORK_SYSTEM', 'state:transition', content, payloadRecord);
    };

    this.eventBus.subscribe('state:transition', stateHandler);
    this.unsubscribers.push(() => this.eventBus.unsubscribe('state:transition', stateHandler));
  }

  /**
   * Format agent event content for display
   */
  private formatAgentEventContent(eventName: string, payload: unknown): string {
    const p = payload as Record<string, unknown>;

    switch (eventName) {
      case 'agent:start':
        return `Agent ${p?.agentId || 'unknown'} started: ${p?.task || 'No task description'}`;
      case 'agent:complete':
        return `Agent ${p?.agentId || 'unknown'} completed successfully`;
      case 'agent:error':
        return `Agent ${p?.agentId || 'unknown'} failed: ${p?.error || 'Unknown error'}`;
      case 'agent:progress':
        return `Agent ${p?.agentId || 'unknown'} progress: ${p?.percent || 0}% - ${p?.message || ''}`;
      default:
        return `Agent event: ${eventName}`;
    }
  }
}

/**
 * Singleton instance for global bridge access
 */
let globalBridge: EventBusBridge | null = null;

/**
 * Get or create the global EventBusBridge instance
 */
export function getGlobalEventBusBridge(
  eventBus?: EventBus,
  collaborationHub?: FoundryCollaborationHub,
  options?: BridgeOptions
): EventBusBridge {
  if (!globalBridge) {
    globalBridge = new EventBusBridge(eventBus, collaborationHub, options);
  }
  return globalBridge;
}

/**
 * Reset the global bridge (useful for testing)
 */
export function resetGlobalEventBusBridge(): void {
  if (globalBridge) {
    globalBridge.stop();
    globalBridge = null;
  }
}
