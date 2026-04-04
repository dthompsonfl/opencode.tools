/**
 * Team Events
 * 
 * Event definitions and payload types for team management system.
 */

import { TeamEvent, TeamEventPayloads, TeamMember, DevelopmentTeam, TeamHealth } from './team-types';

export { TeamEvent, TeamEventPayloads };

/**
 * Create a team:forming event payload
 */
export function createTeamFormingEvent(
  teamId: string,
  projectId: string,
  requiredRoles: string[]
): TeamEventPayloads['team:forming'] {
  return {
    teamId,
    projectId,
    requiredRoles,
    timestamp: Date.now()
  };
}

/**
 * Create a team:formed event payload
 */
export function createTeamFormedEvent(
  teamId: string,
  projectId: string,
  memberCount: number,
  leadRoleId: string
): TeamEventPayloads['team:formed'] {
  return {
    teamId,
    projectId,
    memberCount,
    leadRoleId,
    timestamp: Date.now()
  };
}

/**
 * Create a team:member:joined event payload
 */
export function createMemberJoinedEvent(
  teamId: string,
  agentId: string,
  roleId: string
): TeamEventPayloads['team:member:joined'] {
  return {
    teamId,
    agentId,
    roleId,
    timestamp: Date.now()
  };
}

/**
 * Create a team:member:left event payload
 */
export function createMemberLeftEvent(
  teamId: string,
  agentId: string,
  roleId: string,
  reason?: string
): TeamEventPayloads['team:member:left'] {
  return {
    teamId,
    agentId,
    roleId,
    reason,
    timestamp: Date.now()
  };
}

/**
 * Create a team:member:status_changed event payload
 */
export function createMemberStatusChangedEvent(
  teamId: string,
  agentId: string,
  oldStatus: TeamMember['status'],
  newStatus: TeamMember['status']
): TeamEventPayloads['team:member:status_changed'] {
  return {
    teamId,
    agentId,
    oldStatus,
    newStatus,
    timestamp: Date.now()
  };
}

/**
 * Create a team:status_changed event payload
 */
export function createTeamStatusChangedEvent(
  teamId: string,
  oldStatus: DevelopmentTeam['status'],
  newStatus: DevelopmentTeam['status']
): TeamEventPayloads['team:status_changed'] {
  return {
    teamId,
    oldStatus,
    newStatus,
    timestamp: Date.now()
  };
}

/**
 * Create a team:dissolved event payload
 */
export function createTeamDissolvedEvent(
  teamId: string,
  projectId: string,
  reason?: string
): TeamEventPayloads['team:dissolved'] {
  return {
    teamId,
    projectId,
    reason,
    timestamp: Date.now()
  };
}

/**
 * Create a team:health:check event payload
 */
export function createTeamHealthCheckEvent(
  teamId: string,
  health: TeamHealth
): TeamEventPayloads['team:health:check'] {
  return {
    teamId,
    health,
    timestamp: Date.now()
  };
}

/**
 * Create a team:health:degraded event payload
 */
export function createTeamHealthDegradedEvent(
  teamId: string,
  health: TeamHealth,
  issues: string[]
): TeamEventPayloads['team:health:degraded'] {
  return {
    teamId,
    health,
    issues,
    timestamp: Date.now()
  };
}

/**
 * Create a team:health:critical event payload
 */
export function createTeamHealthCriticalEvent(
  teamId: string,
  health: TeamHealth,
  issues: string[]
): TeamEventPayloads['team:health:critical'] {
  return {
    teamId,
    health,
    issues,
    timestamp: Date.now()
  };
}
