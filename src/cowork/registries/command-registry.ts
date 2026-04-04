/**
 * Command Registry
 * 
 * Central registry for managing and executing Cowork commands.
 * Provides singleton pattern for global command access.
 */

import {
  CoworkCommand,
  CoworkCommandResult,
  RegistryEntry,
  CommandDefinition,
} from '../types';
import { logger } from '../../runtime/logger';

export class CommandRegistry {
  private static instance: CommandRegistry;
  private commands: Map<string, RegistryEntry<CommandDefinition>>;
  
  private constructor() {
    this.commands = new Map();
  }
  
  /**
   * Get the singleton instance of CommandRegistry
   */
  public static getInstance(): CommandRegistry {
    if (!CommandRegistry.instance) {
      CommandRegistry.instance = new CommandRegistry();
    }
    return CommandRegistry.instance;
  }
  
  /**
   * Register a single command
   */
  public register(command: CoworkCommand | CommandDefinition, source?: string): void {
    if (this.commands.has(command.id)) {
      logger.warn(`Command with id '${command.id}' already registered, overwriting`);
    }
    
    this.commands.set(command.id, {
      id: command.id,
      item: command,
      registeredAt: new Date(),
      source,
    });
    
    logger.debug(`Registered command: ${command.name} (${command.id})`);
  }
  
  /**
   * Register multiple commands
   */
  public registerMany(commands: Array<CoworkCommand | CommandDefinition>, source?: string): void {
    for (const command of commands) {
      this.register(command, source);
    }
  }
  
  /**
   * Unregister a command by id
   */
  public unregister(commandId: string): boolean {
    const deleted = this.commands.delete(commandId);
    if (deleted) {
      logger.debug(`Unregistered command: ${commandId}`);
    }
    return deleted;
  }
  
  /**
   * Get a command by id
   */
  public get(commandId: string): CommandDefinition | undefined {
    const entry = this.commands.get(commandId);
    return entry?.item;
  }

  /**
   * Get a command by name (or ID)
   */
  public getByName(name: string): CommandDefinition | undefined {
    const normalizedName = name.trim().toLowerCase();

    // Try getting by ID first
    const byId = this.get(name);
    if (byId) return byId;

    const byNormalizedId = this.get(normalizedName);
    if (byNormalizedId) return byNormalizedId;

    // Search by name property
    return Array.from(this.commands.values()).find(
      (entry) => entry.item.name.trim().toLowerCase() === normalizedName
    )?.item;
  }
  
  /**
   * Check if a command exists
   */
  public has(commandId: string): boolean {
    return this.commands.has(commandId);
  }
  
  /**
   * Execute a command by id with the given arguments
   */
  public async execute(commandId: string, args: string[] = []): Promise<CoworkCommandResult> {
    const command = this.get(commandId);
    
    if (!command) {
      return {
        success: false,
        error: `Command '${commandId}' not found`,
      };
    }
    
    try {
      logger.debug(`Executing command: ${command.name}`, { args });
      const handler = command.handler || this.createFallbackHandler(command);
      const result = await handler(args);
      logger.debug(`Command executed successfully: ${command.name}`);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Command execution failed: ${command.name}`, error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
  
  /**
   * List all registered commands
   */
  public list(): CommandDefinition[] {
    return Array.from(this.commands.values()).map(entry => entry.item);
  }
  
  /**
   * Get all registered command ids
   */
  public getIds(): string[] {
    return Array.from(this.commands.keys());
  }
  
  /**
   * Clear all registered commands
   */
  public clear(): void {
    this.commands.clear();
    logger.debug('Cleared all commands from registry');
  }
  
  /**
   * Get the count of registered commands
   */
  public count(): number {
    return this.commands.size;
  }

  /**
   * Backward-compatible alias for count()
   */
  public size(): number {
    return this.count();
  }

  private createFallbackHandler(command: CommandDefinition): (args: string[]) => Promise<CoworkCommandResult> {
    return async (args: string[]): Promise<CoworkCommandResult> => {
      return {
        success: true,
        data: {
          commandId: command.id,
          args,
          body: command.body || '',
        },
      };
    };
  }
}
