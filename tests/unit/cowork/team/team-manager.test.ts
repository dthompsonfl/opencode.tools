/**
 * Team Manager Tests
 * 
 * Tests for team formation, member management, and health monitoring.
 */

import { TeamManager } from '../../../../src/cowork/team/team-manager';
import { CollaborativeWorkspace } from '../../../../src/cowork/collaboration/collaborative-workspace';
import { EventBus } from '../../../../src/cowork/orchestrator/event-bus';
import { ArtifactVersioning } from '../../../../src/cowork/collaboration/artifact-versioning';
import { FeedbackThreads } from '../../../../src/cowork/collaboration/feedback-threads';
import { RoleMapping, TeamMember } from '../../../../src/cowork/team/team-types';

describe('TeamManager', () => {
  let teamManager: TeamManager;
  let eventBus: EventBus;
  let workspace: CollaborativeWorkspace;

  beforeEach(() => {
    // Clear singletons
    ArtifactVersioning.getInstance().clear();
    FeedbackThreads.getInstance().clear();
    
    // Get fresh instances
    teamManager = TeamManager.getInstance();
    eventBus = EventBus.getInstance();
    workspace = CollaborativeWorkspace.getInstance();
    
    // Clear mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    teamManager.clear();
  });

  describe('Team Formation', () => {
    it('should form a team with required roles', () => {
      // Register role mappings
      const mapping: RoleMapping = {
        roleId: 'CTO_ORCHESTRATOR',
        roleName: 'CTO Orchestrator',
        agentId: 'cto-agent',
        capabilities: ['orchestrate', 'review'],
        vetoGates: ['architecture'],
        approvalGates: ['deployment']
      };
      teamManager.registerRoleMapping(mapping);

      const request = {
        projectId: 'proj-1',
        projectName: 'New Feature',
        requiredRoles: ['CTO_ORCHESTRATOR'],
        leadRoleId: 'CTO_ORCHESTRATOR'
      };

      const team = teamManager.formTeam(request);

      expect(team).toBeDefined();
      expect(team.projectId).toBe('proj-1');
      expect(team.name).toBe('New Feature Team');
      expect(team.leadRoleId).toBe('CTO_ORCHESTRATOR');
      expect(team.status).toBe('active');
      expect(team.members.size).toBe(1);
    });

    it('should create a workspace for the team', () => {
      const mapping: RoleMapping = {
        roleId: 'DEVELOPER',
        roleName: 'Developer',
        agentId: 'dev-agent',
        capabilities: ['implement'],
        vetoGates: [],
        approvalGates: []
      };
      teamManager.registerRoleMapping(mapping);

      const team = teamManager.formTeam({
        projectId: 'proj-1',
        projectName: 'Test',
        requiredRoles: ['DEVELOPER'],
        leadRoleId: 'DEVELOPER'
      });

      expect(team.workspaceId).toBeDefined();
      const ws = workspace.getWorkspace(team.workspaceId);
      expect(ws).toBeDefined();
      expect(ws?.projectId).toBe('proj-1');
    });

    it('should emit team:forming and team:formed events', () => {
      const publishSpy = jest.spyOn(eventBus, 'publish');

      teamManager.registerRoleMapping({
        roleId: 'LEAD',
        roleName: 'Lead',
        agentId: 'lead-agent',
        capabilities: ['lead'],
        vetoGates: [],
        approvalGates: []
      });

      teamManager.formTeam({
        projectId: 'proj-1',
        projectName: 'Test',
        requiredRoles: ['LEAD'],
        leadRoleId: 'LEAD'
      });

      expect(publishSpy).toHaveBeenCalledWith(
        'team:forming',
        expect.objectContaining({
          projectId: 'proj-1',
          requiredRoles: ['LEAD']
        })
      );

      expect(publishSpy).toHaveBeenCalledWith(
        'team:formed',
        expect.objectContaining({
          projectId: 'proj-1',
          memberCount: 1,
          leadRoleId: 'LEAD'
        })
      );
    });

    it('should handle multiple members', () => {
      teamManager.registerRoleMapping({
        roleId: 'LEAD',
        roleName: 'Lead',
        agentId: 'lead-agent',
        capabilities: ['lead'],
        vetoGates: [],
        approvalGates: []
      });

      teamManager.registerRoleMapping({
        roleId: 'DEV',
        roleName: 'Developer',
        agentId: 'dev-agent',
        capabilities: ['code'],
        vetoGates: [],
        approvalGates: []
      });

      const team = teamManager.formTeam({
        projectId: 'proj-1',
        projectName: 'Test',
        requiredRoles: ['LEAD', 'DEV'],
        leadRoleId: 'LEAD'
      });

      expect(team.members.size).toBe(2);
      expect(team.members.has('lead-agent')).toBe(true);
      expect(team.members.has('dev-agent')).toBe(true);
    });
  });

  describe('Team Dissolution', () => {
    it('should dissolve a team', () => {
      teamManager.registerRoleMapping({
        roleId: 'LEAD',
        roleName: 'Lead',
        agentId: 'lead-agent',
        capabilities: [],
        vetoGates: [],
        approvalGates: []
      });

      const team = teamManager.formTeam({
        projectId: 'proj-1',
        projectName: 'Test',
        requiredRoles: ['LEAD'],
        leadRoleId: 'LEAD'
      });

      const result = teamManager.dissolveTeam(team.id, 'Project completed');

      expect(result).toBe(true);
      expect(teamManager.getTeam(team.id)).toBeUndefined();
      expect(teamManager.getTeamForProject('proj-1')).toBeUndefined();
    });

    it('should emit team:dissolved event', () => {
      const publishSpy = jest.spyOn(eventBus, 'publish');

      teamManager.registerRoleMapping({
        roleId: 'LEAD',
        roleName: 'Lead',
        agentId: 'lead-agent',
        capabilities: [],
        vetoGates: [],
        approvalGates: []
      });

      const team = teamManager.formTeam({
        projectId: 'proj-1',
        projectName: 'Test',
        requiredRoles: ['LEAD'],
        leadRoleId: 'LEAD'
      });

      teamManager.dissolveTeam(team.id, 'Test complete');

      expect(publishSpy).toHaveBeenCalledWith(
        'team:dissolved',
        expect.objectContaining({
          teamId: team.id,
          projectId: 'proj-1',
          reason: 'Test complete'
        })
      );
    });

    it('should return false for non-existent team', () => {
      const result = teamManager.dissolveTeam('non-existent', 'reason');
      expect(result).toBe(false);
    });
  });

  describe('Member Management', () => {
    beforeEach(() => {
      teamManager.registerRoleMapping({
        roleId: 'LEAD',
        roleName: 'Lead',
        agentId: 'lead-agent',
        capabilities: ['lead', 'review'],
        vetoGates: [],
        approvalGates: []
      });
    });

    it('should add member to team', () => {
      const team = teamManager.formTeam({
        projectId: 'proj-1',
        projectName: 'Test',
        requiredRoles: ['LEAD'],
        leadRoleId: 'LEAD'
      });

      teamManager.registerRoleMapping({
        roleId: 'DEV',
        roleName: 'Developer',
        agentId: 'dev-agent',
        capabilities: ['code'],
        vetoGates: [],
        approvalGates: []
      });

      const member = teamManager.addMember(team.id, 'DEV');

      expect(member).toBeDefined();
      expect(member?.agentId).toBe('dev-agent');
      expect(member?.roleId).toBe('DEV');
      expect(team.members.has('dev-agent')).toBe(true);
    });

    it('should remove member from team', () => {
      const team = teamManager.formTeam({
        projectId: 'proj-1',
        projectName: 'Test',
        requiredRoles: ['LEAD'],
        leadRoleId: 'LEAD'
      });

      const result = teamManager.removeMember(team.id, 'lead-agent', 'Left project');

      expect(result).toBe(true);
      expect(team.members.has('lead-agent')).toBe(false);
    });

    it('should emit team:member:joined event', () => {
      const publishSpy = jest.spyOn(eventBus, 'publish');

      const team = teamManager.formTeam({
        projectId: 'proj-1',
        projectName: 'Test',
        requiredRoles: ['LEAD'],
        leadRoleId: 'LEAD'
      });

      expect(publishSpy).toHaveBeenCalledWith(
        'team:member:joined',
        expect.objectContaining({
          teamId: team.id,
          agentId: 'lead-agent',
          roleId: 'LEAD'
        })
      );
    });

    it('should return null when adding member without role mapping', () => {
      const team = teamManager.formTeam({
        projectId: 'proj-1',
        projectName: 'Test',
        requiredRoles: ['LEAD'],
        leadRoleId: 'LEAD'
      });

      const member = teamManager.addMember(team.id, 'UNKNOWN_ROLE');

      expect(member).toBeNull();
    });
  });

  describe('Status Management', () => {
    let team: ReturnType<typeof teamManager.formTeam>;

    beforeEach(() => {
      teamManager.registerRoleMapping({
        roleId: 'LEAD',
        roleName: 'Lead',
        agentId: 'lead-agent',
        capabilities: [],
        vetoGates: [],
        approvalGates: []
      });

      team = teamManager.formTeam({
        projectId: 'proj-1',
        projectName: 'Test',
        requiredRoles: ['LEAD'],
        leadRoleId: 'LEAD'
      });
    });

    it('should update member status', () => {
      const result = teamManager.updateMemberStatus(team.id, 'lead-agent', 'busy');

      expect(result).toBe(true);
      const member = teamManager.getMember(team.id, 'lead-agent');
      expect(member?.status).toBe('busy');
    });

    it('should emit team:member:status_changed event', () => {
      const publishSpy = jest.spyOn(eventBus, 'publish');

      teamManager.updateMemberStatus(team.id, 'lead-agent', 'busy');

      expect(publishSpy).toHaveBeenCalledWith(
        'team:member:status_changed',
        expect.objectContaining({
          teamId: team.id,
          agentId: 'lead-agent',
          oldStatus: 'idle',
          newStatus: 'busy'
        })
      );
    });

    it('should assign task to member', () => {
      teamManager.assignTask(team.id, 'lead-agent', 'task-123');

      const member = teamManager.getMember(team.id, 'lead-agent');
      expect(member?.currentTask).toBe('task-123');
      expect(member?.status).toBe('busy');
    });

    it('should clear member task', () => {
      teamManager.assignTask(team.id, 'lead-agent', 'task-123');
      teamManager.clearTask(team.id, 'lead-agent');

      const member = teamManager.getMember(team.id, 'lead-agent');
      expect(member?.currentTask).toBeUndefined();
      expect(member?.status).toBe('idle');
    });
  });

  describe('Health Monitoring', () => {
    let team: ReturnType<typeof teamManager.formTeam>;

    beforeEach(() => {
      teamManager.registerRoleMapping({
        roleId: 'LEAD',
        roleName: 'Lead',
        agentId: 'lead-agent',
        capabilities: [],
        vetoGates: [],
        approvalGates: []
      });

      team = teamManager.formTeam({
        projectId: 'proj-1',
        projectName: 'Test',
        requiredRoles: ['LEAD'],
        leadRoleId: 'LEAD'
      });

      // Stop automatic health checks for controlled testing
      teamManager.stopHealthChecks();
    });

    it('should return team health', () => {
      const health = teamManager.getTeamHealth(team.id);

      expect(health).toBeDefined();
      expect(health?.teamId).toBe(team.id);
      expect(health?.memberCount).toBe(1);
      expect(health?.status).toBe('healthy');
    });

    it('should detect degraded health with offline members', () => {
      // Add another member
      teamManager.registerRoleMapping({
        roleId: 'DEV',
        roleName: 'Developer',
        agentId: 'dev-agent',
        capabilities: [],
        vetoGates: [],
        approvalGates: []
      });
      teamManager.addMember(team.id, 'DEV');

      // Mark one as offline
      teamManager.updateMemberStatus(team.id, 'dev-agent', 'offline');

      const health = teamManager.getTeamHealth(team.id);
      expect(health?.status).toBe('degraded');
    });

    it('should detect critical health with all members offline', () => {
      teamManager.updateMemberStatus(team.id, 'lead-agent', 'offline');

      const health = teamManager.getTeamHealth(team.id);
      expect(health?.status).toBe('critical');
    });

    it('should provide recovery suggestions for degraded team', () => {
      teamManager.registerRoleMapping({
        roleId: 'DEV',
        roleName: 'Developer',
        agentId: 'dev-agent',
        capabilities: [],
        vetoGates: [],
        approvalGates: []
      });
      teamManager.addMember(team.id, 'DEV');
      teamManager.updateMemberStatus(team.id, 'dev-agent', 'offline');

      const suggestions = teamManager.getRecoverySuggestions(team.id);
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Query Methods', () => {
    beforeEach(() => {
      teamManager.registerRoleMapping({
        roleId: 'LEAD',
        roleName: 'Lead',
        agentId: 'lead-agent',
        capabilities: ['lead'],
        vetoGates: [],
        approvalGates: []
      });

      teamManager.registerRoleMapping({
        roleId: 'DEV',
        roleName: 'Developer',
        agentId: 'dev-agent',
        capabilities: ['code'],
        vetoGates: [],
        approvalGates: []
      });
    });

    it('should get team by project', () => {
      const team = teamManager.formTeam({
        projectId: 'proj-1',
        projectName: 'Test',
        requiredRoles: ['LEAD'],
        leadRoleId: 'LEAD'
      });

      const found = teamManager.getTeamForProject('proj-1');
      expect(found?.id).toBe(team.id);
    });

    it('should list active teams', () => {
      teamManager.formTeam({
        projectId: 'proj-1',
        projectName: 'Test 1',
        requiredRoles: ['LEAD'],
        leadRoleId: 'LEAD'
      });

      teamManager.formTeam({
        projectId: 'proj-2',
        projectName: 'Test 2',
        requiredRoles: ['LEAD'],
        leadRoleId: 'LEAD'
      });

      const active = teamManager.listActiveTeams();
      expect(active).toHaveLength(2);
    });

    it('should get members by capability', () => {
      const team = teamManager.formTeam({
        projectId: 'proj-1',
        projectName: 'Test',
        requiredRoles: ['LEAD', 'DEV'],
        leadRoleId: 'LEAD'
      });

      const leads = teamManager.getMembersByCapability(team.id, 'lead');
      expect(leads).toHaveLength(1);
      expect(leads[0].agentId).toBe('lead-agent');
    });

    it('should get team lead', () => {
      const team = teamManager.formTeam({
        projectId: 'proj-1',
        projectName: 'Test',
        requiredRoles: ['LEAD', 'DEV'],
        leadRoleId: 'LEAD'
      });

      const lead = teamManager.getTeamLead(team.id);
      expect(lead?.agentId).toBe('lead-agent');
    });
  });

  describe('Role Mapping', () => {
    it('should register role mapping', () => {
      const mapping: RoleMapping = {
        roleId: 'CTO',
        roleName: 'CTO',
        agentId: 'cto-agent',
        capabilities: ['orchestrate'],
        vetoGates: ['architecture'],
        approvalGates: ['deployment']
      };

      teamManager.registerRoleMapping(mapping);
      const found = teamManager.getRoleMapping('CTO');

      expect(found).toEqual(mapping);
    });

    it('should get all role mappings', () => {
      teamManager.registerRoleMapping({
        roleId: 'ROLE1',
        roleName: 'Role 1',
        agentId: 'agent-1',
        capabilities: [],
        vetoGates: [],
        approvalGates: []
      });

      teamManager.registerRoleMapping({
        roleId: 'ROLE2',
        roleName: 'Role 2',
        agentId: 'agent-2',
        capabilities: [],
        vetoGates: [],
        approvalGates: []
      });

      const mappings = teamManager.getAllRoleMappings();
      expect(mappings).toHaveLength(2);
    });
  });
});
