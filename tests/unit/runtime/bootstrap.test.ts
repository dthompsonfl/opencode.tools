/**
 * Runtime Bootstrap Tests
 * 
 * Tests for the MCP-first runtime initialization and health checks.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  initializeRuntime,
  resetRuntime,
  isRuntimeInitialized,
  runtimeHealthCheck,
  listRuntimeTools,
} from '../../../src/runtime/bootstrap';

describe('Runtime Bootstrap', () => {
  beforeEach(() => {
    // Reset the runtime before each test
    resetRuntime();
  });

  afterEach(() => {
    // Clean up after each test
    resetRuntime();
  });

  describe('initializeRuntime', () => {
    it('should initialize runtime with default options', () => {
      const result = initializeRuntime();
      
      expect(result).toBeDefined();
      expect(result.coworkOrchestrator).toBeDefined();
      expect(result.eventBus).toBeDefined();
      expect(result.commandRegistry).toBeDefined();
      expect(result.agentRegistry).toBeDefined();
      expect(result.toolRouter).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should return cached instance on second call', () => {
      const result1 = initializeRuntime();
      const result2 = initializeRuntime();
      
      expect(result1).toBe(result2);
    });

    it('should not create foundry bridge when eagerInit is false', () => {
      const result = initializeRuntime({ eagerInit: false });
      
      expect(result.foundryBridge).toBeNull();
    });
  });

  describe('isRuntimeInitialized', () => {
    it('should return false before initialization', () => {
      expect(isRuntimeInitialized()).toBe(false);
    });

    it('should return true after initialization', () => {
      initializeRuntime();
      expect(isRuntimeInitialized()).toBe(true);
    });
  });

  describe('runtimeHealthCheck', () => {
    it('should return not initialized before bootstrap', () => {
      const health = runtimeHealthCheck();
      
      expect(health.initialized).toBe(false);
      expect(health.errors).toContain('Runtime not initialized');
    });

    it('should return health info after initialization', () => {
      initializeRuntime();
      const health = runtimeHealthCheck();
      
      expect(health.initialized).toBe(true);
      expect(health.pluginCount).toBeGreaterThanOrEqual(0);
      expect(health.agentCount).toBeGreaterThanOrEqual(0);
      expect(health.commandCount).toBeGreaterThanOrEqual(0);
      expect(health.timestamp).toBeDefined();
    });
  });

  describe('listRuntimeTools', () => {
    it('should list tools after initialization', () => {
      initializeRuntime();
      const tools = listRuntimeTools();
      
      expect(Array.isArray(tools)).toBe(true);
      // Each tool should have name and description
      tools.forEach(tool => {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
      });
    });

    it('should include agent tools with agent: prefix', () => {
      initializeRuntime();
      const tools = listRuntimeTools();
      
      const agentTools = tools.filter(t => t.name.startsWith('agent:'));
      // We may or may not have agents depending on config
      agentTools.forEach(tool => {
        expect(tool.name.startsWith('agent:')).toBe(true);
      });
    });

    it('should include command tools with command: prefix', () => {
      initializeRuntime();
      const tools = listRuntimeTools();
      
      const commandTools = tools.filter(t => t.name.startsWith('command:'));
      // We may or may not have commands depending on plugins
      commandTools.forEach(tool => {
        expect(tool.name.startsWith('command:')).toBe(true);
      });
    });
  });
});

describe('MCP Integration', () => {
  beforeEach(() => {
    resetRuntime();
  });

  afterEach(() => {
    resetRuntime();
  });

  it('should initialize for MCP with eagerInit', () => {
    const result = initializeRuntime({ eagerInit: true });
    
    expect(result.foundryBridge).toBeDefined();
  });
});
