/**
 * Cowork Collaboration Integration for TUI-Foundry
 * 
 * This module provides comprehensive integration between the TUI and
 * the Cowork multi-agent collaboration system. It enables real-time
 * agent chat, collaboration requests, artifact sharing, and team management.
 */

// Adapter and core integration
export {
  CoworkAdapter,
  type CoworkAdapterOptions,
  type CoworkAdapterState,
  type CoworkConnectionStatus,
} from './adapter';

// React hooks
export {
  useCoworkOrchestrator,
  useTeam,
  useCollaboration,
  useArtifacts,
  useAgentActivity,
  useCoworkConnection,
  type UseTeamResult,
  type UseCollaborationResult,
  type UseArtifactsResult,
  type UseAgentActivityResult,
  type UseCoworkConnectionResult,
} from './hooks';

// Chat bridge
export {
  ChatBridge,
  type ChatBridgeOptions,
  type ChatMessage,
  type AgentMention,
  type ConversationContext,
} from './chat-bridge';

// Re-export Cowork types for convenience
export type {
  CollaborationRequest,
  CollaborationResponse,
  CollaborationType,
  CollaborationPriority,
  CollaborationStatus,
} from '../../cowork/team/collaboration-protocol';

export type {
  TeamMember,
  DevelopmentTeam,
  TeamHealth,
  RoleMapping,
} from '../../cowork/team/team-types';

export type {
  ProjectWorkspace,
  WorkspaceStatus,
  CompliancePackage,
} from '../../cowork/collaboration/collaborative-workspace';

// ArtifactVersion is not exported from collaborative-workspace
export type ArtifactVersion<T = unknown> = {
  version: number;
  data: T;
  timestamp: number;
  author: string;
};

// Integration helpers
export {
  createCoworkIntegration,
  getCoworkIntegration,
  resetCoworkIntegration,
  setupCoworkIntegration,
  type CoworkIntegration,
  type CoworkIntegrationOptions,
  type CoworkIntegrationHealth,
} from './integration';
