/**
 * Team Manager
 * 
 * Singleton manager for team formation, member management, health monitoring,
 * and role mapping from Foundry to Cowork agents.
 */

import { logger } from '../../runtime/logger';
import { EventBus } from '../orchestrator/event-bus';
import { CollaborativeWorkspace } from '../collaboration/collaborative-workspace';
import { AgentRegistry } from '../registries/agent-registry';
import {
  DevelopmentTeam,
  TeamMember,
  TeamFormationRequest,
  RoleMapping,
  TeamHealth,
  TeamEvent
} from './team-types';
import {
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

const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const HEARTBEAT_TIMEOUT = 120000; // 2 minutes

export class TeamManager {
  private static instance: TeamManager;
  private teams: Map<string, DevelopmentTeam> = new Map();
  private projectTeams: Map<string, string> = new Map(); // projectId -> teamId
  private roleMappings: Map<string, RoleMapping> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private eventBus: EventBus;
  private workspace: CollaborativeWorkspace;
  private agentRegistry: AgentRegistry;

  private constructor() {
    this.eventBus = EventBus.getInstance();
    this.workspace = CollaborativeWorkspace.getInstance();
    this.agentRegistry = AgentRegistry.getInstance();
    this.startHealthChecks();
  }

  public static getInstance(): TeamManager {
    if (!TeamManager.instance) {
      TeamManager.instance = new TeamManager();
    }
    return TeamManager.instance;
  }

  /**
   * Start automatic health checks
   */
  private startHealthChecks(): void {
    if (this.healthCheckInterval) {
      return;
    }

    this.healthCheckInterval = setInterval(() => {
      this.checkAllTeamsHealth();
    }, HEALTH_CHECK_INTERVAL);

    logger.info('[TeamManager] Started automatic health checks');
  }

  /**
   * Stop automatic health checks
   */
  public stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logger.info('[TeamManager] Stopped automatic health checks');
    }
  }

  /**
   * Form a new team from a formation request
   */
  public formTeam(request: TeamFormationRequest): DevelopmentTeam {
    const teamId = `team-${request.projectId}-${Date.now()}`;
    const now = Date.now();

    // Create workspace for the team
    const ws = this.workspace.createWorkspace(
      request.projectId,
      `${request.projectName} Team Workspace`,
      'team-manager',
      {
        description: `Workspace for ${request.projectName} development team`,
        metadata: { teamId, leadRoleId: request.leadRoleId }
      }
    );

    const team: DevelopmentTeam = {
      id: teamId,
      projectId: request.projectId,
      name: `${request.projectName} Team`,
      members: new Map(),
      formedAt: now,
      status: 'forming',
      leadRoleId: request.leadRoleId,
      workspaceId: ws.id,
      metadata: request.metadata || {}
    };

    this.teams.set(teamId, team);
    this.projectTeams.set(request.projectId, teamId);

    // Emit forming event
    this.eventBus.publish('team:forming', createTeamFormingEvent(
      teamId,
      request.projectId,
      request.requiredRoles
    ));

    // Add required role members
    for (const roleId of request.requiredRoles) {
      this.addMember(teamId, roleId);
    }

    // Add optional role members if mappings exist
    if (request.optionalRoles) {
      for (const roleId of request.optionalRoles) {
        if (this.roleMappings.has(roleId)) {
          this.addMember(teamId, roleId);
        }
      }
    }

    // Transition to active if we have members
    if (team.members.size > 0) {
      this.updateTeamStatus(teamId, 'active');
      
      // Emit formed event
      this.eventBus.publish('team:formed', createTeamFormedEvent(
        teamId,
        request.projectId,
        team.members.size,
        request.leadRoleId
      ));
    }

    logger.info(`[TeamManager] Formed team ${teamId} for project ${request.projectId} with ${team.members.size} members`);

    return team;
  }

  /**
   * Dissolve a team
   */
  public dissolveTeam(teamId: string, reason?: string): boolean {
    const team = this.teams.get(teamId);
    if (!team) {
      logger.warn(`[TeamManager] Cannot dissolve non-existent team: ${teamId}`);
      return false;
    }

    // Update team status
    this.updateTeamStatus(teamId, 'dissolved');

    // Remove from project mapping
    this.projectTeams.delete(team.projectId);

    // Emit dissolved event
    this.eventBus.publish('team:dissolved', createTeamDissolvedEvent(
      teamId,
      team.projectId,
      reason
    ));

    // Archive workspace
    this.workspace.archiveWorkspace(team.workspaceId, 'team-manager', reason);

    // Remove team
    this.teams.delete(teamId);

    logger.info(`[TeamManager] Dissolved team ${teamId}${reason ? `: ${reason}` : ''}`);

    return true;
  }

  /**
   * Add a member to a team
   */
  public addMember(teamId: string, roleId: string): TeamMember | null {
    const team = this.teams.get(teamId);
    if (!team) {
      logger.warn(`[TeamManager] Cannot add member to non-existent team: ${teamId}`);
      return null;
    }

    if (team.status === 'dissolved') {
      logger.warn(`[TeamManager] Cannot add member to dissolved team: ${teamId}`);
      return null;
    }

    const mapping = this.roleMappings.get(roleId);
    if (!mapping) {
      logger.warn(`[TeamManager] No role mapping found for roleId: ${roleId}`);
      return null;
    }

    // Check if agent already exists in team
    for (const member of team.members.values()) {
      if (member.agentId === mapping.agentId) {
        logger.debug(`[TeamManager] Agent ${mapping.agentId} already in team ${teamId}`);
        return member;
      }
    }

    const now = Date.now();
    const member: TeamMember = {
      agentId: mapping.agentId,
      roleId: roleId,
      name: mapping.roleName,
      status: 'idle',
      capabilities: mapping.capabilities,
      joinedAt: now,
      lastHeartbeat: now,
      metadata: {
        vetoGates: mapping.vetoGates,
        approvalGates: mapping.approvalGates
      }
    };

    team.members.set(mapping.agentId, member);

    // Add to workspace
    this.workspace.addMember(team.workspaceId, mapping.agentId, 'team-manager');

    // Emit member joined event
    this.eventBus.publish('team:member:joined', createMemberJoinedEvent(
      teamId,
      mapping.agentId,
      roleId
    ));

    logger.debug(`[TeamManager] Added member ${mapping.agentId} (${roleId}) to team ${teamId}`);

    return member;
  }

  /**
   * Remove a member from a team
   */
  public removeMember(teamId: string, agentId: string, reason?: string): boolean {
    const team = this.teams.get(teamId);
    if (!team) {
      logger.warn(`[TeamManager] Cannot remove member from non-existent team: ${teamId}`);
      return false;
    }

    const member = team.members.get(agentId);
    if (!member) {
      logger.warn(`[TeamManager] Member ${agentId} not found in team ${teamId}`);
      return false;
    }

    team.members.delete(agentId);

    // Emit member left event
    this.eventBus.publish('team:member:left', createMemberLeftEvent(
      teamId,
      agentId,
      member.roleId,
      reason
    ));

    logger.debug(`[TeamManager] Removed member ${agentId} from team ${teamId}`);

    return true;
  }

  /**
   * Get a team by ID
   */
  public getTeam(teamId: string): DevelopmentTeam | undefined {
    return this.teams.get(teamId);
  }

  /**
   * Get team for a project
   */
  public getTeamForProject(projectId: string): DevelopmentTeam | undefined {
    const teamId = this.projectTeams.get(projectId);
    if (!teamId) return undefined;
    return this.teams.get(teamId);
  }

  /**
   * Get a specific team member
   */
  public getMember(teamId: string, agentId: string): TeamMember | undefined {
    const team = this.teams.get(teamId);
    if (!team) return undefined;
    return team.members.get(agentId);
  }

  /**
   * Update member status
   */
  public updateMemberStatus(
    teamId: string,
    agentId: string,
    status: TeamMember['status']
  ): boolean {
    const team = this.teams.get(teamId);
    if (!team) {
      logger.warn(`[TeamManager] Cannot update status for non-existent team: ${teamId}`);
      return false;
    }

    const member = team.members.get(agentId);
    if (!member) {
      logger.warn(`[TeamManager] Member ${agentId} not found in team ${teamId}`);
      return false;
    }

    const oldStatus = member.status;
    member.status = status;
    member.lastHeartbeat = Date.now();

    // Emit status changed event
    this.eventBus.publish('team:member:status_changed', createMemberStatusChangedEvent(
      teamId,
      agentId,
      oldStatus,
      status
    ));

    logger.debug(`[TeamManager] Member ${agentId} status changed from ${oldStatus} to ${status}`);

    return true;
  }

  /**
   * Assign a task to a team member
   */
  public assignTask(teamId: string, agentId: string, taskId: string): boolean {
    const team = this.teams.get(teamId);
    if (!team) {
      logger.warn(`[TeamManager] Cannot assign task for non-existent team: ${teamId}`);
      return false;
    }

    const member = team.members.get(agentId);
    if (!member) {
      logger.warn(`[TeamManager] Member ${agentId} not found in team ${teamId}`);
      return false;
    }

    member.currentTask = taskId;
    this.updateMemberStatus(teamId, agentId, 'busy');

    logger.debug(`[TeamManager] Assigned task ${taskId} to member ${agentId}`);

    return true;
  }

  /**
   * Clear member task
   */
  public clearTask(teamId: string, agentId: string): boolean {
    const team = this.teams.get(teamId);
    if (!team) {
      logger.warn(`[TeamManager] Cannot clear task for non-existent team: ${teamId}`);
      return false;
    }

    const member = team.members.get(agentId);
    if (!member) {
      logger.warn(`[TeamManager] Member ${agentId} not found in team ${teamId}`);
      return false;
    }

    member.currentTask = undefined;
    this.updateMemberStatus(teamId, agentId, 'idle');

    logger.debug(`[TeamManager] Cleared task for member ${agentId}`);

    return true;
  }

  /**
   * Get team health
   */
  public getTeamHealth(teamId: string): TeamHealth | null {
    const team = this.teams.get(teamId);
    if (!team) {
      logger.warn(`[TeamManager] Cannot check health for non-existent team: ${teamId}`);
      return null;
    }

    return this.calculateTeamHealth(team);
  }

  /**
   * Calculate team health
   */
  private calculateTeamHealth(team: DevelopmentTeam): TeamHealth {
    const now = Date.now();
    const issues: string[] = [];
    let activeMembers = 0;
    let busyMembers = 0;
    let errorMembers = 0;

    for (const member of team.members.values()) {
      // Check heartbeat timeout
      const heartbeatExpired = now - member.lastHeartbeat > HEARTBEAT_TIMEOUT;
      
      if (heartbeatExpired) {
        issues.push(`Member ${member.agentId} heartbeat timeout`);
      }

      // Count as active only if not offline and heartbeat not expired
      const isActive = member.status !== 'offline' && !heartbeatExpired;
      
      if (isActive) {
        activeMembers++;
      }

      if (member.status === 'busy') {
        busyMembers++;
      } else if (member.status === 'error') {
        errorMembers++;
        issues.push(`Member ${member.agentId} in error state`);
      } else if (member.status === 'offline') {
        issues.push(`Member ${member.agentId} is offline`);
      }
    }

    // Determine health status
    let status: TeamHealth['status'] = 'healthy';
    if (errorMembers > 0 || activeMembers === 0) {
      status = 'critical';
    } else if (issues.length > 0 || activeMembers <= team.members.size / 2) {
      status = 'degraded';
    }

    return {
      teamId: team.id,
      status,
      memberCount: team.members.size,
      activeMembers,
      busyMembers,
      errorMembers,
      issues,
      lastCheck: now
    };
  }

  /**
   * Check health of all teams
   */
  private checkAllTeamsHealth(): void {
    for (const team of this.teams.values()) {
      if (team.status === 'dissolved') continue;

      const health = this.calculateTeamHealth(team);

      // Emit health check event
      this.eventBus.publish('team:health:check', createTeamHealthCheckEvent(
        team.id,
        health
      ));

      // Emit degraded or critical events
      if (health.status === 'degraded') {
        this.eventBus.publish('team:health:degraded', createTeamHealthDegradedEvent(
          team.id,
          health,
          health.issues
        ));
        logger.warn(`[TeamManager] Team ${team.id} health degraded: ${health.issues.join(', ')}`);
      } else if (health.status === 'critical') {
        this.eventBus.publish('team:health:critical', createTeamHealthCriticalEvent(
          team.id,
          health,
          health.issues
        ));
        logger.error(`[TeamManager] Team ${team.id} health critical: ${health.issues.join(', ')}`);
      }
    }
  }

  /**
   * List all active teams
   */
  public listActiveTeams(): DevelopmentTeam[] {
    return Array.from(this.teams.values()).filter(
      team => team.status !== 'dissolved'
    );
  }

  /**
   * List all teams
   */
  public listAllTeams(): DevelopmentTeam[] {
    return Array.from(this.teams.values());
  }

  /**
   * Register a role mapping
   */
  public registerRoleMapping(mapping: RoleMapping): void {
    this.roleMappings.set(mapping.roleId, mapping);
    logger.debug(`[TeamManager] Registered role mapping for ${mapping.roleId} -> ${mapping.agentId}`);
  }

  /**
   * Get role mapping
   */
  public getRoleMapping(roleId: string): RoleMapping | undefined {
    return this.roleMappings.get(roleId);
  }

  /**
   * Get all role mappings
   */
  public getAllRoleMappings(): RoleMapping[] {
    return Array.from(this.roleMappings.values());
  }

  /**
   * Update team status
   */
  private updateTeamStatus(teamId: string, newStatus: DevelopmentTeam['status']): boolean {
    const team = this.teams.get(teamId);
    if (!team) {
      logger.warn(`[TeamManager] Cannot update status for non-existent team: ${teamId}`);
      return false;
    }

    const oldStatus = team.status;
    team.status = newStatus;

    this.eventBus.publish('team:status_changed', createTeamStatusChangedEvent(
      teamId,
      oldStatus,
      newStatus
    ));

    logger.debug(`[TeamManager] Team ${teamId} status changed from ${oldStatus} to ${newStatus}`);

    return true;
  }

  /**
   * Update member heartbeat
   */
  public updateHeartbeat(teamId: string, agentId: string): boolean {
    const team = this.teams.get(teamId);
    if (!team) return false;

    const member = team.members.get(agentId);
    if (!member) return false;

    member.lastHeartbeat = Date.now();
    return true;
  }

  /**
   * Get team members by capability
   */
  public getMembersByCapability(teamId: string, capability: string): TeamMember[] {
    const team = this.teams.get(teamId);
    if (!team) return [];

    return Array.from(team.members.values()).filter(member =>
      member.capabilities.includes(capability)
    );
  }

  /**
   * Get team lead
   */
  public getTeamLead(teamId: string): TeamMember | null {
    const team = this.teams.get(teamId);
    if (!team) return null;

    for (const member of team.members.values()) {
      if (member.roleId === team.leadRoleId) {
        return member;
      }
    }

    return null;
  }

  /**
   * Get recovery suggestions for degraded team
   */
  public getRecoverySuggestions(teamId: string): string[] {
    const team = this.teams.get(teamId);
    if (!team) return [];

    const health = this.calculateTeamHealth(team);
    const suggestions: string[] = [];

    if (health.errorMembers > 0) {
      suggestions.push('Restart agents in error state');
      suggestions.push('Check agent logs for errors');
    }

    if (health.activeMembers < team.members.size / 2) {
      suggestions.push('Scale up team with additional members');
      suggestions.push('Redistribute workload to active members');
    }

    if (health.issues.some(i => i.includes('heartbeat'))) {
      suggestions.push('Check network connectivity');
      suggestions.push('Verify agent health endpoints');
    }

    if (health.issues.some(i => i.includes('offline'))) {
      suggestions.push('Bring offline members back online');
      suggestions.push('Check member status and connectivity');
    }

    if (health.status === 'degraded') {
      suggestions.push('Monitor team health closely');
      suggestions.push('Review team capacity and workload distribution');
    }

    if (health.status === 'critical') {
      suggestions.push('Consider dissolving and reforming the team');
      suggestions.push('Escalate to human operator');
    }

    return suggestions;
  }

  /**
   * Clear all teams (for testing)
   */
  public clear(): void {
    this.stopHealthChecks();
    this.teams.clear();
    this.projectTeams.clear();
    this.roleMappings.clear();
    TeamManager.instance = undefined as unknown as TeamManager;
    logger.warn('[TeamManager] All teams cleared');
  }
}

export default TeamManager;
