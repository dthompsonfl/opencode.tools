/**
 * Tests for Agent Spawner
 */

import { AgentSpawner } from '../../../../src/cowork/orchestrator/agent-spawner';
import { AgentRegistry } from '../../../../src/cowork/registries/agent-registry';
import { AgentDefinition } from '../../../../src/cowork/types';

// Mock the uuid module
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123')
}));

describe('AgentSpawner', () => {
  let spawner: AgentSpawner;
  let registry: AgentRegistry;

  beforeEach(() => {
    spawner = new AgentSpawner();
    registry = AgentRegistry.getInstance();
    registry.clear();
  });

  describe('spawn', () => {
    it('should return error result for non-existing agent', async () => {
      const result = await spawner.spawn('non-existing', { task: 'test task' });

      expect(result.metadata.success).toBe(false);
      expect(result.metadata.error).toContain('not found');
    });

    it('should spawn existing agent', async () => {
      const agent: AgentDefinition = {
        id: 'pm',
        name: 'Project Manager',
        description: 'PM agent',
        body: 'You are a project manager.'
      };
      registry.register(agent);

      const result = await spawner.spawn('pm', { task: 'Plan a project' });

      expect(result.agentId).toBe('pm');
      expect(result.agentName).toBe('Project Manager');
      expect(result.metadata.success).toBe(true);
    });
  });

  describe('hasAgent', () => {
    it('should return true for existing agent', () => {
      const agent: AgentDefinition = {
        id: 'pm',
        name: 'Project Manager',
        description: 'PM agent',
        body: 'You are a project manager.'
      };
      registry.register(agent);

      expect(spawner.hasAgent('pm')).toBe(true);
    });

    it('should return false for non-existing agent', () => {
      expect(spawner.hasAgent('non-existing')).toBe(false);
    });
  });

  describe('registerAgentHandler', () => {
    it('should register and call custom handler', async () => {
      // First register an agent in the registry
      const agent: AgentDefinition = {
        id: 'custom-agent',
        name: 'Custom Agent',
        description: 'Custom agent',
        body: 'You are a custom agent.'
      };
      registry.register(agent);

      const customHandler = jest.fn().mockResolvedValue({ custom: 'result' });
      spawner.registerAgentHandler('custom-agent', customHandler);

      const result = await spawner.spawn('custom-agent', { task: 'test' });

      expect(customHandler).toHaveBeenCalled();
      expect(result.metadata.success).toBe(true);
    });
  });

  describe('spawnMany', () => {
    it('should spawn multiple agents concurrently', async () => {
      const agent1: AgentDefinition = {
        id: 'pm',
        name: 'Project Manager',
        description: 'PM agent',
        body: 'You are a project manager.'
      };
      const agent2: AgentDefinition = {
        id: 'architect',
        name: 'Architect',
        description: 'Architect agent',
        body: 'You are an architect.'
      };
      registry.register(agent1);
      registry.register(agent2);

      const results = await spawner.spawnMany([
        { agentId: 'pm', context: { task: 'Plan' } },
        { agentId: 'architect', context: { task: 'Design' } }
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].metadata.success).toBe(true);
      expect(results[1].metadata.success).toBe(true);
    });
  });
});
