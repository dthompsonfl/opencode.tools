/**
 * Collaboration Protocol
 * 
 * Implements agent-to-agent communication patterns including help requests,
 * finding sharing, code reviews, and escalation paths.
 */

import { logger } from '../../runtime/logger';
import { EventBus } from '../orchestrator/event-bus';
import { Blackboard } from '../orchestrator/blackboard';
import { TeamManager } from './team-manager';
import { TeamMember } from './team-types';

export type CollaborationType = 'help' | 'review' | 'share' | 'escalate';
export type CollaborationPriority = 'low' | 'normal' | 'high' | 'critical';
export type CollaborationStatus = 'pending' | 'accepted' | 'rejected' | 'completed' | 'expired';

export interface CollaborationRequest {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  type: CollaborationType;
  priority: CollaborationPriority;
  payload: unknown;
  timestamp: number;
  timeout: number;
  status: CollaborationStatus;
  response?: CollaborationResponse;
}

export interface CollaborationResponse {
  accepted: boolean;
  data?: unknown;
  message?: string;
  timestamp: number;
}

export interface ReviewRequest {
  artifactId: string;
  reviewType: 'code' | 'architecture' | 'security' | 'compliance';
  context?: Record<string, unknown>;
}

export interface ReviewResponse {
  accepted: boolean;
  reviewId?: string;
  estimatedCompletion?: number;
  message?: string;
}

export interface EscalationRequest {
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, unknown>;
}

export interface EscalationResponse {
  escalated: boolean;
  escalationId?: string;
  handledBy?: string;
  message?: string;
}

export interface Finding {
  type: string;
  title: string;
  description: string;
  severity?: 'info' | 'warning' | 'critical';
  data?: unknown;
}

type RequestCallback = (request: CollaborationRequest) => void;

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const CLEANUP_INTERVAL = 60000; // 1 minute

export class CollaborationProtocol {
  private static instance: CollaborationProtocol;
  private requests: Map<string, CollaborationRequest> = new Map();
  private pendingRequests: Map<string, Set<string>> = new Map(); // agentId -> requestIds
  private subscribers: Map<string, Set<RequestCallback>> = new Map(); // agentId -> callbacks
  private eventBus: EventBus;
  private blackboard: Blackboard;
  private teamManager: TeamManager;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.eventBus = EventBus.getInstance();
    this.blackboard = Blackboard.getInstance();
    this.teamManager = TeamManager.getInstance();
    this.startCleanupInterval();
  }

  public static getInstance(): CollaborationProtocol {
    if (!CollaborationProtocol.instance) {
      CollaborationProtocol.instance = new CollaborationProtocol();
    }
    return CollaborationProtocol.instance;
  }

  public static resetForTests(): void {
    if (!CollaborationProtocol.instance) {
      return;
    }

    CollaborationProtocol.instance.stopCleanupInterval();
    CollaborationProtocol.instance.requests.clear();
    CollaborationProtocol.instance.pendingRequests.clear();
    CollaborationProtocol.instance.subscribers.clear();
    CollaborationProtocol.instance = undefined as unknown as CollaborationProtocol;
  }

  /**
   * Start cleanup interval for expired requests
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredRequests();
    }, CLEANUP_INTERVAL);
  }

  /**
   * Stop cleanup interval
   */
  public stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Request help from another agent
   */
  public async requestHelp(
    fromAgentId: string,
    toAgentId: string,
    task: string,
    context?: Record<string, unknown>,
    priority: CollaborationPriority = 'normal',
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<CollaborationResponse> {
    const request = this.createRequest(
      fromAgentId,
      toAgentId,
      'help',
      priority,
      { task, context },
      timeout
    );

    logger.debug(`[CollaborationProtocol] Help request ${request.id} from ${fromAgentId} to ${toAgentId}`);

    // Emit event for visibility
    this.eventBus.publish('collaboration:help:requested', {
      requestId: request.id,
      fromAgentId,
      toAgentId,
      task,
      priority,
      timestamp: request.timestamp
    });

    // Try to deliver to subscriber
    const delivered = this.deliverRequest(toAgentId, request);

    if (!delivered) {
      // Store for later pickup
      this.storeRequest(request);
    }

    // Wait for response with timeout
    return this.waitForResponse(request.id, timeout);
  }

  /**
   * Share a finding with the team
   */
  public shareFinding(
    fromAgentId: string,
    finding: Finding,
    scope: 'team' | 'specific' | 'broadcast' = 'team',
    targetAgentIds?: string[],
    workspaceId?: string
  ): void {
    const timestamp = Date.now();

    logger.debug(`[CollaborationProtocol] Finding shared by ${fromAgentId}: ${finding.title}`);

    // Store on blackboard
    this.blackboard.updateArtifact(
      `finding-${timestamp}`,
      {
        ...finding,
        sharedBy: fromAgentId,
        scope,
        timestamp
      },
      fromAgentId,
      'finding',
      { workspaceId }
    );

    // Emit event
    this.eventBus.publish('collaboration:finding:shared', {
      fromAgentId,
      finding,
      scope,
      targetAgentIds,
      timestamp
    });

    // Handle different scopes
    switch (scope) {
      case 'team': {
        // Find team and broadcast to all members
        const teams = this.teamManager.listActiveTeams();
        for (const team of teams) {
          const member = team.members.get(fromAgentId);
          if (member) {
            // This is the sender's team, notify other members
            for (const [agentId] of team.members) {
              if (agentId !== fromAgentId) {
                this.eventBus.publish(`collaboration:finding:shared:${agentId}`, {
                  fromAgentId,
                  finding,
                  timestamp
                });
              }
            }
            break;
          }
        }
        break;
      }
      case 'specific': {
        // Notify specific agents
        if (targetAgentIds) {
          for (const agentId of targetAgentIds) {
            this.eventBus.publish(`collaboration:finding:shared:${agentId}`, {
              fromAgentId,
              finding,
              timestamp
            });
          }
        }
        break;
      }
      case 'broadcast': {
        // Already emitted to general channel
        break;
      }
    }
  }

  /**
   * Request a review from another agent
   */
  public async requestReview(
    fromAgentId: string,
    artifactId: string,
    reviewType: ReviewRequest['reviewType'],
    context?: Record<string, unknown>,
    priority: CollaborationPriority = 'normal',
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<ReviewResponse> {
    // Find best reviewer based on review type
    const toAgentId = this.findBestReviewer(fromAgentId, reviewType);
    
    if (!toAgentId) {
      return {
        accepted: false,
        message: `No available reviewer found for ${reviewType} review`
      };
    }

    const request = this.createRequest(
      fromAgentId,
      toAgentId,
      'review',
      priority,
      { artifactId, reviewType, context },
      timeout
    );

    logger.debug(`[CollaborationProtocol] Review request ${request.id} from ${fromAgentId} to ${toAgentId}`);

    // Emit event
    this.eventBus.publish('collaboration:review:requested', {
      requestId: request.id,
      fromAgentId,
      toAgentId,
      artifactId,
      reviewType,
      priority,
      timestamp: request.timestamp
    });

    // Deliver or store
    const delivered = this.deliverRequest(toAgentId, request);
    if (!delivered) {
      this.storeRequest(request);
    }

    // Wait for response
    const response = await this.waitForResponse(request.id, timeout);

    return {
      accepted: response.accepted,
      reviewId: response.accepted ? `review-${request.id}` : undefined,
      estimatedCompletion: response.accepted ? Date.now() + 300000 : undefined, // 5 min estimate
      message: response.message
    };
  }

  /**
   * Escalate an issue to higher authority
   */
  public async escalate(
    fromAgentId: string,
    issue: EscalationRequest,
    escalationPath: string[] = [],
    priority: CollaborationPriority = 'high',
    timeout: number = DEFAULT_TIMEOUT * 2
  ): Promise<EscalationResponse> {
    // Find team lead or use escalation path
    let toAgentId: string | undefined;
    
    const teams = this.teamManager.listActiveTeams();
    for (const team of teams) {
      if (team.members.has(fromAgentId)) {
        const lead = this.teamManager.getTeamLead(team.id);
        if (lead && lead.agentId !== fromAgentId) {
          toAgentId = lead.agentId;
        }
        break;
      }
    }

    // Use escalation path if no team lead found
    if (!toAgentId && escalationPath.length > 0) {
      for (const roleId of escalationPath) {
        const mapping = this.teamManager.getRoleMapping(roleId);
        if (mapping) {
          toAgentId = mapping.agentId;
          break;
        }
      }
    }

    if (!toAgentId) {
      return {
        escalated: false,
        message: 'No escalation target found'
      };
    }

    const request = this.createRequest(
      fromAgentId,
      toAgentId,
      'escalate',
      priority,
      { issue },
      timeout
    );

    logger.warn(`[CollaborationProtocol] Escalation ${request.id} from ${fromAgentId} to ${toAgentId}: ${issue.title}`);

    // Emit critical event
    this.eventBus.publish('collaboration:escalation', {
      requestId: request.id,
      fromAgentId,
      toAgentId,
      issue,
      priority,
      timestamp: request.timestamp
    });

    // Deliver or store
    const delivered = this.deliverRequest(toAgentId, request);
    if (!delivered) {
      this.storeRequest(request);
    }

    // Wait for response
    const response = await this.waitForResponse(request.id, timeout);

    return {
      escalated: response.accepted,
      escalationId: response.accepted ? `escalation-${request.id}` : undefined,
      handledBy: response.accepted ? toAgentId : undefined,
      message: response.message
    };
  }

  /**
   * Broadcast a message to the team
   */
  public broadcast(
    fromAgentId: string,
    message: string,
    metadata?: Record<string, unknown>,
    workspaceId?: string
  ): void {
    const timestamp = Date.now();

    logger.debug(`[CollaborationProtocol] Broadcast from ${fromAgentId}: ${message}`);

    // Store on blackboard
    this.blackboard.updateArtifact(
      `broadcast-${timestamp}`,
      {
        message,
        fromAgentId,
        timestamp,
        ...metadata
      },
      fromAgentId,
      'broadcast',
      { workspaceId }
    );

    // Emit event
    this.eventBus.publish('collaboration:broadcast', {
      fromAgentId,
      message,
      metadata,
      timestamp
    });

    // Notify team members
    const teams = this.teamManager.listActiveTeams();
    for (const team of teams) {
      if (team.members.has(fromAgentId)) {
        for (const [agentId] of team.members) {
          if (agentId !== fromAgentId) {
            this.eventBus.publish(`collaboration:broadcast:${agentId}`, {
              fromAgentId,
              message,
              timestamp
            });
          }
        }
        break;
      }
    }
  }

  /**
   * Subscribe to collaboration requests
   */
  public onRequest(
    agentId: string,
    callback: RequestCallback
  ): () => void {
    if (!this.subscribers.has(agentId)) {
      this.subscribers.set(agentId, new Set());
    }
    this.subscribers.get(agentId)!.add(callback);

    // Check for pending requests
    const pending = this.pendingRequests.get(agentId);
    if (pending) {
      for (const requestId of pending) {
        const request = this.requests.get(requestId);
        if (request && request.status === 'pending') {
          callback(request);
        }
      }
    }

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(agentId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscribers.delete(agentId);
        }
      }
    };
  }

  /**
   * Get pending requests for an agent
   */
  public getPendingRequests(agentId: string): CollaborationRequest[] {
    const pending = this.pendingRequests.get(agentId);
    if (!pending) return [];

    return Array.from(pending)
      .map(id => this.requests.get(id))
      .filter((req): req is CollaborationRequest => 
        req !== undefined && req.status === 'pending'
      );
  }

  /**
   * Respond to a collaboration request
   */
  public respondToRequest(
    requestId: string,
    accepted: boolean,
    data?: unknown,
    message?: string
  ): boolean {
    const request = this.requests.get(requestId);
    if (!request) {
      logger.warn(`[CollaborationProtocol] Cannot respond to non-existent request: ${requestId}`);
      return false;
    }

    if (request.status !== 'pending') {
      logger.warn(`[CollaborationProtocol] Request ${requestId} already ${request.status}`);
      return false;
    }

    const response: CollaborationResponse = {
      accepted,
      data,
      message,
      timestamp: Date.now()
    };

    request.status = accepted ? 'accepted' : 'rejected';
    request.response = response;

    // Emit response event
    this.eventBus.publish(`collaboration:response:${requestId}`, response);
    this.eventBus.publish('collaboration:response', {
      requestId,
      fromAgentId: request.fromAgentId,
      toAgentId: request.toAgentId,
      accepted,
      timestamp: response.timestamp
    });

    logger.debug(`[CollaborationProtocol] Response to ${requestId}: ${accepted ? 'accepted' : 'rejected'}`);

    return true;
  }

  /**
   * Complete a collaboration request
   */
  public completeRequest(requestId: string, data?: unknown): boolean {
    const request = this.requests.get(requestId);
    if (!request) {
      logger.warn(`[CollaborationProtocol] Cannot complete non-existent request: ${requestId}`);
      return false;
    }

    if (request.status !== 'accepted') {
      logger.warn(`[CollaborationProtocol] Cannot complete request ${requestId} with status ${request.status}`);
      return false;
    }

    request.status = 'completed';

    // Update response
    if (request.response) {
      request.response.data = data;
    }

    // Emit completion event
    this.eventBus.publish(`collaboration:complete:${requestId}`, {
      requestId,
      data,
      timestamp: Date.now()
    });

    logger.debug(`[CollaborationProtocol] Request ${requestId} completed`);

    return true;
  }

  /**
   * Create a new collaboration request
   */
  private createRequest(
    fromAgentId: string,
    toAgentId: string,
    type: CollaborationType,
    priority: CollaborationPriority,
    payload: unknown,
    timeout: number
  ): CollaborationRequest {
    const request: CollaborationRequest = {
      id: `collab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fromAgentId,
      toAgentId,
      type,
      priority,
      payload,
      timestamp: Date.now(),
      timeout,
      status: 'pending'
    };

    this.requests.set(request.id, request);

    // Track pending request for agent
    if (!this.pendingRequests.has(toAgentId)) {
      this.pendingRequests.set(toAgentId, new Set());
    }
    this.pendingRequests.get(toAgentId)!.add(request.id);

    return request;
  }

  /**
   * Store a request for later pickup
   */
  private storeRequest(request: CollaborationRequest): void {
    logger.debug(`[CollaborationProtocol] Stored request ${request.id} for ${request.toAgentId}`);
  }

  /**
   * Deliver request to subscriber if available
   */
  private deliverRequest(agentId: string, request: CollaborationRequest): boolean {
    const callbacks = this.subscribers.get(agentId);
    if (!callbacks || callbacks.size === 0) {
      return false;
    }

    callbacks.forEach(callback => {
      try {
        callback(request);
      } catch (err) {
        logger.error(`[CollaborationProtocol] Error delivering request to ${agentId}`, err);
      }
    });

    return true;
  }

  /**
   * Wait for response to a request
   */
  private waitForResponse(
    requestId: string,
    timeout: number
  ): Promise<CollaborationResponse> {
    return new Promise((resolve) => {
      const request = this.requests.get(requestId);
      if (!request) {
        resolve({ accepted: false, message: 'Request not found', timestamp: Date.now() });
        return;
      }

      // Check if already responded
      if (request.response) {
        resolve(request.response);
        return;
      }

      // Subscribe to response
      const unsubscribe = this.eventBus.subscribe(
        `collaboration:response:${requestId}`,
        (response: unknown) => {
          unsubscribe();
          clearTimeout(timeoutId);
          resolve(response as CollaborationResponse);
        }
      );

      // Set timeout
      const timeoutId = setTimeout(() => {
        unsubscribe();
        request.status = 'expired';
        resolve({ 
          accepted: false, 
          message: 'Request timed out', 
          timestamp: Date.now() 
        });
      }, timeout);
    });
  }

  /**
   * Find best reviewer for a review type
   */
  private findBestReviewer(fromAgentId: string, reviewType: string): string | undefined {
    const capabilityMap: Record<string, string> = {
      'code': 'code-review',
      'architecture': 'architecture-review',
      'security': 'security-review',
      'compliance': 'compliance-review'
    };

    const requiredCapability = capabilityMap[reviewType];
    if (!requiredCapability) return undefined;

    // Find team of requesting agent
    const teams = this.teamManager.listActiveTeams();
    for (const team of teams) {
      if (team.members.has(fromAgentId)) {
        // Find member with capability
        for (const [agentId, member] of team.members) {
          if (agentId !== fromAgentId && 
              member.status === 'idle' &&
              member.capabilities.includes(requiredCapability)) {
            return agentId;
          }
        }
        break;
      }
    }

    return undefined;
  }

  /**
   * Clean up expired requests
   */
  private cleanupExpiredRequests(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, request] of this.requests) {
      if (request.status === 'pending' && now - request.timestamp > request.timeout) {
        request.status = 'expired';
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`[CollaborationProtocol] Cleaned up ${cleaned} expired requests`);
    }
  }

  public triggerCleanupForTests(): void {
    this.cleanupExpiredRequests();
  }

  /**
   * Get all active requests
   */
  public getAllRequests(): CollaborationRequest[] {
    return Array.from(this.requests.values());
  }

  /**
   * Get request by ID
   */
  public getRequest(requestId: string): CollaborationRequest | undefined {
    return this.requests.get(requestId);
  }

  /**
   * Clear all requests (for testing)
   */
  public clear(): void {
    CollaborationProtocol.resetForTests();
    logger.warn('[CollaborationProtocol] All requests cleared');
  }
}

export default CollaborationProtocol;
