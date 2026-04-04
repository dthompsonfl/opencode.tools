/**
 * Foundry Collaboration Bridge Tests
 * 
 * Tests for deep integration between Foundry and Cowork.
 */

import { FoundryCollaborationBridge } from '../../../../src/foundry/integration/collaboration-bridge';
import { FoundryOrchestrator } from '../../../../src/foundry/orchestrator';
import { TeamManager } from '../../../../src/cowork/team/team-manager';
import { CollaborationProtocol } from '../../../../src/cowork/team/collaboration-protocol';
import { ParallelStateMonitor } from '../../../../src/cowork/monitoring/parallel-state-monitor';
import { EvidenceCollector } from '../../../../src/cowork/evidence/collector';
import { EventBus } from '../../../../src/cowork/orchestrator/event-bus';
import { CollaborativeWorkspace } from '../../../../src/cowork/collaboration/collaborative-workspace';

describe('FoundryCollaborationBridge', () => {
  let bridge: FoundryCollaborationBridge;
  let teamManager: TeamManager;
  let collaborationProtocol: CollaborationProtocol;
  let parallelStateMonitor: ParallelStateMonitor;
  let evidenceCollector: EvidenceCollector;

  beforeEach(() => {
    (TeamManager as unknown as { instance?: TeamManager }).instance = undefined;
    (CollaborationProtocol as unknown as { instance?: CollaborationProtocol }).instance = undefined;
    (ParallelStateMonitor as unknown as { instance?: ParallelStateMonitor }).instance = undefined;
    (EvidenceCollector as unknown as { instance?: EvidenceCollector }).instance = undefined;
    (EventBus as unknown as { instance?: EventBus }).instance = undefined;
    (CollaborativeWorkspace as unknown as { instance?: CollaborativeWorkspace }).instance = undefined;

    teamManager = TeamManager.getInstance();
    collaborationProtocol = CollaborationProtocol.getInstance();
    parallelStateMonitor = ParallelStateMonitor.getInstance();
    evidenceCollector = EvidenceCollector.getInstance();
    bridge = new FoundryCollaborationBridge();
  });

  afterEach(() => {
    parallelStateMonitor.clear();
    evidenceCollector.clear();
    collaborationProtocol.clear();
    teamManager.clear();
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await bridge.initialize();
      const health = bridge.healthCheck();
      expect(health.initialized).toBe(true);
    });
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      await bridge.initialize();
      const health = bridge.healthCheck();
      expect(health.healthy).toBe(true);
      expect(health.evidenceCollecting).toBe(true);
    });
  });

  describe('collectPhaseEvidence', () => {
    it('should return evidence for project', async () => {
      await bridge.initialize();
      const evidence = bridge.collectPhaseEvidence('test-phase', 'test-project');
      expect(Array.isArray(evidence)).toBe(true);
    });
  });

  describe('getTeamActivity', () => {
    it('should return empty array for new project', async () => {
      await bridge.initialize();
      const activities = bridge.getTeamActivity('test-project');
      expect(activities).toEqual([]);
    });
  });
});
