/**
 * Cowork Adapter
 * 
 * Bridges the TUI state management with the Cowork multi-agent system.
 * Manages connections to CoworkOrchestrator, CollaborationProtocol,
 * TeamManager, and EventBus. Translates Cowork events to TUI actions.
 */

import { EventBus, EventEnvelope } from '../../cowork/orchestrator/event-bus';
import { CoworkOrchestrator } from '../../cowork/orchestrator/cowork-orchestrator';
import { CollaborationProtocol, CollaborationRequest, CollaborationResponse } from '../../cowork/team/collaboration-protocol';
import { TeamManager } from '../../cowork/team/team-manager';
import { TeamMember, DevelopmentTeam, TeamHealth } from '../../cowork/team/team-types';
import { CollaborativeWorkspace, ProjectWorkspace, Conflict } from '../../cowork/collaboration/collaborative-workspace';
import { ArtifactVersion } from '../../cowork/collaboration/artifact-versioning';
import { Blackboard } from '../../cowork/orchestrator/blackboard';
import { AgentResult } from '../../cowork/orchestrator/result-merger';
import { logger } from '../../runtime/logger';
import type { WorkspaceSnapshotRecord } from '../../cowork/persistence';
import { createWarmedUpBridge } from '../../foundry/cowork-bridge';
import type { FoundryDispatch, FoundryAction } from '../store/actions';
import type { Agent, TeamMember as TUITeamMember, Artifact, CollaborationEntry } from '../types';

// =============================================================================
// Types
// =============================================================================

export type CoworkConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'reconnecting' | 'error';

export interface CoworkAdapterOptions {
  /** Enable automatic reconnection on disconnect */
  autoReconnect?: boolean;
  /** Reconnection delay in milliseconds */
  reconnectDelayMs?: number;
  /** Maximum reconnection attempts */
  maxReconnectAttempts?: number;
  /** Default workspace ID for operations */
  defaultWorkspaceId?: string;
  /** Enable debug logging */
  debug?: boolean;
}

export interface CoworkAdapterState {
  connectionStatus: CoworkConnectionStatus;
  isInitialized: boolean;
  lastError?: string;
  reconnectAttempts: number;
  activeSubscriptions: string[];
}

export interface AgentActivity {
  agentId: string;
  status: 'idle' | 'busy' | 'error' | 'offline';
  currentTask?: string;
  progress?: number;
  lastActivity: number;
}

export interface CollaborationRequestUI {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  fromAgentName: string;
  toAgentName: string;
  type: 'help' | 'review' | 'share' | 'escalate';
  priority: 'low' | 'normal' | 'high' | 'critical';
  payload: unknown;
  timestamp: number;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'expired';
  message?: string;
}

// =============================================================================
// Cowork Adapter Class
// =============================================================================

export class CoworkAdapter {
  private static instance: CoworkAdapter | null = null;

  // Core Cowork components
  private eventBus: EventBus;
  private orchestrator: CoworkOrchestrator;
  private collaborationProtocol: CollaborationProtocol;
  private teamManager: TeamManager;
  private workspace: CollaborativeWorkspace;
  private blackboard: Blackboard;

  // State
  private options: Required<CoworkAdapterOptions>;
  private state: CoworkAdapterState;
  private dispatch: FoundryDispatch | null = null;
  private unsubscribers: Array<() => void> = [];
  private reconnectTimer: NodeJS.Timeout | null = null;
  private connectionCheckInterval: NodeJS.Timeout | null = null;

  // Caches for performance
  private teamCache: Map<string, DevelopmentTeam> = new Map();
  private memberCache: Map<string, TeamMember> = new Map();
  private activityCache: Map<string, AgentActivity> = new Map();

  private constructor(options: CoworkAdapterOptions = {}) {
    // Initialize with defaults
    this.options = {
      autoReconnect: options.autoReconnect ?? true,
      reconnectDelayMs: options.reconnectDelayMs ?? 5000,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 10,
      defaultWorkspaceId: options.defaultWorkspaceId ?? 'global',
      debug: options.debug ?? false,
    };

    this.state = {
      connectionStatus: 'disconnected',
      isInitialized: false,
      reconnectAttempts: 0,
      activeSubscriptions: [],
    };

    // Initialize Cowork components
    this.eventBus = EventBus.getInstance();
    this.orchestrator = createWarmedUpBridge().getOrchestrator();
    this.collaborationProtocol = CollaborationProtocol.getInstance();
    this.teamManager = TeamManager.getInstance();
    this.workspace = CollaborativeWorkspace.getInstance();
    this.blackboard = Blackboard.getInstance();
  }

  /**
   * Get the singleton instance of CoworkAdapter
   */
  public static getInstance(options?: CoworkAdapterOptions): CoworkAdapter {
    if (!CoworkAdapter.instance) {
      CoworkAdapter.instance = new CoworkAdapter(options);
    }
    return CoworkAdapter.instance;
  }

  /**
   * Reset the singleton instance (for testing)
   */
  public static resetInstance(): void {
    if (CoworkAdapter.instance) {
      CoworkAdapter.instance.disconnect();
      CoworkAdapter.instance = null;
    }
  }

  // ===========================================================================
  // Initialization & Connection
  // ===========================================================================

  /**
   * Initialize the adapter and connect to Cowork systems
   */
  public async initialize(dispatch: FoundryDispatch): Promise<void> {
    if (this.state.isInitialized) {
      this.log('debug', 'Adapter already initialized');
      return;
    }

    this.dispatch = dispatch;
    this.updateState({ connectionStatus: 'connecting' });

    try {
      // Ensure persistence is bootstrapped
      await this.orchestrator.awaitPersistenceBootstrap();

      // Set up event subscriptions
      this.setupEventSubscriptions();

      // Start connection health monitoring
      this.startConnectionMonitoring();

      this.updateState({
        connectionStatus: 'connected',
        isInitialized: true,
        reconnectAttempts: 0,
      });

      this.log('info', 'CoworkAdapter initialized successfully');

      // Dispatch connection status
      this.dispatchAction({
        type: 'SET_CONNECTION_STATUS',
        connection: 'connected',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.updateState({
        connectionStatus: 'error',
        lastError: errorMessage,
      });
      this.dispatchAction({
        type: 'SET_CONNECTION_STATUS',
        connection: 'error',
      });
      this.log('error', `Failed to initialize: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Disconnect and cleanup
   */
  public disconnect(): void {
    this.log('info', 'Disconnecting CoworkAdapter');

    // Clear timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }

    // Unsubscribe from all events
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers = [];

    this.updateState({
      connectionStatus: 'disconnected',
      isInitialized: false,
      activeSubscriptions: [],
    });

    this.dispatch = null;
  }

  /**
   * Reconnect to Cowork systems
   */
  public async reconnect(): Promise<void> {
    if (!this.dispatch) {
      throw new Error('Cannot reconnect: dispatch not set');
    }

    this.updateState({ connectionStatus: 'reconnecting' });
    this.dispatchAction({
      type: 'SET_CONNECTION_STATUS',
      connection: 'connecting',
    });

    try {
      // Cleanup existing subscriptions
      this.unsubscribers.forEach(unsubscribe => unsubscribe());
      this.unsubscribers = [];

      // Re-initialize
      await this.initialize(this.dispatch);

      this.log('info', 'Reconnected successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.updateState({
        connectionStatus: 'error',
        lastError: errorMessage,
      });
      this.log('error', `Reconnection failed: ${errorMessage}`);
      this.scheduleReconnect();
    }
  }

  // ===========================================================================
  // Event Subscription Management
  // ===========================================================================

  private setupEventSubscriptions(): void {
    // Agent lifecycle events
    this.subscribe('agent:start', this.handleAgentStart.bind(this));
    this.subscribe('agent:queued', this.handleAgentQueued.bind(this));
    this.subscribe('agent:complete', this.handleAgentComplete.bind(this));
    this.subscribe('agent:error', this.handleAgentError.bind(this));
    this.subscribe('agent:progress', this.handleAgentProgress.bind(this));

    // Team events
    this.subscribe('team:forming', this.handleTeamForming.bind(this));
    this.subscribe('team:formed', this.handleTeamFormed.bind(this));
    this.subscribe('team:member:joined', this.handleMemberJoined.bind(this));
    this.subscribe('team:member:left', this.handleMemberLeft.bind(this));
    this.subscribe('team:member:status_changed', this.handleMemberStatusChanged.bind(this));
    this.subscribe('team:health:*', this.handleTeamHealth.bind(this));

    // Collaboration events
    this.subscribe('collaboration:help:requested', this.handleCollaborationRequest.bind(this));
    this.subscribe('collaboration:response', this.handleCollaborationResponse.bind(this));
    this.subscribe('collaboration:finding:shared', this.handleFindingShared.bind(this));
    this.subscribe('collaboration:broadcast', this.handleCollaborationBroadcast.bind(this));

    // Artifact events
    this.subscribe('artifact:version:created', this.handleArtifactCreated.bind(this));
    this.subscribe('artifact:version:updated', this.handleArtifactUpdated.bind(this));
    this.subscribe('workspace:artifact:updated', this.handleWorkspaceArtifactUpdated.bind(this));

    // Workspace events
    this.subscribe('workspace:created', this.handleWorkspaceCreated.bind(this));
    this.subscribe('workspace:status:changed', this.handleWorkspaceStatusChanged.bind(this));
    this.subscribe('workspace:conflict:detected', this.handleConflictDetected.bind(this));

    // Feed events (catch-all)
    this.subscribe('*', this.handleFeedEvent.bind(this));

    // Subscribe to low-level agent stream events emitted by Cowork
    // agent:stream carries partial streaming updates (thought/tool/result)
    this.subscribe('agent:stream', this.handleAgentStream.bind(this));
  }

  private handleAgentStream(payload: unknown, envelope?: EventEnvelope): void {
    const data = payload as Record<string, unknown> | null;
    if (!data) return;

    const agentId = String(data.agentId || data.agent || 'unknown');
    const streamType = String(data.type || data.streamType || 'output');
    const content = data.content || data.message || data.output || '';

    // Normalize into execution log entry
    const log = {
      id: String(data.id || `stream-${Date.now()}-${Math.random().toString(16).slice(2,8)}`),
      level: (String(data.level || 'info') as 'debug' | 'info' | 'warn' | 'error' | 'fatal'),
      message: typeof content === 'string' ? content : JSON.stringify(content),
      source: `agent:${agentId}`,
      timestamp: Date.now(),
      metadata: (data.metadata && typeof data.metadata === 'object' ? data.metadata as Record<string, unknown> : {}),
    };

    // Push into execution stream identified by agentId
    this.dispatchAction({ type: 'ADD_EXECUTION_LOG', streamId: `agent-${agentId}`, log });

    // Also add a feed entry for observability
    this.dispatchAction({
      type: 'ADD_FEED_ENTRY',
      entry: {
        id: `agent-stream-${log.id}`,
        type: 'agent:progress',
        event: 'agent:stream',
        actor: agentId,
        message: log.message,
        metadata: { streamType },
        timestamp: log.timestamp,
      },
    });
  }

  private subscribe(event: string, handler: (payload: unknown, envelope?: EventEnvelope) => void): void {
    const unsubscribe = this.eventBus.subscribe(event, handler);
    this.unsubscribers.push(unsubscribe);
    this.updateState({
      activeSubscriptions: [...this.state.activeSubscriptions, event],
    });
  }

  // ===========================================================================
  // Event Handlers
  // ===========================================================================

  private handleAgentStart(payload: unknown, envelope?: EventEnvelope): void {
    const data = payload as Record<string, unknown>;
    const agentId = String(data.agentId || '');
    const task = String(data.task || '');

    this.log('debug', `Agent started: ${agentId}`);

    // Update activity cache
    this.activityCache.set(agentId, {
      agentId,
      status: 'busy',
      currentTask: task,
      progress: 0,
      lastActivity: Date.now(),
    });

    // Dispatch to TUI store
    this.dispatchAction({
      type: 'UPSERT_AGENT',
      agent: {
        id: agentId,
        name: String(data.agentName || agentId),
        role: this.normalizeRole(String(data.role || 'implementer')),
        roleLabel: String(data.roleLabel || data.role || 'Contributor'),
        status: 'busy',
        progress: 0,
        task,
        capabilities: Array.isArray(data.capabilities) ? data.capabilities : [],
        startTime: Date.now(),
        dependencies: [],
        outputs: [],
        updatedAt: Date.now(),
      },
    });
  }

  private handleAgentQueued(payload: unknown): void {
    const data = payload as Record<string, unknown>;
    this.log('debug', `Agent queued: ${data.agentId}`);
  }

  private handleAgentComplete(payload: unknown): void {
    const data = payload as Record<string, unknown>;
    const agentId = String(data.agentId || '');

    this.log('debug', `Agent completed: ${agentId}`);

    // Update activity cache
    const activity = this.activityCache.get(agentId);
    if (activity) {
      activity.status = 'idle';
      activity.progress = 100;
      activity.lastActivity = Date.now();
    }

    this.dispatchAction({
      type: 'UPDATE_AGENT_STATUS',
      agentId,
      status: 'completed',
      progress: 100,
    });
  }

  private handleAgentError(payload: unknown): void {
    const data = payload as Record<string, unknown>;
    const agentId = String(data.agentId || '');
    const error = String(data.error || 'Unknown error');

    this.log('error', `Agent error: ${agentId} - ${error}`);

    // Update activity cache
    const activity = this.activityCache.get(agentId);
    if (activity) {
      activity.status = 'error';
      activity.lastActivity = Date.now();
    }

    this.dispatchAction({
      type: 'UPDATE_AGENT_STATUS',
      agentId,
      status: 'failed',
    });

    this.dispatchAction({
      type: 'APPEND_EXECUTION_ERROR',
      message: `${agentId}: ${error}`,
    });
  }

  private handleAgentProgress(payload: unknown): void {
    const data = payload as Record<string, unknown>;
    const agentId = String(data.agentId || '');
    const progress = typeof data.progress === 'number' ? data.progress : 0;

    // Update activity cache
    const activity = this.activityCache.get(agentId);
    if (activity) {
      activity.progress = progress;
      activity.lastActivity = Date.now();
    }

    this.dispatchAction({
      type: 'UPDATE_AGENT_STATUS',
      agentId,
      status: 'busy',
      progress,
    });
  }

  private handleTeamForming(payload: unknown): void {
    const data = payload as Record<string, unknown>;
    this.log('info', `Team forming for project: ${data.projectId}`);
  }

  private handleTeamFormed(payload: unknown): void {
    const data = payload as Record<string, unknown>;
    const teamId = String(data.teamId || '');
    const projectId = String(data.projectId || '');

    this.log('info', `Team formed: ${teamId} for project ${projectId}`);

    // Cache the team
    const team = this.teamManager.getTeam(teamId);
    if (team) {
      this.teamCache.set(teamId, team);
    }
  }

  private handleMemberJoined(payload: unknown): void {
    const data = payload as Record<string, unknown>;
    const agentId = String(data.agentId || '');
    const roleId = String(data.roleId || '');
    const teamId = String(data.teamId || '');

    this.log('debug', `Member joined: ${agentId} (${roleId}) to team ${teamId}`);

    const team = this.teamManager.getTeam(teamId);
    if (team) {
      const member = team.members.get(agentId);
      if (member) {
        this.memberCache.set(agentId, member);

        this.dispatchAction({
          type: 'UPSERT_TEAM_MEMBER',
          member: {
            id: agentId,
            name: member.name || agentId,
            role: this.normalizeRole(roleId),
            roleLabel: member.name || roleId,
            status: 'available',
            availability: 100,
            isActive: true,
            joinedAt: member.joinedAt,
            lastActivity: Date.now(),
          },
        });
      }
    }
  }

  private handleMemberLeft(payload: unknown): void {
    const data = payload as Record<string, unknown>;
    const agentId = String(data.agentId || '');

    this.log('debug', `Member left: ${agentId}`);
    this.memberCache.delete(agentId);
  }

  private handleMemberStatusChanged(payload: unknown): void {
    const data = payload as Record<string, unknown>;
    const agentId = String(data.agentId || '');
    const newStatus = String(data.newStatus || '');

    this.log('debug', `Member status changed: ${agentId} -> ${newStatus}`);

    // Update cache
    const activity = this.activityCache.get(agentId);
    if (activity) {
      activity.status = this.normalizeCoworkStatus(newStatus);
      activity.lastActivity = Date.now();
    }

    this.dispatchAction({
      type: 'UPDATE_MEMBER_STATUS',
      memberId: agentId,
      status: this.normalizeTeamStatus(newStatus),
    });
  }

  private handleTeamHealth(payload: unknown): void {
    const data = payload as Record<string, unknown>;
    const teamId = String(data.teamId || '');
    const health = data.health as TeamHealth | undefined;

    if (health) {
      this.log('debug', `Team health: ${teamId} - ${health.status}`);
    }
  }

  private handleCollaborationRequest(payload: unknown): void {
    const data = payload as Record<string, unknown>;
    const requestId = String(data.requestId || '');

    this.log('debug', `Collaboration request: ${requestId}`);

    // Add to feed
    const entry: CollaborationEntry = {
      id: `collab-${requestId}`,
      type: 'system:notification',
      event: 'collaboration:help:requested',
      actor: String(data.fromAgentId || 'unknown'),
      message: `Help requested from ${data.toAgentId}: ${data.task || ''}`,
      metadata: data,
      timestamp: Date.now(),
    };

    this.dispatchAction({
      type: 'ADD_FEED_ENTRY',
      entry,
    });
  }

  private handleCollaborationResponse(payload: unknown): void {
    const data = payload as Record<string, unknown>;
    const accepted = Boolean(data.accepted);

    this.log('debug', `Collaboration response: ${data.requestId} - ${accepted ? 'accepted' : 'rejected'}`);
  }

  private handleFindingShared(payload: unknown): void {
    const data = payload as Record<string, unknown>;
    const finding = data.finding as Record<string, unknown> | undefined;

    if (finding) {
      this.log('info', `Finding shared: ${finding.title}`);
    }
  }

  private handleCollaborationBroadcast(payload: unknown): void {
    const data = payload as Record<string, unknown>;
    const message = String(data.message || '');
    const fromAgentId = String(data.fromAgentId || 'unknown');

    this.log('debug', `Broadcast from ${fromAgentId}: ${message}`);
  }

  private handleArtifactCreated(payload: unknown, envelope?: EventEnvelope): void {
    this.handleArtifactUpdate(payload, envelope, 'created');
  }

  private handleArtifactUpdated(payload: unknown, envelope?: EventEnvelope): void {
    this.handleArtifactUpdate(payload, envelope, 'updated');
  }

  private handleWorkspaceArtifactUpdated(payload: unknown, envelope?: EventEnvelope): void {
    this.handleArtifactUpdate(payload, envelope, 'workspace_updated');
  }

  private handleArtifactUpdate(
    payload: unknown,
    envelope: EventEnvelope | undefined,
    action: 'created' | 'updated' | 'workspace_updated'
  ): void {
    const data = payload as Record<string, unknown>;
    const artifactId = String(data.artifactId || data.id || '');
    const artifactKey = String(data.artifactKey || data.key || '');

    this.log('debug', `Artifact ${action}: ${artifactId || artifactKey}`);

    const artifact: Artifact = {
      id: artifactId || artifactKey,
      name: String(data.name || artifactKey || 'Unnamed Artifact'),
      type: this.normalizeArtifactType(String(data.type || '')),
      path: String(data.path || artifactKey || ''),
      content: typeof data.content === 'string' ? data.content : undefined,
      version: typeof data.version === 'number' ? data.version : 1,
      createdAt: envelope?.occurredAt ? Date.parse(envelope.occurredAt) : Date.now(),
      updatedAt: envelope?.occurredAt ? Date.parse(envelope.occurredAt) : Date.now(),
      createdBy: String(data.author || data.createdBy || 'system'),
      source: String(data.source || 'system'),
      tags: Array.isArray(data.tags) ? data.tags : [],
      size: typeof data.size === 'number' ? data.size : undefined,
    };

    this.dispatchAction({
      type: 'UPSERT_ARTIFACT',
      artifact,
    });
  }

  private handleWorkspaceCreated(payload: unknown): void {
    const data = payload as Record<string, unknown>;
    this.log('info', `Workspace created: ${data.id}`);
  }

  private handleWorkspaceStatusChanged(payload: unknown): void {
    const data = payload as Record<string, unknown>;
    this.log('debug', `Workspace status: ${data.workspaceId} -> ${data.newStatus}`);
  }

  private handleConflictDetected(payload: unknown): void {
    const data = payload as Record<string, unknown>;
    this.log('warn', `Conflict detected in workspace: ${data.workspaceId}`);
  }

  private handleFeedEvent(payload: unknown, envelope?: EventEnvelope): void {
    if (!envelope) return;

    // Skip events that are already handled specifically
    const specificEvents = [
      'agent:start', 'agent:queued', 'agent:complete', 'agent:error', 'agent:progress',
      'team:forming', 'team:formed', 'team:member:joined', 'team:member:left',
      'team:member:status_changed', 'artifact:version:created', 'artifact:version:updated',
      'workspace:artifact:updated', 'collaboration:help:requested', 'collaboration:response',
    ];

    if (specificEvents.includes(envelope.event)) return;

    // Add to feed
    const entry: CollaborationEntry = {
      id: envelope.eventId,
      type: 'system:notification',
      event: envelope.event,
      actor: this.extractActor(payload, envelope),
      message: this.extractMessage(payload, envelope),
      metadata: envelope.metadata,
      timestamp: Date.parse(envelope.occurredAt) || Date.now(),
    };

    this.dispatchAction({
      type: 'ADD_FEED_ENTRY',
      entry,
    });
  }

  // ===========================================================================
  // Connection Monitoring
  // ===========================================================================

  private startConnectionMonitoring(): void {
    this.connectionCheckInterval = setInterval(() => {
      this.checkConnectionHealth();
    }, 30000); // Check every 30 seconds
  }

  private checkConnectionHealth(): void {
    try {
      // Try to publish a health check event
      this.eventBus.publish('adapter:health:check', { timestamp: Date.now() });

      if (this.state.connectionStatus === 'error') {
        this.log('info', 'Connection recovered');
        this.updateState({ connectionStatus: 'connected' });
        this.dispatchAction({
          type: 'SET_CONNECTION_STATUS',
          connection: 'connected',
        });
      }
    } catch (error) {
      this.log('warn', 'Connection health check failed');
      this.updateState({ connectionStatus: 'error' });

      if (this.options.autoReconnect) {
        this.scheduleReconnect();
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.state.reconnectAttempts >= this.options.maxReconnectAttempts) {
      return;
    }

    this.updateState({
      connectionStatus: 'reconnecting',
      reconnectAttempts: this.state.reconnectAttempts + 1,
    });

    this.log('info', `Scheduling reconnect attempt ${this.state.reconnectAttempts + 1}/${this.options.maxReconnectAttempts}`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.reconnect();
    }, this.options.reconnectDelayMs);
  }

  // ===========================================================================
  // Public API Methods
  // ===========================================================================

  /**
   * Get the current adapter state
   */
  public getState(): CoworkAdapterState {
    return { ...this.state };
  }

  /**
   * Get connection status
   */
  public getConnectionStatus(): CoworkConnectionStatus {
    return this.state.connectionStatus;
  }

  /**
   * Execute a command through the orchestrator
   */
  public async executeCommand(commandId: string, args?: string[]): Promise<AgentResult[]> {
    this.log('debug', `Executing command: ${commandId}`);

    const result = await this.orchestrator.execute(commandId, args);

    if (result.output && Array.isArray(result.output)) {
      return result.output as AgentResult[];
    }

    return [{
      agentId: 'command',
      agentName: commandId,
      output: result.output,
      metadata: {
        runId: `cmd-${Date.now()}`,
        timestamp: new Date().toISOString(),
        success: true,
      },
    }];
  }

  /**
   * Spawn a single agent
   */
  public async spawnAgent(
    agentId: string,
    task: string,
    context?: Record<string, unknown>,
    workspaceId?: string
  ): Promise<AgentResult> {
    this.log('debug', `Spawning agent: ${agentId}`);
    return this.orchestrator.spawnAgent(agentId, task, context, undefined, workspaceId || this.options.defaultWorkspaceId);
  }

  /**
   * Spawn multiple agents concurrently
   */
  public async spawnAgents(
    tasks: Array<{ agentId: string; task: string; context?: Record<string, unknown> }>
  ): Promise<AgentResult[]> {
    this.log('debug', `Spawning ${tasks.length} agents`);
    const result = await this.orchestrator.spawnAgents(tasks);

    if (result.output && Array.isArray(result.output)) {
      return result.output as AgentResult[];
    }

    return [];
  }

  /**
   * Request help from one agent to another
   */
  public async requestCollaboration(
    fromAgentId: string,
    toAgentId: string,
    task: string,
    priority?: 'low' | 'normal' | 'high' | 'critical',
    timeout?: number
  ): Promise<CollaborationResponse> {
    this.log('debug', `Requesting collaboration: ${fromAgentId} -> ${toAgentId}`);
    return this.collaborationProtocol.requestHelp(
      fromAgentId,
      toAgentId,
      task,
      undefined,
      priority || 'normal',
      timeout
    );
  }

  /**
   * Respond to a collaboration request
   */
  public respondToCollaboration(requestId: string, accepted: boolean, message?: string): boolean {
    this.log('debug', `Responding to collaboration: ${requestId} - ${accepted}`);
    return this.collaborationProtocol.respondToRequest(requestId, accepted, undefined, message);
  }

  /**
   * Get pending collaboration requests
   */
  public getPendingCollaborations(agentId: string): CollaborationRequest[] {
    return this.collaborationProtocol.getPendingRequests(agentId);
  }

  /**
   * Get all active collaboration requests
   */
  public getAllCollaborations(): CollaborationRequest[] {
    return this.collaborationProtocol.getAllRequests();
  }

  /**
   * Share a finding with the team
   */
  public shareFinding(
    fromAgentId: string,
    finding: { type: string; title: string; description: string; severity?: 'info' | 'warning' | 'critical' },
    scope: 'team' | 'specific' | 'broadcast' = 'team',
    targetAgentIds?: string[]
  ): void {
    this.collaborationProtocol.shareFinding(fromAgentId, finding, scope, targetAgentIds);
  }

  /**
   * Broadcast a message to the team
   */
  public broadcastMessage(fromAgentId: string, message: string, metadata?: Record<string, unknown>): void {
    this.collaborationProtocol.broadcast(fromAgentId, message, metadata);
  }

  /**
   * Get team information
   */
  public getTeam(teamId: string): DevelopmentTeam | undefined {
    return this.teamManager.getTeam(teamId);
  }

  /**
   * Get team for a project
   */
  public getTeamForProject(projectId: string): DevelopmentTeam | undefined {
    return this.teamManager.getTeamForProject(projectId);
  }

  /**
   * Get team member
   */
  public getTeamMember(teamId: string, agentId: string): TeamMember | undefined {
    return this.teamManager.getMember(teamId, agentId);
  }

  /**
   * List all active teams
   */
  public listActiveTeams(): DevelopmentTeam[] {
    return this.teamManager.listActiveTeams();
  }

  /**
   * Get team health
   */
  public getTeamHealth(teamId: string): TeamHealth | null {
    return this.teamManager.getTeamHealth(teamId);
  }


  /**
   * Create workspace for a project
   */
  public createWorkspace(projectId: string, name: string, createdBy: string, members: string[] = []): ProjectWorkspace {
    return this.workspace.createWorkspace(projectId, name, createdBy, {
      initialMembers: members.length > 0 ? members : [createdBy],
    });
  }

  /**
   * Get workspace
   */
  public getWorkspace(workspaceId: string): ProjectWorkspace | undefined {
    return this.workspace.getWorkspace(workspaceId);
  }

  /**
   * Get workspaces for a project
   */
  public getWorkspacesForProject(projectId: string): ProjectWorkspace[] {
    return this.workspace.getWorkspacesForProject(projectId);
  }

  /**
   * Get active workspace for a project
   */
  public getActiveWorkspace(projectId: string): ProjectWorkspace | undefined {
    return this.workspace.getActiveWorkspace(projectId);
  }

  /**
   * Get artifact from workspace
   */
  public getArtifact<T>(workspaceId: string, artifactKey: string): T | undefined {
    return this.workspace.getArtifact<T>(workspaceId, artifactKey);
  }

  /**
   * Update artifact in workspace
   */
  public async updateArtifact<T>(
    workspaceId: string,
    artifactKey: string,
    data: T,
    source: string,
    author: string
  ): Promise<ArtifactVersion<T> | null> {
    return this.workspace.updateArtifact(workspaceId, artifactKey, data, source, author);
  }


  /**
   * List all workspaces
   */
  public listWorkspaces(): ProjectWorkspace[] {
    return this.workspace.getAllWorkspaces();
  }

  /**
   * Set active workspace for adapter operations
   */
  public setActiveWorkspace(workspaceId: string): void {
    this.options.defaultWorkspaceId = workspaceId;
  }

  /**
   * Create a workspace checkpoint
   */
  public async createCheckpoint(
    workspaceId: string,
    createdBy: string,
    metadata: Record<string, unknown> = {},
  ): Promise<WorkspaceSnapshotRecord | null> {
    return this.workspace.createCheckpoint(workspaceId, createdBy, 'checkpoint', metadata);
  }

  /**
   * List workspace checkpoints
   */
  public async listCheckpoints(workspaceId: string): Promise<WorkspaceSnapshotRecord[]> {
    return this.workspace.listCheckpoints(workspaceId);
  }

  /**
   * Get workspace conflicts
   */
  public getWorkspaceConflicts(workspaceId: string): Conflict[] {
    return this.workspace.getConflictsForWorkspace(workspaceId);
  }

  /**
   * Resolve workspace conflict
   */
  public resolveConflict(
    conflictId: string,
    resolution: {
      strategy: 'last-write-wins' | 'merge' | 'reject' | 'manual';
      resolvedBy: string;
      reason?: string;
      mergedData?: unknown;
      winningVersion?: number;
    },
  ): boolean {
    return this.workspace.resolveConflict(
      conflictId,
      resolution.strategy,
      resolution.resolvedBy,
      {
        reason: resolution.reason,
        mergedData: resolution.mergedData,
        winningVersion: resolution.winningVersion,
      },
    ) !== null;
  }

  /**
   * Get agent activity
   */
  public getAgentActivity(agentId: string): AgentActivity | undefined {
    return this.activityCache.get(agentId);
  }

  /**
   * Get all cached agent activities
   */
  public getAllAgentActivities(): AgentActivity[] {
    return Array.from(this.activityCache.values());
  }

  /**
   * Get blackboard artifact
   */
  public getBlackboardArtifact<T>(key: string, workspaceId?: string): T | undefined {
    return this.blackboard.getArtifact<T>(key, workspaceId);
  }

  /**
   * Update blackboard artifact
   */
  public updateBlackboardArtifact<T>(
    key: string,
    data: T,
    source: string,
    options?: { workspaceId?: string; metadata?: Record<string, unknown> }
  ): void {
    this.blackboard.updateArtifact(key, data, source, 'tui_update', options);
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private dispatchAction(action: FoundryAction): void {
    if (this.dispatch) {
      this.dispatch(action);
    }
  }

  private updateState(updates: Partial<CoworkAdapterState>): void {
    this.state = { ...this.state, ...updates };
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    if (!this.options.debug && level === 'debug') return;

    const prefix = '[CoworkAdapter]';
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

  private normalizeRole(role: string): Agent['role'] {
    const normalized = role.toLowerCase();
    if (normalized.includes('cto')) return 'cto';
    if (normalized.includes('pm') || normalized.includes('product')) return 'pm';
    if (normalized.includes('architect')) return 'architect';
    if (normalized.includes('implementer') || normalized.includes('dev') || normalized.includes('engineer')) return 'implementer';
    if (normalized.includes('qa')) return 'qa';
    if (normalized.includes('security')) return 'security';
    if (normalized.includes('docs') || normalized.includes('doc')) return 'docs';
    if (normalized.includes('performance')) return 'performance';
    if (normalized.includes('review')) return 'reviewer';
    return 'implementer';
  }

  private normalizeTeamStatus(status: string): TUITeamMember['status'] {
    const normalized = status.toLowerCase();
    if (normalized === 'busy') return 'busy';
    if (normalized === 'error') return 'blocked';
    if (normalized === 'offline') return 'offline';
    return 'available';
  }

  private normalizeCoworkStatus(status: string): AgentActivity['status'] {
    const normalized = status.toLowerCase();
    if (normalized === 'idle') return 'idle';
    if (normalized === 'busy') return 'busy';
    if (normalized === 'error') return 'error';
    if (normalized === 'offline') return 'offline';
    return 'idle';
  }

  private normalizeArtifactType(type: string): Artifact['type'] {
    const normalized = type.toLowerCase();
    if (normalized.includes('code')) return 'code';
    if (normalized.includes('config')) return 'config';
    if (normalized.includes('diagram')) return 'diagram';
    if (normalized.includes('report')) return 'report';
    if (normalized.includes('test')) return 'test';
    return 'document';
  }

  private extractActor(payload: unknown, envelope: EventEnvelope): string {
    const data = payload as Record<string, unknown> | null;
    return String(data?.agentId || data?.actor || data?.source || envelope.metadata?.source || 'system');
  }

  private extractMessage(payload: unknown, envelope: EventEnvelope): string {
    const data = payload as Record<string, unknown> | null;
    return String(
      data?.message || data?.task || data?.summary || data?.content || envelope.event
    );
  }
}

export default CoworkAdapter;
