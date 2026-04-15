/**
 * Cowork Integration Helper
 *
 * Provides a unified interface for initializing and managing the complete
 * Cowork-TUI integration. This is the main entry point for setting up
 * the collaboration system.
 */

import { CoworkAdapter, CoworkAdapterOptions } from './adapter';
import type { CoworkConnectionStatus } from './adapter';
import { ChatBridge, ChatBridgeOptions } from './chat-bridge';
import { EventBus } from '../../cowork/orchestrator/event-bus';
import { CollaborationProtocol } from '../../cowork/team/collaboration-protocol';
import { TeamManager } from '../../cowork/team/team-manager';
import { CollaborativeWorkspace } from '../../cowork/collaboration/collaborative-workspace';
import type { FoundryDispatch } from '../store/actions';

// =============================================================================
// Types
// =============================================================================

export interface CoworkIntegrationOptions {
  /** Adapter options */
  adapter?: CoworkAdapterOptions;
  /** Chat bridge options */
  chatBridge?: ChatBridgeOptions;
  /** Enable automatic team formation */
  autoFormTeams?: boolean;
  /** Default project ID for operations */
  defaultProjectId?: string;
  /** Enable debug mode */
  debug?: boolean;
}

export interface CoworkIntegration {
  /** The CoworkAdapter instance */
  adapter: CoworkAdapter;
  /** The ChatBridge instance */
  chatBridge: ChatBridge;
  /** EventBus instance */
  eventBus: EventBus;
  /** CollaborationProtocol instance */
  collaboration: CollaborationProtocol;
  /** TeamManager instance */
  teamManager: TeamManager;
  /** CollaborativeWorkspace instance */
  workspace: CollaborativeWorkspace;
  /** Whether the integration is initialized */
  isInitialized: boolean;
  /** Initialize the integration */
  initialize: (dispatch: FoundryDispatch) => Promise<void>;
  /** Shutdown and cleanup */
  shutdown: () => void;
  /** Get health status */
  healthCheck: () => CoworkIntegrationHealth;
}

export interface CoworkIntegrationHealth {
  healthy: boolean;
  adapter: CoworkConnectionStatus;
  eventBus: boolean;
  collaboration: boolean;
  teamManager: boolean;
  workspace: boolean;
  errors: string[];
}

// =============================================================================
// Integration Factory
// =============================================================================

/**
 * Create a complete Cowork integration
 *
 * @example
 * ```typescript
 * // Initialize in your app entry point
 * const cowork = createCoworkIntegration({
 *   adapter: { autoReconnect: true },
 *   chatBridge: { enableAgentMentions: true },
 * });
 *
 * // In your store provider
 * await cowork.initialize(dispatch);
 *
 * // Use throughout your app
 * const result = await cowork.adapter.spawnAgent('implementer', 'Fix bug');
 * ```
 */
export function createCoworkIntegration(
  options: CoworkIntegrationOptions = {}
): CoworkIntegration {
  // Get or create singleton instances
  const adapter = CoworkAdapter.getInstance({
    debug: options.debug,
    ...options.adapter,
  });

  const chatBridge = ChatBridge.getInstance({
    debug: options.debug,
    ...options.chatBridge,
  });

  const eventBus = EventBus.getInstance();
  const collaboration = CollaborationProtocol.getInstance();
  const teamManager = TeamManager.getInstance();
  const workspace = CollaborativeWorkspace.getInstance();

  let isInitialized = false;

  const integration: CoworkIntegration = {
    adapter,
    chatBridge,
    eventBus,
    collaboration,
    teamManager,
    workspace,
    isInitialized: false,

    async initialize(dispatch: FoundryDispatch): Promise<void> {
      if (isInitialized) {
        return;
      }

      // Initialize adapter
      await adapter.initialize(dispatch);

      // Initialize chat bridge
      chatBridge.initialize(dispatch);

      // Optionally auto-form teams
      if (options.autoFormTeams && options.defaultProjectId) {
        const existingTeam = teamManager.getTeamForProject(options.defaultProjectId);
        if (!existingTeam) {
          eventBus.publish('integration:team_formation_requested', {
            projectId: options.defaultProjectId,
            timestamp: Date.now(),
          });
        }
      }

      isInitialized = true;
      integration.isInitialized = true;

      eventBus.publish('cowork:integration:initialized', {
        timestamp: Date.now(),
        projectId: options.defaultProjectId,
      });
    },

    shutdown(): void {
      adapter.disconnect();
      chatBridge.destroy();
      isInitialized = false;
      integration.isInitialized = false;

      eventBus.publish('cowork:integration:shutdown', {
        timestamp: Date.now(),
      });
    },

    healthCheck(): CoworkIntegrationHealth {
      const errors: string[] = [];

      // Check adapter
      const adapterStatus = adapter.getConnectionStatus();
      if (adapterStatus === 'error') {
        errors.push('Adapter connection error');
      }

      // Check EventBus
      let eventBusHealthy = false;
      try {
        eventBus.publish('health:check', { timestamp: Date.now() });
        eventBusHealthy = true;
      } catch {
        errors.push('EventBus not responding');
      }

      // Check collaboration protocol
      let collaborationHealthy = false;
      try {
        const requests = collaboration.getAllRequests();
        collaborationHealthy = Array.isArray(requests);
      } catch {
        errors.push('CollaborationProtocol not responding');
      }

      // Check team manager
      let teamManagerHealthy = false;
      try {
        const teams = teamManager.listActiveTeams();
        teamManagerHealthy = Array.isArray(teams);
      } catch {
        errors.push('TeamManager not responding');
      }

      // Check workspace
      let workspaceHealthy = false;
      try {
        const workspaces = workspace.getAllWorkspaces();
        workspaceHealthy = Array.isArray(workspaces);
      } catch {
        errors.push('CollaborativeWorkspace not responding');
      }

      const healthy =
        adapterStatus === 'connected' &&
        eventBusHealthy &&
        collaborationHealthy &&
        teamManagerHealthy &&
        workspaceHealthy;

      return {
        healthy,
        adapter: adapterStatus,
        eventBus: eventBusHealthy,
        collaboration: collaborationHealthy,
        teamManager: teamManagerHealthy,
        workspace: workspaceHealthy,
        errors,
      };
    },
  };

  return integration;
}

// =============================================================================
// Singleton Integration Instance
// =============================================================================

let globalIntegration: CoworkIntegration | null = null;

/**
 * Get or create the global Cowork integration instance
 */
export function getCoworkIntegration(options?: CoworkIntegrationOptions): CoworkIntegration {
  if (!globalIntegration) {
    globalIntegration = createCoworkIntegration(options);
  }
  return globalIntegration;
}

/**
 * Reset the global integration (for testing)
 */
export function resetCoworkIntegration(): void {
  if (globalIntegration) {
    globalIntegration.shutdown();
    globalIntegration = null;
  }

  // Reset singletons
  CoworkAdapter.resetInstance();
  ChatBridge.resetInstance();
}

// =============================================================================
// Convenience Exports
// =============================================================================

/**
 * Quick setup helper for React applications
 *
 * @example
 * ```tsx
 * // In your app initialization
 * import { setupCoworkIntegration } from './cowork/integration';
 *
 * function App() {
 *   const { state, dispatch } = useStore();
 *
 *   useEffect(() => {
 *     setupCoworkIntegration(dispatch);
 *   }, [dispatch]);
 *
 *   return <YourApp />;
 * }
 * ```
 */
export async function setupCoworkIntegration(
  dispatch: FoundryDispatch,
  options?: CoworkIntegrationOptions
): Promise<CoworkIntegration> {
  const integration = getCoworkIntegration(options);
  await integration.initialize(dispatch);
  return integration;
}

export default createCoworkIntegration;
