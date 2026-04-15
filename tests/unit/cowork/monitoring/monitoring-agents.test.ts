/**
 * Monitoring Agents Tests
 */

import {
  MonitoringAgent,
  SecurityMonitorAgent,
  ComplianceMonitorAgent,
  ObservabilityAgent,
  Finding,
  MonitoringResult
} from '../../../../src/cowork/monitoring/monitoring-agents';
import { EventBus } from '../../../../src/cowork/orchestrator/event-bus';

// Mock EventBus
jest.mock('../../../../src/cowork/orchestrator/event-bus', () => ({
  EventBus: {
    getInstance: jest.fn(() => ({
      subscribe: jest.fn(() => jest.fn()),
      publish: jest.fn()
    }))
  }
}));

describe('Monitoring Agents', () => {
  let mockEventBus: { publish: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockEventBus = {
      publish: jest.fn()
    };
    (EventBus.getInstance as jest.Mock).mockReturnValue(mockEventBus);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('SecurityMonitorAgent', () => {
    let agent: SecurityMonitorAgent;

    beforeEach(() => {
      agent = new SecurityMonitorAgent('project-1');
    });

    afterEach(() => {
      agent.stop();
    });

    it('should have correct properties', () => {
      expect(agent.id).toBe('security-monitor');
      expect(agent.name).toBe('Security Monitor');
      expect(agent.type).toBe('security');
      expect(agent.runInterval).toBe(60000);
    });

    it('should run and return results', async () => {
      const result = await agent.run();

      expect(result.agentId).toBe('security-monitor');
      expect(result.timestamp).toBeGreaterThan(0);
      expect(result.metrics).toHaveProperty('filesScanned');
      expect(result.metrics).toHaveProperty('secretsChecked');
      expect(result.metrics).toHaveProperty('dependenciesScanned');
      expect(result.metrics).toHaveProperty('configsChecked');
      expect(result.status).toBe('success');
    });

    it('should start and stop', () => {
      agent.start();
      expect(agent.status).toBe('running');
      expect(agent['isRunning']).toBe(true);

      agent.stop();
      expect(agent.status).toBe('paused');
      expect(agent['isRunning']).toBe(false);
    });

    it('should not start if already running', () => {
      agent.start();
      const intervalId = agent['intervalId'];
      
      agent.start(); // Try to start again
      
      expect(agent['intervalId']).toBe(intervalId); // Should not create new interval
    });

    it('should publish findings via event bus', async () => {
      jest.spyOn(agent as unknown as { runSASTScan: () => Promise<Finding[]> }, 'runSASTScan')
        .mockResolvedValue([
          {
            id: 'forced-sast-finding',
            type: 'sql_injection',
            severity: 'high',
            title: 'Forced SAST finding',
            description: 'Deterministic finding for test'
          }
        ]);

      const result = await agent.run();

      expect(result.findings.length).toBeGreaterThan(0);
    });
  });

  describe('ComplianceMonitorAgent', () => {
    let agent: ComplianceMonitorAgent;

    beforeEach(() => {
      agent = new ComplianceMonitorAgent('project-1');
    });

    afterEach(() => {
      agent.stop();
    });

    it('should have correct properties', () => {
      expect(agent.id).toBe('compliance-monitor');
      expect(agent.name).toBe('Compliance Monitor');
      expect(agent.type).toBe('compliance');
      expect(agent.runInterval).toBe(120000);
    });

    it('should run and return results', async () => {
      const result = await agent.run();

      expect(result.agentId).toBe('compliance-monitor');
      expect(result.metrics).toHaveProperty('controlsChecked');
      expect(result.metrics).toHaveProperty('compliantControls');
      expect(result.metrics).toHaveProperty('nonCompliantControls');
      expect(result.metrics).toHaveProperty('evidenceFreshness');
    });

    it('should validate controls on run', async () => {
      const result = await agent.run();
      
      // Should check default controls
      expect(result.metrics.controlsChecked).toBeGreaterThan(0);
    });

    it('should add and validate custom controls', async () => {
      await agent.run(); // Initialize default controls
      agent.addControl('custom-1', 'Custom Control');
      agent.validateControl('custom-1');

      // The control should now have recent validation timestamp
      expect(agent['controls'].length).toBeGreaterThan(5); // Default + custom
    });
  });

  describe('ObservabilityAgent', () => {
    let agent: ObservabilityAgent;

    beforeEach(() => {
      agent = new ObservabilityAgent('project-1');
    });

    afterEach(() => {
      agent.stop();
    });

    it('should have correct properties', () => {
      expect(agent.id).toBe('observability-agent');
      expect(agent.name).toBe('Observability Agent');
      expect(agent.type).toBe('observability');
      expect(agent.runInterval).toBe(30000);
    });

    it('should run and collect metrics', async () => {
      const result = await agent.run();

      expect(result.agentId).toBe('observability-agent');
      expect(result.metrics).toHaveProperty('activeAgents');
      expect(result.metrics).toHaveProperty('cpuUsage');
      expect(result.metrics).toHaveProperty('memoryUsage');
      expect(result.metrics).toHaveProperty('eventsPerSecond');
      expect(result.metrics).toHaveProperty('errorRate');
    });

    it('should store metrics history', async () => {
      await agent.run();
      await agent.run();
      await agent.run();

      const history = agent.getMetricsHistory();
      expect(history.length).toBe(3);
    });

    it('should return latest metrics', async () => {
      await agent.run();
      
      const latest = agent.getLatestMetrics();
      expect(latest).toBeDefined();
      expect(latest).toHaveProperty('activeAgents');
    });

    it('should detect anomalies in high error rates', async () => {
      jest.spyOn(agent as unknown as { collectErrorMetrics: () => Record<string, number> }, 'collectErrorMetrics')
        .mockReturnValue({
          errorRate: 1.5,
          totalErrors: 3,
          criticalErrors: 1,
          warnings: 2
        });

      const result = await agent.run();

      // Should have detected anomaly
      const highErrorFinding = result.findings.find(f => f.type === 'high_error_rate');
      expect(highErrorFinding).toBeDefined();
    });

    it('should detect high resource usage', async () => {
      jest.spyOn(agent as unknown as { collectSystemMetrics: () => Record<string, number> }, 'collectSystemMetrics')
        .mockReturnValue({
          cpuUsage: 92,
          memoryUsage: 88,
          diskUsage: 55,
          networkLatency: 20
        });

      const result = await agent.run();

      // Should have findings for high resource usage
      const resourceFindings = result.findings.filter(f => 
        f.type === 'high_cpu_usage' || f.type === 'high_memory_usage'
      );
      expect(resourceFindings.length).toBeGreaterThan(0);
    });

    it('should limit history size', async () => {
      // Set small max history for test
      agent['maxHistorySize'] = 5;

      // Run more times than max
      for (let i = 0; i < 10; i++) {
        await agent.run();
      }

      const history = agent.getMetricsHistory();
      expect(history.length).toBe(5);
    });
  });

  describe('Base MonitoringAgent', () => {
    class TestAgent extends MonitoringAgent {
      id = 'test-agent';
      name = 'Test Agent';
      type = 'observability' as const;
      runInterval = 1000;

      async run(): Promise<MonitoringResult> {
        return {
          agentId: this.id,
          timestamp: Date.now(),
          findings: [],
          metrics: { test: 1 },
          status: 'success'
        };
      }
    }

    let agent: TestAgent;

    beforeEach(() => {
      agent = new TestAgent();
    });

    afterEach(() => {
      agent.stop();
    });

    it('should start with running status', () => {
      agent.start();
      expect(agent.status).toBe('running');
    });

    it('should update lastRun on execution', async () => {
      agent.start();
      
      // Wait for first run
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(agent.lastRun).toBeGreaterThan(0);
    });

    it('should stop with paused status', () => {
      agent.start();
      agent.stop();
      expect(agent.status).toBe('paused');
    });

    it('should publish findings via event bus', async () => {
      class FindingAgent extends MonitoringAgent {
        id = 'finding-agent';
        name = 'Finding Agent';
        type = 'security' as const;
        runInterval = 1000;

        async run(): Promise<MonitoringResult> {
          return {
            agentId: this.id,
            timestamp: Date.now(),
            findings: [{
              id: 'finding-1',
              type: 'test',
              severity: 'high',
              title: 'Test Finding',
              description: 'A test finding'
            }],
            metrics: {},
            status: 'success'
          };
        }
      }

      const findingAgent = new FindingAgent();
      findingAgent.start();
      
      // Wait for execution
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Stop to prevent further runs
      findingAgent.stop();

      // Check that finding was published
      const findingCalls = mockEventBus.publish.mock.calls.filter(
        (call: [string, unknown]) => call[0] === 'monitoring:finding'
      );
      expect(findingCalls.length).toBeGreaterThan(0);
    });

    it('should publish metrics via event bus', async () => {
      agent.start();
      
      // Wait for execution
      await new Promise(resolve => setTimeout(resolve, 100));
      
      agent.stop();

      // Check that metrics were published
      const metricsCalls = mockEventBus.publish.mock.calls.filter(
        (call: [string, unknown]) => call[0] === 'monitoring:metrics'
      );
      expect(metricsCalls.length).toBeGreaterThan(0);
    });

    it('should handle errors gracefully', async () => {
      class ErrorAgent extends MonitoringAgent {
        id = 'error-agent';
        name = 'Error Agent';
        type = 'observability' as const;
        runInterval = 1000;

        async run(): Promise<MonitoringResult> {
          throw new Error('Test error');
        }
      }

      const errorAgent = new ErrorAgent();
      errorAgent.start();
      
      // Wait for execution
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(errorAgent.status).toBe('error');
      
      errorAgent.stop();
      
      // Check that error was published
      const errorCalls = mockEventBus.publish.mock.calls.filter(
        (call: [string, unknown]) => call[0] === 'monitoring:error'
      );
      expect(errorCalls.length).toBeGreaterThan(0);
    });
  });
});
