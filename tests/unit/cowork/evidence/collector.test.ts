/**
 * Evidence Collector Tests
 */

import { EvidenceCollector, EvidenceFilter, IntegrityReport } from '../../../../src/cowork/evidence/collector';
import { EvidenceSigner, SignedEvidence } from '../../../../src/cowork/evidence/signer';
import { EventBus } from '../../../../src/cowork/orchestrator/event-bus';
import { CollaborativeWorkspace } from '../../../../src/cowork/collaboration/collaborative-workspace';
import { resetCoworkSingletonsForTests } from '../test-helpers';

describe('EvidenceCollector', () => {
  let collector: EvidenceCollector;
  let signer: EvidenceSigner;

  beforeEach(() => {
    jest.clearAllMocks();
    resetCoworkSingletonsForTests();
    
    signer = EvidenceSigner.getInstance();
    signer.generateKeyPair();
    collector = EvidenceCollector.getInstance();
  });

  afterEach(() => {
    resetCoworkSingletonsForTests();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = EvidenceCollector.getInstance();
      const instance2 = EvidenceCollector.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('startCollecting / stopCollecting', () => {
    it('should start and stop collecting', () => {
      expect(collector.getStatus().isCollecting).toBe(false);
      
      collector.startCollecting();
      expect(collector.getStatus().isCollecting).toBe(true);
      
      collector.stopCollecting();
      expect(collector.getStatus().isCollecting).toBe(false);
    });

    it('should not start multiple times', () => {
      collector.startCollecting();
      
      // Should not throw or cause issues
      collector.startCollecting();
      expect(collector.getStatus().isCollecting).toBe(true);
    });

    it('should subscribe to relevant events when starting', () => {
      const eventBus = EventBus.getInstance();
      const subscribeSpy = jest.spyOn(eventBus, 'subscribe');

      collector.startCollecting();

      expect(subscribeSpy).toHaveBeenCalledWith('agent:complete', expect.any(Function));
      expect(subscribeSpy).toHaveBeenCalledWith('task:completed', expect.any(Function));
      expect(subscribeSpy).toHaveBeenCalledWith('monitoring:finding', expect.any(Function));
      expect(subscribeSpy).toHaveBeenCalledWith('state:transition', expect.any(Function));
    });
  });

  describe('collectFromAgentOutput', () => {
    it('should collect and sign agent output', () => {
      const output = { result: 'test output' };
      const context = { projectId: 'project-1', taskId: 'task-1' };
      
      const evidence = collector.collectFromAgentOutput('agent-1', output, context);
      
      expect(evidence.id).toContain('evidence-agent');
      expect(evidence.type).toBe('agent_output');
      expect(evidence.source).toBe('agent-1');
      expect(evidence.projectId).toBe('project-1');
      expect(evidence.content).toEqual(output);
      expect(evidence.signature).toBeTruthy();
      expect(evidence.contentHash).toBeTruthy();
    });

    it('should store evidence', () => {
      const output = { result: 'test output' };
      const context = { projectId: 'project-1' };
      
      const evidence = collector.collectFromAgentOutput('agent-1', output, context);
      const retrieved = collector.getEvidence(evidence.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(evidence.id);
    });
  });

  describe('collectFromTaskCompletion', () => {
    it('should collect task completion evidence', () => {
      const result = { success: true, data: 'completed' };
      
      const evidence = collector.collectFromTaskCompletion('task-1', result, 'project-1');
      
      expect(evidence.id).toContain('evidence-task');
      expect(evidence.type).toBe('task_completion');
      expect(evidence.source).toBe('task-router');
      expect(evidence.projectId).toBe('project-1');
      expect(evidence.content).toEqual(result);
    });
  });

  describe('collectFromFinding', () => {
    it('should collect finding evidence', () => {
      const finding = {
        id: 'finding-1',
        type: 'security',
        severity: 'high',
        title: 'Test Finding',
        description: 'A test finding'
      };
      
      const evidence = collector.collectFromFinding(finding, 'project-1');
      
      expect(evidence.id).toContain('evidence-finding');
      expect(evidence.type).toBe('finding');
      expect(evidence.source).toBe('monitoring-agent');
      expect(evidence.projectId).toBe('project-1');
      expect(evidence.content).toEqual(finding);
    });
  });

  describe('collectFromStateTransition', () => {
    it('should collect state transition evidence', () => {
      const transition = {
        fromState: 'idle',
        toState: 'busy',
        metadata: { reason: 'task_started' }
      };
      
      const evidence = collector.collectFromStateTransition(transition, 'project-1');
      
      expect(evidence.id).toContain('evidence-transition');
      expect(evidence.type).toBe('state_transition');
      expect(evidence.source).toBe('state-machine');
      expect(evidence.projectId).toBe('project-1');
      expect(evidence.content).toEqual(transition);
    });
  });

  describe('getEvidenceForProject', () => {
    it('should return evidence filtered by project', () => {
      collector.collectFromAgentOutput('agent-1', { data: 'a' }, { projectId: 'project-1' });
      collector.collectFromAgentOutput('agent-1', { data: 'b' }, { projectId: 'project-2' });
      collector.collectFromAgentOutput('agent-1', { data: 'c' }, { projectId: 'project-1' });
      
      const evidence = collector.getEvidenceForProject('project-1');
      
      expect(evidence).toHaveLength(2);
      expect(evidence.every(e => e.projectId === 'project-1')).toBe(true);
    });

    it('should return evidence sorted by timestamp', () => {
      const e1 = collector.collectFromAgentOutput('agent-1', { data: 'a' }, { projectId: 'project-1' });
      
      // Small delay
      const now = Date.now();
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(now + 1000);
      
      const e2 = collector.collectFromAgentOutput('agent-1', { data: 'b' }, { projectId: 'project-1' });
      
      nowSpy.mockRestore();
      
      const evidence = collector.getEvidenceForProject('project-1');
      
      expect(evidence[0].timestamp).toBeLessThanOrEqual(evidence[1].timestamp);
    });
  });

  describe('getEvidenceForCompliance', () => {
    it('should return compliance-relevant evidence types', () => {
      // Collect various types
      collector.collectFromAgentOutput('agent-1', { data: 'a' }, { projectId: 'project-1' });
      collector.collectFromFinding({ id: 'f1', type: 'security', severity: 'high', title: 'Security Issue', description: 'desc' }, 'project-1');
      collector.collectFromStateTransition({ fromState: 'idle', toState: 'busy' }, 'project-1');
      collector.collectFromTaskCompletion('task-1', { success: true }, 'project-1');
      
      const complianceEvidence = collector.getEvidenceForCompliance('soc2');
      
      // Should only include finding, state_transition, task_completion types
      expect(complianceEvidence.length).toBeGreaterThanOrEqual(3);
      expect(complianceEvidence.every(e => 
        ['finding', 'state_transition', 'task_completion'].includes(e.type)
      )).toBe(true);
    });
  });

  describe('exportEvidencePackage', () => {
    it('should create evidence package with manifest', () => {
      collector.collectFromAgentOutput('agent-1', { data: 'a' }, { projectId: 'project-1' });
      collector.collectFromFinding({ id: 'f1', type: 'security', severity: 'high', title: 'Security Issue', description: 'desc' }, 'project-1');
      
      const filter: EvidenceFilter = { projectId: 'project-1' };
      const pkg = collector.exportEvidencePackage(filter);
      
      expect(pkg.id).toBeTruthy();
      expect(pkg.createdAt).toBeGreaterThan(0);
      expect(pkg.evidence).toHaveLength(2);
      expect(pkg.manifest).toBeDefined();
      expect(pkg.manifest.totalEvidence).toBe(2);
      expect(pkg.manifest.filters).toEqual(filter);
      expect(pkg.signature).toBeTruthy();
    });

    it('should filter evidence by criteria', () => {
      collector.collectFromAgentOutput('agent-1', { data: 'a' }, { projectId: 'project-1' });
      collector.collectFromFinding({ id: 'f1', type: 'security', severity: 'high', title: 'Security Issue', description: 'desc' }, 'project-1');
      collector.collectFromFinding({ id: 'f2', type: 'compliance', severity: 'medium', title: 'Compliance Issue', description: 'desc' }, 'project-2');
      
      const pkg = collector.exportEvidencePackage({ projectId: 'project-1', type: 'finding' });
      
      expect(pkg.evidence).toHaveLength(1);
      expect(pkg.evidence[0].projectId).toBe('project-1');
      expect(pkg.evidence[0].type).toBe('finding');
    });
  });

  describe('verifyEvidenceChain', () => {
    it('should verify all evidence signatures', () => {
      collector.collectFromAgentOutput('agent-1', { data: 'a' }, { projectId: 'project-1' });
      collector.collectFromAgentOutput('agent-1', { data: 'b' }, { projectId: 'project-1' });
      
      const report = collector.verifyEvidenceChain();
      
      expect(report.totalEvidence).toBe(2);
      expect(report.validSignatures).toBe(2);
      expect(report.invalidSignatures).toBe(0);
      expect(report.isValid).toBe(true);
      expect(report.details).toHaveLength(2);
      expect(report.details.every(d => d.isValid)).toBe(true);
    });

    it('should detect tampered evidence', () => {
      const evidence = collector.collectFromAgentOutput('agent-1', { data: 'a' }, { projectId: 'project-1' });
      
      // Tamper with the evidence
      evidence.content = { data: 'tampered' };
      
      const report = collector.verifyEvidenceChain();
      
      expect(report.totalEvidence).toBe(1);
      expect(report.validSignatures).toBe(0);
      expect(report.invalidSignatures).toBe(1);
      expect(report.isValid).toBe(false);
    });

    it('should generate chain hash', () => {
      collector.collectFromAgentOutput('agent-1', { data: 'a' }, { projectId: 'project-1' });
      
      const report = collector.verifyEvidenceChain();
      
      expect(report.chainHash).toBeTruthy();
      expect(report.chainHash.length).toBe(64); // SHA-256 hex
    });
  });

  describe('getStatus', () => {
    it('should return current status', () => {
      collector.startCollecting();
      
      collector.collectFromAgentOutput('agent-1', { data: 'a' }, { projectId: 'project-1' });
      
      const status = collector.getStatus();
      
      expect(status.isCollecting).toBe(true);
      expect(status.totalEvidence).toBe(1);
      expect(status.hasSignerKeys).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear all evidence and reset instance', () => {
      collector.collectFromAgentOutput('agent-1', { data: 'a' }, { projectId: 'project-1' });
      collector.startCollecting();
      
      collector.clear();
      
      expect(collector.getStatus().totalEvidence).toBe(0);
      expect(collector.getStatus().isCollecting).toBe(false);
    });
  });
});
