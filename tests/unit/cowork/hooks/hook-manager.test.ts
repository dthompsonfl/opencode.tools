/**
 * Tests for Hook Manager
 */

import { HookManager } from '../../../../src/cowork/hooks/hook-manager';
import { HookDefinition, HookEvent, HookContext } from '../../../../src/cowork/types';

describe('HookManager', () => {
  let manager: HookManager;
  let testContext: HookContext;

  beforeEach(() => {
    manager = new HookManager();
    testContext = {
      eventName: 'SessionStart' as HookEvent,
      projectDir: '/test/project',
      pluginRoot: '/test/plugins',
      timestamp: new Date().toISOString()
    };
  });

  describe('registerHook', () => {
    it('should register a hook', () => {
      const hook: HookDefinition = {
        name: 'test-hook',
        events: ['SessionStart'],
        type: 'command',
        command: 'echo test'
      };

      manager.registerHook(hook);

      expect(manager.hasHooksFor('SessionStart')).toBe(true);
    });

    it('should register hook for multiple events', () => {
      const hook: HookDefinition = {
        name: 'multi-hook',
        events: ['SessionStart', 'SessionEnd'],
        type: 'command',
        command: 'echo test'
      };

      manager.registerHook(hook);

      expect(manager.hasHooksFor('SessionStart')).toBe(true);
      expect(manager.hasHooksFor('SessionEnd')).toBe(true);
    });
  });

  describe('loadHooks', () => {
    it('should load multiple hooks', () => {
      const hooks: HookDefinition[] = [
        {
          name: 'hook1',
          events: ['SessionStart'],
          type: 'command',
          command: 'echo 1'
        },
        {
          name: 'hook2',
          events: ['SessionEnd'],
          type: 'command',
          command: 'echo 2'
        }
      ];

      manager.loadHooks(hooks);

      expect(manager.hasHooksFor('SessionStart')).toBe(true);
      expect(manager.hasHooksFor('SessionEnd')).toBe(true);
    });
  });

  describe('dispatch', () => {
    it('should return allow when no hooks registered', async () => {
      const result = await manager.dispatch('SessionStart', testContext);

      expect(result.decision).toBe('allow');
    });

    it('should return hooks for event when registered', async () => {
      const hooks = manager.getHooksFor('SessionStart');
      
      expect(hooks).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should remove all hooks', () => {
      const hook: HookDefinition = {
        name: 'test-hook',
        events: ['SessionStart'],
        type: 'command',
        command: 'echo test'
      };

      manager.registerHook(hook);
      manager.clear();

      expect(manager.hasHooksFor('SessionStart')).toBe(false);
    });
  });

  describe('hasHooksFor', () => {
    it('should return true when hooks exist', () => {
      const hook: HookDefinition = {
        name: 'test-hook',
        events: ['SessionStart'],
        type: 'command',
        command: 'echo test'
      };

      manager.registerHook(hook);

      expect(manager.hasHooksFor('SessionStart')).toBe(true);
    });

    it('should return false when no hooks exist', () => {
      expect(manager.hasHooksFor('SessionStart')).toBe(false);
    });
  });
});
