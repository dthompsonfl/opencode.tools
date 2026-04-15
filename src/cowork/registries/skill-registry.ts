/**
 * Skill Registry for Cowork Plugin System
 * 
 * Singleton registry for registering and looking up skills.
 */

import { SkillDefinition } from '../types';

/**
 * Skill Registry
 * Singleton for registering and looking up skills
 */
export class SkillRegistry {
  private static instance: SkillRegistry;
  private skills: Map<string, SkillDefinition>;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.skills = new Map<string, SkillDefinition>();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): SkillRegistry {
    if (!SkillRegistry.instance) {
      SkillRegistry.instance = new SkillRegistry();
    }
    return SkillRegistry.instance;
  }

  /**
   * Register a skill
   * If a skill with the same ID exists, it will be overridden
   * 
   * @param skill - Skill definition to register
   */
  public register(skill: SkillDefinition): void {
    this.skills.set(skill.id, skill);
  }

  /**
   * Register multiple skills at once
   * 
   * @param skills - Array of skill definitions
   */
  public registerMany(skills: SkillDefinition[]): void {
    for (const skill of skills) {
      this.register(skill);
    }
  }

  /**
   * Get skill by ID
   * 
   * @param id - Skill ID
   * @returns Skill definition or undefined if not found
   */
  public get(id: string): SkillDefinition | undefined {
    return this.skills.get(id);
  }

  /**
   * List all registered skills
   * 
   * @returns Array of all skill definitions
   */
  public list(): SkillDefinition[] {
    return Array.from(this.skills.values());
  }

  /**
   * Check if skill exists
   * 
   * @param id - Skill ID
   * @returns True if skill exists
   */
  public has(id: string): boolean {
    return this.skills.has(id);
  }

  /**
   * Clear all registered skills
   * Useful for testing
   */
  public clear(): void {
    this.skills.clear();
  }

  /**
   * Get the number of registered skills
   */
  public size(): number {
    return this.skills.size;
  }
}
