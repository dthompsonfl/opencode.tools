import { MetricsCollector } from '../../../../src/cowork/runtime/metrics-collector';

describe('cowork/runtime/metrics-collector', () => {
  it('aggregates run metrics across agents', () => {
    const collector = new MetricsCollector();

    collector.recordRun('agent-a', {
      success: true,
      durationMs: 100,
      toolCalls: 2,
      errorCount: 0
    });
    collector.recordRun('agent-a', {
      success: false,
      durationMs: 300,
      toolCalls: 1,
      errorCount: 1
    });
    collector.recordRun('agent-b', {
      success: true,
      durationMs: 200,
      toolCalls: 3,
      errorCount: 0
    });

    const snapshot = collector.snapshot();
    expect(snapshot.totalRuns).toBe(3);
    expect(snapshot.successRate).toBeCloseTo(2 / 3);
    expect(snapshot.avgDurationMs).toBeCloseTo(200);
    expect(snapshot.toolCalls).toBe(6);
    expect(snapshot.errors).toBe(1);
    expect(snapshot.perAgent['agent-a']).toMatchObject({
      runs: 2,
      successes: 1,
      failures: 1,
      successRate: 0.5,
      avgDurationMs: 200,
      toolCalls: 3,
      errors: 1
    });
    expect(snapshot.perAgent['agent-b']).toMatchObject({
      runs: 1,
      successes: 1,
      failures: 0,
      successRate: 1,
      avgDurationMs: 200,
      toolCalls: 3,
      errors: 0
    });
  });

  it('resets all aggregated metrics', () => {
    const collector = new MetricsCollector();

    collector.recordRun('agent-a', {
      success: false,
      durationMs: 50,
      toolCalls: 1,
      errorCount: 1
    });

    collector.reset();
    const snapshot = collector.snapshot();

    expect(snapshot).toEqual({
      totalRuns: 0,
      successRate: 0,
      avgDurationMs: 0,
      toolCalls: 0,
      errors: 0,
      perAgent: {}
    });
  });
});
