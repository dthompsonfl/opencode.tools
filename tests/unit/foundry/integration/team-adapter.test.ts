/**
 * Foundry Team Adapter Tests
 * 
 * Tests for bridging Foundry roles to Cowork teams.
 */

import { FoundryTeamAdapter } from '../../../../src/foundry/integration/team-adapter';
import { TeamManager } from '../../../../src/cowork/team/team-manager';
import { EventBus } from '../../../../src/cowork/orchestrator/event-bus';

describe('FoundryTeamAdapter', () => {
  let adapter: FoundryTeamAdapter;
  let teamManager: TeamManager;

  beforeEach(() => {
    (TeamManager as unknown as { instance?: TeamManager }).instance = undefined;
    (EventBus as unknown as { instance?: EventBus }).instance = undefined;

    teamManager = TeamManager.getInstance();
    adapter = new FoundryTeamAdapter();
  });

  afterEach(() => {
    teamManager.clear();
  });

  describe('initialize', () => {
    it('should initialize with default roles', () => {
      adapter.initialize();
      const roles = adapter.getFoundryRoles();
      expect(roles.length).toBeGreaterThan(0);
    });
  });

  describe('getFoundryRoles', () => {
    it('should return all Foundry roles', () => {
      const roles = adapter.getFoundryRoles();
      expect(roles).toContainEqual(expect.objectContaining({ id: 'CTO_ORCHESTRATOR' }));
      expect(roles).toContainEqual(expect.objectContaining({ id: 'SECURITY_LEAD' }));
    });
  });

  describe('resolveRolePermissions', () => {
    it('should resolve permissions for CTO_ORCHESTRATOR', () => {
      const perms = adapter.resolveRolePermissions('CTO_ORCHESTRATOR');
      expect(perms).not.toBeNull();
      expect(perms?.canExecute).toContain('plan');
      expect(perms?.canExecute).toContain('approve_release');
    });

    it('should resolve veto permissions for SECURITY_LEAD', () => {
      const perms = adapter.resolveRolePermissions('SECURITY_LEAD');
      expect(perms).not.toBeNull();
      expect(perms?.canVeto).toContain('security_gate');
    });

    it('should return null for unknown role', () => {
      const perms = adapter.resolveRolePermissions('UNKNOWN_ROLE');
      expect(perms).toBeNull();
    });
  });

  describe('canRoleExecute', () => {
    it('should return true for valid action', () => {
      expect(adapter.canRoleExecute('SECURITY_LEAD', 'threat_model')).toBe(true);
    });

    it('should return false for invalid action', () => {
      expect(adapter.canRoleExecute('SECURITY_LEAD', 'invalid_action')).toBe(false);
    });
  });

  describe('canRoleVeto', () => {
    it('should return true for veto capability', () => {
      expect(adapter.canRoleVeto('SECURITY_LEAD', 'security_gate')).toBe(true);
    });

    it('should return false for non-veto action', () => {
      expect(adapter.canRoleVeto('SECURITY_LEAD', 'other_gate')).toBe(false);
    });
  });

  describe('getRoleCapabilities', () => {
    it('should return capabilities for role', () => {
      const capabilities = adapter.getRoleCapabilities('SECURITY_LEAD');
      expect(capabilities).toContain('security-review');
      expect(capabilities).toContain('threat-modeling');
    });
  });
});
