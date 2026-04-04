/**
 * Parallel State Monitor Tests
 */

import { ParallelStateMonitor, ParallelState, MonitoringReport } from '../../../../src/cowork/monitoring/parallel-state-monitor';
import { SecurityMonitorAgent, ComplianceMonitorAgent, Finding } from '../../../../src/cowork/monitoring/monitoring-agents';
import { EventBus } from '../../../../src/cowork/orchestrator/event-bus';
import { TeamManager } from '../../../../src/cowork/team/team-manager';
import { CollaborativeWorkspace } from '../../../../src/cowork/collaboration/collaborative-workspace';
import { CollaborationProtocol } from '../../../../src/cowork/team/collaboration-protocol';

// Mock dependencies
jest.mock('../../../../src/cowork/orchestrator/event-bus', () => ({
  EventBus: {
    getInstance: jest.fn(() => ({
      subscribe: jest.fn(() => jest.fn()),
      publish: jest.fn()
    }))
  }
}));

jest.mock('../../../../src/cowork/team/team-manager', () => ({
  TeamManager: {
    getInstance: jest.fn(() => ({
      getTeamForProject: jest.fn(),
      getTeamLead: jest.fn(),
      listActiveTeams: jest.fn(() => [])
    }))
  }
}));

jest.mock('../../../../src/cowork/collaboration/collaborative-workspace', () => ({
  CollaborativeWorkspace: {
    getInstance: jest.fn(() => ({
      getWorkspacesForProject: jest.fn(() => []),
      updateArtifact: jest.fn()
    }))
  }
}));

jest.mock('../../../../src/cowork/team/collaboration-protocol', () => ({
  CollaborationProtocol: {
    getInstance: jest.fn(() => ({
      escalate: jest.fn()
    }))
  }
}));

describe('ParallelStateMonitor', () => {
  let monitor: ParallelStateMonitor;
  let mockEventBus: { subscribe: jest.Mock; publish: jest.Mock };
  let mockTeamManager: { getTeamForProject: jest.Mock; getTeamLead: jest.Mock };
  let mockCollaboration: { escalate: jest.Mock };
  let mockWorkspace: { getWorkspacesForProject: jest.Mock; updateArtifact: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockEventBus = {
      subscribe: jest.fn(() => jest.fn()),
      publish: jest.fn()
    };
    
    mockTeamManager = {
      getTeamForProject: jest.fn(),
      getTeamLead: jest.fn()
    };
    
    mockCollaboration = {
      escalate: jest.fn()
    };

    mockWorkspace = {
      getWorkspacesForProject: jest.fn(() => []),
      updateArtifact: jest.fn()
    };

    (EventBus.getInstance as jest.Mock).mockReturnValue(mockEventBus);
    (TeamManager.getInstance as jest.Mock).mockReturnValue(mockTeamManager);
    (CollaborationProtocol.getInstance as jest.Mock).mockReturnValue(mockCollaboration);
    (CollaborativeWorkspace.getInstance as jest.Mock).mockReturnValue(mockWorkspace);

    ParallelStateMonitor['instance'] = undefined as unknown as ParallelStateMonitor;
    monitor = ParallelStateMonitor.getInstance();
  });

  afterEach(() => {
    monitor.clear();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = ParallelStateMonitor.getInstance();
      const instance2 = ParallelStateMonitor.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('startMonitoring / stopMonitoring', () => {
    it('should start monitoring for a project', () => {
      monitor.startMonitoring('project-1');

      const state = monitor.getParallelState('project-1', 'security_monitoring');
      expect(state).toBeDefined();
      expect(state?.status).toBe('active');
      expect(state?.projectId).toBe('project-1');

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'monitoring:started',
        expect.objectContaining({ projectId: 'project-1' })
      );
    });

    it('should stop monitoring for a project', () => {
      monitor.startMonitoring('project-1');
      monitor.stopMonitoring('project-1');

      const state = monitor.getParallelState('project-1', 'security_monitoring');
      expect(state?.status).toBe('paused');

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'monitoring:stopped',
        expect.objectContaining({ projectId: 'project-1' })
      );
    });

    it('should initialize all parallel states', () => {
      monitor.startMonitoring('project-1');

      expect(monitor.getParallelState('project-1', 'security_monitoring')).toBeDefined();
      expect(monitor.getParallelState('project-1', 'compliance_monitoring')).toBeDefined();
      expect(monitor.getParallelState('project-1', 'observability')).toBeDefined();
    });
  });

  describe('registerAgent / unregisterAgent', () => {
    it('should register a monitoring agent', () => {
      const agent = new SecurityMonitorAgent();
      monitor.registerAgent(agent);

      const agents = monitor.getRegisteredAgents();
      expect(agents).toHaveLength(1);
      expect(agents[0].id).toBe('security-monitor');

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'monitoring:agent:registered',
        expect.objectContaining({ agentId: 'security-monitor' })
      );
    });

    it('should unregister a monitoring agent', () => {
      const agent = new SecurityMonitorAgent();
      monitor.registerAgent(agent);
      
      monitor.unregisterAgent('security-monitor');

      const agents = monitor.getRegisteredAgents();
      expect(agents).toHaveLength(0);

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'monitoring:agent:unregistered',
        expect.objectContaining({ agentId: 'security-monitor' })
      );
    });

    it('should stop agent when unregistering', () => {
      const agent = new SecurityMonitorAgent();
      const stopSpy = jest.spyOn(agent, 'stop');
      
      monitor.registerAgent(agent);
      monitor.unregisterAgent('security-monitor');

      expect(stopSpy).toHaveBeenCalled();
    });
  });

  describe('updateParallelState', () => {
    it('should update parallel state', () => {
      monitor.startMonitoring('project-1');
      
      monitor.updateParallelState('project-1', 'security_monitoring', {
        status: 'error',
        metrics: { testMetric: 123 }
      });

      const state = monitor.getParallelState('project-1', 'security_monitoring');
      expect(state?.status).toBe('error');
      expect(state?.metrics).toHaveProperty('testMetric', 123);

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'monitoring:state:updated',
        expect.objectContaining({
          projectId: 'project-1',
          stateType: 'security_monitoring'
        })
      );
    });
  });

  describe('getMonitoringReport', () => {
    it('should generate monitoring report', () => {
      monitor.startMonitoring('project-1');
      
      const report = monitor.getMonitoringReport('project-1');
      
      expect(report).toBeDefined();
      expect(report?.projectId).toBe('project-1');
      expect(report?.states).toHaveProperty('security_monitoring');
      expect(report?.states).toHaveProperty('compliance_monitoring');
      expect(report?.states).toHaveProperty('observability');
      expect(report?.agents).toBeDefined();
      expect(report?.summary).toBeDefined();
    });

    it('should calculate finding counts', () => {
      monitor.startMonitoring('project-1');
      
      // Add some findings
      const finding: Finding = {
        id: 'finding-1',
        type: 'security',
        severity: 'critical',
        title: 'Critical Finding',
        description: 'Test',
        projectId: 'project-1'
      };
      monitor.handleFinding(finding);

      const report = monitor.getMonitoringReport('project-1');
      expect(report?.totalFindings).toBe(1);
      expect(report?.criticalFindings).toBe(1);
    });

    it('should return null for non-existent project', () => {
      const report = monitor.getMonitoringReport('non-existent');
      expect(report).toBeNull();
    });
  });

  describe('pauseMonitoring / resumeMonitoring', () => {
    it('should pause monitoring', () => {
      monitor.startMonitoring('project-1');
      monitor.pauseMonitoring('project-1');

      const state = monitor.getParallelState('project-1', 'security_monitoring');
      expect(state?.status).toBe('paused');

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'monitoring:paused',
        expect.objectContaining({ projectId: 'project-1' })
      );
    });

    it('should resume monitoring', () => {
      monitor.startMonitoring('project-1');
      monitor.pauseMonitoring('project-1');
      monitor.resumeMonitoring('project-1');

      const state = monitor.getParallelState('project-1', 'security_monitoring');
      expect(state?.status).toBe('active');
      expect(state?.lastCheck).toBeGreaterThan(0);

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'monitoring:resumed',
        expect.objectContaining({ projectId: 'project-1' })
      );
    });
  });

  describe('handleFinding', () => {
    it('should store finding in parallel state', () => {
      monitor.startMonitoring('project-1');
      
      const finding: Finding = {
        id: 'finding-1',
        type: 'security',
        severity: 'medium',
        title: 'Test Finding',
        description: 'Test',
        projectId: 'project-1'
      };
      
      monitor.handleFinding(finding);

      const state = monitor.getParallelState('project-1', 'security_monitoring');
      expect(state?.findings).toContainEqual(finding);
    });

    it('should escalate critical findings', () => {
      monitor.startMonitoring('project-1');
      
      // Mock team lead
      mockTeamManager.getTeamForProject.mockReturnValue({
        id: 'team-1',
        leadRoleId: 'lead-role'
      });
      mockTeamManager.getTeamLead.mockReturnValue({
        agentId: 'lead-agent'
      });

      const finding: Finding = {
        id: 'finding-1',
        type: 'security',
        severity: 'critical',
        title: 'Critical Security Issue',
        description: 'Test',
        projectId: 'project-1'
      };
      
      monitor.handleFinding(finding);

      expect(mockCollaboration.escalate).toHaveBeenCalled();
    });

    it('should store finding as workspace artifact', () => {
      mockWorkspace.getWorkspacesForProject.mockReturnValue([
        {
          id: 'ws-1',
          status: 'active'
        }
      ]);
      
      monitor.startMonitoring('project-1');
      
      const finding: Finding = {
        id: 'finding-1',
        type: 'security',
        severity: 'high',
        title: 'Test Finding',
        description: 'Test',
        projectId: 'project-1'
      };
      
      monitor.handleFinding(finding);

      expect(mockWorkspace.updateArtifact).toHaveBeenCalled();
    });
  });

  describe('isMonitoring', () => {
    it('should return false when not running', () => {
      expect(monitor.isMonitoring()).toBe(false);
    });

    it('should return true when monitoring', () => {
      monitor.startMonitoring('project-1');
      expect(monitor.isMonitoring()).toBe(true);
    });
  });

  describe('getAllParallelStates', () => {
    it('should return all parallel states', () => {
      monitor.startMonitoring('project-1');
      monitor.startMonitoring('project-2');

      const allStates = monitor.getAllParallelStates();
      expect(allStates.size).toBe(2);
      expect(allStates.has('project-1')).toBe(true);
      expect(allStates.has('project-2')).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear all data', () => {
      const agent = new SecurityMonitorAgent();
      monitor.registerAgent(agent);
      monitor.startMonitoring('project-1');

      monitor.clear();

      expect(monitor.getRegisteredAgents()).toHaveLength(0);
      expect(monitor.isMonitoring()).toBe(false);
      expect(monitor.getAllParallelStates().size).toBe(0);
    });

    it('should stop all agents when clearing', () => {
      const agent = new SecurityMonitorAgent();
      const stopSpy = jest.spyOn(agent, 'stop');
      
      monitor.registerAgent(agent);
      monitor.startMonitoring('project-1');
      monitor.clear();

      expect(stopSpy).toHaveBeenCalled();
    });
  });
});
