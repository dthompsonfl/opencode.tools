export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  vetoGates?: string[];
  conditions?: {
    requireHumanOversight?: boolean;
  };
}

export interface Permission {
  resource: string;
  action: string;
  scope: string;
  conditions?: PermissionConditions;
}

export interface PermissionConditions {
  escalationThreshold?: number;
  requireSecondaryApproval?: string[];
  timeWindow?: { start: number; end: number };
}

export interface AgentIdentity {
  agentId: string;
  roleId: string;
  credentials: string;
  expiresAt: number;
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  requiredApprovals?: string[];
  conditions?: PermissionConditions;
}

export class RBACManager {
  private roles: Map<string, Role> = new Map();

  registerRole(role: Role): void {
    this.roles.set(role.id, role);
  }

  getRole(roleId: string): Role | undefined {
    return this.roles.get(roleId);
  }

  listRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  checkPermission(
    identity: AgentIdentity,
    permission: Omit<Permission, "conditions">
  ): PermissionCheckResult {
    const role = this.roles.get(identity.roleId);
    if (!role) {
      return { allowed: false, reason: "Role not found" };
    }

    if (identity.expiresAt < Date.now()) {
      return { allowed: false, reason: "Credentials expired" };
    }

    const matchingPerm = role.permissions.find(
      (p) =>
        p.resource === permission.resource &&
        p.action === permission.action &&
        this.scopeMatches(p.scope, permission.scope)
    );

    if (!matchingPerm) {
      return {
        allowed: false,
        reason: `Permission ${permission.action} on ${permission.resource} not granted`,
      };
    }

    if (matchingPerm.conditions) {
      return {
        allowed: true,
        conditions: matchingPerm.conditions,
      };
    }

    return { allowed: true };
  }

  canVeto(identity: AgentIdentity, gate: string): boolean {
    const role = this.roles.get(identity.roleId);
    return role?.vetoGates?.includes(gate) || false;
  }

  private scopeMatches(grantedScope: string, requestedScope: string): boolean {
    if (grantedScope === "global") return true;
    if (grantedScope === "organization" && requestedScope !== "global") return true;
    return grantedScope === requestedScope;
  }
}
