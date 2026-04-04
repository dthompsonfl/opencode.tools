/**
 * Release Domain Orchestrator Tests
 * 
 * Tests for release domain orchestration including preparation,
 * gates, deployment, and rollbacks.
 */

import { ReleaseDomainOrchestrator } from '../../../../src/foundry/domains/release/release-orchestrator';
import { TeamManager } from '../../../../src/cowork/team/team-manager';
import { CollaborationProtocol } from '../../../../src/cowork/team/collaboration-protocol';
import { EventBus } from '../../../../src/cowork/orchestrator/event-bus';

describe('ReleaseDomainOrchestrator', () => {
  let orchestrator: ReleaseDomainOrchestrator;
  let teamManager: TeamManager;
  let collaborationProtocol: CollaborationProtocol;

  beforeEach(() => {
    (TeamManager as unknown as { instance?: TeamManager }).instance = undefined;
    (CollaborationProtocol as unknown as { instance?: CollaborationProtocol }).instance = undefined;
    (EventBus as unknown as { instance?: EventBus }).instance = undefined;

    teamManager = TeamManager.getInstance();
    collaborationProtocol = CollaborationProtocol.getInstance();
    orchestrator = new ReleaseDomainOrchestrator();
  });

  afterEach(() => {
    collaborationProtocol.clear();
    teamManager.clear();
  });

  describe('initialize', () => {
    it('should initialize for a project', async () => {
      await orchestrator.initialize('test-project');
      // Initialization completes without error
    });
  });

  describe('runReleaseGates', () => {
    it('should run all release gates', async () => {
      const gates = await orchestrator.runReleaseGates('test-release');
      expect(gates).toHaveLength(3);
      expect(gates.every(g => g.passed)).toBe(true);
    });
  });

  describe('getReleaseStatus', () => {
    it('should return default status for unknown release', () => {
      const status = orchestrator.getReleaseStatus('unknown-release');
      expect(status.releaseId).toBe('unknown-release');
      expect(status.phase).toBe('planning');
      expect(status.approved).toBe(false);
    });
  });
});
