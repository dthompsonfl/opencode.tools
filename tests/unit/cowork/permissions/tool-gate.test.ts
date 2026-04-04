/**
 * Tests for Tool Permission Gate
 */

import { ToolPermissionGate } from '../../../../src/cowork/permissions/tool-gate';

describe('ToolPermissionGate', () => {
  let gate: ToolPermissionGate;

  beforeEach(() => {
    gate = new ToolPermissionGate();
  });

  describe('checkToolAccess', () => {
    it('should allow manager all tools', () => {
      expect(gate.checkToolAccess('manager', 'any', 'dangerous-tool')).toBe(true);
      expect(gate.checkToolAccess('manager', 'any', 'read')).toBe(true);
    });

    it('should deny by default when no allowlist set', () => {
      expect(gate.checkToolAccess('command', 'test-cmd', 'read')).toBe(false);
      expect(gate.checkToolAccess('agent', 'test-agent', 'write')).toBe(false);
    });

    it('should allow tools in command allowlist', () => {
      gate.setCommandAllowlist('test-cmd', ['read', 'write']);

      expect(gate.checkToolAccess('command', 'test-cmd', 'read')).toBe(true);
      expect(gate.checkToolAccess('command', 'test-cmd', 'write')).toBe(true);
      expect(gate.checkToolAccess('command', 'test-cmd', 'execute')).toBe(false);
    });

    it('should allow tools in agent allowlist', () => {
      gate.setAgentAllowlist('test-agent', ['read', 'grep']);

      expect(gate.checkToolAccess('agent', 'test-agent', 'read')).toBe(true);
      expect(gate.checkToolAccess('agent', 'test-agent', 'grep')).toBe(true);
      expect(gate.checkToolAccess('agent', 'test-agent', 'write')).toBe(false);
    });

    it('should deny all when allowlist is empty', () => {
      gate.setCommandAllowlist('test-cmd', []);

      expect(gate.checkToolAccess('command', 'test-cmd', 'read')).toBe(false);
    });
  });

  describe('setCommandAllowlist', () => {
    it('should set allowlist for command', () => {
      gate.setCommandAllowlist('my-command', ['tool1', 'tool2']);

      expect(gate.getCommandAllowlist('my-command')).toEqual(['tool1', 'tool2']);
    });
  });

  describe('setAgentAllowlist', () => {
    it('should set allowlist for agent', () => {
      gate.setAgentAllowlist('my-agent', ['tool1', 'tool2']);

      expect(gate.getAgentAllowlist('my-agent')).toEqual(['tool1', 'tool2']);
    });
  });

  describe('getCommandAllowlist', () => {
    it('should return undefined for non-existing command', () => {
      expect(gate.getCommandAllowlist('non-existing')).toBeUndefined();
    });
  });

  describe('getAgentAllowlist', () => {
    it('should return undefined for non-existing agent', () => {
      expect(gate.getAgentAllowlist('non-existing')).toBeUndefined();
    });
  });

  describe('hasRestrictions', () => {
    it('should return false for manager', () => {
      expect(gate.hasRestrictions('manager', 'any')).toBe(false);
    });

    it('should return true when allowlist exists', () => {
      gate.setCommandAllowlist('test-cmd', ['read']);

      expect(gate.hasRestrictions('command', 'test-cmd')).toBe(true);
    });

    it('should return true when no allowlist (deny by default)', () => {
      expect(gate.hasRestrictions('command', 'test-cmd')).toBe(true);
    });
  });

  describe('clearAllowlists', () => {
    it('should clear all allowlists', () => {
      gate.setCommandAllowlist('cmd1', ['read']);
      gate.setAgentAllowlist('agent1', ['write']);

      gate.clearAllowlists();

      expect(gate.getCommandAllowlist('cmd1')).toBeUndefined();
      expect(gate.getAgentAllowlist('agent1')).toBeUndefined();
    });
  });
});
