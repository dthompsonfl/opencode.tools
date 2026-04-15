/**
 * Tool Permission Gate for Cowork Plugin System
 * 
 * Enforces tool allowlists per command and agent.
 */

/**
 * Actor types for permission checking
 */
export type ActorType = 'command' | 'agent' | 'manager';

/**
 * Tool Permission Gate
 * Enforces tool allowlists per command and agent
 */
export class ToolPermissionGate {
  private commandAllowlists: Map<string, string[]>;
  private agentAllowlists: Map<string, string[]>;

  /**
   * Create tool permission gate
   */
  constructor() {
    this.commandAllowlists = new Map<string, string[]>();
    this.agentAllowlists = new Map<string, string[]>();
  }

  /**
   * Check if tool is allowed for actor
   * 
   * @param actorType - Type of actor (command, agent, manager)
   * @param actorId - ID of the actor
   * @param toolName - Name of the tool
   * @returns True if tool is allowed
   */
  public checkToolAccess(
    actorType: ActorType,
    actorId: string,
    toolName: string
  ): boolean {
    // Manager always has full access
    if (actorType === 'manager') {
      return true;
    }

    // Get allowlist based on actor type
    const allowlist = actorType === 'command'
      ? this.commandAllowlists.get(actorId)
      : this.agentAllowlists.get(actorId);

    // No allowlist = deny by default (secure default)
    if (!allowlist) {
      return false;
    }

    // Empty allowlist = deny all
    if (allowlist.length === 0) {
      return false;
    }

    // Check if tool is in allowlist
    return allowlist.includes(toolName);
  }

  /**
   * Set allowlist for a command
   * 
   * @param commandId - Command ID
   * @param tools - Array of allowed tool names
   */
  public setCommandAllowlist(commandId: string, tools: string[]): void {
    this.commandAllowlists.set(commandId, tools);
  }

  /**
   * Set allowlist for an agent
   * 
   * @param agentId - Agent ID
   * @param tools - Array of allowed tool names
   */
  public setAgentAllowlist(agentId: string, tools: string[]): void {
    this.agentAllowlists.set(agentId, tools);
  }

  /**
   * Get allowlist for command
   * 
   * @param commandId - Command ID
   * @returns Array of allowed tools or undefined
   */
  public getCommandAllowlist(commandId: string): string[] | undefined {
    return this.commandAllowlists.get(commandId);
  }

  /**
   * Get allowlist for agent
   * 
   * @param agentId - Agent ID
   * @returns Array of allowed tools or undefined
   */
  public getAgentAllowlist(agentId: string): string[] | undefined {
    return this.agentAllowlists.get(agentId);
  }

  /**
   * Check if actor has any restrictions
   * 
   * @param actorType - Type of actor
   * @param actorId - ID of the actor
   * @returns True if actor has restrictions
   */
  public hasRestrictions(actorType: ActorType, actorId: string): boolean {
    if (actorType === 'manager') {
      return false;
    }

    // Has restrictions if:
    // - Has an explicit allowlist in the map (even if empty)
    // - OR no entry in the map (deny by default is also a restriction)
    const hasExplicitAllowlist = actorType === 'command'
      ? this.commandAllowlists.has(actorId)
      : this.agentAllowlists.has(actorId);

    // Always returns true because either:
    // - There's an explicit allowlist (hasExplicitAllowlist = true)
    // - There's no allowlist = deny by default (hasExplicitAllowlist = false)
    // Either way, there's a restriction on tool usage
    return true;
  }

  /**
   * Clear all allowlists
   */
  public clearAllowlists(): void {
    this.commandAllowlists.clear();
    this.agentAllowlists.clear();
  }

  /**
   * Get all command IDs with allowlists
   * 
   * @returns Array of command IDs
   */
  public getCommandIds(): string[] {
    return Array.from(this.commandAllowlists.keys());
  }

  /**
   * Get all agent IDs with allowlists
   * 
   * @returns Array of agent IDs
   */
  public getAgentIds(): string[] {
    return Array.from(this.agentAllowlists.keys());
  }
}
