/**
 * Capability Matcher Tests
 */

import { CapabilityMatcher, Capability, TaskRequirement, MatchResult } from '../../../../src/cowork/routing/capability-matcher';
import { TeamMember } from '../../../../src/cowork/team/team-types';

describe('CapabilityMatcher', () => {
  let matcher: CapabilityMatcher;

  beforeEach(() => {
    CapabilityMatcher['instance'] = undefined as unknown as CapabilityMatcher;
    matcher = CapabilityMatcher.getInstance();
  });

  afterEach(() => {
    matcher.clear();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = CapabilityMatcher.getInstance();
      const instance2 = CapabilityMatcher.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('registerCapability', () => {
    it('should register a new capability', () => {
      const capability: Capability = {
        name: 'test-capability',
        description: 'Test capability',
        keywords: ['test', 'testing'],
        complexity: 'simple'
      };

      matcher.registerCapability(capability);

      const retrieved = matcher.getCapability('test-capability');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('test-capability');
    });

    it('should index capability keywords', () => {
      const capability: Capability = {
        name: 'react',
        description: 'React development',
        keywords: ['react', 'frontend', 'component'],
        complexity: 'moderate'
      };

      matcher.registerCapability(capability);

      // Parsing task with these keywords should find the capability
      const capabilities = matcher.parseTaskCapabilities('Build a react component');
      expect(capabilities).toContain('react');
    });
  });

  describe('getCapability', () => {
    it('should return undefined for non-existent capability', () => {
      const capability = matcher.getCapability('non-existent');
      expect(capability).toBeUndefined();
    });
  });

  describe('getAllCapabilities', () => {
    it('should return all registered capabilities', () => {
      // Should include default capabilities
      const capabilities = matcher.getAllCapabilities();
      expect(capabilities.length).toBeGreaterThan(0);
      
      // Check for known default capabilities
      const names = capabilities.map(c => c.name);
      expect(names).toContain('frontend');
      expect(names).toContain('backend');
      expect(names).toContain('security');
    });
  });

  describe('parseTaskCapabilities', () => {
    it('should extract capabilities from task description', () => {
      const description = 'Implement JWT authentication with TypeScript backend';
      const capabilities = matcher.parseTaskCapabilities(description);

      expect(capabilities.length).toBeGreaterThan(0);
      // Should find security and backend keywords
      expect(capabilities.some(c => c === 'security' || c === 'backend' || c === 'typescript')).toBe(true);
    });

    it('should handle empty description', () => {
      const capabilities = matcher.parseTaskCapabilities('');
      expect(capabilities).toEqual([]);
    });

    it('should handle description with no matching keywords', () => {
      const capabilities = matcher.parseTaskCapabilities('xyz abc 123');
      expect(capabilities).toEqual([]);
    });

    it('should remove duplicate capabilities', () => {
      // "react frontend" matches both keywords
      const capabilities = matcher.parseTaskCapabilities('Build react frontend');
      const uniqueCapabilities = [...new Set(capabilities)];
      expect(capabilities.length).toBe(uniqueCapabilities.length);
    });
  });

  describe('calculateMatchScore', () => {
    it('should return high score for perfect match', () => {
      const task: TaskRequirement = {
        taskId: 'task-1',
        description: 'Build React frontend',
        requiredCapabilities: ['frontend', 'react'],
        priority: 'medium',
        estimatedEffort: 'medium'
      };

      const agent: TeamMember = {
        agentId: 'agent-1',
        roleId: 'frontend-dev',
        name: 'Frontend Developer',
        status: 'idle',
        capabilities: ['frontend', 'react', 'typescript'],
        joinedAt: Date.now(),
        lastHeartbeat: Date.now(),
        metadata: {}
      };

      const score = matcher.calculateMatchScore(task, agent);
      expect(score).toBeGreaterThan(70); // High score for perfect match + idle status
    });

    it('should return lower score for partial match', () => {
      const task: TaskRequirement = {
        taskId: 'task-1',
        description: 'Build React frontend with security review',
        requiredCapabilities: ['frontend', 'react', 'security'],
        priority: 'medium',
        estimatedEffort: 'medium'
      };

      const agent: TeamMember = {
        agentId: 'agent-1',
        roleId: 'frontend-dev',
        name: 'Frontend Developer',
        status: 'idle',
        capabilities: ['frontend', 'react'],
        joinedAt: Date.now(),
        lastHeartbeat: Date.now(),
        metadata: {}
      };

      const score = matcher.calculateMatchScore(task, agent);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(90); // Not perfect match
    });

    it('should consider agent availability', () => {
      const task: TaskRequirement = {
        taskId: 'task-1',
        description: 'Build React frontend',
        requiredCapabilities: ['frontend'],
        priority: 'medium',
        estimatedEffort: 'medium'
      };

      const idleAgent: TeamMember = {
        agentId: 'agent-1',
        roleId: 'frontend-dev',
        name: 'Frontend Developer',
        status: 'idle',
        capabilities: ['frontend'],
        joinedAt: Date.now(),
        lastHeartbeat: Date.now(),
        metadata: {}
      };

      const busyAgent: TeamMember = {
        ...idleAgent,
        agentId: 'agent-2',
        status: 'busy'
      };

      const idleScore = matcher.calculateMatchScore(task, idleAgent);
      const busyScore = matcher.calculateMatchScore(task, busyAgent);

      expect(idleScore).toBeGreaterThan(busyScore);
    });

    it('should consider task priority', () => {
      const lowPriorityTask: TaskRequirement = {
        taskId: 'task-1',
        description: 'Build frontend',
        requiredCapabilities: ['frontend'],
        priority: 'low',
        estimatedEffort: 'small'
      };

      const criticalTask: TaskRequirement = {
        taskId: 'task-2',
        description: 'Build frontend',
        requiredCapabilities: ['frontend'],
        priority: 'critical',
        estimatedEffort: 'small'
      };

      const agent: TeamMember = {
        agentId: 'agent-1',
        roleId: 'frontend-dev',
        name: 'Frontend Developer',
        status: 'idle',
        capabilities: ['frontend'],
        joinedAt: Date.now(),
        lastHeartbeat: Date.now(),
        metadata: {}
      };

      const lowScore = matcher.calculateMatchScore(lowPriorityTask, agent);
      const criticalScore = matcher.calculateMatchScore(criticalTask, agent);

      expect(criticalScore).toBeGreaterThan(lowScore);
    });

    it('should return 0 for no matching capabilities', () => {
      const task: TaskRequirement = {
        taskId: 'task-1',
        description: 'Build React frontend',
        requiredCapabilities: ['react'],
        priority: 'medium',
        estimatedEffort: 'medium'
      };

      const agent: TeamMember = {
        agentId: 'agent-1',
        roleId: 'backend-dev',
        name: 'Backend Developer',
        status: 'idle',
        capabilities: ['backend', 'database'],
        joinedAt: Date.now(),
        lastHeartbeat: Date.now(),
        metadata: {}
      };

      const score = matcher.calculateMatchScore(task, agent);
      expect(score).toBe(0);
    });
  });

  describe('matchTaskToAgents', () => {
    it('should return sorted matches', () => {
      const task: TaskRequirement = {
        taskId: 'task-1',
        description: 'Build React frontend',
        requiredCapabilities: ['frontend'],
        priority: 'medium',
        estimatedEffort: 'medium'
      };

      const agents: TeamMember[] = [
        {
          agentId: 'agent-1',
          roleId: 'frontend-dev',
          name: 'Frontend Developer',
          status: 'busy',
          capabilities: ['frontend'],
          joinedAt: Date.now(),
          lastHeartbeat: Date.now(),
          metadata: {}
        },
        {
          agentId: 'agent-2',
          roleId: 'senior-frontend',
          name: 'Senior Frontend',
          status: 'idle',
          capabilities: ['frontend', 'react'],
          joinedAt: Date.now(),
          lastHeartbeat: Date.now(),
          metadata: {}
        }
      ];

      const matches = matcher.matchTaskToAgents(task, agents);

      expect(matches.length).toBe(2);
      expect(matches[0].agentId).toBe('agent-2'); // Higher score (idle + more capabilities)
      expect(matches[1].agentId).toBe('agent-1');
      expect(matches[0].score).toBeGreaterThan(matches[1].score);
    });

    it('should exclude offline and error agents', () => {
      const task: TaskRequirement = {
        taskId: 'task-1',
        description: 'Build frontend',
        requiredCapabilities: ['frontend'],
        priority: 'medium',
        estimatedEffort: 'medium'
      };

      const agents: TeamMember[] = [
        {
          agentId: 'agent-1',
          roleId: 'frontend-dev',
          name: 'Frontend Developer',
          status: 'offline',
          capabilities: ['frontend'],
          joinedAt: Date.now(),
          lastHeartbeat: Date.now(),
          metadata: {}
        },
        {
          agentId: 'agent-2',
          roleId: 'frontend-dev',
          name: 'Frontend Developer',
          status: 'error',
          capabilities: ['frontend'],
          joinedAt: Date.now(),
          lastHeartbeat: Date.now(),
          metadata: {}
        },
        {
          agentId: 'agent-3',
          roleId: 'frontend-dev',
          name: 'Frontend Developer',
          status: 'idle',
          capabilities: ['frontend'],
          joinedAt: Date.now(),
          lastHeartbeat: Date.now(),
          metadata: {}
        }
      ];

      const matches = matcher.matchTaskToAgents(task, agents);

      expect(matches.length).toBe(1);
      expect(matches[0].agentId).toBe('agent-3');
    });

    it('should include matched and missing capabilities in results', () => {
      const task: TaskRequirement = {
        taskId: 'task-1',
        description: 'Build React frontend with security',
        requiredCapabilities: ['frontend', 'react', 'security'],
        priority: 'medium',
        estimatedEffort: 'medium'
      };

      const agent: TeamMember = {
        agentId: 'agent-1',
        roleId: 'frontend-dev',
        name: 'Frontend Developer',
        status: 'idle',
        capabilities: ['frontend', 'react'],
        joinedAt: Date.now(),
        lastHeartbeat: Date.now(),
        metadata: {}
      };

      const matches = matcher.matchTaskToAgents(task, [agent]);

      expect(matches.length).toBe(1);
      expect(matches[0].matchedCapabilities).toContain('frontend');
      expect(matches[0].matchedCapabilities).toContain('react');
      expect(matches[0].missingCapabilities).toContain('security');
    });

    it('should return empty array when no agents match', () => {
      const task: TaskRequirement = {
        taskId: 'task-1',
        description: 'Build frontend',
        requiredCapabilities: ['frontend'],
        priority: 'medium',
        estimatedEffort: 'medium'
      };

      const agents: TeamMember[] = [
        {
          agentId: 'agent-1',
          roleId: 'backend-dev',
          name: 'Backend Developer',
          status: 'idle',
          capabilities: ['backend'],
          joinedAt: Date.now(),
          lastHeartbeat: Date.now(),
          metadata: {}
        }
      ];

      const matches = matcher.matchTaskToAgents(task, agents);

      expect(matches).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should clear all capabilities', () => {
      const capability: Capability = {
        name: 'test-capability',
        description: 'Test',
        keywords: ['test'],
        complexity: 'simple'
      };

      matcher.registerCapability(capability);
      expect(matcher.getCapability('test-capability')).toBeDefined();

      matcher.clear();

      // Create new instance (simulating reset)
      CapabilityMatcher['instance'] = undefined as unknown as CapabilityMatcher;
      const newMatcher = CapabilityMatcher.getInstance();
      
      // Should only have default capabilities
      expect(newMatcher.getCapability('test-capability')).toBeUndefined();
    });
  });
});
