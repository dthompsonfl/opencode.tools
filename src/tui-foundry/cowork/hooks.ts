/**
 * Cowork React Hooks
 * 
 * Provides React hooks for accessing Cowork functionality from TUI components.
 * These hooks integrate with the TUI store and CoworkAdapter for seamless
 * real-time updates and agent collaboration.
 */

import * as React from 'react';
import { CoworkAdapter, CoworkConnectionStatus, AgentActivity } from './adapter';
import type { CollaborationRequest, CollaborationResponse } from '../../cowork/team/collaboration-protocol';
import type { TeamMember, DevelopmentTeam, TeamHealth } from '../../cowork/team/team-types';
import type { ProjectWorkspace } from '../../cowork/collaboration/collaborative-workspace';
import type { ArtifactVersion } from '../../cowork/collaboration/artifact-versioning';
import type { AgentResult } from '../../cowork/orchestrator/result-merger';
import { useStore, useSelector } from '../store/store';
import type { Agent, TeamMember as TUITeamMember, Artifact } from '../types';

// =============================================================================
// Types
// =============================================================================

export interface UseCoworkConnectionResult {
  /** Current connection status */
  status: CoworkConnectionStatus;
  /** Whether the connection is established */
  isConnected: boolean;
  /** Whether currently reconnecting */
  isReconnecting: boolean;
  /** Last error message if any */
  lastError?: string;
  /** Number of reconnection attempts */
  reconnectAttempts: number;
  /** Manually trigger reconnection */
  reconnect: () => Promise<void>;
  /** Disconnect from Cowork */
  disconnect: () => void;
}

export interface UseTeamResult {
  /** List of all active teams */
  teams: DevelopmentTeam[];
  /** Current team for the active project */
  currentTeam?: DevelopmentTeam;
  /** All team members across teams */
  allMembers: TeamMember[];
  /** Team members for current project */
  currentTeamMembers: TeamMember[];
  /** Loading state */
  isLoading: boolean;
  /** Refresh team data */
  refresh: () => void;
  /** Get a specific team by ID */
  getTeam: (teamId: string) => DevelopmentTeam | undefined;
  /** Get a specific member by ID */
  getMember: (agentId: string) => TeamMember | undefined;
  /** Get team health */
  getTeamHealth: (teamId: string) => TeamHealth | null;
}

export interface UseCollaborationResult {
  /** Pending collaboration requests */
  pendingRequests: CollaborationRequestUI[];
  /** All collaboration requests */
  allRequests: CollaborationRequest[];
  /** Request help from an agent */
  requestHelp: (
    fromAgentId: string,
    toAgentId: string,
    task: string,
    options?: { priority?: 'low' | 'normal' | 'high' | 'critical'; timeout?: number }
  ) => Promise<CollaborationResponse>;
  /** Respond to a collaboration request */
  respondToRequest: (requestId: string, accepted: boolean, message?: string) => boolean;
  /** Share a finding */
  shareFinding: (
    finding: { type: string; title: string; description: string; severity?: 'info' | 'warning' | 'critical' },
    options?: { scope?: 'team' | 'specific' | 'broadcast'; targetAgentIds?: string[] }
  ) => void;
  /** Broadcast a message */
  broadcast: (message: string, metadata?: Record<string, unknown>) => void;
  /** Refresh pending requests */
  refreshRequests: () => void;
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

export interface UseArtifactsResult {
  /** All artifacts from TUI store */
  artifacts: Artifact[];
  /** Workspaces for current project */
  workspaces: ProjectWorkspace[];
  /** Active workspace */
  activeWorkspace?: ProjectWorkspace;
  /** Get artifact content */
  getArtifact: <T>(workspaceId: string, artifactKey: string) => T | undefined;
  /** Get artifact version history */
  getArtifactHistory: (workspaceId: string, artifactKey: string) => ArtifactVersion[];
  /** Update/create an artifact */
  updateArtifact: <T>(
    workspaceId: string,
    artifactKey: string,
    data: T,
    options?: { source?: string; author?: string }
  ) => Promise<ArtifactVersion<T> | null>;
  /** Create a new workspace */
  createWorkspace: (
    projectId: string,
    name: string,
    options?: { description?: string; initialMembers?: string[] }
  ) => ProjectWorkspace;
  /** Get workspace by ID */
  getWorkspace: (workspaceId: string) => ProjectWorkspace | undefined;
  /** Refresh workspace data */
  refresh: () => void;
}

export interface UseAgentActivityResult {
  /** All agents with activity info */
  agents: (Agent & { activity?: AgentActivity })[];
  /** Currently active agents (busy) */
  activeAgents: (Agent & { activity?: AgentActivity })[];
  /** Idle agents */
  idleAgents: (Agent & { activity?: AgentActivity })[];
  /** Agents with errors */
  errorAgents: (Agent & { activity?: AgentActivity })[];
  /** Get activity for a specific agent */
  getActivity: (agentId: string) => AgentActivity | undefined;
  /** Refresh activity data */
  refresh: () => void;
}

// =============================================================================
// Hook: useCoworkConnection
// =============================================================================

/**
 * Hook for monitoring and managing the Cowork connection
 * 
 * @example
 * ```tsx
 * function ConnectionStatus() {
 *   const { status, isConnected, reconnect } = useCoworkConnection();
 *   
 *   if (!isConnected) {
 *     return <Text color="red">Disconnected <Button onPress={reconnect}>Reconnect</Button></Text>;
 *   }
 *   
 *   return <Text color="green">Connected</Text>;
 * }
 * ```
 */
export function useCoworkConnection(): UseCoworkConnectionResult {
  const adapter = React.useMemo(() => CoworkAdapter.getInstance(), []);
  const [state, setState] = React.useState(() => adapter.getState());

  React.useEffect(() => {
    // Poll for state changes
    const interval = setInterval(() => {
      const newState = adapter.getState();
      setState(prev => {
        // Only update if changed
        if (prev.connectionStatus !== newState.connectionStatus ||
            prev.reconnectAttempts !== newState.reconnectAttempts ||
            prev.lastError !== newState.lastError) {
          return newState;
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [adapter]);

  const reconnect = React.useCallback(async () => {
    await adapter.reconnect();
  }, [adapter]);

  const disconnect = React.useCallback(() => {
    adapter.disconnect();
  }, [adapter]);

  return {
    status: state.connectionStatus,
    isConnected: state.connectionStatus === 'connected',
    isReconnecting: state.connectionStatus === 'reconnecting',
    lastError: state.lastError,
    reconnectAttempts: state.reconnectAttempts,
    reconnect,
    disconnect,
  };
}

// =============================================================================
// Hook: useCoworkOrchestrator
// =============================================================================

/**
 * Hook for accessing the CoworkOrchestrator
 * 
 * @example
 * ```tsx
 * function TaskRunner() {
 *   const { spawnAgent, spawnAgents, isReady } = useCoworkOrchestrator();
 *   
 *   const handleRun = async () => {
 *     const result = await spawnAgent('implementer', 'Fix bug #123');
 *     console.log(result);
 *   };
 *   
 *   return <Button onPress={handleRun} disabled={!isReady}>Run Task</Button>;
 * }
 * ```
 */
export function useCoworkOrchestrator() {
  const adapter = React.useMemo(() => CoworkAdapter.getInstance(), []);
  const { state } = useStore();
  const [isExecuting, setIsExecuting] = React.useState(false);

  const isReady = state.connection === 'connected';

  const spawnAgent = React.useCallback(
    async (
      agentId: string,
      task: string,
      context?: Record<string, unknown>,
      workspaceId?: string
    ): Promise<AgentResult> => {
      setIsExecuting(true);
      try {
        return await adapter.spawnAgent(agentId, task, context, workspaceId);
      } finally {
        setIsExecuting(false);
      }
    },
    [adapter]
  );

  const spawnAgents = React.useCallback(
    async (
      tasks: Array<{ agentId: string; task: string; context?: Record<string, unknown> }>
    ): Promise<AgentResult[]> => {
      setIsExecuting(true);
      try {
        return await adapter.spawnAgents(tasks);
      } finally {
        setIsExecuting(false);
      }
    },
    [adapter]
  );

  const executeCommand = React.useCallback(
    async (commandId: string, args?: string[]): Promise<AgentResult[]> => {
      setIsExecuting(true);
      try {
        return await adapter.executeCommand(commandId, args);
      } finally {
        setIsExecuting(false);
      }
    },
    [adapter]
  );

  return {
    isReady,
    isExecuting,
    spawnAgent,
    spawnAgents,
    executeCommand,
  };
}

// =============================================================================
// Hook: useTeam
// =============================================================================

/**
 * Hook for accessing team and member information
 * 
 * @example
 * ```tsx
 * function TeamRoster() {
 *   const { currentTeam, currentTeamMembers, getTeamHealth } = useTeam();
 *   const health = currentTeam ? getTeamHealth(currentTeam.id) : null;
 *   
 *   return (
 *     <Box>
 *       <Text>Team: {currentTeam?.name}</Text>
 *       <Text>Status: {health?.status}</Text>
 *       {currentTeamMembers.map(member => (
 *         <TeamMemberCard key={member.agentId} member={member} />
 *       ))}
 *     </Box>
 *   );
 * }
 * ```
 */
export function useTeam(): UseTeamResult {
  const adapter = React.useMemo(() => CoworkAdapter.getInstance(), []);
  const { state } = useStore();
  const [isLoading, setIsLoading] = React.useState(false);
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  // Get teams from adapter
  const teams = React.useMemo(() => {
    return adapter.listActiveTeams();
  }, [adapter, isLoading]);

  // Get current team based on active project
  const currentTeam = React.useMemo(() => {
    if (!state.activeProjectId) return undefined;
    return adapter.getTeamForProject(state.activeProjectId);
  }, [adapter, state.activeProjectId, isLoading]);

  // Get all members across all teams
  const allMembers = React.useMemo(() => {
    const members: TeamMember[] = [];
    for (const team of teams) {
      const teamMembers = Array.from(team.members.values());
      for (const member of teamMembers) {
        members.push(member);
      }
    }
    return members;
  }, [teams]);

  // Get members for current team
  const currentTeamMembers = React.useMemo(() => {
    if (!currentTeam) return [];
    return Array.from(currentTeam.members.values());
  }, [currentTeam]);

  const refresh = React.useCallback(() => {
    setIsLoading(true);
    // Force re-render to refresh data
    forceUpdate();
    setIsLoading(false);
  }, []);

  const getTeam = React.useCallback(
    (teamId: string) => adapter.getTeam(teamId),
    [adapter]
  );

  const getMember = React.useCallback(
    (agentId: string) => {
      for (const team of teams) {
        const member = team.members.get(agentId);
        if (member) return member;
      }
      return undefined;
    },
    [teams]
  );

  const getTeamHealth = React.useCallback(
    (teamId: string) => adapter.getTeamHealth(teamId),
    [adapter]
  );

  return {
    teams,
    currentTeam,
    allMembers,
    currentTeamMembers,
    isLoading,
    refresh,
    getTeam,
    getMember,
    getTeamHealth,
  };
}

// =============================================================================
// Hook: useCollaboration
// =============================================================================

/**
 * Hook for managing collaboration requests and communications
 * 
 * @example
 * ```tsx
 * function CollaborationPanel() {
 *   const { pendingRequests, requestHelp, respondToRequest } = useCollaboration();
 *   
 *   return (
 *     <Box>
 *       <Text>Pending Requests: {pendingRequests.length}</Text>
 *       {pendingRequests.map(req => (
 *         <RequestCard
 *           key={req.id}
 *           request={req}
 *           onAccept={() => respondToRequest(req.id, true)}
 *           onReject={() => respondToRequest(req.id, false)}
 *         />
 *       ))}
 *     </Box>
 *   );
 * }
 * ```
 */
export function useCollaboration(agentId?: string): UseCollaborationResult {
  const adapter = React.useMemo(() => CoworkAdapter.getInstance(), []);
  const { state } = useStore();
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  // Get pending requests
  const pendingRequests = React.useMemo((): CollaborationRequestUI[] => {
    const requests = agentId
      ? adapter.getPendingCollaborations(agentId)
      : adapter.getAllCollaborations().filter(r => r.status === 'pending');

    return requests.map(req => ({
      id: req.id,
      fromAgentId: req.fromAgentId,
      toAgentId: req.toAgentId,
      fromAgentName: req.fromAgentId,
      toAgentName: req.toAgentId,
      type: req.type,
      priority: req.priority,
      payload: req.payload,
      timestamp: req.timestamp,
      status: req.status,
      message: req.response?.message,
    }));
  }, [adapter, agentId, state.feed]); // Re-compute when feed changes

  const allRequests = React.useMemo(() => {
    return adapter.getAllCollaborations();
  }, [adapter, state.feed]);

  const requestHelp = React.useCallback(
    async (
      fromAgentId: string,
      toAgentId: string,
      task: string,
      options?: { priority?: 'low' | 'normal' | 'high' | 'critical'; timeout?: number }
    ): Promise<CollaborationResponse> => {
      return adapter.requestCollaboration(
        fromAgentId,
        toAgentId,
        task,
        options?.priority,
        options?.timeout
      );
    },
    [adapter]
  );

  const respondToRequest = React.useCallback(
    (requestId: string, accepted: boolean, message?: string): boolean => {
      const result = adapter.respondToCollaboration(requestId, accepted, message);
      if (result) {
        forceUpdate(); // Trigger re-render
      }
      return result;
    },
    [adapter]
  );

  const shareFinding = React.useCallback(
    (
      finding: { type: string; title: string; description: string; severity?: 'info' | 'warning' | 'critical' },
      options?: { scope?: 'team' | 'specific' | 'broadcast'; targetAgentIds?: string[] }
    ) => {
      const fromAgentId = agentId || 'user';
      adapter.shareFinding(fromAgentId, finding, options?.scope, options?.targetAgentIds);
    },
    [adapter, agentId]
  );

  const broadcast = React.useCallback(
    (message: string, metadata?: Record<string, unknown>) => {
      const fromAgentId = agentId || 'user';
      adapter.broadcastMessage(fromAgentId, message, metadata);
    },
    [adapter, agentId]
  );

  const refreshRequests = React.useCallback(() => {
    forceUpdate();
  }, []);

  return {
    pendingRequests,
    allRequests,
    requestHelp,
    respondToRequest,
    shareFinding,
    broadcast,
    refreshRequests,
  };
}

// =============================================================================
// Hook: useArtifacts
// =============================================================================

/**
 * Hook for accessing and managing workspace artifacts
 * 
 * @example
 * ```tsx
 * function ArtifactViewer() {
 *   const { artifacts, activeWorkspace, getArtifact } = useArtifacts();
 *   
 *   const readme = activeWorkspace 
 *     ? getArtifact<string>(activeWorkspace.id, 'readme.md')
 *     : null;
 *   
 *   return (
 *     <Box>
 *       <Text>Artifacts: {artifacts.length}</Text>
 *       {readme && <Text>{readme}</Text>}
 *     </Box>
 *   );
 * }
 * ```
 */
export function useArtifacts(): UseArtifactsResult {
  const adapter = React.useMemo(() => CoworkAdapter.getInstance(), []);
  const { state } = useStore();
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  // Get artifacts from TUI store
  const artifacts = state.artifacts;

  // Get workspaces for active project
  const workspaces = React.useMemo(() => {
    if (!state.activeProjectId) return [];
    return adapter.getWorkspacesForProject(state.activeProjectId);
  }, [adapter, state.activeProjectId]);

  // Get active workspace
  const activeWorkspace = React.useMemo(() => {
    if (!state.activeProjectId) return undefined;
    return adapter.getActiveWorkspace(state.activeProjectId);
  }, [adapter, state.activeProjectId]);

  const getArtifact = React.useCallback(
    <T>(workspaceId: string, artifactKey: string): T | undefined => {
      return adapter.getArtifact<T>(workspaceId, artifactKey);
    },
    [adapter]
  );

  const getArtifactHistory = React.useCallback(
    () => {
      // Stub implementation - artifact history not available through public API
      return [] as ArtifactVersion<unknown>[];
    },
    [adapter]
  );

  const updateArtifact = React.useCallback(
    async <T>(
      workspaceId: string,
      artifactKey: string,
      data: T,
      options?: { source?: string; author?: string }
    ): Promise<ArtifactVersion<T> | null> => {
      const result = await adapter.updateArtifact(
        workspaceId,
        artifactKey,
        data,
        options?.source || 'tui',
        options?.author || 'user'
      );
      forceUpdate();
      return result as ArtifactVersion<T> | null;
    },
    [adapter]
  );

  const createWorkspace = React.useCallback(
    (
      projectId: string,
      name: string,
      options?: { description?: string; initialMembers?: string[] }
    ): ProjectWorkspace => {
      // Stub implementation - workspace creation not available through public API
      const ws: ProjectWorkspace = {
        id: `ws-${Date.now()}`,
        projectId,
        name,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'tui-user',
        artifacts: new Map(),
        members: options?.initialMembers || [],
      };
      forceUpdate();
      return ws;
    },
    [adapter]
  );

  const getWorkspace = React.useCallback(
    (workspaceId: string) => adapter.getWorkspace(workspaceId),
    [adapter]
  );

  const refresh = React.useCallback(() => {
    forceUpdate();
  }, []);

  return {
    artifacts,
    workspaces,
    activeWorkspace,
    getArtifact,
    getArtifactHistory,
    updateArtifact,
    createWorkspace,
    getWorkspace,
    refresh,
  };
}

// =============================================================================
// Hook: useAgentActivity
// =============================================================================

/**
 * Hook for monitoring real-time agent activity
 * 
 * @example
 * ```tsx
 * function AgentMonitor() {
 *   const { agents, activeAgents, getActivity } = useAgentActivity();
 *   
 *   return (
 *     <Box>
 *       <Text>Active: {activeAgents.length}</Text>
 *       {agents.map(agent => {
 *         const activity = getActivity(agent.id);
 *         return (
 *           <AgentRow 
 *             key={agent.id} 
 *             agent={agent} 
 *             progress={activity?.progress}
 *             status={activity?.status}
 *           />
 *         );
 *       })}
 *     </Box>
 *   );
 * }
 * ```
 */
export function useAgentActivity(): UseAgentActivityResult {
  const adapter = React.useMemo(() => CoworkAdapter.getInstance(), []);
  const { state } = useStore();
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  // Combine TUI agents with activity data
  const agents = React.useMemo(() => {
    return state.agents.map(agent => {
      const activity = adapter.getAgentActivity(agent.id);
      return { ...agent, activity };
    });
  }, [state.agents, adapter]);

  const activeAgents = React.useMemo(() => {
    return agents.filter(a => a.status === 'busy' || a.activity?.status === 'busy');
  }, [agents]);

  const idleAgents = React.useMemo(() => {
    return agents.filter(a => a.status === 'idle' || a.activity?.status === 'idle');
  }, [agents]);

  const errorAgents = React.useMemo(() => {
    return agents.filter(a => a.status === 'failed' || a.activity?.status === 'error');
  }, [agents]);

  const getActivity = React.useCallback(
    (agentId: string) => adapter.getAgentActivity(agentId),
    [adapter]
  );

  const refresh = React.useCallback(() => {
    forceUpdate();
  }, []);

  // Auto-refresh every 2 seconds
  React.useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return {
    agents,
    activeAgents,
    idleAgents,
    errorAgents,
    getActivity,
    refresh,
  };
}

// =============================================================================
// Hook: useCoworkIntegration
// =============================================================================

/**
 * Combined hook that provides all Cowork integration features
 * 
 * @example
 * ```tsx
 * function CoworkPanel() {
 *   const cowork = useCoworkIntegration();
 *   
 *   return (
 *     <Box>
 *       <ConnectionStatus connection={cowork.connection} />
 *       <TeamRoster team={cowork.team} />
 *       <CollaborationQueue requests={cowork.collaboration.pendingRequests} />
 *     </Box>
 *   );
 * }
 * ```
 */
export function useCoworkIntegration() {
  const connection = useCoworkConnection();
  const orchestrator = useCoworkOrchestrator();
  const team = useTeam();
  const collaboration = useCollaboration();
  const artifacts = useArtifacts();
  const agentActivity = useAgentActivity();

  return {
    connection,
    orchestrator,
    team,
    collaboration,
    artifacts,
    agentActivity,
  };
}

export default useCoworkIntegration;
