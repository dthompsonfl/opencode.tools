/**
 * Foundry Team Adapter
 *
 * Bridge between Foundry roles and Cowork teams. Maps Foundry role definitions
 * to Cowork agent mappings and enables team formation from Foundry role configurations.
 */

import { TeamManager } from '@/cowork/team/team-manager';
import { DevelopmentTeam, RoleMapping, TeamFormationRequest } from '@/cowork/team/team-types';
import { EventBus } from '@/cowork/orchestrator/event-bus';
import { logger } from '@/runtime/logger';

// Foundry role definition from foundry/agents/registry.ts
export interface FoundryRole {
  id: string;
  name: string;
  can: string[];
  vetoes: string[];
  approvalGates?: string[];
}

// Role permissions derived from Foundry role
export interface RolePermissions {
  canExecute: string[];
  canVeto: string[];
  requiresApprovalFor: string[];
}

// Default Foundry roles
const DEFAULT_FOUNDRY_ROLES: FoundryRole[] = [
  {
    id: 'CTO_ORCHESTRATOR',
    name: 'CTO Orchestrator',
    can: ['plan', 'assign', 'block', 'approve_phase', 'approve_release'],
    vetoes: [],
    approvalGates: ['release_approval'],
  },
  {
    id: 'SECURITY_LEAD',
    name: 'Security Lead',
    can: ['threat_model', 'security_review', 'vuln_triage', 'approve_security'],
    vetoes: ['security_gate'],
    approvalGates: ['security_approval'],
  },
  {
    id: 'STAFF_BACKEND_ENGINEER',
    name: 'Staff Backend Engineer',
    can: ['implement_backend', 'migrations', 'api_contracts'],
    vetoes: [],
  },
  {
    id: 'STAFF_FRONTEND_ENGINEER',
    name: 'Staff Frontend Engineer',
    can: ['implement_frontend', 'a11y', 'design_system'],
    vetoes: [],
  },
  {
    id: 'SRE_DEVOPS',
    name: 'SRE / DevOps',
    can: ['ci_cd', 'infra', 'observability', 'deploy', 'rollback'],
    vetoes: [],
  },
  {
    id: 'QA_AUTOMATION_LEAD',
    name: 'QA Automation Lead',
    can: ['test_strategy', 'e2e', 'acceptance_validation'],
    vetoes: ['quality_gate'],
    approvalGates: ['qa_approval'],
  },
  {
    id: 'PRODUCT_MANAGER',
    name: 'Product Manager',
    can: ['discovery', 'requirements', 'prioritization'],
    vetoes: [],
  },
  {
    id: 'QA_LEAD',
    name: 'QA Lead',
    can: ['test_plan', 'peer_review', 'acceptance'],
    vetoes: ['quality_gate'],
    approvalGates: ['qa_approval'],
  },
  {
    id: 'UX_DESIGNER',
    name: 'UX Designer',
    can: ['journey_design', 'interaction_design', 'usability_review'],
    vetoes: [],
  },
  {
    id: 'DATABASE_ARCHITECT',
    name: 'Database Architect',
    can: ['schema_design', 'index_optimization', 'data_integrity_review'],
    vetoes: [],
  },
];

// Map Foundry roles to Cowork agent IDs
const ROLE_TO_AGENT_MAP: Record<string, string> = {
  CTO_ORCHESTRATOR: 'cto',
  PRODUCT_MANAGER: 'pm',
  STAFF_BACKEND_ENGINEER: 'implementer',
  STAFF_FRONTEND_ENGINEER: 'implementer',
  QA_LEAD: 'qa',
  QA_AUTOMATION_LEAD: 'qa',
  SECURITY_LEAD: 'security',
  TECH_WRITER: 'docs',
  SRE_DEVOPS: 'performance',
  UX_DESIGNER: 'implementer',
  DATABASE_ARCHITECT: 'architect',
};

// Capabilities per role
const ROLE_CAPABILITIES: Record<string, string[]> = {
  CTO_ORCHESTRATOR: ['architecture-review', 'planning', 'coordination'],
  SECURITY_LEAD: ['security-review', 'threat-modeling', 'vulnerability-assessment'],
  STAFF_BACKEND_ENGINEER: ['backend-implementation', 'api-design', 'database-design'],
  STAFF_FRONTEND_ENGINEER: ['frontend-implementation', 'ui-design', 'accessibility'],
  SRE_DEVOPS: ['deployment', 'infrastructure', 'monitoring'],
  QA_AUTOMATION_LEAD: ['test-automation', 'e2e-testing', 'quality-assurance'],
  QA_LEAD: ['peer-review', 'test-planning', 'acceptance-testing'],
  PRODUCT_MANAGER: ['discovery', 'requirements-analysis'],
  TECH_WRITER: ['documentation', 'technical-writing'],
  UX_DESIGNER: ['ux-design', 'interaction-design', 'accessibility-design'],
  DATABASE_ARCHITECT: ['database-design', 'migration-planning', 'query-optimization'],
};

export class FoundryTeamAdapter {
  private teamManager: TeamManager;
  private eventBus: EventBus;
  private roleMappings: Map<string, RoleMapping> = new Map();
  private foundryRoles: Map<string, FoundryRole> = new Map();

  constructor() {
    this.teamManager = TeamManager.getInstance();
    this.eventBus = EventBus.getInstance();
    this.initialize();
  }

  /**
   * Initialize the adapter with default Foundry roles
   */
  public initialize(): void {
    // Load default Foundry roles
    for (const role of DEFAULT_FOUNDRY_ROLES) {
      this.foundryRoles.set(role.id, role);
    }

    // Sync Foundry roles to Cowork
    this.syncFoundryRolesToCowork();

    logger.info('[FoundryTeamAdapter] Initialized with ' + this.foundryRoles.size + ' roles');
  }

  /**
   * Sync Foundry roles to Cowork role mappings
   */
  public syncFoundryRolesToCowork(): void {
    for (const role of this.foundryRoles.values()) {
      const mapping = this.createRoleMapping(role);
      this.roleMappings.set(role.id, mapping);
      this.teamManager.registerRoleMapping(mapping);
    }

    this.eventBus.publish('foundry:roles:synced', {
      roleCount: this.roleMappings.size,
      timestamp: Date.now(),
    });

    logger.info(`[FoundryTeamAdapter] Synced ${this.roleMappings.size} Foundry roles to Cowork`);
  }

  /**
   * Map a Foundry role ID to a Cowork agent ID
   */
  public mapRoleToAgent(roleId: string): string | null {
    return ROLE_TO_AGENT_MAP[roleId] || null;
  }

  /**
   * Create a team from Foundry roles
   */
  public createTeamFromFoundryRoles(
    projectId: string,
    projectName: string,
    roles: string[],
    leadRoleId?: string
  ): DevelopmentTeam {
    // Determine lead role (default to first role or CTO_ORCHESTRATOR)
    const effectiveLeadRoleId = leadRoleId || roles.find(r => r === 'CTO_ORCHESTRATOR') || roles[0];

    const formationRequest: TeamFormationRequest = {
      projectId,
      projectName,
      requiredRoles: roles,
      leadRoleId: effectiveLeadRoleId,
      metadata: {
        source: 'foundry',
        roleIds: roles,
        createdBy: 'FoundryTeamAdapter',
      },
    };

    const team = this.teamManager.formTeam(formationRequest);

    logger.info(`[FoundryTeamAdapter] Created team ${team.id} for project ${projectId} with ${roles.length} roles`);

    this.eventBus.publish('foundry:team:created', {
      teamId: team.id,
      projectId,
      roles,
      leadRoleId: effectiveLeadRoleId,
      timestamp: Date.now(),
    });

    return team;
  }

  /**
   * Assign a Foundry role to a team member
   */
  public assignFoundryRoleToTeamMember(
    teamId: string,
    agentId: string,
    roleId: string
  ): boolean {
    const role = this.foundryRoles.get(roleId);
    if (!role) {
      logger.warn(`[FoundryTeamAdapter] Unknown Foundry role: ${roleId}`);
      return false;
    }

    const team = this.teamManager.getTeam(teamId);
    if (!team) {
      logger.warn(`[FoundryTeamAdapter] Team not found: ${teamId}`);
      return false;
    }

    const member = team.members.get(agentId);
    if (!member) {
      logger.warn(`[FoundryTeamAdapter] Member ${agentId} not found in team ${teamId}`);
      return false;
    }

    // Update member metadata with Foundry role
    member.metadata = {
      ...member.metadata,
      foundryRoleId: roleId,
      foundryRoleName: role.name,
      can: role.can,
      vetoes: role.vetoes,
      approvalGates: role.approvalGates || [],
    };

    this.eventBus.publish('foundry:role:assigned', {
      teamId,
      agentId,
      roleId,
      roleName: role.name,
      timestamp: Date.now(),
    });

    logger.info(`[FoundryTeamAdapter] Assigned role ${roleId} to ${agentId} in team ${teamId}`);

    return true;
  }

  /**
   * Get the team for a Foundry project
   */
  public getTeamForFoundryProject(projectId: string): DevelopmentTeam | undefined {
    return this.teamManager.getTeamForProject(projectId);
  }

  /**
   * Get all Foundry roles
   */
  public getFoundryRoles(): FoundryRole[] {
    return Array.from(this.foundryRoles.values());
  }

  /**
   * Get a specific Foundry role
   */
  public getFoundryRole(roleId: string): FoundryRole | undefined {
    return this.foundryRoles.get(roleId);
  }

  /**
   * Resolve permissions for a role
   */
  public resolveRolePermissions(roleId: string): RolePermissions | null {
    const role = this.foundryRoles.get(roleId);
    if (!role) {
      return null;
    }

    return {
      canExecute: role.can,
      canVeto: role.vetoes,
      requiresApprovalFor: role.approvalGates || [],
    };
  }

  /**
   * Check if a role can perform an action
   */
  public canRoleExecute(roleId: string, action: string): boolean {
    const role = this.foundryRoles.get(roleId);
    if (!role) {
      return false;
    }
    return role.can.includes(action);
  }

  /**
   * Check if a role can veto a gate
   */
  public canRoleVeto(roleId: string, gate: string): boolean {
    const role = this.foundryRoles.get(roleId);
    if (!role) {
      return false;
    }
    return role.vetoes.includes(gate);
  }

  /**
   * Get team members by Foundry role
   */
  public getTeamMembersByRole(teamId: string, roleId: string): Array<{ agentId: string; member: import('../../cowork/team/team-types').TeamMember }> {
    const team = this.teamManager.getTeam(teamId);
    if (!team) {
      return [];
    }

    return Array.from(team.members.entries())
      .filter(([, member]) => member.roleId === roleId || member.metadata?.foundryRoleId === roleId)
      .map(([agentId, member]) => ({ agentId, member }));
  }

  /**
   * Register a custom Foundry role
   */
  public registerFoundryRole(role: FoundryRole): void {
    this.foundryRoles.set(role.id, role);
    const mapping = this.createRoleMapping(role);
    this.roleMappings.set(role.id, mapping);
    this.teamManager.registerRoleMapping(mapping);

    logger.info(`[FoundryTeamAdapter] Registered custom Foundry role: ${role.id}`);
  }

  /**
   * Get available capabilities for a role
   */
  public getRoleCapabilities(roleId: string): string[] {
    return ROLE_CAPABILITIES[roleId] || [];
  }

  /**
   * Create a role mapping from Foundry role
   */
  private createRoleMapping(role: FoundryRole): RoleMapping {
    return {
      roleId: role.id,
      roleName: role.name,
      agentId: ROLE_TO_AGENT_MAP[role.id] || 'generic-agent',
      capabilities: ROLE_CAPABILITIES[role.id] || [],
      vetoGates: role.vetoes,
      approvalGates: role.approvalGates || [],
    };
  }

  /**
   * Dissolve a team
   */
  public dissolveTeam(teamId: string, reason?: string): boolean {
    return this.teamManager.dissolveTeam(teamId, reason);
  }

  /**
   * Get team health
   */
  public getTeamHealth(teamId: string) {
    return this.teamManager.getTeamHealth(teamId);
  }

  /**
   * List all active teams
   */
  public listActiveTeams() {
    return this.teamManager.listActiveTeams();
  }
}

export default FoundryTeamAdapter;
