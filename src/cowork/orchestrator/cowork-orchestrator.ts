/**
 * Cowork Orchestrator
 * 
 * Multi-agent coordination with deterministic result merging.
 * 
 * SECURITY POLICY: By default, agents can only communicate with the CTO.
 * - Agents can send messages TO the CTO
 * - CTO can send messages TO any agent
 * - Direct agent-to-agent communication is denied by default
 * 
 * This enforces a hub-and-spoke communication model for security and auditability.
 * Override with directMessagePolicy in options if needed for specific use cases.
 */

import { v4 as uuidv4 } from 'uuid';
import { CommandDefinition } from '../types';
import { CommandRegistry } from '../registries/command-registry';
import { AgentRegistry } from '../registries/agent-registry';
import { HookManager } from '../hooks/hook-manager';
import { ToolPermissionGate } from '../permissions/tool-gate';
import { AgentSpawner, TaskContext } from './agent-spawner';
import { AgentCoordinator, type DirectMessageEnvelope } from './agent-coordinator';
import { ResultMerger, AgentResult, MergedResult } from './result-merger';
import { EventBus } from './event-bus';
import { Blackboard } from './blackboard';
import { CollaborativeWorkspace } from '../collaboration/collaborative-workspace';
import { initializeCoworkPersistence } from '../persistence';
import { CoworkConfigManager } from '../config';
import type { RuntimeMetricsSnapshot } from '../runtime/metrics-collector';
import type { DirectMessagePolicy } from '../../security/event-guardrails';
import { logger } from '../../runtime/logger';

/**
 * Orchestrator options
 */
export interface OrchestratorOptions {
  /** Project directory */
  projectDir?: string;
  /** Directory for transcripts */
  transcriptDir?: string;
  /** Maximum concurrent agents */
  maxConcurrent?: number;
  /** Default timeout for agent execution */
  defaultTimeout?: number;
  /** Direct agent messaging policy */
  directMessagePolicy?: DirectMessagePolicy;
}

/**
 * Orchestrator context
 */
export interface OrchestratorContext {
  /** Command being executed */
  command: CommandDefinition;
  /** Command arguments */
  args: string[];
  /** Project directory */
  projectDir: string;
  /** Plugin root directory */
  pluginRoot: string;
}

/**
 * Transcript entry for logging
 */
export interface TranscriptEntry {
  /** Entry timestamp */
  timestamp: string;
  /** Entry type */
  type: 'spawn' | 'complete' | 'error' | 'merge';
  /** Agent ID if applicable */
  agentId?: string;
  /** Command ID if applicable */
  commandId?: string;
  /** Entry message */
  message: string;
  /** Additional data */
  data?: unknown;
}

/**
 * Cowork Orchestrator
 * Multi-agent coordination with deterministic result merging
 */
export class CoworkOrchestrator {
  private static instance: CoworkOrchestrator | null = null;
  private commandRegistry: CommandRegistry;
  private agentRegistry: AgentRegistry;
  private hookManager: HookManager;
  private permissionGate: ToolPermissionGate;
  private agentSpawner: AgentSpawner;
  private coordinator: AgentCoordinator;
  private resultMerger: ResultMerger;
  private eventBus: EventBus;
  private blackboard: Blackboard;
  private transcript: TranscriptEntry[];
  private options: OrchestratorOptions;
  private persistenceBootstrapPromise: Promise<void> | null = null;

  /**
   * Create orchestrator
   * 
   * @param options - Orchestrator options
   */
  constructor(options?: OrchestratorOptions) {
    this.commandRegistry = CommandRegistry.getInstance();
    this.agentRegistry = AgentRegistry.getInstance();
    this.hookManager = new HookManager();
    this.permissionGate = new ToolPermissionGate();
    this.eventBus = EventBus.getInstance();
    this.agentSpawner = new AgentSpawner(this.eventBus);
    
    // Default to CTO-only hub-and-spoke communication policy
    // This enforces that:
    // 1. CTO can send to any agent (cto -> *)
    // 2. Any agent can send to CTO (* -> cto)
    // 3. All other agent-to-agent communication is denied
    const directMessagePolicy = options?.directMessagePolicy ?? {
      defaultAllow: false,
      allowedRoutes: [
        { from: 'cto', to: '*' },      // CTO can message anyone
        { from: '*', to: 'cto' },      // Anyone can message CTO
      ],
    };
    this.coordinator = new AgentCoordinator(this.eventBus, Blackboard.getInstance(), {
      directMessagePolicy,
    });
    this.resultMerger = new ResultMerger();
    this.blackboard = Blackboard.getInstance();
    this.transcript = [];
    this.options = {
      projectDir: options?.projectDir || process.cwd(),
      transcriptDir: options?.transcriptDir,
      maxConcurrent: options?.maxConcurrent || 5,
      defaultTimeout: options?.defaultTimeout || 60000
    };

    if (this.shouldBootstrapPersistence()) {
      this.persistenceBootstrapPromise = this.bootstrapCoworkPersistence();
    }
  }

  public static getInstance(options?: OrchestratorOptions): CoworkOrchestrator {
    if (!CoworkOrchestrator.instance) {
      CoworkOrchestrator.instance = new CoworkOrchestrator(options);
    }

    return CoworkOrchestrator.instance;
  }

  public static resetInstanceForTests(): void {
    CoworkOrchestrator.instance = null;
  }

  public async awaitPersistenceBootstrap(): Promise<void> {
    if (!this.persistenceBootstrapPromise && this.shouldBootstrapPersistence()) {
      this.persistenceBootstrapPromise = this.bootstrapCoworkPersistence();
    }

    if (!this.persistenceBootstrapPromise) {
      return;
    }

    await this.persistenceBootstrapPromise;
  }

  /**
   * Execute a command
   * 
   * @param commandId - Command ID to execute
   * @param args - Command arguments
   * @returns Merged result
   */
  public async execute(
    commandId: string,
    args?: string[]
  ): Promise<MergedResult> {
    const command = this.commandRegistry.get(commandId);

    if (!command) {
      return this.createErrorMergedResult(`Command "${commandId}" not found`);
    }

    const context: OrchestratorContext = {
      command,
      args: args || [],
      projectDir: this.options.projectDir || process.cwd(),
      pluginRoot: ''
    };

    return this.executeWithContext(commandId, context);
  }

  /**
   * Execute command with custom context
   * 
   * @param commandId - Command ID
   * @param context - Orchestrator context
   * @returns Merged result
   */
  public async executeWithContext(
    commandId: string,
    context: OrchestratorContext
  ): Promise<MergedResult> {
    const command = this.commandRegistry.get(commandId);

    if (!command) {
      return this.createErrorMergedResult(`Command "${commandId}" not found`);
    }

    this.addTranscriptEntry({
      type: 'spawn',
      commandId,
      message: `Starting execution of command "${command.name}"`,
      data: { args: context.args }
    });

    // Set up tool allowlist if specified in command
    if (command.allowedTools) {
      this.permissionGate.setCommandAllowlist(commandId, command.allowedTools);
      // Store for spawnAgent to access
      (this as any)._currentCommandAllowlist = command.allowedTools;
    } else {
      (this as any)._currentCommandAllowlist = undefined;
    }

    // Parse command body for agent references
    const agentTasks = this.parseAgentReferences(command.body || '');

    let results: AgentResult[];

    if (agentTasks.length > 0) {
      // Execute agents
      results = await this.executeAgents(agentTasks, context);
    } else {
      // No agents to spawn - create a simple result
      results = [{
        agentId: 'command',
        agentName: command.name,
        output: {
          commandId,
          commandName: command.name,
          body: command.body,
          args: context.args
        },
        metadata: {
          runId: uuidv4(),
          timestamp: new Date().toISOString(),
          success: true
        }
      }];
    }

    // Merge results
    const mergedResult = this.resultMerger.merge(results);

    this.addTranscriptEntry({
      type: 'merge',
      commandId,
      message: `Command "${command.name}" completed`,
      data: { metadata: mergedResult.metadata }
    });

    return mergedResult;
  }

  /**
   * Spawn a subagent
   * 
   * @param agentId - Agent ID
   * @param task - Task prompt
   * @param context - Additional context
   * @param sessionId - Optional session ID for tracking
   * @param workspaceId - Optional workspace ID for project isolation (defaults to 'global')
   * @returns Agent result
   */
  public async spawnAgent(
    agentId: string,
    task: string,
    context?: Record<string, unknown>,
    sessionId?: string,
    workspaceId: string = 'global'
  ): Promise<AgentResult> {
    const sharedArtifacts = this.blackboard.getAllArtifacts(workspaceId);
    const derivedSessionId = sessionId || (typeof context?.sessionId === 'string' ? context.sessionId : undefined);

    this.addTranscriptEntry({
      type: 'spawn',
      agentId,
      message: `Spawning agent "${agentId}"`
    });

    this.eventBus.publish('agent:queued', {
      agentId,
      task,
      context,
      sharedArtifacts,
      sessionId: derivedSessionId,
    });

    this.coordinator.registerAgent(agentId);

    const messaging: TaskContext['messaging'] = {
      send: async (toAgentId: string, messageType: string, payload: unknown) => {
        return this.coordinator.sendDirectMessage(agentId, toAgentId, messageType, payload);
      },
      onMessage: (callback: (fromAgentId: string, messageType: string, payload: unknown) => void) => {
        return this.coordinator.subscribeInbox(agentId, (envelope) => {
          callback(envelope.from, envelope.messageType, envelope.payload);
        });
      },
    };

    // Look up agent definition from registry to get allowed tools
    const agentDefinition = this.agentRegistry.get(agentId);
    let tools: string[] | undefined;
    
    // Get current command context from instance property (set by executeWithContext)
    const commandAllowlist = (this as any)._currentCommandAllowlist;

    if (agentDefinition?.tools && agentDefinition.tools.length > 0) {
      // Start with agent's defined tools
      tools = [...agentDefinition.tools];
      
      // If command-level allowlist was set (from executeWithContext), intersect with it
      if (commandAllowlist && commandAllowlist.length > 0) {
        // Intersection: only tools that are in both agent definition AND command allowlist
        tools = tools.filter(tool => commandAllowlist.includes(tool));
      }
    } else if (!agentDefinition?.tools || agentDefinition.tools.length === 0) {
      // Agent has no defined tools - check if there's a command-level allowlist
      if (commandAllowlist && commandAllowlist.length > 0) {
        // Use command allowlist only
        tools = commandAllowlist;
      }
    }

    const taskContext: TaskContext = {
      task,
      context: {
        ...context,
        sharedArtifacts,
      },
      messaging,
      sessionId: derivedSessionId,
      workspaceId,
      tools, // Wire agent tools (or intersected with command allowlist)
    };

    try {
      const result = await this.agentSpawner.spawn(agentId, taskContext, {
        timeout: this.options.defaultTimeout
      });

      if (result.metadata.success) {
        this.blackboard.updateArtifact(
          `agent_output:${agentId}`,
          result.output,
          agentId,
          'agent_output',
          { workspaceId }
        );

        this.addTranscriptEntry({
          type: 'complete',
          agentId,
          message: `Agent "${agentId}" completed successfully`
        });
      } else {
        this.addTranscriptEntry({
          type: 'error',
          agentId,
          message: `Agent "${agentId}" failed: ${result.metadata.error}`,
          data: { error: result.metadata.error }
        });
      }

      return result;
    } finally {
      this.coordinator.unregisterAgent(agentId);
    }
  }

  /**
   * Spawn multiple agents concurrently
   * 
   * @param tasks - Array of tasks
   * @returns Merged result
   */
  public async spawnAgents(
    tasks: Array<{
      agentId: string;
      task: string;
      context?: Record<string, unknown>;
    }>
  ): Promise<MergedResult> {
    this.addTranscriptEntry({
      type: 'spawn',
      message: `Spawning ${tasks.length} agents concurrently`
    });

    const coordinated = await this.coordinator.coordinateParallel(
      tasks.map((task, index) => ({
        taskId: `${task.agentId}:${index}`,
        agentId: task.agentId,
        execute: () => this.spawnAgent(task.agentId, task.task, task.context),
      })),
      {
        concurrency: this.options.maxConcurrent,
      }
    );

    const results: AgentResult[] = coordinated.map((entry) => {
      if (entry.status === 'fulfilled' && entry.value) {
        return entry.value as AgentResult;
      }

      return {
        agentId: entry.agentId,
        agentName: entry.agentId,
        output: null,
        metadata: {
          runId: uuidv4(),
          timestamp: new Date().toISOString(),
          success: false,
          error: entry.error instanceof Error ? entry.error.message : String(entry.error || 'Unknown error'),
        },
      };
    });

    const mergedResult = this.resultMerger.merge(results);

    this.addTranscriptEntry({
      type: 'merge',
      message: `Merged results from ${results.length} agents`,
      data: { metadata: mergedResult.metadata }
    });

    return mergedResult;
  }

  public async sendAgentMessage(
    fromAgentId: string,
    toAgentId: string,
    messageType: string,
    payload: unknown,
  ): Promise<DirectMessageEnvelope> {
    return this.withTemporaryAgentRegistrations([fromAgentId, toAgentId], async () => {
      return this.coordinator.sendDirectMessage(fromAgentId, toAgentId, messageType, payload);
    });
  }

  public subscribeAgentInbox(
    agentId: string,
    callback: (fromAgentId: string, messageType: string, payload: unknown) => void,
  ): () => void {
    const wasRegistered = this.coordinator.isAgentRegistered(agentId);
    if (!wasRegistered) {
      this.coordinator.registerAgent(agentId);
    }

    const unsubscribeInbox = this.coordinator.subscribeInbox(agentId, (envelope) => {
      callback(envelope.from, envelope.messageType, envelope.payload);
    });

    return () => {
      unsubscribeInbox();
      if (!wasRegistered) {
        this.coordinator.unregisterAgent(agentId);
      }
    };
  }

  private async withTemporaryAgentRegistrations<T>(agentIds: string[], action: () => Promise<T>): Promise<T> {
    const newlyRegistered: string[] = [];

    for (const agentId of agentIds) {
      if (this.coordinator.isAgentRegistered(agentId)) {
        continue;
      }

      if (!this.agentRegistry.has(agentId)) {
        throw new Error(`Agent "${agentId}" is not registered in the agent registry`);
      }

      this.coordinator.registerAgent(agentId);
      newlyRegistered.push(agentId);
    }

    try {
      return await action();
    } finally {
      for (const agentId of newlyRegistered) {
        this.coordinator.unregisterAgent(agentId);
      }
    }
  }

  public getMetricsSnapshot(): RuntimeMetricsSnapshot {
    return this.agentSpawner.getMetricsSnapshot();
  }

  /**
   * Get execution transcript
   * 
   * @returns Array of transcript entries
   */
  public getTranscript(): TranscriptEntry[] {
    return [...this.transcript];
  }

  /**
   * Clear transcript
   */
  public clearTranscript(): void {
    this.transcript = [];
  }

  /**
   * Execute multiple agents
   */
  private async executeAgents(
    tasks: Array<{ agentId: string; task: string }>,
    context: OrchestratorContext
  ): Promise<AgentResult[]> {
    const maxConcurrent = this.options.maxConcurrent || 5;
    const results: AgentResult[] = [];

    // Process in batches to respect max concurrent limit
    for (let i = 0; i < tasks.length; i += maxConcurrent) {
      const batch = tasks.slice(i, i + maxConcurrent);
      
      const batchResults = await Promise.all(
        batch.map(async (task) => {
          return this.spawnAgent(task.agentId, task.task, {
            args: context.args,
            projectDir: context.projectDir,
            pluginRoot: context.pluginRoot
          });
        })
      );

      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Parse agent references from command body
   * Looks for patterns like [[agent:agentId:task]]
   */
  private parseAgentReferences(body: string): Array<{ agentId: string; task: string }> {
    const tasks: Array<{ agentId: string; task: string }> = [];
    
    // Match patterns like [[agent:pm:Review code]]
    const regex = /\[\[agent:([^:]+):([^\]]+)\]\]/g;
    let match;
    
    while ((match = regex.exec(body)) !== null) {
      tasks.push({
        agentId: match[1],
        task: match[2]
      });
    }

    return tasks;
  }

  /**
   * Add entry to transcript
   */
  private addTranscriptEntry(entry: Omit<TranscriptEntry, 'timestamp'>): void {
    this.transcript.push({
      timestamp: new Date().toISOString(),
      ...entry
    });
  }

  /**
   * Create error merged result
   */
  private createErrorMergedResult(errorMessage: string): MergedResult {
    return {
      output: null,
      metadata: {
        agentIds: [],
        runIds: [],
        timestamp: new Date().toISOString(),
        totalToolsUsed: [],
        allSucceeded: false
      }
    };
  }

  private async bootstrapCoworkPersistence(): Promise<void> {
    try {
      const store = await initializeCoworkPersistence();
      this.eventBus.configurePersistence(store);
      this.eventBus.startDispatcher();
      await this.blackboard.configurePersistence(store, {
        hydrateFromStore: true,
        initializeRuntime: false,
        startDispatcher: false,
      });
      await CollaborativeWorkspace.getInstance().configurePersistence(store, {
        hydrateFromStore: true,
        initializeRuntime: false,
        startDispatcher: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const persistenceRequired = this.isPersistenceRequired();

      if (persistenceRequired) {
        throw new Error(`[CoworkOrchestrator] Persistent Cowork storage is required but unavailable: ${errorMessage}`);
      }

      logger.warn('[CoworkOrchestrator] Running without persistent Cowork storage', {
        error: errorMessage,
      });
    }
  }


  private isPersistenceRequired(): boolean {
    const loadedConfig = CoworkConfigManager.getInstance().getCurrentConfig();
    if (loadedConfig) {
      return loadedConfig.persistence.required;
    }

    return process.env.COWORK_PERSISTENCE_REQUIRED === 'true';
  }

  private shouldBootstrapPersistence(): boolean {
    const hasLoadedConfig = Boolean(CoworkConfigManager.getInstance().getCurrentConfig());
    const hasPersistenceConnection = typeof process.env.COWORK_PERSISTENCE_CONNECTION_STRING === 'string'
      && process.env.COWORK_PERSISTENCE_CONNECTION_STRING.length > 0;

    return hasLoadedConfig || hasPersistenceConnection;
  }
}
