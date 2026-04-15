/**
 * Collaboration Request Worker
 *
 * Enables agents to respond to collaboration requests by subscribing to the
 * CollaborationProtocol and spawning agents to handle incoming requests.
 * This component is critical for making collaboration requests work - without
 * it, requests simply time out because no one is listening.
 */

import { logger } from '../../runtime/logger';
import {
  CollaborationProtocol,
  CollaborationRequest,
  CollaborationResponse,
  CollaborationType,
  ReviewRequest,
  EscalationRequest,
} from './collaboration-protocol';
import { CoworkOrchestrator } from '../orchestrator/cowork-orchestrator';
import { AgentResult } from '../orchestrator/result-merger';

/**
 * Worker options for configuration
 */
export interface CollaborationRequestWorkerOptions {
  /** Array of agent IDs to subscribe */
  agentIds: string[];
  /** Workspace ID for context */
  workspaceId?: string;
  /** Default timeout for request handling in ms (default: 60000) */
  defaultTimeout?: number;
  /** Maximum concurrent requests per agent (default: 3) */
  maxConcurrentRequests?: number;
  /** Whether to auto-start on construction (default: false) */
  autoStart?: boolean;
}

/**
 * Active request tracking
 */
interface ActiveRequest {
  requestId: string;
  agentId: string;
  startTime: number;
  timeoutId: NodeJS.Timeout;
  abortController?: AbortController;
}

/**
 * Request processing result
 */
interface RequestProcessingResult {
  success: boolean;
  data?: unknown;
  error?: string;
  findings?: unknown[];
}

/**
 * Unsubscribe function type
 */
type UnsubscribeFunction = () => void;

/**
 * Collaboration Request Worker
 *
 * Listens for collaboration requests and spawns agents to handle them.
 * Supports multiple request types: help, review, and escalate.
 */
export class CollaborationRequestWorker {
  private protocol: CollaborationProtocol;
  private orchestrator: CoworkOrchestrator;
  private agentIds: string[];
  private workspaceId?: string;
  private defaultTimeout: number;
  private maxConcurrentRequests: number;
  private unsubscribers: Map<string, UnsubscribeFunction> = new Map();
  private activeRequests: Map<string, ActiveRequest> = new Map();
  private requestCounts: Map<string, number> = new Map();
  private isRunning: boolean = false;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL_MS = 30000; // 30 seconds

  /**
   * Create a new collaboration request worker
   *
   * @param options - Worker configuration options
   */
  constructor(options: CollaborationRequestWorkerOptions) {
    this.protocol = CollaborationProtocol.getInstance();
    this.orchestrator = new CoworkOrchestrator({
      defaultTimeout: options.defaultTimeout || 60000,
    });
    this.agentIds = [...options.agentIds];
    this.workspaceId = options.workspaceId;
    this.defaultTimeout = options.defaultTimeout || 60000;
    this.maxConcurrentRequests = options.maxConcurrentRequests || 3;

    logger.info(
      `[CollaborationRequestWorker] Created for agents: ${this.agentIds.join(', ')}`
    );

    if (options.autoStart) {
      this.start();
    }
  }

  /**
   * Start the worker and subscribe all agents to collaboration requests
   */
  public start(): void {
    if (this.isRunning) {
      logger.warn('[CollaborationRequestWorker] Already running');
      return;
    }

    this.isRunning = true;

    // Subscribe each agent to collaboration requests
    for (const agentId of this.agentIds) {
      this.subscribeAgent(agentId);
    }

    // Start cleanup interval for stale requests
    this.startCleanupInterval();

    logger.info(
      `[CollaborationRequestWorker] Started for ${this.agentIds.length} agents`
    );
  }

  /**
   * Stop the worker and unsubscribe all agents
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Cancel all active requests
    for (const [requestId, activeRequest] of this.activeRequests) {
      this.cancelRequest(requestId, 'Worker stopped');
    }

    // Unsubscribe all agents
    for (const [agentId, unsubscribe] of this.unsubscribers) {
      try {
        unsubscribe();
        logger.debug(
          `[CollaborationRequestWorker] Unsubscribed agent: ${agentId}`
        );
      } catch (err) {
        logger.error(
          `[CollaborationRequestWorker] Error unsubscribing agent ${agentId}`,
          err
        );
      }
    }

    this.unsubscribers.clear();
    this.stopCleanupInterval();

    logger.info('[CollaborationRequestWorker] Stopped');
  }

  /**
   * Add a new agent to the worker
   *
   * @param agentId - Agent ID to add
   */
  public addAgent(agentId: string): void {
    if (this.agentIds.includes(agentId)) {
      logger.warn(
        `[CollaborationRequestWorker] Agent ${agentId} already registered`
      );
      return;
    }

    this.agentIds.push(agentId);

    if (this.isRunning) {
      this.subscribeAgent(agentId);
    }

    logger.info(`[CollaborationRequestWorker] Added agent: ${agentId}`);
  }

  /**
   * Remove an agent from the worker
   *
   * @param agentId - Agent ID to remove
   */
  public removeAgent(agentId: string): void {
    const index = this.agentIds.indexOf(agentId);
    if (index === -1) {
      logger.warn(
        `[CollaborationRequestWorker] Agent ${agentId} not found`
      );
      return;
    }

    this.agentIds.splice(index, 1);

    // Unsubscribe if running
    if (this.isRunning) {
      const unsubscribe = this.unsubscribers.get(agentId);
      if (unsubscribe) {
        try {
          unsubscribe();
          this.unsubscribers.delete(agentId);
        } catch (err) {
          logger.error(
            `[CollaborationRequestWorker] Error unsubscribing agent ${agentId}`,
            err
          );
        }
      }
    }

    logger.info(`[CollaborationRequestWorker] Removed agent: ${agentId}`);
  }

  /**
   * Get the current status of the worker
   */
  public getStatus(): {
    isRunning: boolean;
    agentCount: number;
    activeRequestCount: number;
    subscribedAgents: string[];
  } {
    return {
      isRunning: this.isRunning,
      agentCount: this.agentIds.length,
      activeRequestCount: this.activeRequests.size,
      subscribedAgents: Array.from(this.unsubscribers.keys()),
    };
  }

  /**
   * Subscribe an agent to collaboration requests
   *
   * @param agentId - Agent ID to subscribe
   */
  private subscribeAgent(agentId: string): void {
    try {
      const unsubscribe = this.protocol.onRequest(agentId, (request) => {
        this.handleRequest(agentId, request);
      });

      this.unsubscribers.set(agentId, unsubscribe);
      logger.debug(
        `[CollaborationRequestWorker] Subscribed agent: ${agentId}`
      );
    } catch (err) {
      logger.error(
        `[CollaborationRequestWorker] Failed to subscribe agent ${agentId}`,
        err
      );
    }
  }

  /**
   * Handle an incoming collaboration request
   *
   * @param agentId - Target agent ID
   * @param request - Collaboration request
   */
  private async handleRequest(
    agentId: string,
    request: CollaborationRequest
  ): Promise<void> {
    // Check if we've hit the concurrent request limit for this agent
    const currentCount = this.requestCounts.get(agentId) || 0;
    if (currentCount >= this.maxConcurrentRequests) {
      logger.warn(
        `[CollaborationRequestWorker] Agent ${agentId} at max concurrent requests (${this.maxConcurrentRequests}), rejecting request ${request.id}`
      );
      this.protocol.respondToRequest(
        request.id,
        false,
        undefined,
        `Agent ${agentId} is at capacity, please try again later`
      );
      return;
    }

    // Increment request count
    this.requestCounts.set(agentId, currentCount + 1);

    // Set up timeout for this request
    const timeoutId = setTimeout(() => {
      this.handleRequestTimeout(request.id);
    }, request.timeout || this.defaultTimeout);

    // Track the active request
    const activeRequest: ActiveRequest = {
      requestId: request.id,
      agentId,
      startTime: Date.now(),
      timeoutId,
    };
    this.activeRequests.set(request.id, activeRequest);

    logger.info(
      `[CollaborationRequestWorker] Processing ${request.type} request ${request.id} for agent ${agentId} (priority: ${request.priority})`
    );

    try {
      // Accept the request
      const accepted = this.protocol.respondToRequest(request.id, true, undefined, 'Request accepted, processing...');

      if (!accepted) {
        throw new Error('Failed to accept request - may have been cancelled');
      }

      // Process based on request type
      let result: RequestProcessingResult;

      switch (request.type) {
        case 'help':
          result = await this.processHelpRequest(agentId, request);
          break;
        case 'review':
          result = await this.processReviewRequest(agentId, request);
          break;
        case 'escalate':
          result = await this.processEscalationRequest(agentId, request);
          break;
        default:
          result = {
            success: false,
            error: `Unknown request type: ${request.type}`,
          };
      }

      // Complete the request
      if (result.success) {
        this.protocol.completeRequest(request.id, result.data);
        logger.info(
          `[CollaborationRequestWorker] Request ${request.id} completed successfully`
        );
      } else {
        this.protocol.respondToRequest(
          request.id,
          false,
          result.data,
          result.error || 'Request processing failed'
        );
        logger.error(
          `[CollaborationRequestWorker] Request ${request.id} failed: ${result.error}`
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error(
        `[CollaborationRequestWorker] Error processing request ${request.id}: ${errorMessage}`,
        err
      );

      // Try to respond with error if not already completed
      try {
        this.protocol.respondToRequest(
          request.id,
          false,
          undefined,
          `Error: ${errorMessage}`
        );
      } catch (respondErr) {
        // Request may already be completed or expired
        logger.debug(
          `[CollaborationRequestWorker] Could not send error response for request ${request.id}`
        );
      }
    } finally {
      // Clean up
      this.cleanupRequest(request.id);
    }
  }

  /**
   * Process a help request
   *
   * @param agentId - Agent to spawn
   * @param request - Collaboration request containing help payload
   */
  private async processHelpRequest(
    agentId: string,
    request: CollaborationRequest
  ): Promise<RequestProcessingResult> {
    const payload = request.payload as { task: string; context?: Record<string, unknown> };

    if (!payload?.task) {
      return {
        success: false,
        error: 'Help request missing task payload',
      };
    }

    logger.debug(
      `[CollaborationRequestWorker] Spawning agent ${agentId} for help request ${request.id}`
    );

    // Spawn the agent with the task
    const result: AgentResult = await this.orchestrator.spawnAgent(
      agentId,
      payload.task,
      {
        workspaceId: this.workspaceId,
        collaborationRequestId: request.id,
        fromAgentId: request.fromAgentId,
        ...payload.context,
      }
    );

    if (result.metadata.success) {
      return {
        success: true,
        data: {
          output: result.output,
          agentId: result.agentId,
          timestamp: result.metadata.timestamp,
        },
      };
    } else {
      return {
        success: false,
        error: result.metadata.error || 'Agent execution failed',
        data: result.output,
      };
    }
  }

  /**
   * Process a review request
   *
   * @param agentId - Agent to spawn for review
   * @param request - Collaboration request containing review payload
   */
  private async processReviewRequest(
    agentId: string,
    request: CollaborationRequest
  ): Promise<RequestProcessingResult> {
    const payload = request.payload as {
      artifactId: string;
      reviewType: string;
      context?: Record<string, unknown>;
    };

    if (!payload?.artifactId || !payload?.reviewType) {
      return {
        success: false,
        error: 'Review request missing artifactId or reviewType',
      };
    }

    logger.debug(
      `[CollaborationRequestWorker] Spawning agent ${agentId} for review request ${request.id} (type: ${payload.reviewType})`
    );

    // Create a review-specific task
    const reviewTask = `Review ${payload.reviewType} for artifact "${payload.artifactId}". 
Context: ${JSON.stringify(payload.context || {})}
Provide a detailed review with findings, recommendations, and severity assessment.`;

    const result: AgentResult = await this.orchestrator.spawnAgent(
      agentId,
      reviewTask,
      {
        workspaceId: this.workspaceId,
        collaborationRequestId: request.id,
        fromAgentId: request.fromAgentId,
        reviewType: payload.reviewType,
        artifactId: payload.artifactId,
        ...payload.context,
      }
    );

    if (result.metadata.success) {
      return {
        success: true,
        data: {
          reviewId: `review-${request.id}`,
          artifactId: payload.artifactId,
          reviewType: payload.reviewType,
          findings: result.output,
          reviewerAgentId: result.agentId,
          timestamp: result.metadata.timestamp,
        },
      };
    } else {
      return {
        success: false,
        error: result.metadata.error || 'Review execution failed',
        data: result.output,
      };
    }
  }

  /**
   * Process an escalation request
   *
   * @param agentId - Agent to handle escalation
   * @param request - Collaboration request containing escalation payload
   */
  private async processEscalationRequest(
    agentId: string,
    request: CollaborationRequest
  ): Promise<RequestProcessingResult> {
    const payload = request.payload as {
      issue: EscalationRequest;
    };

    if (!payload?.issue) {
      return {
        success: false,
        error: 'Escalation request missing issue payload',
      };
    }

    const { issue } = payload;

    logger.warn(
      `[CollaborationRequestWorker] Spawning agent ${agentId} for escalation request ${request.id}: ${issue.title} (severity: ${issue.severity})`
    );

    // Create an escalation-specific task
    const escalationTask = `Handle escalation: ${issue.title}
Severity: ${issue.severity}
Description: ${issue.description}
Context: ${JSON.stringify(issue.context || {})}
Assess the situation and provide resolution steps or further escalation recommendations.`;

    const result: AgentResult = await this.orchestrator.spawnAgent(
      agentId,
      escalationTask,
      {
        workspaceId: this.workspaceId,
        collaborationRequestId: request.id,
        fromAgentId: request.fromAgentId,
        escalationId: `escalation-${request.id}`,
        severity: issue.severity,
        ...issue.context,
      }
    );

    if (result.metadata.success) {
      return {
        success: true,
        data: {
          escalationId: `escalation-${request.id}`,
          handledBy: agentId,
          resolution: result.output,
          severity: issue.severity,
          timestamp: result.metadata.timestamp,
        },
      };
    } else {
      return {
        success: false,
        error: result.metadata.error || 'Escalation handling failed',
        data: result.output,
      };
    }
  }

  /**
   * Handle request timeout
   *
   * @param requestId - Request ID that timed out
   */
  private handleRequestTimeout(requestId: string): void {
    const activeRequest = this.activeRequests.get(requestId);
    if (!activeRequest) {
      return; // Already cleaned up
    }

    logger.warn(
      `[CollaborationRequestWorker] Request ${requestId} timed out after ${Date.now() - activeRequest.startTime}ms`
    );

    // The protocol will handle the timeout response automatically,
    // but we need to clean up our tracking
    this.cleanupRequest(requestId);
  }

  /**
   * Cancel an active request
   *
   * @param requestId - Request ID to cancel
   * @param reason - Cancellation reason
   */
  private cancelRequest(requestId: string, reason: string): void {
    const activeRequest = this.activeRequests.get(requestId);
    if (!activeRequest) {
      return;
    }

    logger.info(
      `[CollaborationRequestWorker] Cancelling request ${requestId}: ${reason}`
    );

    // Clear the timeout
    clearTimeout(activeRequest.timeoutId);

    // Try to respond with cancellation
    try {
      this.protocol.respondToRequest(
        requestId,
        false,
        undefined,
        `Cancelled: ${reason}`
      );
    } catch (err) {
      // Request may already be completed or expired
    }

    // Clean up
    this.cleanupRequest(requestId);
  }

  /**
   * Clean up request tracking
   *
   * @param requestId - Request ID to clean up
   */
  private cleanupRequest(requestId: string): void {
    const activeRequest = this.activeRequests.get(requestId);
    if (activeRequest) {
      // Clear timeout if still present
      clearTimeout(activeRequest.timeoutId);

      // Decrement request count for agent
      const currentCount = this.requestCounts.get(activeRequest.agentId) || 0;
      if (currentCount > 0) {
        this.requestCounts.set(activeRequest.agentId, currentCount - 1);
      }

      // Remove from active requests
      this.activeRequests.delete(requestId);

      logger.debug(
        `[CollaborationRequestWorker] Cleaned up request ${requestId}`
      );
    }
  }

  /**
   * Start cleanup interval for stale requests
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleRequests();
    }, this.CLEANUP_INTERVAL_MS);
  }

  /**
   * Stop cleanup interval
   */
  private stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Clean up any stale requests that may have been missed
   */
  private cleanupStaleRequests(): void {
    const now = Date.now();
    const staleThreshold = this.defaultTimeout * 2; // 2x timeout

    for (const [requestId, activeRequest] of this.activeRequests) {
      const elapsed = now - activeRequest.startTime;
      if (elapsed > staleThreshold) {
        logger.warn(
          `[CollaborationRequestWorker] Cleaning up stale request ${requestId} (elapsed: ${elapsed}ms)`
        );
        this.cleanupRequest(requestId);
      }
    }
  }
}

/**
 * Create a collaboration request worker
 *
 * Factory function for creating a new CollaborationRequestWorker instance.
 *
 * @param options - Worker configuration options
 * @returns New CollaborationRequestWorker instance
 *
 * @example
 * ```typescript
 * const worker = createCollaborationRequestWorker({
 *   agentIds: ['code-reviewer', 'security-analyst', 'architect'],
 *   workspaceId: 'my-project',
 *   autoStart: true
 * });
 * ```
 */
export function createCollaborationRequestWorker(
  options: CollaborationRequestWorkerOptions
): CollaborationRequestWorker {
  return new CollaborationRequestWorker(options);
}

export default CollaborationRequestWorker;
