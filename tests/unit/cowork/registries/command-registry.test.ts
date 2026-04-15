/**
 * Tests for Command Registry
 */

import { CommandRegistry } from '../../../../src/cowork/registries/command-registry';
import { CommandDefinition } from '../../../../src/cowork/types';

describe('CommandRegistry', () => {
  let registry: CommandRegistry;

  beforeEach(() => {
    registry = CommandRegistry.getInstance();
    registry.clear();
  });

  describe('register', () => {
    it('should register a command', () => {
      const command: CommandDefinition = {
        id: 'test-command',
        name: 'Test Command',
        description: 'A test command',
        body: 'Command body'
      };

      registry.register(command);

      expect(registry.has('test-command')).toBe(true);
      expect(registry.get('test-command')).toEqual(command);
    });

    it('should override existing command with same ID', () => {
      const command1: CommandDefinition = {
        id: 'test-command',
        name: 'Test Command',
        description: 'First description',
        body: 'Body 1'
      };

      const command2: CommandDefinition = {
        id: 'test-command',
        name: 'Test Command',
        description: 'Second description',
        body: 'Body 2'
      };

      registry.register(command1);
      registry.register(command2);

      expect(registry.get('test-command')?.description).toBe('Second description');
    });
  });

  describe('registerMany', () => {
    it('should register multiple commands', () => {
      const commands: CommandDefinition[] = [
        { id: 'cmd1', name: 'Command 1', description: 'Desc 1', body: 'Body 1' },
        { id: 'cmd2', name: 'Command 2', description: 'Desc 2', body: 'Body 2' }
      ];

      registry.registerMany(commands);

      expect(registry.size()).toBe(2);
      expect(registry.has('cmd1')).toBe(true);
      expect(registry.has('cmd2')).toBe(true);
    });
  });

  describe('get', () => {
    it('should return command by ID', () => {
      const command: CommandDefinition = {
        id: 'test-command',
        name: 'Test Command',
        description: 'A test command',
        body: 'Command body'
      };

      registry.register(command);

      expect(registry.get('test-command')).toEqual(command);
    });

    it('should return undefined for non-existing ID', () => {
      expect(registry.get('non-existing')).toBeUndefined();
    });
  });

  describe('getByName', () => {
    it('should find command by name (case-insensitive)', () => {
      const command: CommandDefinition = {
        id: 'test-command',
        name: 'Test Command',
        description: 'A test command',
        body: 'Command body'
      };

      registry.register(command);

      expect(registry.getByName('test command')).toEqual(command);
      expect(registry.getByName('TEST COMMAND')).toEqual(command);
      expect(registry.getByName('test command')).toEqual(command);
    });

    it('should return undefined for non-existing name', () => {
      expect(registry.getByName('non-existing')).toBeUndefined();
    });
  });

  describe('list', () => {
    it('should return all registered commands', () => {
      const commands: CommandDefinition[] = [
        { id: 'cmd1', name: 'Command 1', description: 'Desc 1', body: 'Body 1' },
        { id: 'cmd2', name: 'Command 2', description: 'Desc 2', body: 'Body 2' }
      ];

      registry.registerMany(commands);

      const result = registry.list();

      expect(result).toHaveLength(2);
    });
  });

  describe('has', () => {
    it('should return true for existing command', () => {
      const command: CommandDefinition = {
        id: 'test-command',
        name: 'Test Command',
        description: 'A test command',
        body: 'Command body'
      };

      registry.register(command);

      expect(registry.has('test-command')).toBe(true);
    });

    it('should return false for non-existing command', () => {
      expect(registry.has('non-existing')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all commands', () => {
      const commands: CommandDefinition[] = [
        { id: 'cmd1', name: 'Command 1', description: 'Desc 1', body: 'Body 1' },
        { id: 'cmd2', name: 'Command 2', description: 'Desc 2', body: 'Body 2' }
      ];

      registry.registerMany(commands);
      registry.clear();

      expect(registry.size()).toBe(0);
    });
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const instance1 = CommandRegistry.getInstance();
      const instance2 = CommandRegistry.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});
