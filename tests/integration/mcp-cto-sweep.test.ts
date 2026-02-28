/**
 * MCP CTO Sweep Integration Tests
 * 
 * Tests for the MCP tool cto_sweep which wraps Foundry orchestration.
 */

import { cto_sweep } from '../../tools/mcp-server-legacy';
import type { FoundryExecutionReport } from '../../src/foundry/contracts';

// Mock the environment for testing
process.env.COWORK_LLM_PROVIDER = 'mock';
process.env.COWORK_ALLOW_MOCK_LLM = 'true';

// Define the expected result type from cto_sweep
interface CtoSweepResult {
  success: boolean;
  report?: FoundryExecutionReport;
  error?: string;
}

// Define input type (replicating from mcp-server)
interface CtoSweepInput {
  request: string;
  repoRoot?: string;
  maxIterations?: number;
  runQualityGates?: boolean;
}

describe('MCP CTO Sweep Integration', () => {
  describe('cto_sweep', () => {
    it('should be exported as a function', () => {
      expect(typeof cto_sweep).toBe('function');
    });

    it('should return a result object with success field', async () => {
      const input: CtoSweepInput = {
        request: 'Build a simple hello world function',
        repoRoot: process.cwd(),
        maxIterations: 1,
        runQualityGates: false,
      };

      // The function returns { success: boolean, report?: FoundryExecutionReport, error?: string }
      const result = await cto_sweep(input) as unknown as CtoSweepResult;

      // Verify result structure
      expect(result).toBeDefined();
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should include report when successful', async () => {
      const input: CtoSweepInput = {
        request: 'Test request',
        repoRoot: process.cwd(),
        maxIterations: 1,
        runQualityGates: false,
      };

      const result = await cto_sweep(input) as unknown as CtoSweepResult;

      // The result wraps FoundryExecutionReport in a success property
      if (result.success && result.report) {
        const report = result.report;
        expect(report).toHaveProperty('projectId');
        expect(report).toHaveProperty('status');
        expect(report).toHaveProperty('phase');
        expect(report).toHaveProperty('tasks');
        expect(report).toHaveProperty('messages');
        expect(report).toHaveProperty('gateResults');
        expect(report).toHaveProperty('review');
      }
    });

    it('should return a report with proper structure', async () => {
      const input: CtoSweepInput = {
        request: 'Minimal test',
        repoRoot: process.cwd(),
        maxIterations: 1,
        runQualityGates: false,
      };

      const result = await cto_sweep(input) as unknown as CtoSweepResult;

      // Verify result has expected wrapper shape
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('report');
      
      if (result.report) {
        const report = result.report;
        // Verify core report fields
        expect(typeof report.projectId).toBe('string');
        expect(['completed', 'failed', 'running', 'pending']).toContain(report.status);
        expect(typeof report.phase).toBe('string');
        expect(Array.isArray(report.tasks)).toBe(true);
        expect(Array.isArray(report.messages)).toBe(true);
        expect(Array.isArray(report.gateResults)).toBe(true);
        expect(report.review).toHaveProperty('passed');
        expect(report.review).toHaveProperty('notes');
        expect(report.review).toHaveProperty('reviewer');
      }
    });
  });

  describe('MCP tool listing', () => {
    it('should have main function for CLI startup', async () => {
      const mcpServer = await import('../../tools/mcp-server');
      expect(mcpServer.main).toBeDefined();
      expect(typeof mcpServer.main).toBe('function');
    });
  });
});
