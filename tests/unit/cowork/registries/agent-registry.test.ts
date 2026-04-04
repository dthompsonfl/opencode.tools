/**
 * Tests for Agent Registry
 */

import { AgentRegistry } from '../../../../src/cowork/registries/agent-registry';
import { AgentDefinition } from '../../../../src/cowork/types';

describe('AgentRegistry', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = AgentRegistry.getInstance();
    registry.clear();
  });

  describe('register', () => {
    it('should register an agent', () => {
      const agent: AgentDefinition = {
        id: 'pm',
        name: 'pm',
        description: 'Project Manager agent',
        body: 'You are a project manager.',
        tools: ['read', 'write'],
        model: 'gpt-4',
        color: 'blue'
      };

      registry.register(agent);

      expect(registry.has('pm')).toBe(true);
      expect(registry.get('pm')).toEqual(agent);
    });

    it('should override existing agent with same ID', () => {
      const agent1: AgentDefinition = {
        id: 'pm',
        name: 'pm',
        description: 'First description',
        body: 'Body 1'
      };

      const agent2: AgentDefinition = {
        id: 'pm',
        name: 'pm',
        description: 'Second description',
        body: 'Body 2'
      };

      registry.register(agent1);
      registry.register(agent2);

      expect(registry.get('pm')?.description).toBe('Second description');
    });
  });

  describe('registerMany', () => {
    it('should register multiple agents', () => {
      const agents: AgentDefinition[] = [
        { id: 'agent1', name: 'Agent 1', description: 'Desc 1', body: 'Body 1' },
        { id: 'agent2', name: 'Agent 2', description: 'Desc 2', body: 'Body 2' }
      ];

      registry.registerMany(agents);

      expect(registry.size()).toBe(2);
      expect(registry.has('agent1')).toBe(true);
      expect(registry.has('agent2')).toBe(true);
    });
  });

  describe('get', () => {
    it('should return agent by ID', () => {
      const agent: AgentDefinition = {
        id: 'pm',
        name: 'pm',
        description: 'Project Manager agent',
        body: 'You are a project manager.'
      };

      registry.register(agent);

      expect(registry.get('pm')).toEqual(agent);
    });

    it('should return undefined for non-existing ID', () => {
      expect(registry.get('non-existing')).toBeUndefined();
    });
  });

  describe('list', () => {
    it('should return all registered agents', () => {
      const agents: AgentDefinition[] = [
        { id: 'agent1', name: 'Agent 1', description: 'Desc 1', body: 'Body 1' },
        { id: 'agent2', name: 'Agent 2', description: 'Desc 2', body: 'Body 2' }
      ];

      registry.registerMany(agents);

      const result = registry.list();

      expect(result).toHaveLength(2);
    });
  });

  describe('has', () => {
    it('should return true for existing agent', () => {
      const agent: AgentDefinition = {
        id: 'pm',
        name: 'pm',
        description: 'Project Manager agent',
        body: 'You are a project manager.'
      };

      registry.register(agent);

      expect(registry.has('pm')).toBe(true);
    });

    it('should return false for non-existing agent', () => {
      expect(registry.has('non-existing')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all agents', () => {
      const agents: AgentDefinition[] = [
        { id: 'agent1', name: 'Agent 1', description: 'Desc 1', body: 'Body 1' },
        { id: 'agent2', name: 'Agent 2', description: 'Desc 2', body: 'Body 2' }
      ];

      registry.registerMany(agents);
      registry.clear();

      expect(registry.size()).toBe(0);
    });
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const instance1 = AgentRegistry.getInstance();
      const instance2 = AgentRegistry.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});
