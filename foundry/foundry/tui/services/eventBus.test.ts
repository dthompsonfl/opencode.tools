import { describe, it, expect, beforeEach } from 'vitest';
import { EventBus } from '../services/eventBus.js';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    EventBus.resetForTests();
    eventBus = EventBus.getInstance();
  });

  describe('publish/subscribe', () => {
    it('should publish and receive events', () => {
      const received: string[] = [];

      eventBus.subscribe('test:event', (payload) => {
        received.push(payload as string);
      });

      eventBus.publish('test:event', 'hello');

      expect(received).toHaveLength(1);
      expect(received[0]).toBe('hello');
    });

    it('should support multiple subscribers', () => {
      const received1: string[] = [];
      const received2: string[] = [];

      eventBus.subscribe('test:event', (payload) => {
        received1.push(payload as string);
      });

      eventBus.subscribe('test:event', (payload) => {
        received2.push(payload as string);
      });

      eventBus.publish('test:event', 'hello');

      expect(received1).toHaveLength(1);
      expect(received2).toHaveLength(1);
    });

    it('should support wildcard patterns', () => {
      const received: string[] = [];

      eventBus.subscribe('test:*', (payload) => {
        received.push(payload as string);
      });

      eventBus.publish('test:event1', 'hello');
      eventBus.publish('test:event2', 'world');

      expect(received).toHaveLength(2);
      expect(received).toContain('hello');
      expect(received).toContain('world');
    });

    it('should return unsubscribe function', () => {
      const received: string[] = [];

      const unsubscribe = eventBus.subscribe('test:event', (payload) => {
        received.push(payload as string);
      });

      eventBus.publish('test:event', 'first');
      unsubscribe();
      eventBus.publish('test:event', 'second');

      expect(received).toHaveLength(1);
      expect(received[0]).toBe('first');
    });

    it('should track listener count', () => {
      expect(eventBus.listenerCount('test:event')).toBe(0);

      const unsubscribe = eventBus.subscribe('test:event', () => {});
      expect(eventBus.listenerCount('test:event')).toBe(1);

      unsubscribe();
      expect(eventBus.listenerCount('test:event')).toBe(0);
    });
  });

  describe('history', () => {
    it('should store event history', () => {
      eventBus.publish('test:event1', 'data1');
      eventBus.publish('test:event2', 'data2');

      const history = eventBus.getHistory();

      expect(history).toHaveLength(2);
      expect(history[0]?.event).toBe('test:event1');
      expect(history[1]?.event).toBe('test:event2');
    });

    it('should filter history by pattern', () => {
      eventBus.publish('test:event1', 'data1');
      eventBus.publish('other:event', 'data2');
      eventBus.publish('test:event2', 'data3');

      const history = eventBus.getHistory('test:*');

      expect(history).toHaveLength(2);
    });
  });
});
