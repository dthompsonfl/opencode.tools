/**
 * Agent Session - Collaborative Session Management
 * 
 * Manages a collaborative session between multiple agents,
 * providing shared context, consensus building, and conflict resolution.
 */

import { EventEmitter } from 'events';
import {
  CollaborationBus,
  CollaborationMessage,
  MessageType,
  MessagePriority,
  ConsensusRequest
} from './message-bus';

/**
 * Agent role in a session
 */
export type AgentRole = 'lead' | 'contributor' | 'reviewer' | 'observer';

/**
 * Agent participation info
 */
export interface AgentParticipation {
  agentId: string;
  role: AgentRole;
  joinedAt: string;
  lastActivity: string;
  status: 'active' | 'idle' | 'offline';
}

/**
 * Shared context for the session
 */
export interface SessionContext {
  [key: string]: unknown;
}

/**
 * Consensus result
 */
export interface ConsensusResult {
  reached: boolean;
  decision?: string;
  votes: Record<string, string>;
  reasoning?: string;
}

/**
 * Session options
 */
export interface AgentSessionOptions {
  timeout?: number;
  requireConsensus?: boolean;
  maxParticipants?: number;
}

/**
 * Agent Session
 * 
 * Manages a collaborative work session between multiple agents.
 */
export class AgentSession extends EventEmitter {
  public readonly sessionId: string;
  private bus: CollaborationBus;
  private participants: Map<string, AgentParticipation>;
  private context: SessionContext;
  private options: Required<AgentSessionOptions>;
  private consensusResolvers: Map<string, (result: ConsensusResult) => void>;
  private helpResolvers: Map<string, (responses: CollaborationMessage[]) => void>;

  constructor(
    sessionId: string,
    bus: CollaborationBus,
    options?: AgentSessionOptions
  ) {
    super();
    this.sessionId = sessionId;
    this.bus = bus;
    this.participants = new Map();
    this.context = {};
    this.consensusResolvers = new Map();
    this.helpResolvers = new Map();
    
    this.options = {
      timeout: options?.timeout || 300000, // 5 minutes
      requireConsensus: options?.requireConsensus ?? false,
      maxParticipants: options?.maxParticipants || 10
    };

    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for the session
   */
  private setupEventHandlers(): void {
    // Listen for consensus votes
    this.bus.on('consensus-vote', (message: CollaborationMessage) => {
      if (message.sessionId === this.sessionId) {
        this.handleConsensusVote(message);
      }
    });

    // Listen for help responses
    this.bus.on('help-response', (message: CollaborationMessage) => {
      if (message.sessionId === this.sessionId) {
        this.handleHelpResponse(message);
      }
    });

    // Listen for updates
    this.bus.on('message', (message: CollaborationMessage) => {
      if (message.sessionId === this.sessionId) {
        this.updateParticipantActivity(message.from);
        this.emit('message', message);
      }
    });
  }

  /**
   * Invite an agent to join the session
   */
  public async inviteAgent(agentId: string, role: AgentRole = 'contributor'): Promise<boolean> {
    if (this.participants.size >= this.options.maxParticipants) {
      this.emit('error', { type: 'max_participants', agentId });
      return false;
    }

    if (this.participants.has(agentId)) {
      return true; // Already invited
    }

    const participation: AgentParticipation = {
      agentId,
      role,
      joinedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      status: 'active'
    };

    this.participants.set(agentId, participation);
    this.bus.registerAgent(this.sessionId, agentId);

    // Notify the agent they've been invited
    this.bus.sendDirect(
      this.sessionId,
      'system',
      agentId,
      'Session Invitation',
      `You have been invited to join session ${this.sessionId} as ${role}`,
      {
        data: { sessionId: this.sessionId, role, context: this.context }
      }
    );

    this.emit('agent:joined', { agentId, role });
    return true;
  }

  /**
   * Remove an agent from the session
   */
  public removeAgent(agentId: string): void {
    if (!this.participants.has(agentId)) return;

    this.participants.delete(agentId);
    this.bus.unregisterAgent(this.sessionId, agentId);

    this.emit('agent:left', { agentId });
  }

  /**
   * Set shared context for the session
   */
  public setContext(context: SessionContext): void {
    this.context = { ...this.context, ...context };
    
    // Broadcast context update to all participants
    this.broadcastToAll(
      'Context Update',
      'Session context has been updated',
      { priority: MessagePriority.NORMAL, data: { context: this.context } }
    );

    this.emit('context:updated', this.context);
  }

  /**
   * Get current session context
   */
  public getContext(): SessionContext {
    return { ...this.context };
  }

  /**
   * Broadcast a message to all participants
   */
  public broadcastToAll(
    subject: string,
    content: string,
    options?: {
      priority?: MessagePriority;
      data?: unknown;
      exclude?: string[];
    }
  ): CollaborationMessage {
    return this.bus.broadcast(
      this.sessionId,
      'session-lead',
      subject,
      content,
      options
    );
  }

  /**
   * Send a direct message to a specific agent
   */
  public sendToAgent(
    from: string,
    to: string,
    subject: string,
    content: string,
    options?: {
      priority?: MessagePriority;
      data?: unknown;
      requiresResponse?: boolean;
    }
  ): CollaborationMessage {
    return this.bus.sendDirect(
      this.sessionId,
      from,
      to,
      subject,
      content,
      options
    );
  }

  /**
   * Request help from the team
   */
  public async requestHelp(
    from: string,
    problem: string,
    options?: {
      attemptedSolutions?: string[];
      expertiseNeeded?: string[];
      timeout?: number;
    }
  ): Promise<CollaborationMessage[]> {
    const timeout = options?.timeout || 30000;

    return new Promise((resolve) => {
      const responses: CollaborationMessage[] = [];
      
      // Create a resolver for this help request
      const requestId = this.bus.requestHelp(
        this.sessionId,
        from,
        problem,
        {
          attemptedSolutions: options?.attemptedSolutions,
          expertiseNeeded: options?.expertiseNeeded,
          responseDeadline: new Date(Date.now() + timeout).toISOString()
        }
      ).id;

      this.helpResolvers.set(requestId, resolve);

      // Set timeout
      setTimeout(() => {
        if (this.helpResolvers.has(requestId)) {
          this.helpResolvers.delete(requestId);
          resolve(responses);
        }
      }, timeout);
    });
  }

  /**
   * Request consensus from all participants
   */
  public async requestConsensus(
    from: string,
    proposal: string,
    options?: {
      options?: string[];
      timeout?: number;
    }
  ): Promise<ConsensusResult> {
    const timeout = options?.timeout || 60000;

    return new Promise((resolve) => {
      const request = this.bus.requestConsensus(
        this.sessionId,
        from,
        proposal,
        {
          options: options?.options,
          deadline: new Date(Date.now() + timeout).toISOString()
        }
      );

      // Store resolver
      this.consensusResolvers.set(request.id, resolve);

      // Set timeout
      setTimeout(() => {
        if (this.consensusResolvers.has(request.id)) {
          this.consensusResolvers.delete(request.id);
          
          // Return current state even if not fully resolved
          const votes: Record<string, string> = {};
          request.votes.forEach((vote, agentId) => {
            votes[agentId] = vote;
          });

          resolve({
            reached: false,
            votes
          });
        }
      }, timeout);
    });
  }

  /**
   * Cast a vote on a consensus request
   */
  public castVote(
    consensusRequestId: string,
    agentId: string,
    vote: string,
    reasoning?: string
  ): void {
    this.bus.castVote(
      this.sessionId,
      consensusRequestId,
      agentId,
      vote,
      reasoning
    );
  }

  /**
   * Delegate a task to an agent
   */
  public delegateTask(
    from: string,
    to: string,
    task: string,
    options?: {
      deadline?: string;
      priority?: MessagePriority;
      context?: unknown;
    }
  ): CollaborationMessage {
    return this.bus.delegateTask(
      this.sessionId,
      from,
      to,
      task,
      options
    );
  }

  /**
   * Share a finding with all participants
   */
  public shareFinding(
    from: string,
    finding: string,
    options?: {
      severity?: 'info' | 'warning' | 'error' | 'critical';
      location?: string;
      data?: unknown;
    }
  ): CollaborationMessage {
    return this.bus.shareFinding(
      this.sessionId,
      from,
      finding,
      options
    );
  }

  /**
   * Wait for consensus to be reached
   */
  public async waitForConsensus(timeout: number = 30000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      // Check if all active participants are in agreement
      const activeParticipants = Array.from(this.participants.values())
        .filter(p => p.status === 'active');
      
      if (activeParticipants.length <= 1) {
        return true; // Consensus by default with single agent
      }

      // Wait a bit before checking again
      await this.delay(1000);
    }

    return false;
  }

  /**
   * Get all participants
   */
  public getParticipants(): AgentParticipation[] {
    return Array.from(this.participants.values());
  }

  /**
   * Get participants by role
   */
  public getParticipantsByRole(role: AgentRole): AgentParticipation[] {
    return Array.from(this.participants.values())
      .filter(p => p.role === role);
  }

  /**
   * Update agent status
   */
  public updateAgentStatus(agentId: string, status: AgentParticipation['status']): void {
    const participant = this.participants.get(agentId);
    if (participant) {
      participant.status = status;
      participant.lastActivity = new Date().toISOString();
      this.emit('agent:status', { agentId, status });
    }
  }

  /**
   * End the session
   */
  public endSession(): void {
    // Notify all participants
    this.broadcastToAll(
      'Session Ended',
      'The collaborative session has ended',
      { priority: MessagePriority.HIGH }
    );

    // Unregister all agents
    this.participants.forEach((_, agentId) => {
      this.bus.unregisterAgent(this.sessionId, agentId);
    });

    this.participants.clear();
    this.emit('session:ended', { sessionId: this.sessionId });
  }

  /**
   * Get session statistics
   */
  public getStats(): {
    participantCount: number;
    duration: number;
    messageCount: number;
    activeParticipants: number;
  } {
    const messages = this.bus.queryMessages({ sessionId: this.sessionId });
    const activeCount = Array.from(this.participants.values())
      .filter(p => p.status === 'active').length;

    return {
      participantCount: this.participants.size,
      duration: Date.now() - new Date(
        Array.from(this.participants.values())[0]?.joinedAt || Date.now()
      ).getTime(),
      messageCount: messages.length,
      activeParticipants: activeCount
    };
  }

  // Private helper methods

  private updateParticipantActivity(agentId: string): void {
    const participant = this.participants.get(agentId);
    if (participant) {
      participant.lastActivity = new Date().toISOString();
      if (participant.status !== 'active') {
        participant.status = 'active';
      }
    }
  }

  private handleConsensusVote(message: CollaborationMessage): void {
    // Check if this completes a consensus
    const request = this.bus.queryMessages({
      sessionId: this.sessionId,
      type: MessageType.CONSENSUS_REQUEST
    }).find(m => m.id === message.replyTo) as ConsensusRequest | undefined;

    if (request) {
      // Check if all participants have voted
      const votes: Record<string, string> = {};
      request.votes.forEach((vote, agentId) => {
        votes[agentId] = vote;
      });

      // Check if we have a resolver waiting
      const resolver = this.consensusResolvers.get(request.id);
      if (resolver && request.votes.size >= this.participants.size - 1) {
        this.consensusResolvers.delete(request.id);
        
        // Determine the decision
        const counts: Record<string, number> = {};
        request.votes.forEach(vote => {
          counts[vote] = (counts[vote] || 0) + 1;
        });

        let decision: string | undefined;
        for (const [option, count] of Object.entries(counts)) {
          if (count > this.participants.size / 2) {
            decision = option;
            break;
          }
        }

        resolver({
          reached: !!decision,
          decision,
          votes
        });
      }
    }
  }

  private handleHelpResponse(message: CollaborationMessage): void {
    if (message.replyTo) {
      const resolver = this.helpResolvers.get(message.replyTo);
      if (resolver) {
        // Collect all responses for this help request
        const responses = this.bus.queryMessages({
          sessionId: this.sessionId,
          type: MessageType.HELP_RESPONSE,
          threadId: message.replyTo
        });

        // If we have enough responses or timeout, resolve
        if (responses.length >= Math.min(2, this.participants.size - 1)) {
          this.helpResolvers.delete(message.replyTo);
          resolver(responses);
        }
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default AgentSession;
