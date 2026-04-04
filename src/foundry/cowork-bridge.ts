/**
 * FoundryCoworkBridge
 *
 * Bridge between Foundry orchestration and Cowork multi-agent runtime.
 * Provides eager initialization, health checks, and role-based task dispatch.
 */

import { CoworkOrchestrator } from '../cowork/orchestrator/cowork-orchestrator';
import { CommandRegistry } from '../cowork/registries/command-registry';
import { AgentRegistry } from '../cowork/registries/agent-registry';
import { loadAllPlugins, loadNativeAgents } from '../cowork/plugin-loader';
import { EventBus } from '../cowork/orchestrator/event-bus';
import { Blackboard } from '../cowork/orchestrator/blackboard';
import type { AgentResult } from '../cowork/orchestrator/result-merger';
import type { DirectMessageEnvelope } from '../cowork/orchestrator/agent-coordinator';
import type { RuntimeMetricsSnapshot } from '../cowork/runtime/metrics-collector';
import type { CoworkPlugin } from '../cowork/types';

const ROLE_TO_AGENT: Record<string, string> = {
  CTO_ORCHESTRATOR: 'cto',
  PRODUCT_MANAGER: 'pm',
  STAFF_BACKEND_ENGINEER: 'implementer',
  STAFF_FRONTEND_ENGINEER: 'implementer',
  QA_LEAD: 'qa',
  SECURITY_LEAD: 'security',
  TECH_WRITER: 'docs',
  SRE_DEVOPS: 'performance',
  UX_DESIGNER: 'implementer',
  DATABASE_ARCHITECT: 'architect',
  PROMPT_ENGINEER: 'prompt-engineer',
};

/**
 * Health check result
 */
export interface HealthCheckResult {
  healthy: boolean;
  initialized: boolean;
  pluginCount: number;
  agentCount: number;
  commandCount: number;
  availableRoles: string[];
  missingRoles: string[];
  errors: string[];
  timestamp: string;
}

/**
 * Bridge status
 */
export interface BridgeStatus {
  initialized: boolean;
  warmedUp: boolean;
  lastHealthCheck: string | null;
  plugins: string[];
  agents: string[];
  commands: string[];
}

/**
 * Bridge options
 */
export interface FoundryCoworkBridgeOptions {
  /** Enable eager initialization (default: false) */
  eagerInit?: boolean;
  /** Custom CoworkOrchestrator instance */
  orchestrator?: CoworkOrchestrator;
  /** Custom EventBus instance */
  eventBus?: EventBus;
  /** Custom Blackboard instance */
  blackboard?: Blackboard;
}

export class FoundryCoworkBridge {
  private readonly orchestrator: CoworkOrchestrator;
  private readonly eventBus: EventBus;
  private readonly blackboard: Blackboard;
  private initialized = false;
  private warmedUp = false;
  private lastHealthCheck: string | null = null;
  private plugins: CoworkPlugin[] = [];
  private healthCheckErrors: string[] = [];

  constructor(options: FoundryCoworkBridgeOptions = {}) {
    this.orchestrator = options.orchestrator || CoworkOrchestrator.getInstance();
    this.eventBus = options.eventBus || EventBus.getInstance();
    this.blackboard = options.blackboard || Blackboard.getInstance();

    // Eager initialization if requested
    if (options.eagerInit) {
      this.warmup();
    }
  }

  /**
   * Warm up the bridge by eagerly initializing all components.
   * This prevents cold-start latency during first execution.
   */
  public warmup(): void {
    if (this.warmedUp) {
      return;
    }

    try {
      this.initialize();

      // Validate that required agents are available
      const agentRegistry = AgentRegistry.getInstance();
      const availableAgents = new Set(agentRegistry.list().map((a) => a.id));

      // Check role mappings
      const requiredRoles = Object.keys(ROLE_TO_AGENT);
      const availableRoles: string[] = [];
      const missingRoles: string[] = [];

      for (const role of requiredRoles) {
        const agentId = ROLE_TO_AGENT[role];
        if (availableAgents.has(agentId)) {
          availableRoles.push(role);
        } else {
          missingRoles.push(role);
        }
      }

      if (missingRoles.length > 0) {
        this.healthCheckErrors.push(
          `Missing agents for roles: ${missingRoles.join(', ')}`
        );
      }

      // Publish warmup event
      this.eventBus.publish('foundry:bridge:warmed_up', {
        availableRoles,
        missingRoles,
        pluginCount: this.plugins.length,
        agentCount: availableAgents.size,
        timestamp: new Date().toISOString(),
      });

      this.warmedUp = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.healthCheckErrors.push(`Warmup failed: ${errorMessage}`);

      this.eventBus.publish('foundry:bridge:warmup_failed', {
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });

      throw error;
    }
  }

  /**
   * Initialize the bridge (lazy initialization).
   * Called automatically on first use if not already warmed up.
   */
  public initialize(): void {
    if (this.initialized) {
      return;
    }

    const commandRegistry = CommandRegistry.getInstance();
    const agentRegistry = AgentRegistry.getInstance();

    // Load all plugins
    this.plugins = loadAllPlugins();
    for (const plugin of this.plugins) {
      commandRegistry.registerMany(plugin.commands);
      agentRegistry.registerMany(plugin.agents);
    }

    // Load native agents
    const nativeAgents = loadNativeAgents();
    agentRegistry.registerMany(nativeAgents);

    this.initialized = true;

    // Publish initialization event
    this.eventBus.publish('foundry:bridge:initialized', {
      pluginCount: this.plugins.length,
      commandCount: commandRegistry.count(),
      agentCount: agentRegistry.size(),
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Perform a health check on the bridge.
   * Validates that all required components are available.
   */
  public healthCheck(): HealthCheckResult {
    this.initialize();

    const errors: string[] = [...this.healthCheckErrors];
    const agentRegistry = AgentRegistry.getInstance();
    const commandRegistry = CommandRegistry.getInstance();

    const availableAgents = new Set(agentRegistry.list().map((a) => a.id));
    const requiredRoles = Object.keys(ROLE_TO_AGENT);
    const availableRoles: string[] = [];
    const missingRoles: string[] = [];

    // Check each role
    for (const role of requiredRoles) {
      const agentId = ROLE_TO_AGENT[role];
      if (availableAgents.has(agentId)) {
        availableRoles.push(role);
      } else {
        missingRoles.push(role);
        errors.push(`Missing agent for role "${role}" (expected agentId: "${agentId}")`);
      }
    }

    // Check EventBus connectivity
    try {
      this.eventBus.publish('health:check', { timestamp: new Date().toISOString() });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`EventBus not functioning: ${errorMessage}`);
    }

    // Check Blackboard
    try {
      this.blackboard.getState();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`Blackboard not functioning: ${errorMessage}`);
    }

    this.lastHealthCheck = new Date().toISOString();

    const result: HealthCheckResult = {
      healthy: errors.length === 0,
      initialized: this.initialized,
      pluginCount: this.plugins.length,
      agentCount: availableAgents.size,
      commandCount: commandRegistry.count(),
      availableRoles,
      missingRoles,
      errors,
      timestamp: this.lastHealthCheck,
    };

    // Publish health check result
    this.eventBus.publish('foundry:bridge:health_check', result);

    return result;
  }

  /**
   * Get the current status of the bridge
   */
  public getStatus(): BridgeStatus {
    const agentRegistry = AgentRegistry.getInstance();
    const commandRegistry = CommandRegistry.getInstance();

    return {
      initialized: this.initialized,
      warmedUp: this.warmedUp,
      lastHealthCheck: this.lastHealthCheck,
      plugins: this.plugins.map((p) => p.manifest.id),
      agents: agentRegistry.list().map((a) => a.id),
      commands: commandRegistry.getIds(),
    };
  }

  /**
   * Check if the bridge is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Check if the bridge has been warmed up
   */
  public isWarmedUp(): boolean {
    return this.warmedUp;
  }

  /**
   * Get the mapped agent ID for a role
   */
  public getAgentIdForRole(roleId: string): string | null {
    return ROLE_TO_AGENT[roleId] || null;
  }

  /**
   * Check if an agent is available for a role
   */
  public hasAgentForRole(roleId: string): boolean {
    this.initialize();
    const agentId = this.getAgentIdForRole(roleId);
    if (!agentId) {
      return false;
    }

    return AgentRegistry.getInstance().has(agentId);
  }

  /**
   * Get all available roles
   */
  public getAvailableRoles(): string[] {
    this.initialize();
    const agentRegistry = AgentRegistry.getInstance();
    const availableAgents = new Set(agentRegistry.list().map((a) => a.id));

    return Object.entries(ROLE_TO_AGENT)
      .filter(([, agentId]) => availableAgents.has(agentId))
      .map(([role]) => role);
  }

  /**
   * Dispatch a task to an agent by role
   */
  public async dispatchRoleTask(
    roleId: string,
    task: string,
    context?: Record<string, unknown>,
  ): Promise<AgentResult | null> {
    this.initialize();

    const agentId = this.getAgentIdForRole(roleId);
    if (!agentId || !AgentRegistry.getInstance().has(agentId)) {
      return null;
    }

    // Publish dispatch event
    this.eventBus.publish('foundry:bridge:dispatch', {
      roleId,
      agentId,
      task,
      timestamp: new Date().toISOString(),
    });

    const sessionId = typeof context?.sessionId === 'string' ? context.sessionId : undefined;
    const result = await this.orchestrator.spawnAgent(agentId, task, context, sessionId);

    // Publish completion event
    this.eventBus.publish('foundry:bridge:dispatch_complete', {
      roleId,
      agentId,
      success: result?.metadata?.success ?? false,
      timestamp: new Date().toISOString(),
    });

    return result;
  }

  /**
   * Run a command through the orchestrator
   */
  public async runCommand(commandId: string, args: string[]): Promise<unknown> {
    this.initialize();

    // Publish command execution event
    this.eventBus.publish('foundry:bridge:command', {
      commandId,
      args,
      timestamp: new Date().toISOString(),
    });

    return this.orchestrator.execute(commandId, args);
  }

  public async sendRoleMessage(
    fromRoleId: string,
    toRoleId: string,
    messageType: string,
    payload: unknown,
  ): Promise<DirectMessageEnvelope | null> {
    this.initialize();

    const fromAgentId = this.getAgentIdForRole(fromRoleId);
    const toAgentId = this.getAgentIdForRole(toRoleId);
    if (!fromAgentId || !toAgentId) {
      return null;
    }

    return this.orchestrator.sendAgentMessage(fromAgentId, toAgentId, messageType, payload);
  }

  public getRuntimeMetrics(): RuntimeMetricsSnapshot {
    return this.orchestrator.getMetricsSnapshot();
  }

  /**
   * Get the EventBus instance
   */
  public getEventBus(): EventBus {
    return this.eventBus;
  }

  /**
   * Get the Blackboard instance
   */
  public getBlackboard(): Blackboard {
    return this.blackboard;
  }

  /**
   * Get the CoworkOrchestrator instance
   */
  public getOrchestrator(): CoworkOrchestrator {
    return this.orchestrator;
  }
}

let warmedBridge: FoundryCoworkBridge | null = null;

/**
 * Create a warmed-up bridge instance
 */
export function createWarmedUpBridge(
  options: Omit<FoundryCoworkBridgeOptions, 'eagerInit'> = {}
): FoundryCoworkBridge {
  if (!warmedBridge) {
    warmedBridge = new FoundryCoworkBridge({ ...options, eagerInit: true });
  }

  return warmedBridge;
}

export function resetWarmedUpBridgeForTests(): void {
  warmedBridge = null;
}
