/**
 * Feature Domain Orchestrator Tests
 * 
 * Tests for feature domain orchestration including planning,
 * implementation, reviews, and validation gates.
 */

import { FeatureDomainOrchestrator } from '../../../../src/foundry/domains/feature/feature-orchestrator';
import { TeamManager } from '../../../../src/cowork/team/team-manager';
import { CollaborationProtocol } from '../../../../src/cowork/team/collaboration-protocol';
import { EventBus } from '../../../../src/cowork/orchestrator/event-bus';
import { CollaborativeWorkspace } from '../../../../src/cowork/collaboration/collaborative-workspace';

describe('FeatureDomainOrchestrator', () => {
  let orchestrator: FeatureDomainOrchestrator;
  let teamManager: TeamManager;
  let collaborationProtocol: CollaborationProtocol;

  beforeEach(() => {
    (TeamManager as unknown as { instance?: TeamManager }).instance = undefined;
    (CollaborationProtocol as unknown as { instance?: CollaborationProtocol }).instance = undefined;
    (EventBus as unknown as { instance?: EventBus }).instance = undefined;
    (CollaborativeWorkspace as unknown as { instance?: CollaborativeWorkspace }).instance = undefined;

    teamManager = TeamManager.getInstance();
    collaborationProtocol = CollaborationProtocol.getInstance();
    orchestrator = new FeatureDomainOrchestrator();
  });

  afterEach(() => {
    collaborationProtocol.clear();
    teamManager.clear();
  });

  describe('initialize', () => {
    it('should initialize for a project and team', async () => {
      await orchestrator.initialize('test-project', 'test-team');
      // Initialization completes without error
    });
  });

  describe('getFeatureStatus', () => {
    it('should return default status for unknown feature', () => {
      const status = orchestrator.getFeatureStatus('unknown-feature');
      expect(status.featureId).toBe('unknown-feature');
      expect(status.phase).toBe('planning');
      expect(status.progress).toBe(0);
    });
  });

  describe('runValidationGates', () => {
    it('should run all validation gates', async () => {
      const gates = await orchestrator.runValidationGates('test-feature');
      expect(gates).toHaveLength(4);
      expect(gates.every(g => g.passed)).toBe(true);
    });
  });
});
