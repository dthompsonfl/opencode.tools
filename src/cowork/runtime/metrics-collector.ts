export interface RunMetricsRecord {
  success: boolean;
  durationMs: number;
  toolCalls?: number;
  errorCount?: number;
}

export interface AgentMetricsSnapshot {
  runs: number;
  successes: number;
  failures: number;
  successRate: number;
  avgDurationMs: number;
  toolCalls: number;
  errors: number;
}

export interface RuntimeMetricsSnapshot {
  totalRuns: number;
  successRate: number;
  avgDurationMs: number;
  toolCalls: number;
  errors: number;
  perAgent: Record<string, AgentMetricsSnapshot>;
}

interface MutableAgentMetrics {
  runs: number;
  successes: number;
  failures: number;
  totalDurationMs: number;
  toolCalls: number;
  errors: number;
}

export class MetricsCollector {
  private totalRuns = 0;
  private totalSuccesses = 0;
  private totalDurationMs = 0;
  private totalToolCalls = 0;
  private totalErrors = 0;
  private perAgent = new Map<string, MutableAgentMetrics>();

  public recordRun(agentId: string, record: RunMetricsRecord): void {
    const toolCalls = record.toolCalls ?? 0;
    const errorCount = record.errorCount ?? 0;
    const durationMs = Number.isFinite(record.durationMs) && record.durationMs >= 0 ? record.durationMs : 0;

    this.totalRuns += 1;
    this.totalDurationMs += durationMs;
    this.totalToolCalls += toolCalls;
    this.totalErrors += errorCount;

    if (record.success) {
      this.totalSuccesses += 1;
    }

    const agentMetrics = this.getOrCreateAgentMetrics(agentId);
    agentMetrics.runs += 1;
    agentMetrics.totalDurationMs += durationMs;
    agentMetrics.toolCalls += toolCalls;
    agentMetrics.errors += errorCount;

    if (record.success) {
      agentMetrics.successes += 1;
    } else {
      agentMetrics.failures += 1;
    }
  }

  public snapshot(): RuntimeMetricsSnapshot {
    const perAgent: Record<string, AgentMetricsSnapshot> = {};

    for (const [agentId, metrics] of this.perAgent.entries()) {
      perAgent[agentId] = {
        runs: metrics.runs,
        successes: metrics.successes,
        failures: metrics.failures,
        successRate: this.toRate(metrics.successes, metrics.runs),
        avgDurationMs: this.toAverage(metrics.totalDurationMs, metrics.runs),
        toolCalls: metrics.toolCalls,
        errors: metrics.errors
      };
    }

    return {
      totalRuns: this.totalRuns,
      successRate: this.toRate(this.totalSuccesses, this.totalRuns),
      avgDurationMs: this.toAverage(this.totalDurationMs, this.totalRuns),
      toolCalls: this.totalToolCalls,
      errors: this.totalErrors,
      perAgent
    };
  }

  public reset(): void {
    this.totalRuns = 0;
    this.totalSuccesses = 0;
    this.totalDurationMs = 0;
    this.totalToolCalls = 0;
    this.totalErrors = 0;
    this.perAgent.clear();
  }

  private getOrCreateAgentMetrics(agentId: string): MutableAgentMetrics {
    const existing = this.perAgent.get(agentId);
    if (existing) {
      return existing;
    }

    const created: MutableAgentMetrics = {
      runs: 0,
      successes: 0,
      failures: 0,
      totalDurationMs: 0,
      toolCalls: 0,
      errors: 0
    };

    this.perAgent.set(agentId, created);
    return created;
  }

  private toRate(successes: number, total: number): number {
    if (total === 0) {
      return 0;
    }

    return successes / total;
  }

  private toAverage(total: number, count: number): number {
    if (count === 0) {
      return 0;
    }

    return total / count;
  }
}
