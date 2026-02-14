/**
 * Collaboration System - Inter-Agent Communication
 * 
 * Exports all collaboration components for multi-agent coordination.
 */

export {
  CollaborationBus,
  CollaborationMessage,
  MessageType,
  MessagePriority,
  HelpRequest,
  ConsensusRequest,
  MessageFilter,
  MessageStats
} from './message-bus';

export {
  AgentSession,
  AgentRole,
  AgentParticipation,
  SessionContext,
  ConsensusResult,
  AgentSessionOptions
} from './agent-session';
