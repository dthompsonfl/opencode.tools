/**
 * Security Domain Orchestrator Tests
 * 
 * Tests for security domain orchestration including threat modeling,
 * SAST scans, secrets scanning, and auto-remediation.
 */

import { SecurityDomainOrchestrator } from '../../../../src/foundry/domains/security/security-orchestrator';
import { TeamManager } from '../../../../src/cowork/team/team-manager';
import { CollaborationProtocol } from '../../../../src/cowork/team/collaboration-protocol';
import { ParallelStateMonitor } from '../../../../src/cowork/monitoring/parallel-state-monitor';
import { EvidenceCollector } from '../../../../src/cowork/evidence/collector';
import { EventBus } from '../../../../src/cowork/orchestrator/event-bus';

describe('SecurityDomainOrchestrator', () => {
  let orchestrator: SecurityDomainOrchestrator;
  let teamManager: TeamManager;
  let collaborationProtocol: CollaborationProtocol;
  let parallelStateMonitor: ParallelStateMonitor;
  let evidenceCollector: EvidenceCollector;

  beforeEach(() => {
    // Clear singleton instances
    (TeamManager as unknown as { instance?: TeamManager }).instance = undefined;
    (CollaborationProtocol as unknown as { instance?: CollaborationProtocol }).instance = undefined;
    (ParallelStateMonitor as unknown as { instance?: ParallelStateMonitor }).instance = undefined;
    (EvidenceCollector as unknown as { instance?: EvidenceCollector }).instance = undefined;
    (EventBus as unknown as { instance?: EventBus }).instance = undefined;

    teamManager = TeamManager.getInstance();
    collaborationProtocol = CollaborationProtocol.getInstance();
    parallelStateMonitor = ParallelStateMonitor.getInstance();
    evidenceCollector = EvidenceCollector.getInstance();
    orchestrator = new SecurityDomainOrchestrator();
  });

  afterEach(() => {
    orchestrator.stopMonitoring('test-project');
    parallelStateMonitor.clear();
    evidenceCollector.clear();
    collaborationProtocol.clear();
    teamManager.clear();
  });

  describe('initialize', () => {
    it('should initialize for a project', async () => {
      await orchestrator.initialize('test-project');
      expect(orchestrator.isMonitored('test-project')).toBe(true);
    });

    it('should set initial security posture', async () => {
      await orchestrator.initialize('test-project');
      const posture = orchestrator.getSecurityPosture('test-project');
      expect(posture.projectId).toBe('test-project');
      expect(posture.overallScore).toBe(100);
      expect(posture.threatModelStatus).toBe('not_started');
    });
  });

  describe('autoRemediate', () => {
    it('should auto-remediate low severity findings', async () => {
      const finding = {
        id: 'test-1',
        severity: 'low' as const,
        category: 'code_style',
        title: 'Code style issue',
        description: 'Minor formatting issue',
        autoFixable: true,
      };

      const result = await orchestrator.autoRemediate(finding);
      expect(result.success).toBe(true);
      expect(result.actionTaken).toBe('code_formatted');
    });

    it('should not auto-remediate critical findings', async () => {
      const finding = {
        id: 'test-1',
        severity: 'critical' as const,
        category: 'security',
        title: 'Security vulnerability',
        description: 'Critical security issue',
      };

      const result = await orchestrator.autoRemediate(finding);
      expect(result.success).toBe(false);
      expect(result.actionTaken).toBe('escalated_for_manual_review');
    });
  });

  describe('evaluateSecurityGate', () => {
    it('should pass gate when no findings', async () => {
      const result = await orchestrator.evaluateSecurityGate('test-gate');
      expect(result.passed).toBe(true);
      expect(result.gateId).toBe('test-gate');
    });
  });

  describe('stopMonitoring', () => {
    it('should stop monitoring for a project', async () => {
      await orchestrator.initialize('test-project');
      expect(orchestrator.isMonitored('test-project')).toBe(true);
      
      orchestrator.stopMonitoring('test-project');
      expect(orchestrator.isMonitored('test-project')).toBe(false);
    });
  });
});
