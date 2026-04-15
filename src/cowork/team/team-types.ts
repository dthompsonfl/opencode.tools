/**
 * Team Management Types
 * 
 * Type definitions for team management system including team members,
 * team formation, role mappings, and health monitoring.
 */

// Team member status and info
export interface TeamMember {
  agentId: string;
  roleId: string;
  name: string;
  status: 'idle' | 'busy' | 'error' | 'offline';
  currentTask?: string;
  capabilities: string[];
  joinedAt: number;
  lastHeartbeat: number;
  metadata: Record<string, unknown>;
}

// Team definition
export interface DevelopmentTeam {
  id: string;
  projectId: string;
  name: string;
  members: Map<string, TeamMember>;
  formedAt: number;
  status: 'forming' | 'active' | 'pausing' | 'dissolved';
  leadRoleId: string;
  workspaceId: string;
  metadata: Record<string, unknown>;
}

// Team formation request
export interface TeamFormationRequest {
  projectId: string;
  projectName: string;
  requiredRoles: string[];
  leadRoleId: string;
  optionalRoles?: string[];
  metadata?: Record<string, unknown>;
}

// Role mapping from Foundry roles to Cowork agents
export interface RoleMapping {
  roleId: string;
  roleName: string;
  agentId: string;
  capabilities: string[];
  vetoGates: string[];
  approvalGates: string[];
}

// Health check result
export interface TeamHealth {
  teamId: string;
  status: 'healthy' | 'degraded' | 'critical';
  memberCount: number;
  activeMembers: number;
  busyMembers: number;
  errorMembers: number;
  issues: string[];
  lastCheck: number;
}

// Team events
export type TeamEvent = 
  | 'team:forming'
  | 'team:formed'
  | 'team:member:joined'
  | 'team:member:left'
  | 'team:member:status_changed'
  | 'team:status_changed'
  | 'team:dissolved'
  | 'team:health:check'
  | 'team:health:degraded'
  | 'team:health:critical';

// Team event payloads
export interface TeamEventPayloads {
  'team:forming': {
    teamId: string;
    projectId: string;
    requiredRoles: string[];
    timestamp: number;
  };
  'team:formed': {
    teamId: string;
    projectId: string;
    memberCount: number;
    leadRoleId: string;
    timestamp: number;
  };
  'team:member:joined': {
    teamId: string;
    agentId: string;
    roleId: string;
    timestamp: number;
  };
  'team:member:left': {
    teamId: string;
    agentId: string;
    roleId: string;
    reason?: string;
    timestamp: number;
  };
  'team:member:status_changed': {
    teamId: string;
    agentId: string;
    oldStatus: TeamMember['status'];
    newStatus: TeamMember['status'];
    timestamp: number;
  };
  'team:status_changed': {
    teamId: string;
    oldStatus: DevelopmentTeam['status'];
    newStatus: DevelopmentTeam['status'];
    timestamp: number;
  };
  'team:dissolved': {
    teamId: string;
    projectId: string;
    reason?: string;
    timestamp: number;
  };
  'team:health:check': {
    teamId: string;
    health: TeamHealth;
    timestamp: number;
  };
  'team:health:degraded': {
    teamId: string;
    health: TeamHealth;
    issues: string[];
    timestamp: number;
  };
  'team:health:critical': {
    teamId: string;
    health: TeamHealth;
    issues: string[];
    timestamp: number;
  };
}
