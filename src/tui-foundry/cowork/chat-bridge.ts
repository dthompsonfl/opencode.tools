/**
 * Chat Bridge for Cowork Integration
 *
 * Bridges the TUI chat system with Cowork collaboration features.
 * Enables @mentions to spawn agents, converts chat messages to
 * collaboration requests, and manages conversation context.
 */

import { EventBus, EventEnvelope } from '../../cowork/orchestrator/event-bus';
import { CollaborationProtocol } from '../../cowork/team/collaboration-protocol';
import { TeamManager } from '../../cowork/team/team-manager';
import { CoworkOrchestrator } from '../../cowork/orchestrator/cowork-orchestrator';
import { CollaborativeWorkspace } from '../../cowork/collaboration/collaborative-workspace';
import { AgentResult } from '../../cowork/orchestrator/result-merger';
import { logger } from '../../runtime/logger';
import type { FoundryDispatch } from '../store/actions';
import type { Message, MessageRole } from '../types';

// =============================================================================
// Types
// =============================================================================

export interface ChatBridgeOptions {
  /** Enable @mentions to spawn agents */
  enableAgentMentions?: boolean;
  /** Enable automatic agent responses */
  enableAutoResponses?: boolean;
  /** Enable conversation context tracking */
  enableContextTracking?: boolean;
  /** Maximum conversation history to maintain */
  maxContextMessages?: number;
  /** Default timeout for agent responses in ms */
  defaultResponseTimeout?: number;
  /** Enable debug logging */
  debug?: boolean;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  agentId?: string;
  agentName?: string;
  threadId?: string;
  replyTo?: string;
  mentions?: string[];
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    size: number;
  }>;
  metadata?: Record<string, unknown>;
}

export interface AgentMention {
  agentId: string;
  agentName: string;
  role: string;
  task?: string;
}

export interface ConversationContext {
  threadId: string;
  messages: ChatMessage[];
  participants: string[];
  activeAgents: string[];
  lastActivity: number;
  metadata: Record<string, unknown>;
}

export interface ChatResponse {
  message: ChatMessage;
  action?: 'spawn_agent' | 'collaboration_request' | 'broadcast';
  result?: AgentResult;
}

// =============================================================================
// Chat Bridge Class
// =============================================================================

export class ChatBridge {
  private static instance: ChatBridge | null = null;

  // Core components
  private eventBus: EventBus;
  private collaborationProtocol: CollaborationProtocol;
  private teamManager: TeamManager;
  private orchestrator: CoworkOrchestrator;
  private workspace: CollaborativeWorkspace;

  // Options and state
  private options: Required<ChatBridgeOptions>;
  private dispatch: FoundryDispatch | null = null;
  private unsubscribers: Array<() => void> = [];

  // Context tracking
  private contexts: Map<string, ConversationContext> = new Map();
  private messageHistory: Map<string, ChatMessage[]> = new Map();
  private pendingResponses: Map<string, (response: ChatResponse) => void> = new Map();

  // Agent registry for mention resolution
  private agentRegistry: Map<string, { agentId: string; name: string; role: string }> = new Map();

  private constructor(options: ChatBridgeOptions = {}) {
    this.options = {
      enableAgentMentions: options.enableAgentMentions ?? true,
      enableAutoResponses: options.enableAutoResponses ?? true,
      enableContextTracking: options.enableContextTracking ?? true,
      maxContextMessages: options.maxContextMessages ?? 50,
      defaultResponseTimeout: options.defaultResponseTimeout ?? 30000,
      debug: options.debug ?? false,
    };

    this.eventBus = EventBus.getInstance();
    this.collaborationProtocol = CollaborationProtocol.getInstance();
    this.teamManager = TeamManager.getInstance();
    this.orchestrator = CoworkOrchestrator.getInstance();
    this.workspace = CollaborativeWorkspace.getInstance();

    this.setupEventListeners();
    this.initializeAgentRegistry();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(options?: ChatBridgeOptions): ChatBridge {
    if (!ChatBridge.instance) {
      ChatBridge.instance = new ChatBridge(options);
    }
    return ChatBridge.instance;
  }

  /**
   * Reset the singleton instance (for testing)
   */
  public static resetInstance(): void {
    if (ChatBridge.instance) {
      ChatBridge.instance.destroy();
      ChatBridge.instance = null;
    }
  }

  // ===========================================================================
  // Initialization & Cleanup
  // ===========================================================================

  /**
   * Initialize the chat bridge with a dispatch function
   */
  public initialize(dispatch: FoundryDispatch): void {
    this.dispatch = dispatch;
    this.log('info', 'ChatBridge initialized');
    // Mirror to store on initialization to avoid duplicate EventBus->store pipelines
    // ChatBridge will be the primary route for chat messages into the store.
  }

  /**
   * Destroy and cleanup
   */
  public destroy(): void {
    this.log('info', 'Destroying ChatBridge');

    // Unsubscribe from events
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers = [];

    // Clear contexts and history
    this.contexts.clear();
    this.messageHistory.clear();
    this.pendingResponses.clear();

    this.dispatch = null;
  }

  // ===========================================================================
  // Message Processing
  // ===========================================================================

  /**
   * Process an incoming chat message
   * Handles @mentions, collaboration requests, and dispatches to store
   */
  public async processMessage(
    message: Omit<ChatMessage, 'id' | 'timestamp'>,
    options?: {
      workspaceId?: string;
      autoSpawnAgents?: boolean;
      expectResponse?: boolean;
    }
  ): Promise<ChatMessage> {
    const fullMessage: ChatMessage = {
      ...message,
      id: this.generateId(),
      timestamp: Date.now(),
    };

    this.log('debug', `Processing message: ${fullMessage.id}`);

    // Parse mentions
    const mentions = this.parseMentions(fullMessage.content);
    if (mentions.length > 0) {
      fullMessage.mentions = mentions.map(m => m.agentId);
    }

    // Update conversation context
    if (this.options.enableContextTracking && fullMessage.threadId) {
      this.updateContext(fullMessage);
    }

    // Store in history
    this.addToHistory(fullMessage.threadId || 'default', fullMessage);

    // Handle @mentions - spawn agents
    if (this.options.enableAgentMentions && mentions.length > 0 && options?.autoSpawnAgents !== false) {
      for (const mention of mentions) {
        await this.handleAgentMention(mention, fullMessage, options?.workspaceId);
      }
    }

    // Dispatch to store
    this.dispatchToStore(fullMessage);

    return fullMessage;
  }

  /**
   * Send a user message to the chat
   */
  public async sendUserMessage(
    content: string,
    options?: {
      threadId?: string;
      workspaceId?: string;
      autoSpawnAgents?: boolean;
    }
  ): Promise<ChatMessage> {
    return this.processMessage(
      {
        role: 'user',
        content,
        threadId: options?.threadId,
      },
      options
    );
  }

  /**
   * Send an agent message to the chat
   */
  public async sendAgentMessage(
    agentId: string,
    content: string,
    options?: {
      threadId?: string;
      agentName?: string;
      replyTo?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<ChatMessage> {
    const agentInfo = this.agentRegistry.get(agentId);
    const message = await this.processMessage({
      role: 'agent',
      content,
      agentId,
      agentName: options?.agentName || agentInfo?.name || agentId,
      threadId: options?.threadId,
      replyTo: options?.replyTo,
      metadata: options?.metadata,
    });

    return message;
  }

  /**
   * Send a system message
   */
  public sendSystemMessage(
    content: string,
    options?: {
      threadId?: string;
      metadata?: Record<string, unknown>;
    }
  ): ChatMessage {
    const message: ChatMessage = {
      id: this.generateId(),
      role: 'system',
      content,
      timestamp: Date.now(),
      threadId: options?.threadId,
      metadata: options?.metadata,
    };

    this.dispatchToStore(message);
    return message;
  }

  // ===========================================================================
  // Agent Spawning & Collaboration
  // ===========================================================================

  /**
   * Spawn an agent via @mention
   */
  public async spawnAgentViaMention(
    agentId: string,
    task: string,
    context?: {
      threadId?: string;
      workspaceId?: string;
      conversationHistory?: ChatMessage[];
    }
  ): Promise<AgentResult> {
    this.log('info', `Spawning agent via mention: ${agentId}`);

    // Build context from conversation history if available
    const spawnContext: Record<string, unknown> = {
      taskSource: 'chat_mention',
      threadId: context?.threadId,
    };

    if (context?.conversationHistory) {
      spawnContext.conversationContext = context.conversationHistory.map(m => ({
        role: m.role,
        content: m.content,
        agentId: m.agentId,
        timestamp: m.timestamp,
      }));
    }

    // Send typing indicator
    if (context?.threadId) {
      this.eventBus.publish('agent:typing:start', {
        agentId,
        threadId: context.threadId,
      });
    }

    try {
      // Spawn the agent
      const result = await this.orchestrator.spawnAgent(
        agentId,
        task,
        spawnContext,
        undefined,
        context?.workspaceId
      );

      // Send agent response to chat
      if (result.output && context?.threadId) {
        const responseContent = this.formatAgentResponse(result);
        await this.sendAgentMessage(agentId, responseContent, {
          threadId: context.threadId,
          metadata: {
            spawnResult: result.metadata,
            taskCompleted: result.metadata.success,
          },
        });
      }

      // Stop typing indicator
      if (context?.threadId) {
        this.eventBus.publish('agent:typing:stop', { agentId });
      }

      return result;
    } catch (error) {
      // Stop typing indicator on error
      if (context?.threadId) {
        this.eventBus.publish('agent:typing:stop', { agentId });
      }

      // Send error message
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.sendSystemMessage(
        `Agent ${agentId} encountered an error: ${errorMessage}`,
        { threadId: context?.threadId }
      );

      throw error;
    }
  }

  /**
   * Request collaboration between agents
   */
  public async requestCollaboration(
    fromAgentId: string,
    toAgentId: string,
    task: string,
    options?: {
      priority?: 'low' | 'normal' | 'high' | 'critical';
      timeout?: number;
      threadId?: string;
    }
  ): Promise<boolean> {
    this.log('info', `Requesting collaboration: ${fromAgentId} -> ${toAgentId}`);

    try {
      const response = await this.collaborationProtocol.requestHelp(
        fromAgentId,
        toAgentId,
        task,
        { threadId: options?.threadId },
        options?.priority || 'normal',
        options?.timeout || this.options.defaultResponseTimeout
      );

      // Send system message about the collaboration
      const statusMessage = response.accepted
        ? `✓ ${toAgentId} accepted collaboration request from ${fromAgentId}`
        : `✗ ${toAgentId} declined collaboration request from ${fromAgentId}`;

      this.sendSystemMessage(statusMessage, { threadId: options?.threadId });

      return response.accepted;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.sendSystemMessage(
        `Collaboration request failed: ${errorMessage}`,
        { threadId: options?.threadId }
      );
      return false;
    }
  }

  // ===========================================================================
  // Context Management
  // ===========================================================================

  /**
   * Get conversation context for a thread
   */
  public getContext(threadId: string): ConversationContext | undefined {
    return this.contexts.get(threadId);
  }

  /**
   * Get message history for a thread
   */
  public getHistory(threadId: string, limit?: number): ChatMessage[] {
    const history = this.messageHistory.get(threadId) || [];
    if (limit) {
      return history.slice(-limit);
    }
    return [...history];
  }

  /**
   * Clear context and history for a thread
   */
  public clearContext(threadId: string): void {
    this.contexts.delete(threadId);
    this.messageHistory.delete(threadId);
    this.log('debug', `Cleared context for thread: ${threadId}`);
  }

  /**
   * Export conversation context for persistence
   */
  public exportContext(threadId: string): string {
    const context = this.contexts.get(threadId);
    const history = this.messageHistory.get(threadId) || [];

    return JSON.stringify(
      {
        threadId,
        context,
        messages: history,
        exportedAt: Date.now(),
      },
      null,
      2
    );
  }

  // ===========================================================================
  // Artifact Sharing
  // ===========================================================================

  /**
   * Share an artifact in chat
   */
  public async shareArtifactInChat(
    workspaceId: string,
    artifactKey: string,
    options?: {
      threadId?: string;
      message?: string;
      shareContent?: boolean;
    }
  ): Promise<void> {
    const artifact = this.workspace.getArtifact(workspaceId, artifactKey);
    if (!artifact) {
      this.sendSystemMessage(`Artifact not found: ${artifactKey}`, {
        threadId: options?.threadId,
      });
      return;
    }

    const history = this.getHistory(options?.threadId || 'default');
    const contextMessage = options?.message || `Sharing artifact: ${artifactKey}`;

    // Send system message about the shared artifact
    this.sendSystemMessage(contextMessage, {
      threadId: options?.threadId,
      metadata: {
        artifactKey,
        workspaceId,
        sharedAt: Date.now(),
      },
    });

    // If sharing content, include it in the message
    if (options?.shareContent && typeof artifact === 'string') {
      const contentPreview = artifact.length > 500
        ? artifact.substring(0, 500) + '...'
        : artifact;

      this.sendSystemMessage(`\`\`\`\n${contentPreview}\n\`\`\``, {
        threadId: options?.threadId,
      });
    }
  }

  /**
   * Link a message to an artifact
   */
  public linkMessageToArtifact(
    messageId: string,
    workspaceId: string,
    artifactKey: string
  ): void {
    // Update the message metadata
    this.eventBus.publish('chat:message:link_artifact', {
      messageId,
      workspaceId,
      artifactKey,
      timestamp: Date.now(),
    });

    this.log('debug', `Linked message ${messageId} to artifact ${artifactKey}`);
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private setupEventListeners(): void {
    // Listen for agent messages emitted by Cowork orchestrator
    const unsubAgent = this.eventBus.subscribe('chat:message:agent', (payload) => {
      const data = payload as Record<string, unknown> | null;
      if (!data) return;

      const agentId = String(data.agentId || data.agent || 'unknown');
      const content = String(data.content || data.message || '');
      const threadId = data.threadId as string | undefined;

      void this.sendAgentMessage(agentId, content, { threadId, metadata: data.metadata as Record<string, unknown> | undefined });
    });
    this.unsubscribers.push(unsubAgent);

    // Listen for collaboration responses
    const unsubCollab = this.eventBus.subscribe('collaboration:response', (payload) => {
      const data = payload as Record<string, unknown> | null;
      if (!data) return;
      const requestId = String(data.requestId || '');
      const callback = this.pendingResponses.get(requestId);
      if (callback) {
        callback({ message: { id: requestId, role: 'system', content: String(data.message || ''), timestamp: Date.now() } });
        this.pendingResponses.delete(requestId);
      }
    });
    this.unsubscribers.push(unsubCollab);

    // Subscribe to agent stream events and forward to telemetry/threads
    const unsubStream = this.eventBus.subscribe('agent:stream', (payload, envelope) => {
      const data = payload as Record<string, unknown> | null;
      if (!data) return;

      const agentId = String(data.agentId || data.agent || 'unknown');
      const type = String(data.type || data.streamType || 'output');
      const content = data.content || data.message || data.output || '';

      // Add as system message to telemetry thread and optionally to agent thread
      const telemetryMessage: ChatMessage = {
        id: this.generateId(),
        role: 'system',
        content: `[${agentId}][${type}] ${typeof content === 'string' ? content : JSON.stringify(content)}`,
        timestamp: Date.now(),
        agentId,
        metadata: { stream: true, type, envelope: envelope?.event },
      };

      // dispatch as system message to store
      this.dispatchToStore(telemetryMessage);

      // Mirror condensed entry into agent thread
      const agentThreadId = `agent:${agentId}`;
      const collapsedMsg: ChatMessage = { ...telemetryMessage, threadId: agentThreadId };
      this.dispatchToStore(collapsedMsg);
    });
    this.unsubscribers.push(unsubStream);
  }

  private initializeAgentRegistry(): void {
    // Register known agents
    const defaultAgents = [
      { agentId: 'cto', name: 'CTO Orchestrator', role: 'cto' },
      { agentId: 'pm', name: 'Product Manager', role: 'pm' },
      { agentId: 'architect', name: 'System Architect', role: 'architect' },
      { agentId: 'implementer', name: 'Implementer', role: 'implementer' },
      { agentId: 'qa', name: 'QA Engineer', role: 'qa' },
      { agentId: 'security', name: 'Security Lead', role: 'security' },
      { agentId: 'docs', name: 'Documentation Writer', role: 'docs' },
      { agentId: 'performance', name: 'Performance Engineer', role: 'performance' },
      { agentId: 'reviewer', name: 'Code Reviewer', role: 'reviewer' },
    ];

    for (const agent of defaultAgents) {
      this.agentRegistry.set(agent.agentId, agent);
      // Also register by name for easier mention resolution
      this.agentRegistry.set(agent.name.toLowerCase().replace(/\s+/g, ''), agent);
    }
  }

  private parseMentions(content: string): AgentMention[] {
    const mentions: AgentMention[] = [];
    const mentionRegex = /@([a-zA-Z0-9_-]+)/g;

    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      const mentionText = match[1].toLowerCase();
      const agentInfo = this.agentRegistry.get(mentionText);

      if (agentInfo) {
        // Extract task from message (everything after the mention)
        const afterMention = content.substring(match.index + match[0].length).trim();
        const task = afterMention || 'Please assist with this request';

        mentions.push({
          agentId: agentInfo.agentId,
          agentName: agentInfo.name,
          role: agentInfo.role,
          task,
        });
      }
    }

    return mentions;
  }

  private async handleAgentMention(
    mention: AgentMention,
    originalMessage: ChatMessage,
    workspaceId?: string
  ): Promise<void> {
    this.log('info', `Handling mention for: ${mention.agentId}`);

    // Get conversation context
    const history = originalMessage.threadId
      ? this.getHistory(originalMessage.threadId, 10)
      : [];

    // Spawn the agent
    try {
      const spawnContext: { workspaceId?: string; conversationHistory: ChatMessage[]; threadId?: string } = {
        conversationHistory: history,
      };
      if (workspaceId) spawnContext.workspaceId = workspaceId;
      if (originalMessage.threadId) spawnContext.threadId = originalMessage.threadId;
      await this.spawnAgentViaMention(mention.agentId, mention.task || '', spawnContext);
    } catch (error) {
      this.log('error', `Failed to spawn agent ${mention.agentId}: ${error}`);
    }
  }

  private updateContext(message: ChatMessage): void {
    if (!message.threadId) return;

    let context = this.contexts.get(message.threadId);
    if (!context) {
      context = {
        threadId: message.threadId,
        messages: [],
        participants: [],
        activeAgents: [],
        lastActivity: Date.now(),
        metadata: {},
      };
      this.contexts.set(message.threadId, context);
    }

    // Add message to context
    context.messages.push(message);
    if (context.messages.length > this.options.maxContextMessages) {
      context.messages = context.messages.slice(-this.options.maxContextMessages);
    }

    // Track participants
    const participant = message.agentId || message.role;
    if (!context.participants.includes(participant)) {
      context.participants.push(participant);
    }

    // Track active agents
    if (message.role === 'agent' && message.agentId && !context.activeAgents.includes(message.agentId)) {
      context.activeAgents.push(message.agentId);
    }

    context.lastActivity = Date.now();
  }

  private addToHistory(threadId: string, message: ChatMessage): void {
    let history = this.messageHistory.get(threadId);
    if (!history) {
      history = [];
      this.messageHistory.set(threadId, history);
    }

    history.push(message);
    if (history.length > this.options.maxContextMessages) {
      history.shift();
    }
  }

  private dispatchToStore(message: ChatMessage): void {
    if (!this.dispatch) return;

    const storeMessage: Message = {
      id: message.id,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
      agentId: message.agentId,
      agentName: message.agentName,
      threadId: message.threadId,
      replyTo: message.replyTo,
      mentions: message.mentions,
      attachments: message.attachments,
      metadata: message.metadata,
    };

    this.dispatch({
      type: 'CHAT_RECEIVE_MESSAGE',
      message: storeMessage,
    });
  }

  private formatAgentResponse(result: AgentResult): string {
    if (!result.output) {
      return 'Task completed successfully.';
    }

    if (typeof result.output === 'string') {
      return result.output;
    }

    if (typeof result.output === 'object') {
      // Try to extract a meaningful message
      const output = result.output as Record<string, unknown>;
      return (
        String(output.message || output.summary || output.result || '') ||
        JSON.stringify(result.output, null, 2)
      );
    }

    return String(result.output);
  }

  private generateId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    if (!this.options.debug && level === 'debug') return;

    const prefix = '[ChatBridge]';
    switch (level) {
      case 'debug':
        logger.debug(`${prefix} ${message}`);
        break;
      case 'info':
        logger.info(`${prefix} ${message}`);
        break;
      case 'warn':
        logger.warn(`${prefix} ${message}`);
        break;
      case 'error':
        logger.error(`${prefix} ${message}`);
        break;
    }
  }
}

export default ChatBridge;
