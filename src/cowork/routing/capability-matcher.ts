/**
 * Capability Matcher
 *
 * Matches tasks to agent capabilities based on keywords, complexity,
 * and required capabilities. Calculates match scores for optimal routing.
 */

import { logger } from '../../runtime/logger';
import { TeamMember } from '../team/team-types';

export interface Capability {
  name: string;
  description: string;
  keywords: string[];
  complexity: 'simple' | 'moderate' | 'complex';
  relatedCapabilities?: string[];
}

export interface TaskRequirement {
  taskId: string;
  description: string;
  requiredCapabilities: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  deadline?: number;
  estimatedEffort: 'small' | 'medium' | 'large';
}

export interface MatchResult {
  agentId: string;
  roleId: string;
  score: number; // 0-100
  matchedCapabilities: string[];
  missingCapabilities: string[];
  reason: string;
}

export class CapabilityMatcher {
  private static instance: CapabilityMatcher;
  private capabilities: Map<string, Capability> = new Map();
  private keywordIndex: Map<string, string[]> = new Map(); // keyword -> capability names

  private constructor() {
    this.registerDefaultCapabilities();
  }

  public static getInstance(): CapabilityMatcher {
    if (!CapabilityMatcher.instance) {
      CapabilityMatcher.instance = new CapabilityMatcher();
    }
    return CapabilityMatcher.instance;
  }

  /**
   * Match a task to available agents
   */
  public matchTaskToAgents(
    task: TaskRequirement,
    availableAgents: TeamMember[]
  ): MatchResult[] {
    logger.debug(`[CapabilityMatcher] Matching task ${task.taskId} to ${availableAgents.length} agents`);

    const results: MatchResult[] = [];

    for (const agent of availableAgents) {
      // Skip offline agents
      if (agent.status === 'offline' || agent.status === 'error') {
        continue;
      }

      const score = this.calculateMatchScore(task, agent);
      const matchedCapabilities: string[] = [];
      const missingCapabilities: string[] = [];

      for (const required of task.requiredCapabilities) {
        if (this.agentHasCapability(agent, required)) {
          matchedCapabilities.push(required);
        } else {
          missingCapabilities.push(required);
        }
      }

      // Only include agents with at least one matched capability
      if (matchedCapabilities.length > 0) {
        results.push({
          agentId: agent.agentId,
          roleId: agent.roleId,
          score,
          matchedCapabilities,
          missingCapabilities,
          reason: this.generateMatchReason(score, matchedCapabilities, missingCapabilities)
        });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    logger.debug(`[CapabilityMatcher] Found ${results.length} matching agents`);

    return results;
  }

  /**
   * Calculate match score between task and agent (0-100)
   */
  public calculateMatchScore(task: TaskRequirement, agent: TeamMember): number {
    let score = 0;

    // Calculate capability match (max 60 points)
    const capabilityScore = this.calculateCapabilityScore(task, agent);

    // Hard fail when explicit requirements have zero capability match.
    // This keeps routing deterministic and avoids selecting agents purely
    // from availability/priority when they cannot perform the task.
    if (task.requiredCapabilities.length > 0 && capabilityScore === 0) {
      return 0;
    }

    score += capabilityScore * 0.6;

    // Check agent availability (max 20 points)
    const availabilityScore = this.calculateAvailabilityScore(agent);
    score += availabilityScore * 0.2;

    // Consider task priority and agent workload (max 20 points)
    const priorityScore = this.calculatePriorityScore(task, agent);
    score += priorityScore * 0.2;

    return Math.round(score);
  }

  /**
   * Parse task description to extract capabilities
   */
  public parseTaskCapabilities(taskDescription: string): string[] {
    const foundCapabilities: string[] = [];
    const normalizedDescription = taskDescription.toLowerCase();

    for (const [name, capability] of this.capabilities) {
      // Check if any keyword matches
      const hasMatch = capability.keywords.some(keyword =>
        normalizedDescription.includes(keyword.toLowerCase())
      );

      if (hasMatch) {
        foundCapabilities.push(name);
      }
    }

    // Remove duplicates
    return [...new Set(foundCapabilities)];
  }

  /**
   * Register a new capability
   */
  public registerCapability(capability: Capability): void {
    this.capabilities.set(capability.name, capability);

    // Index keywords
    for (const keyword of capability.keywords) {
      const normalizedKeyword = keyword.toLowerCase();
      if (!this.keywordIndex.has(normalizedKeyword)) {
        this.keywordIndex.set(normalizedKeyword, []);
      }
      this.keywordIndex.get(normalizedKeyword)!.push(capability.name);
    }

    logger.debug(`[CapabilityMatcher] Registered capability: ${capability.name}`);
  }

  /**
   * Get a capability by name
   */
  public getCapability(name: string): Capability | undefined {
    return this.capabilities.get(name);
  }

  /**
   * Get all registered capabilities
   */
  public getAllCapabilities(): Capability[] {
    return Array.from(this.capabilities.values());
  }

  /**
   * Check if an agent has a specific capability
   */
  private agentHasCapability(agent: TeamMember, capabilityName: string): boolean {
    // Direct capability check
    if (agent.capabilities.includes(capabilityName)) {
      return true;
    }

    // Check for related capabilities
    const capability = this.capabilities.get(capabilityName);
    if (capability?.relatedCapabilities) {
      return capability.relatedCapabilities.some(rel =>
        agent.capabilities.includes(rel)
      );
    }

    return false;
  }

  /**
   * Calculate capability match score
   */
  private calculateCapabilityScore(task: TaskRequirement, agent: TeamMember): number {
    if (task.requiredCapabilities.length === 0) {
      return 100;
    }

    let matchedCount = 0;
    let totalWeight = 0;

    for (const required of task.requiredCapabilities) {
      const capability = this.capabilities.get(required);
      const weight = this.getComplexityWeight(capability?.complexity || 'moderate');
      totalWeight += weight;

      if (this.agentHasCapability(agent, required)) {
        matchedCount += weight;
      }
    }

    return totalWeight > 0 ? (matchedCount / totalWeight) * 100 : 0;
  }

  /**
   * Calculate availability score
   */
  private calculateAvailabilityScore(agent: TeamMember): number {
    switch (agent.status) {
      case 'idle':
        return 100;
      case 'busy':
        return 50;
      case 'error':
      case 'offline':
        return 0;
      default:
        return 50;
    }
  }

  /**
   * Calculate priority score based on task priority and agent state
   */
  private calculatePriorityScore(task: TaskRequirement, agent: TeamMember): number {
    let score = 100;

    // Reduce score if agent is busy
    if (agent.status === 'busy') {
      score -= 30;
    }

    // Adjust for task priority
    const priorityMultiplier: Record<string, number> = {
      'critical': 1.2,
      'high': 1.1,
      'medium': 1.0,
      'low': 0.9
    };

    score *= (priorityMultiplier[task.priority] || 1.0);

    // Adjust for deadline proximity
    if (task.deadline) {
      const now = Date.now();
      const timeRemaining = task.deadline - now;
      const oneDay = 24 * 60 * 60 * 1000;

      if (timeRemaining < oneDay) {
        score *= 1.3; // Urgent
      } else if (timeRemaining < 3 * oneDay) {
        score *= 1.1; // Soon
      }
    }

    return Math.min(score, 100);
  }

  /**
   * Get weight for complexity level
   */
  private getComplexityWeight(complexity: string): number {
    switch (complexity) {
      case 'simple':
        return 1;
      case 'moderate':
        return 2;
      case 'complex':
        return 3;
      default:
        return 2;
    }
  }

  /**
   * Generate human-readable match reason
   */
  private generateMatchReason(
    score: number,
    matched: string[],
    missing: string[]
  ): string {
    if (score >= 90) {
      return `Perfect match: has all ${matched.length} required capabilities`;
    } else if (score >= 70) {
      return `Strong match: has ${matched.length}/${matched.length + missing.length} required capabilities`;
    } else if (score >= 50) {
      return `Partial match: has ${matched.length}/${matched.length + missing.length} required capabilities`;
    } else {
      return `Weak match: has ${matched.length}/${matched.length + missing.length} required capabilities`;
    }
  }

  /**
   * Register default capabilities
   */
  private registerDefaultCapabilities(): void {
    const defaultCapabilities: Capability[] = [
      {
        name: 'frontend',
        description: 'Frontend development with React, Vue, Angular, etc.',
        keywords: ['frontend', 'react', 'vue', 'angular', 'ui', 'component', 'html', 'css', 'javascript'],
        complexity: 'moderate',
        relatedCapabilities: ['typescript', 'testing']
      },
      {
        name: 'backend',
        description: 'Backend development with Node.js, Python, Java, etc.',
        keywords: ['backend', 'api', 'server', 'database', 'rest', 'graphql', 'node', 'python', 'java'],
        complexity: 'complex',
        relatedCapabilities: ['security', 'database']
      },
      {
        name: 'security',
        description: 'Security analysis, vulnerability assessment, secure coding',
        keywords: ['security', 'vulnerability', 'penetration', 'auth', 'authentication', 'encryption', 'secure'],
        complexity: 'complex',
        relatedCapabilities: ['backend', 'compliance']
      },
      {
        name: 'typescript',
        description: 'TypeScript development and type system expertise',
        keywords: ['typescript', 'ts', 'type', 'interface', 'generic'],
        complexity: 'moderate',
        relatedCapabilities: ['frontend', 'backend']
      },
      {
        name: 'testing',
        description: 'Test writing, test automation, QA',
        keywords: ['test', 'testing', 'jest', 'cypress', 'playwright', 'unit test', 'integration test'],
        complexity: 'moderate',
        relatedCapabilities: ['typescript']
      },
      {
        name: 'database',
        description: 'Database design, optimization, and management',
        keywords: ['database', 'sql', 'postgres', 'mysql', 'mongodb', 'schema', 'query', 'migration'],
        complexity: 'complex',
        relatedCapabilities: ['backend']
      },
      {
        name: 'devops',
        description: 'CI/CD, infrastructure, deployment, Docker, Kubernetes',
        keywords: ['devops', 'ci/cd', 'pipeline', 'docker', 'kubernetes', 'deployment', 'infrastructure'],
        complexity: 'complex',
        relatedCapabilities: ['backend']
      },
      {
        name: 'compliance',
        description: 'Compliance checks, audit preparation, policy enforcement',
        keywords: ['compliance', 'audit', 'policy', 'gdpr', 'hipaa', 'soc2', 'pci'],
        complexity: 'complex',
        relatedCapabilities: ['security']
      },
      {
        name: 'architecture',
        description: 'System design, architecture patterns, scalability',
        keywords: ['architecture', 'design', 'system', 'scalability', 'microservices', 'pattern'],
        complexity: 'complex',
        relatedCapabilities: ['backend', 'database']
      },
      {
        name: 'ai',
        description: 'AI/ML development, model training, LLM integration',
        keywords: ['ai', 'ml', 'machine learning', 'llm', 'openai', 'model', 'neural'],
        complexity: 'complex',
        relatedCapabilities: ['python', 'backend']
      },
      {
        name: 'python',
        description: 'Python development',
        keywords: ['python', 'py', 'django', 'flask', 'fastapi'],
        complexity: 'moderate',
        relatedCapabilities: ['backend', 'ai']
      },
      {
        name: 'code-review',
        description: 'Code review and quality assurance',
        keywords: ['review', 'code review', 'pr', 'pull request', 'quality'],
        complexity: 'moderate'
      },
      {
        name: 'documentation',
        description: 'Technical writing and documentation',
        keywords: ['documentation', 'docs', 'readme', 'wiki', 'technical writing'],
        complexity: 'simple'
      },
      {
        name: 'performance',
        description: 'Performance optimization and profiling',
        keywords: ['performance', 'optimization', 'profiling', 'speed', 'latency', 'memory'],
        complexity: 'complex',
        relatedCapabilities: ['backend', 'frontend']
      }
    ];

    for (const capability of defaultCapabilities) {
      this.registerCapability(capability);
    }

    logger.debug(`[CapabilityMatcher] Registered ${defaultCapabilities.length} default capabilities`);
  }

  /**
   * Clear all capabilities (for testing)
   */
  public clear(): void {
    this.capabilities.clear();
    this.keywordIndex.clear();
    CapabilityMatcher.instance = undefined as unknown as CapabilityMatcher;
    logger.warn('[CapabilityMatcher] All capabilities cleared');
  }
}

export default CapabilityMatcher;
