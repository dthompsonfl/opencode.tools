/**
 * Team Management Module
 * 
 * Provides team formation, member management, health monitoring,
 * and agent collaboration protocols.
 */

// Team types
export {
  DevelopmentTeam,
  TeamMember,
  TeamFormationRequest,
  RoleMapping,
  TeamHealth,
  TeamEvent,
  TeamEventPayloads
} from './team-types';

// Team events
export {
  createTeamFormingEvent,
  createTeamFormedEvent,
  createMemberJoinedEvent,
  createMemberLeftEvent,
  createMemberStatusChangedEvent,
  createTeamStatusChangedEvent,
  createTeamDissolvedEvent,
  createTeamHealthCheckEvent,
  createTeamHealthDegradedEvent,
  createTeamHealthCriticalEvent
} from './team-events';

// Team manager
export { TeamManager } from './team-manager';

// Collaboration protocol
export {
  CollaborationProtocol,
  CollaborationRequest,
  CollaborationResponse,
  CollaborationType,
  CollaborationPriority,
  CollaborationStatus,
  ReviewRequest,
  ReviewResponse,
  EscalationRequest,
  EscalationResponse,
  Finding
} from './collaboration-protocol';

// Collaboration request worker
export {
  CollaborationRequestWorker,
  createCollaborationRequestWorker,
  type CollaborationRequestWorkerOptions
} from './collaboration-request-worker';
