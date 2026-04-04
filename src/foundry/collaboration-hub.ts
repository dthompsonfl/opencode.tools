import { v4 as uuidv4 } from 'uuid';
import type { FoundryMessage } from './contracts';

export interface CollaborationQuery {
  threadId?: string;
  participant?: string;
  topic?: string;
  limit?: number;
}

export class FoundryCollaborationHub {
  private readonly messages: FoundryMessage[] = [];

  public postMessage(input: Omit<FoundryMessage, 'id' | 'timestamp'>): FoundryMessage {
    const message: FoundryMessage = {
      ...input,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
    };

    this.messages.push(message);
    return message;
  }

  public broadcast(
    from: string,
    topic: string,
    content: string,
    metadata?: Record<string, unknown>,
  ): FoundryMessage {
    return this.postMessage({
      threadId: topic,
      from,
      topic,
      content,
      metadata,
    });
  }

  public getMessages(query?: CollaborationQuery): FoundryMessage[] {
    const filtered = this.messages.filter((message) => {
      if (query?.threadId && message.threadId !== query.threadId) {
        return false;
      }

      if (query?.topic && message.topic !== query.topic) {
        return false;
      }

      if (query?.participant) {
        const isSender = message.from === query.participant;
        const isRecipient = message.to === query.participant;
        if (!isSender && !isRecipient) {
          return false;
        }
      }

      return true;
    });

    if (!query?.limit || query.limit <= 0) {
      return [...filtered];
    }

    return filtered.slice(-query.limit);
  }

  public clear(): void {
    this.messages.length = 0;
  }
}
