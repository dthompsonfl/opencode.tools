/**
 * Agent Spawner for Cowork Orchestrator
 * 
 * Launches subagents with task context.
 */

import { v4 as uuidv4 } from 'uuid';
import { AgentRegistry } from '../registries/agent-registry';
import { ToolPermissionGate } from '../permissions/tool-gate';
import { AgentResult, ResultMerger } from './result-merger';
import { AgentRunner } from '../runtime/agent-runner';
import { ToolRouter } from '../runtime/tool-router';
import { EventBus, EventCallback } from './event-bus';
import type { RuntimeMetricsSnapshot } from '../runtime/metrics-collector';
import type { AgentStreamCallback } from '../runtime/stream-events';
import {
  isAuthorizedAgentEventName,
  isSafeEventName,
  sanitizeEventPayload,
} from '../../security/event-guardrails';

/**
 * Spawn options
 */
export interface SpawnOptions {
  /** Maximum execution time in ms */
  timeout?: number;
  /** Number of retries on failure */
  retries?: number;
}

/**
 * Progress callback function
 */
export type ProgressCallback = (percent: number, message: string) => void;

/**
 * Event system interface for agents
 */
export interface AgentEventSystem {
  /** Publish an event */
  publish: (event: string, payload: unknown) => void;
  /** Subscribe to an event */
  subscribe: (event: string, callback: EventCallback) => () => void;
}

/**
 * Artifact system interface for agents
 */
export interface AgentArtifactSystem {
  /** Get an artifact by key */
  get: (key: string) => unknown;
  /** Set an artifact */
  set: (key: string, value: unknown) => void;
  /** Subscribe to artifact updates */
  onUpdate: (callback: (key: string, value: unknown) => void) => () => void;
}

export interface AgentMessagingSystem {
  send: (toAgentId: string, messageType: string, payload: unknown) => Promise<unknown>;
  onMessage: (callback: (fromAgentId: string, messageType: string, payload: unknown) => void) => () => void;
}

/**
 * Task context for agent execution
 */
export interface TaskContext {
  /** Task/prompt for the agent */
  task: string;
  /** Additional context data */
  context?: Record<string, unknown>;
  /** Allowed tools for this task */
  tools?: string[];
  /** Event system for real-time collaboration */
  events?: AgentEventSystem;
  /** Artifact system for shared state */
  artifacts?: AgentArtifactSystem;
  /** Progress callback for streaming updates */
  onProgress?: ProgressCallback;
  /** Structured streaming callback */
  onStream?: AgentStreamCallback;
  /** Direct messaging bridge */
  messaging?: AgentMessagingSystem;
  /** Session ID for tracking */
  sessionId?: string;
  /** Workspace ID for project isolation */
  workspaceId?: string;
}

/**
 * Custom agent handler function
 */
type AgentHandler = (context: TaskContext) => Promise<unknown>;

/**
 * Agent Spawner
 * Launches subagents with task context and EventBus integration
 */
export class AgentSpawner {
  private agentRegistry: AgentRegistry;
  private permissionGate: ToolPermissionGate;
  private resultMerger: ResultMerger;
  private customHandlers: Map<string, AgentHandler>;
  private agentRunner: AgentRunner;
  private eventBus: EventBus;

  /**
   * Create agent spawner
   */
  constructor(eventBus?: EventBus) {
    this.agentRegistry = AgentRegistry.getInstance();
    this.permissionGate = new ToolPermissionGate();
    this.resultMerger = new ResultMerger();
    this.customHandlers = new Map<string, AgentHandler>();
    this.eventBus = eventBus || EventBus.getInstance();

    // Initialize Runtime with a ToolRouter instance that can be configured per-task
    const toolRouter = new ToolRouter();
    this.agentRunner = new AgentRunner(toolRouter);
    // Keep a reference to the tool router so we can configure base paths per spawn
    // (we cast to any to avoid circular type import issues)
    (this as any).toolRouter = toolRouter;
  }

  /**
   * Spawn an agent with context
   * 
   * @param agentId - Agent ID to spawn
   * @param context - Task context
   * @param options - Spawn options
   * @returns Agent result
   */
  public async spawn(
    agentId: string,
    context: TaskContext,
    options?: SpawnOptions
  ): Promise<AgentResult> {
    const agent = this.agentRegistry.get(agentId);
    
    if (!agent) {
      return this.createErrorResult(agentId, `Agent "${agentId}" not found`);
    }

    // Set up tool allowlist if specified
    // Apply allowlist to permission gate
    if (context.tools) {
      this.permissionGate.setAgentAllowlist(agentId, context.tools);
    }

    // Configure ToolRouter base path if available in context (projectDir or workspace mapping)
    try {
      const anyRouter: any = (this as any).toolRouter;
      if (anyRouter && typeof anyRouter.configureBasePath === 'function') {
        // Get projectDir from either top-level context or nested context.context
        const topLevelContext = context.context as Record<string, unknown> | undefined;
        const base = (context as any).projectDir 
          || (context as any).repoRoot 
          || (topLevelContext?.projectDir as string)
          || (topLevelContext?.repoRoot as string)
          || process.cwd();
        anyRouter.configureBasePath(base, undefined);
        // Apply allowlist to tool router as well so it can enforce tools
        if (context.tools) {
          anyRouter.setAllowlist(agentId, context.tools);
        }
      }
    } catch (err) {
      // Non-fatal; permissions will still be checked by permission gate
    }

    // Check tool permissions
    for (const tool of context.tools || []) {
      if (!this.permissionGate.checkToolAccess('agent', agentId, tool)) {
        return this.createErrorResult(agentId, `Tool "${tool}" not allowed for agent "${agentId}"`);
      }
    }

    // Execute with timeout
    const timeout = options?.timeout || 60000; // Default 60s
    const retries = options?.retries || 0;

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await this.executeWithTimeout(
          agent,
          context,
          timeout
        );
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < retries) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    return this.createErrorResult(
      agentId, 
      lastError?.message || 'Agent execution failed'
    );
  }

  /**
   * Spawn multiple agents concurrently
   * 
   * @param tasks - Array of tasks with agent ID and context
   * @param options - Spawn options
   * @returns Array of agent results
   */
  public async spawnMany(
    tasks: Array<{ agentId: string; context: TaskContext }>,
    options?: SpawnOptions
  ): Promise<AgentResult[]> {
    // Spawn all agents in parallel
    const promises = tasks.map(task => 
      this.spawn(task.agentId, task.context, options)
    );

    return Promise.all(promises);
  }

  /**
   * Check if agent exists
   * 
   * @param agentId - Agent ID
   * @returns True if agent exists
   */
  public hasAgent(agentId: string): boolean {
    return this.agentRegistry.has(agentId);
  }

  public getMetricsSnapshot(): RuntimeMetricsSnapshot {
    return this.agentRunner.getMetricsSnapshot();
  }

  /**
   * Register a custom agent handler
   * 
   * @param agentId - Agent ID
   * @param handler - Handler function
   */
  public registerAgentHandler(
    agentId: string,
    handler: AgentHandler
  ): void {
    this.customHandlers.set(agentId, handler);
  }

  /**
   * Execute agent with timeout and EventBus integration
   */
  private async executeWithTimeout(
    agent: { id: string; name: string; body?: string },
    context: TaskContext,
    timeout: number
  ): Promise<AgentResult> {
    return new Promise<AgentResult>((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve(this.createErrorResult(agent.id, `Agent execution timed out after ${timeout}ms`));
      }, timeout);

      try {
        // Publish agent start event
        this.eventBus.publish('agent:start', {
          agentId: agent.id,
          task: context.task,
          context: context.context,
          sessionId: context.sessionId,
        });

        // Create enhanced context with EventBus access
        const enhancedContext = this.createEnhancedContext(agent.id, context);

        // Check for custom handler first
        const customHandler = this.customHandlers.get(agent.id);
        
        if (customHandler) {
          customHandler(enhancedContext)
            .then(output => {
              clearTimeout(timeoutId);
              this.eventBus.publish('agent:complete', {
                agentId: agent.id,
                output,
                sessionId: context.sessionId,
              });
              resolve(this.createSuccessResult(agent.id, agent.name, output));
            })
            .catch(error => {
              clearTimeout(timeoutId);
              const errorMessage = error instanceof Error ? error.message : String(error);
              this.eventBus.publish('agent:error', {
                agentId: agent.id,
                error: errorMessage,
                sessionId: context.sessionId,
              });
              resolve(this.createErrorResult(agent.id, errorMessage));
            });
          return;
        }

        // Use the AgentRunner to execute the agent using LLM loop
        this.agentRunner.run(agent.id, context.task, enhancedContext, { systemPrompt: agent.body })
            .then(result => {
                clearTimeout(timeoutId);
                if (result.success) {
                    this.eventBus.publish('agent:complete', {
                      agentId: agent.id,
                      output: result,
                      sessionId: context.sessionId,
                    });
                    resolve(this.createSuccessResult(agent.id, agent.name, result));
                } else {
                    this.eventBus.publish('agent:error', {
                      agentId: agent.id,
                      error: result.output,
                      sessionId: context.sessionId,
                    });
                    resolve(this.createErrorResult(agent.id, result.output));
                }
            })
            .catch(error => {
                clearTimeout(timeoutId);
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.eventBus.publish('agent:error', {
                  agentId: agent.id,
                  error: errorMessage,
                  sessionId: context.sessionId,
                });
                resolve(this.createErrorResult(agent.id, errorMessage));
            });

      } catch (error) {
        clearTimeout(timeoutId);
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.eventBus.publish('agent:error', {
          agentId: agent.id,
          error: errorMessage,
          sessionId: context.sessionId,
        });
        resolve(this.createErrorResult(agent.id, errorMessage));
      }
    });
  }

  /**
   * Create enhanced context with EventBus and artifact access
   */
  private createEnhancedContext(agentId: string, context: TaskContext): TaskContext {
    const sessionId = context.sessionId;

    // Create event system interface
    const events: AgentEventSystem = {
      publish: (event: string, payload: unknown) => {
        if (!isSafeEventName(event)) {
          return;
        }

        if (!isAuthorizedAgentEventName(agentId, event)) {
          return;
        }

        const sanitizedPayload = sanitizeEventPayload(payload) as Record<string, unknown>;
        this.eventBus.publish(event, {
          ...sanitizedPayload,
          agentId,
          sessionId,
          timestamp: new Date().toISOString(),
        });
      },
      subscribe: (event: string, callback: EventCallback) => {
        this.eventBus.subscribe(event, callback);
        return () => this.eventBus.unsubscribe(event, callback);
      },
    };

    // Create progress callback wrapper
    const onProgress: ProgressCallback = (percent: number, message: string) => {
      this.eventBus.publish('agent:progress', {
        agentId,
        percent,
        message,
        sessionId,
        timestamp: new Date().toISOString(),
      });

      // Also call original progress callback if provided
      if (context.onProgress) {
        context.onProgress(percent, message);
      }
    };

    const onStream: AgentStreamCallback = (event) => {
      this.eventBus.publish('agent:stream', {
        ...event,
        sessionId,
      });

      if (context.onStream) {
        context.onStream(event);
      }
    };

    return {
      ...context,
      events,
      onProgress,
      onStream,
    };
  }

  /**
   * Create a success result
   */
  private createSuccessResult(
    agentId: string,
    agentName: string,
    output: unknown
  ): AgentResult {
    return {
      agentId,
      agentName,
      output,
      metadata: {
        runId: uuidv4(),
        timestamp: new Date().toISOString(),
        success: true
      }
    };
  }

  /**
   * Create an error result
   */
  private createErrorResult(
    agentId: string,
    errorMessage: string
  ): AgentResult {
    return {
      agentId,
      agentName: agentId,
      output: null,
      metadata: {
        runId: uuidv4(),
        timestamp: new Date().toISOString(),
        success: false,
        error: errorMessage
      }
    };
  }
}
