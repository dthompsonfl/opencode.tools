/**
 * Tests for Result Merger
 */

import { ResultMerger, AgentResult } from '../../../../src/cowork/orchestrator/result-merger';

describe('ResultMerger', () => {
  let merger: ResultMerger;

  beforeEach(() => {
    merger = new ResultMerger();
  });

  describe('merge', () => {
    it('should return empty result for empty array', () => {
      const result = merger.merge([]);

      expect(result.output).toBeNull();
      expect(result.metadata.agentIds).toEqual([]);
      expect(result.metadata.allSucceeded).toBe(true);
    });

    it('should merge single result', () => {
      const results: AgentResult[] = [
        {
          agentId: 'agent1',
          agentName: 'Alpha Agent',
          output: { data: 'test' },
          metadata: {
            runId: 'run-1',
            timestamp: '2024-01-01T00:00:00Z',
            success: true
          }
        }
      ];

      const result = merger.merge(results);

      expect(result.output).toEqual({ data: 'test' });
      expect(result.metadata.agentIds).toEqual(['agent1']);
      expect(result.metadata.allSucceeded).toBe(true);
    });
  });

  describe('sortResults', () => {
    it('should sort results alphabetically by agent name', () => {
      const results: AgentResult[] = [
        {
          agentId: 'agent1',
          agentName: 'Zebra',
          output: {},
          metadata: { runId: '1', timestamp: '2024-01-01T00:00:00Z', success: true }
        },
        {
          agentId: 'agent2',
          agentName: 'Alpha',
          output: {},
          metadata: { runId: '2', timestamp: '2024-01-01T00:00:00Z', success: true }
        },
        {
          agentId: 'agent3',
          agentName: 'Beta',
          output: {},
          metadata: { runId: '3', timestamp: '2024-01-01T00:00:00Z', success: true }
        }
      ];

      const sorted = merger.sortResults(results);

      expect(sorted[0].agentName).toBe('Alpha');
      expect(sorted[1].agentName).toBe('Beta');
      expect(sorted[2].agentName).toBe('Zebra');
    });
  });

  describe('deepMerge', () => {
    it('should merge two objects', () => {
      const a = { x: 1, y: 2 };
      const b = { y: 3, z: 4 };

      const result = merger.deepMerge(a, b);

      expect(result).toEqual({ x: 1, y: 3, z: 4 });
    });

    it('should merge nested objects', () => {
      const a = { outer: { inner: 1 } };
      const b = { outer: { other: 2 } };

      const result = merger.deepMerge(a, b);

      expect(result).toEqual({ outer: { inner: 1, other: 2 } });
    });

    it('should deduplicate arrays', () => {
      const a = [1, 2, 3];
      const b = [2, 3, 4];

      const result = merger.deepMerge(a, b);

      expect(result).toEqual([1, 2, 3, 4]);
    });

    it('should return b if b is not null/undefined', () => {
      expect(merger.deepMerge(null, 'value')).toBe('value');
      expect(merger.deepMerge(undefined, 'value')).toBe('value');
    });
  });

  describe('deterministic ordering', () => {
    it('should produce same output order for same input', () => {
      const results1: AgentResult[] = [
        {
          agentId: 'a',
          agentName: 'Zebra',
          output: { data: 'z' },
          metadata: { runId: '1', timestamp: '2024-01-01T00:00:00Z', success: true }
        },
        {
          agentId: 'b',
          agentName: 'Alpha',
          output: { data: 'a' },
          metadata: { runId: '2', timestamp: '2024-01-01T00:00:00Z', success: true }
        }
      ];

      const results2: AgentResult[] = [
        {
          agentId: 'b',
          agentName: 'Alpha',
          output: { data: 'a' },
          metadata: { runId: '2', timestamp: '2024-01-01T00:00:00Z', success: true }
        },
        {
          agentId: 'a',
          agentName: 'Zebra',
          output: { data: 'z' },
          metadata: { runId: '1', timestamp: '2024-01-01T00:00:00Z', success: true }
        }
      ];

      const merged1 = merger.merge(results1);
      const merged2 = merger.merge(results2);

      // Both should have same agent order
      expect(merged1.metadata.agentIds).toEqual(merged2.metadata.agentIds);
    });
  });
});
