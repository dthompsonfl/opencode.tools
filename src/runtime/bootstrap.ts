/**
 * Runtime Bootstrap - Unified initialization for OpenCode Tools
 * 
 * This module consolidates all bootstrap logic that was previously duplicated across:
 * - src/cli.ts (initializeCowork)
 * - src/foundry/cowork-bridge.ts (initialize/warmup)
 * - tools/cowork.ts
 * 
 * This is the single source of truth for runtime initialization.
 */

import { loadAllPlugins, loadNativeAgents } from '../cowork/plugin-loader';
import { CommandRegistry } from '../cowork/registries/command-registry';
import { AgentRegistry } from '../cowork/registries/agent-registry';
import { CoworkOrchestrator } from '../cowork/orchestrator/cowork-orchestrator';
import { EventBus } from '../cowork/orchestrator/event-bus';
import { ToolRouter } from '../cowork/runtime/tool-router';
import { FoundryCoworkBridge, createWarmedUpBridge } from '../foundry/cowork-bridge';
import { FoundryOrchestrator } from '../foundry/orchestrator';
import { logger } from './logger';
import * as path from 'path';
import * as os from 'os';

export interface RuntimeBootstrapOptions {
  /**
   * Repository root for the current operation.
   * Used as the base path for file system operations.
   */
  repoRoot?: string;
  
  /**
   * Explicit filesystem base path for ToolRouter.
   * Defaults to repoRoot or cwd if not specified.
   */
  fsBasePath?: string;
  
  /**
   * List of allowed bash commands (deny-by-default if provided).
   */
  allowedBashCommands?: string[];
  
  /**
   * If true, eagerly initializes the FoundryCoworkBridge.
   * Default: true for MCP mode.
   */
  eagerInit?: boolean;
  
  /**
   * Enable verbose logging during bootstrap.
   * Default: false.
   */
  verbose?: boolean;
}

export interface RuntimeBootstrapResult {
  /**
   * Cowork Orchestrator instance.
   */
  coworkOrchestrator: CoworkOrchestrator;
  
  /**
   * Foundry-Cowork Bridge (if eagerInit was true).
   */
  foundryBridge: FoundryCoworkBridge | null;
  
  /**
   * Tool Router for secure tool execution.
   */
  toolRouter: ToolRouter;
  
  /**
   * Event Bus for publish-subscribe messaging.
   */
  eventBus: EventBus;
  
  /**
   * Command Registry.
   */
  commandRegistry: CommandRegistry;
  
  /**
   * Agent Registry.
   */
  agentRegistry: AgentRegistry;
  
  /**
   * Bootstrap metadata.
   */
  metadata: {
    pluginCount: number;
    agentCount: number;
    commandCount: number;
    fsBasePath: string | undefined;
    initializedAt: string;
  };
}

/**
 * Singleton instance - initialized once and reused.
 */
let runtimeInstance: RuntimeBootstrapResult | null = null;

/**
 * Initialize the runtime with all plugins, agents, and registries.
 * 
 * This function is idempotent - calling it multiple times returns the same instance.
 * 
 * @param options Bootstrap configuration options
 * @returns Runtime bootstrap result with all initialized components
 */
export function initializeRuntime(options: RuntimeBootstrapOptions = {}): RuntimeBootstrapResult {
  // Return cached instance if already initialized
  if (runtimeInstance) {
    if (options.verbose) {
      logger.info('[bootstrap] Returning cached runtime instance');
    }
    return runtimeInstance;
  }
  
  const startTime = Date.now();
  
  // Determine filesystem base path
  const fsBasePath = options.fsBasePath 
    // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
    ? path.resolve(options.fsBasePath)
    : options.repoRoot 
      // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
      ? path.resolve(options.repoRoot)
      : process.cwd();
  
  if (options.verbose) {
    logger.info(`[bootstrap] Initializing runtime with fsBasePath: ${fsBasePath}`);
  }
  
  // Load plugins and native agents
  const plugins = loadAllPlugins();
  const nativeAgents = loadNativeAgents();
  
  if (options.verbose) {
    logger.info(`[bootstrap] Loaded ${plugins.length} plugins and ${nativeAgents.length} native agents`);
  }
  
  // Get registries
  const commandRegistry = CommandRegistry.getInstance();
  const agentRegistry = AgentRegistry.getInstance();
  
  // Register plugins into registries
  for (const plugin of plugins) {
    commandRegistry.registerMany(plugin.commands);
    agentRegistry.registerMany(plugin.agents);
  }
  
  // Register native agents from ~/.config/opencode/opencode.json
  agentRegistry.registerMany(nativeAgents);
  
  if (options.verbose) {
    logger.info(`[bootstrap] Registered ${commandRegistry.count()} commands and ${agentRegistry.size()} agents`);
  }
  
  // Create ToolRouter with base path configuration
  const toolRouter = new ToolRouter({
    fsBasePath,
    allowedBashCommands: options.allowedBashCommands,
  });
  
  // Get EventBus instance
  const eventBus = EventBus.getInstance();
  
  // Create Cowork Orchestrator
  const coworkOrchestrator = CoworkOrchestrator.getInstance();
  
  // Optionally create warmed-up Foundry bridge
  let foundryBridge: FoundryCoworkBridge | null = null;
  const eagerInit = options.eagerInit !== false;
  
  if (eagerInit) {
    foundryBridge = createWarmedUpBridge({
      // Pass eagerInit inside the options object - createWarmedUpBridge spreads it to constructor
    });
    
    // Manually ensure eager initialization since createWarmedUpBridge handles it internally
    foundryBridge.warmup();
    
    if (options.verbose) {
      logger.info('[bootstrap] Created warmed-up Foundry-Cowork bridge');
    }
  }
  
  // Track bootstrap time
  const bootstrapTimeMs = Date.now() - startTime;
  
  // Create the result object
  runtimeInstance = {
    coworkOrchestrator,
    foundryBridge,
    toolRouter,
    eventBus,
    commandRegistry,
    agentRegistry,
    metadata: {
      pluginCount: plugins.length,
      agentCount: agentRegistry.size(),
      commandCount: commandRegistry.size(),
      fsBasePath,
      initializedAt: new Date().toISOString(),
    },
  };
  
  logger.info(`[bootstrap] Runtime initialized in ${bootstrapTimeMs}ms - ` +
    `${plugins.length} plugins, ${agentRegistry.size()} agents, ${commandRegistry.size()} commands`);
  
  return runtimeInstance;
}

/**
 * Get the current runtime instance.
 * Throws if not initialized.
 */
export function getRuntime(): RuntimeBootstrapResult {
  if (!runtimeInstance) {
    throw new Error('Runtime not initialized. Call initializeRuntime() first.');
  }
  return runtimeInstance;
}

/**
 * Check if the runtime has been initialized.
 */
export function isRuntimeInitialized(): boolean {
  return runtimeInstance !== null;
}

/**
 * Reset the runtime (for testing only).
 */
export function resetRuntime(): void {
  runtimeInstance = null;
  logger.info('[bootstrap] Runtime instance reset');
}

/**
 * Run a health check on the runtime.
 * Returns diagnostics about the current state.
 */
export function runtimeHealthCheck(): {
  initialized: boolean;
  pluginCount: number;
  agentCount: number;
  commandCount: number;
  fsBasePath: string | undefined;
  foundryBridgeHealthy: boolean | null;
  errors: string[];
  timestamp: string;
} {
  const errors: string[] = [];
  let foundryBridgeHealthy: boolean | null = null;
  
  if (!runtimeInstance) {
    return {
      initialized: false,
      pluginCount: 0,
      agentCount: 0,
      commandCount: 0,
      fsBasePath: undefined,
      foundryBridgeHealthy: null,
      errors: ['Runtime not initialized'],
      timestamp: new Date().toISOString(),
    };
  }
  
  try {
    const bridge = runtimeInstance.foundryBridge;
    if (bridge) {
      const health = bridge.healthCheck();
      foundryBridgeHealthy = health.healthy;
      if (!health.healthy) {
        errors.push(...health.errors);
      }
    }
  } catch (error) {
    errors.push(`Foundry bridge health check failed: ${error}`);
    foundryBridgeHealthy = false;
  }
  
  return {
    initialized: true,
    pluginCount: runtimeInstance.metadata.pluginCount,
    agentCount: runtimeInstance.metadata.agentCount,
    commandCount: runtimeInstance.metadata.commandCount,
    fsBasePath: runtimeInstance.metadata.fsBasePath,
    foundryBridgeHealthy,
    errors,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get a summary of available tools for MCP.
 * Returns tool names and their descriptions.
 */
export function listRuntimeTools(): Array<{ name: string; description: string }> {
  const runtime = getRuntime();
  
  const tools: Array<{ name: string; description: string }> = [];
  
  // Add registered commands
  for (const cmd of runtime.commandRegistry.list()) {
    tools.push({
      name: `command:${cmd.id}`,
      description: cmd.description || `Execute command: ${cmd.name}`,
    });
  }
  
  // Add registered agents
  for (const agent of runtime.agentRegistry.list()) {
    tools.push({
      name: `agent:${agent.id}`,
      description: agent.description || `Run agent: ${agent.name}`,
    });
  }
  
  return tools;
}
