/**
 * Agent Registry for Cowork Plugin System
 * 
 * Singleton registry for registering and looking up agents.
 */

import { AgentDefinition } from '../types';

/**
 * Agent Registry
 * Singleton for registering and looking up agents
 */
export class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<string, AgentDefinition>;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.agents = new Map<string, AgentDefinition>();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  /**
   * Register an agent
   * If an agent with the same ID exists, it will be overridden
   * 
   * @param agent - Agent definition to register
   */
  public register(agent: AgentDefinition): void {
    this.agents.set(agent.id, agent);
  }

  /**
   * Register multiple agents at once
   * 
   * @param agents - Array of agent definitions
   */
  public registerMany(agents: AgentDefinition[]): void {
    for (const agent of agents) {
      this.register(agent);
    }
  }

  /**
   * Get agent by ID
   * 
   * @param id - Agent ID
   * @returns Agent definition or undefined if not found
   */
  public get(id: string): AgentDefinition | undefined {
    return this.agents.get(id);
  }

  /**
   * List all registered agents
   * 
   * @returns Array of all agent definitions
   */
  public list(): AgentDefinition[] {
    return Array.from(this.agents.values());
  }

  /**
   * Check if agent exists
   * 
   * @param id - Agent ID
   * @returns True if agent exists
   */
  public has(id: string): boolean {
    return this.agents.has(id);
  }

  /**
   * Clear all registered agents
   * Useful for testing
   */
  public clear(): void {
    this.agents.clear();
  }

  /**
   * Get the number of registered agents
   */
  public size(): number {
    return this.agents.size;
  }
}
