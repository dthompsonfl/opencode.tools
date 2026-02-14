/**
 * Collaboration Message Bus - Inter-Agent Communication System
 * 
 * Enables agents to communicate with each other in real-time,
 * request help, share findings, and build consensus.
 * 
 * Features:
 * - Pub/sub messaging between agents
 * - Direct message routing
 * - Help request system
 * - Consensus building
 * - Message persistence and replay
 */

import { EventEmitter } from 'events';

/**
 * Types of collaboration messages
 */
export enum MessageType {
  DIRECT = 'direct',           // Direct message to specific agent
  BROADCAST = 'broadcast',     // Message to all agents in session
  HELP_REQUEST = 'help_request', // Request for assistance
  HELP_RESPONSE = 'help_response', // Response to help request
  CONSENSUS_REQUEST = 'consensus_request', // Request for consensus
  CONSENSUS_VOTE = 'consensus_vote', // Vote on consensus
  UPDATE = 'update',           // Status update
  FINDING = 'finding',         // Share a finding
  QUESTION = 'question',       // Ask a question
  ANSWER = 'answer',           // Answer a question
  DELEGATION = 'delegation'    // Delegate a task
}

/**
 * Priority levels for messages
 */
export enum MessagePriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Collaboration message structure
 */
export interface CollaborationMessage {
  id: string;
  type: MessageType;
  sessionId: string;
  from: string;              // Agent ID of sender
  to?: string;               // Agent ID of recipient (for direct messages)
  timestamp: string;
  priority: MessagePriority;
  subject: string;
  content: string;
  data?: unknown;            // Additional structured data
  threadId?: string;         // For message threading
  replyTo?: string;          // ID of message being replied to
  requiresResponse?: boolean;
  responseDeadline?: string; // ISO timestamp
}

/**
 * Help request message
 */
export interface HelpRequest extends CollaborationMessage {
  type: MessageType.HELP_REQUEST;
  problem: string;
  attemptedSolutions: string[];
  expertiseNeeded: string[];
}

/**
 * Consensus request message
 */
export interface ConsensusRequest extends CollaborationMessage {
  type: MessageType.CONSENSUS_REQUEST;
  proposal: string;
  options: string[];
  deadline: string;
  votes: Map<string, string>; // agentId -> vote
}

/**
 * Message filter for querying messages
 */
export interface MessageFilter {
  sessionId?: string;
  from?: string;
  to?: string;
  type?: MessageType;
  threadId?: string;
  since?: string;
  until?: string;
  priority?: MessagePriority;
}

/**
 * Message statistics
 */
export interface MessageStats {
  totalMessages: number;
  byType: Record<MessageType, number>;
  byAgent: Record<string, number>;
  helpRequests: number;
  consensusRequests: number;
  averageResponseTime: number;
}

/**
 * Collaboration Bus
 * 
 * Central message passing system for agent collaboration.
 * Implements pub/sub pattern with message persistence.
 */
export class CollaborationBus extends EventEmitter {
  private messages: CollaborationMessage[];
  private sessions: Map<string, Set<string>>; // sessionId -> agentIds
  private messageHandlers: Map<string, Function[]>;
  private maxHistory: number;

  constructor(maxHistory: number = 10000) {
    super();
    this.messages = [];
    this.sessions = new Map();
    this.messageHandlers = new Map();
    this.maxHistory = maxHistory;
  }

  /**
   * Register an agent for a session
   */
  public registerAgent(sessionId: string, agentId: string): void {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, new Set());
    }
    this.sessions.get(sessionId)!.add(agentId);
    
    this.emit('agent:registered', { sessionId, agentId });
  }

  /**
   * Unregister an agent from a session
   */
  public unregisterAgent(sessionId: string, agentId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.delete(agentId);
      if (session.size === 0) {
        this.sessions.delete(sessionId);
      }
    }
    
    this.emit('agent:unregistered', { sessionId, agentId });
  }

  /**
   * Send a direct message to a specific agent
   */
  public sendDirect(
    sessionId: string,
    from: string,
    to: string,
    subject: string,
    content: string,
    options?: {
      priority?: MessagePriority;
      data?: unknown;
      requiresResponse?: boolean;
      responseDeadline?: string;
    }
  ): CollaborationMessage {
    const message: CollaborationMessage = {
      id: this.generateMessageId(),
      type: MessageType.DIRECT,
      sessionId,
      from,
      to,
      timestamp: new Date().toISOString(),
      priority: options?.priority || MessagePriority.NORMAL,
      subject,
      content,
      data: options?.data,
      requiresResponse: options?.requiresResponse,
      responseDeadline: options?.responseDeadline
    };

    this.storeMessage(message);
    this.emit('message', message);
    this.emit(`message:${to}`, message); // Direct emit to recipient

    return message;
  }

  /**
   * Broadcast a message to all agents in a session
   */
  public broadcast(
    sessionId: string,
    from: string,
    subject: string,
    content: string,
    options?: {
      priority?: MessagePriority;
      data?: unknown;
      exclude?: string[]; // Agent IDs to exclude
    }
  ): CollaborationMessage {
    const message: CollaborationMessage = {
      id: this.generateMessageId(),
      type: MessageType.BROADCAST,
      sessionId,
      from,
      timestamp: new Date().toISOString(),
      priority: options?.priority || MessagePriority.NORMAL,
      subject,
      content,
      data: options?.data
    };

    this.storeMessage(message);
    this.emit('broadcast', message);

    // Emit to all agents in session except excluded
    const session = this.sessions.get(sessionId);
    if (session) {
      const exclude = new Set(options?.exclude || []);
      session.forEach(agentId => {
        if (!exclude.has(agentId) && agentId !== from) {
          this.emit(`message:${agentId}`, message);
        }
      });
    }

    return message;
  }

  /**
   * Request help from other agents
   */
  public requestHelp(
    sessionId: string,
    from: string,
    problem: string,
    options?: {
      attemptedSolutions?: string[];
      expertiseNeeded?: string[];
      priority?: MessagePriority;
      responseDeadline?: string;
    }
  ): HelpRequest {
    const message: HelpRequest = {
      id: this.generateMessageId(),
      type: MessageType.HELP_REQUEST,
      sessionId,
      from,
      timestamp: new Date().toISOString(),
      priority: options?.priority || MessagePriority.HIGH,
      subject: `Help Request: ${problem.substring(0, 50)}...`,
      content: problem,
      problem,
      attemptedSolutions: options?.attemptedSolutions || [],
      expertiseNeeded: options?.expertiseNeeded || [],
      requiresResponse: true,
      responseDeadline: options?.responseDeadline
    };

    this.storeMessage(message);
    this.emit('help-request', message);

    // Broadcast to all agents in session
    const session = this.sessions.get(sessionId);
    if (session) {
      session.forEach(agentId => {
        if (agentId !== from) {
          this.emit(`help-request:${agentId}`, message);
        }
      });
    }

    return message;
  }

  /**
   * Respond to a help request
   */
  public respondToHelp(
    sessionId: string,
    from: string,
    helpRequestId: string,
    response: string,
    options?: {
      solution?: string;
      code?: string;
      explanation?: string;
    }
  ): CollaborationMessage {
    const message: CollaborationMessage = {
      id: this.generateMessageId(),
      type: MessageType.HELP_RESPONSE,
      sessionId,
      from,
      timestamp: new Date().toISOString(),
      priority: MessagePriority.HIGH,
      subject: 'Help Response',
      content: response,
      replyTo: helpRequestId,
      data: options
    };

    this.storeMessage(message);
    this.emit('help-response', message);

    return message;
  }

  /**
   * Request consensus from agents
   */
  public requestConsensus(
    sessionId: string,
    from: string,
    proposal: string,
    options?: {
      options?: string[];
      deadline?: string;
      priority?: MessagePriority;
    }
  ): ConsensusRequest {
    const message: ConsensusRequest = {
      id: this.generateMessageId(),
      type: MessageType.CONSENSUS_REQUEST,
      sessionId,
      from,
      timestamp: new Date().toISOString(),
      priority: options?.priority || MessagePriority.HIGH,
      subject: 'Consensus Request',
      content: proposal,
      proposal,
      options: options?.options || ['approve', 'reject', 'abstain'],
      deadline: options?.deadline || this.defaultDeadline(),
      votes: new Map(),
      requiresResponse: true
    };

    this.storeMessage(message);
    this.emit('consensus-request', message);

    // Broadcast to all agents
    const session = this.sessions.get(sessionId);
    if (session) {
      session.forEach(agentId => {
        if (agentId !== from) {
          this.emit(`consensus-request:${agentId}`, message);
        }
      });
    }

    return message;
  }

  /**
   * Cast a vote on a consensus request
   */
  public castVote(
    sessionId: string,
    consensusRequestId: string,
    agentId: string,
    vote: string,
    reasoning?: string
  ): CollaborationMessage {
    const message: CollaborationMessage = {
      id: this.generateMessageId(),
      type: MessageType.CONSENSUS_VOTE,
      sessionId,
      from: agentId,
      timestamp: new Date().toISOString(),
      priority: MessagePriority.HIGH,
      subject: 'Consensus Vote',
      content: reasoning || `Vote: ${vote}`,
      replyTo: consensusRequestId,
      data: { vote }
    };

    this.storeMessage(message);
    
    // Update the consensus request with the vote
    const consensusRequest = this.messages.find(
      m => m.id === consensusRequestId && m.type === MessageType.CONSENSUS_REQUEST
    ) as ConsensusRequest | undefined;
    
    if (consensusRequest) {
      consensusRequest.votes.set(agentId, vote);
      
      // Check if consensus is reached
      const result = this.checkConsensus(consensusRequest);
      if (result.reached) {
        this.emit('consensus-reached', {
          requestId: consensusRequestId,
          result: result.decision,
          votes: Object.fromEntries(consensusRequest.votes)
        });
      }
    }

    this.emit('consensus-vote', message);
    return message;
  }

  /**
   * Share a finding with other agents
   */
  public shareFinding(
    sessionId: string,
    from: string,
    finding: string,
    options?: {
      severity?: 'info' | 'warning' | 'error' | 'critical';
      location?: string;
      data?: unknown;
    }
  ): CollaborationMessage {
    return this.broadcast(
      sessionId,
      from,
      `Finding: ${finding.substring(0, 50)}...`,
      finding,
      {
        priority: this.severityToPriority(options?.severity),
        data: options
      }
    );
  }

  /**
   * Delegate a task to another agent
   */
  public delegateTask(
    sessionId: string,
    from: string,
    to: string,
    task: string,
    options?: {
      deadline?: string;
      priority?: MessagePriority;
      context?: unknown;
    }
  ): CollaborationMessage {
    const message: CollaborationMessage = {
      id: this.generateMessageId(),
      type: MessageType.DELEGATION,
      sessionId,
      from,
      to,
      timestamp: new Date().toISOString(),
      priority: options?.priority || MessagePriority.NORMAL,
      subject: 'Task Delegation',
      content: task,
      data: options?.context,
      requiresResponse: true,
      responseDeadline: options?.deadline
    };

    this.storeMessage(message);
    this.emit('delegation', message);
    this.emit(`delegation:${to}`, message);

    return message;
  }

  /**
   * Query messages based on filter
   */
  public queryMessages(filter?: MessageFilter): CollaborationMessage[] {
    return this.messages.filter(message => {
      if (filter?.sessionId && message.sessionId !== filter.sessionId) return false;
      if (filter?.from && message.from !== filter.from) return false;
      if (filter?.to && message.to !== filter.to) return false;
      if (filter?.type && message.type !== filter.type) return false;
      if (filter?.threadId && message.threadId !== filter.threadId) return false;
      if (filter?.since && message.timestamp < filter.since) return false;
      if (filter?.until && message.timestamp > filter.until) return false;
      if (filter?.priority && message.priority !== filter.priority) return false;
      return true;
    });
  }

  /**
   * Get message statistics
   */
  public getStats(sessionId?: string): MessageStats {
    const messages = sessionId 
      ? this.messages.filter(m => m.sessionId === sessionId)
      : this.messages;

    const byType: Record<string, number> = {};
    const byAgent: Record<string, number> = {};
    let helpRequests = 0;
    let consensusRequests = 0;

    messages.forEach(message => {
      // Count by type
      byType[message.type] = (byType[message.type] || 0) + 1;

      // Count by agent
      byAgent[message.from] = (byAgent[message.from] || 0) + 1;

      // Count special types
      if (message.type === MessageType.HELP_REQUEST) helpRequests++;
      if (message.type === MessageType.CONSENSUS_REQUEST) consensusRequests++;
    });

    return {
      totalMessages: messages.length,
      byType: byType as Record<MessageType, number>,
      byAgent,
      helpRequests,
      consensusRequests,
      averageResponseTime: this.calculateAverageResponseTime(messages)
    };
  }

  /**
   * Get message thread
   */
  public getThread(threadId: string): CollaborationMessage[] {
    return this.messages
      .filter(m => m.threadId === threadId || m.id === threadId)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  /**
   * Get unread messages for an agent
   */
  public getUnreadMessages(sessionId: string, agentId: string, since?: string): CollaborationMessage[] {
    return this.messages.filter(m => {
      if (m.sessionId !== sessionId) return false;
      if (m.from === agentId) return false; // Don't show own messages
      if (m.to && m.to !== agentId) return false; // Not addressed to this agent
      if (since && m.timestamp <= since) return false;
      return true;
    });
  }

  /**
   * Clear message history
   */
  public clearHistory(): void {
    this.messages = [];
    this.emit('history:cleared');
  }

  /**
   * Get all agents in a session
   */
  public getSessionAgents(sessionId: string): string[] {
    const session = this.sessions.get(sessionId);
    return session ? Array.from(session) : [];
  }

  // Private helper methods

  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private storeMessage(message: CollaborationMessage): void {
    this.messages.push(message);
    
    // Trim history if exceeded
    if (this.messages.length > this.maxHistory) {
      this.messages = this.messages.slice(-this.maxHistory);
    }
  }

  private defaultDeadline(): string {
    const deadline = new Date();
    deadline.setMinutes(deadline.getMinutes() + 30); // 30 minutes default
    return deadline.toISOString();
  }

  private severityToPriority(severity?: string): MessagePriority {
    switch (severity) {
      case 'critical': return MessagePriority.CRITICAL;
      case 'error': return MessagePriority.HIGH;
      case 'warning': return MessagePriority.NORMAL;
      default: return MessagePriority.LOW;
    }
  }

  private checkConsensus(consensusRequest: ConsensusRequest): { reached: boolean; decision?: string } {
    const session = this.sessions.get(consensusRequest.sessionId);
    if (!session) return { reached: false };

    const totalAgents = session.size - 1; // Exclude the requester
    const votes = consensusRequest.votes;

    // Check if all agents have voted
    if (votes.size < totalAgents) return { reached: false };

    // Count votes
    const counts: Record<string, number> = {};
    votes.forEach(vote => {
      counts[vote] = (counts[vote] || 0) + 1;
    });

    // Simple majority
    for (const [option, count] of Object.entries(counts)) {
      if (count > totalAgents / 2) {
        return { reached: true, decision: option };
      }
    }

    return { reached: false };
  }

  private calculateAverageResponseTime(messages: CollaborationMessage[]): number {
    const helpRequests = messages.filter(m => m.type === MessageType.HELP_REQUEST);
    if (helpRequests.length === 0) return 0;

    let totalResponseTime = 0;
    let responseCount = 0;

    helpRequests.forEach(request => {
      const response = messages.find(m => 
        m.type === MessageType.HELP_RESPONSE && m.replyTo === request.id
      );
      
      if (response) {
        const requestTime = new Date(request.timestamp).getTime();
        const responseTime = new Date(response.timestamp).getTime();
        totalResponseTime += (responseTime - requestTime);
        responseCount++;
      }
    });

    return responseCount > 0 ? totalResponseTime / responseCount / 1000 : 0; // in seconds
  }
}
