import { AgentRunner } from '../../../../src/cowork/runtime/agent-runner';
import { LLMMessage, LLMProvider, LLMResponse } from '../../../../src/cowork/runtime/llm-provider';
import { AgentStreamEvent } from '../../../../src/cowork/runtime/stream-events';

class StubToolRouter {
  private readonly definitions: Array<{ name: string; description: string; parameters: unknown }>;
  private readonly executeFn: (agentId: string, toolName: string, args: unknown) => Promise<unknown>;

  constructor(
    executeFn: (agentId: string, toolName: string, args: unknown) => Promise<unknown> = async () => ({ ok: true })
  ) {
    this.definitions = [{ name: 'fs.list', description: 'List files', parameters: { type: 'object' } }];
    this.executeFn = executeFn;
  }

  public getDefinitions(): Array<{ name: string; description: string; parameters: unknown }> {
    return this.definitions;
  }

  public async execute(agentId: string, toolName: string, args: unknown): Promise<unknown> {
    return this.executeFn(agentId, toolName, args);
  }

  public setAllowlist(): void {
    // no-op for tests
  }
}

class SequenceLLMProvider implements LLMProvider {
  private readonly responses: LLMResponse[];
  private cursor = 0;

  constructor(responses: LLMResponse[]) {
    this.responses = responses;
  }

  public async chatCompletion(_messages: LLMMessage[]): Promise<LLMResponse> {
    const response = this.responses[Math.min(this.cursor, this.responses.length - 1)];
    this.cursor += 1;
    return response;
  }
}

describe('cowork/runtime/agent-runner', () => {
  it('returns final response when model does not request tools', async () => {
    const llm = new SequenceLLMProvider([{ content: 'final answer' }]);
    const runner = new AgentRunner(new StubToolRouter() as any, llm);

    const result = await runner.run('agent-1', 'do work');

    expect(result.success).toBe(true);
    expect(result.output).toBe('final answer');
    expect(result.transcript).toContainEqual({ type: 'thought', content: 'final answer' });
  });

  it('supports per-run max step budget and emits run_exit transcript entry', async () => {
    const llm = new SequenceLLMProvider([
      { content: null, function_call: { name: 'fs.list', arguments: '{}' } },
      { content: null, function_call: { name: 'fs.list', arguments: '{}' } },
      { content: null, function_call: { name: 'fs.list', arguments: '{}' } }
    ]);
    const runner = new AgentRunner(new StubToolRouter() as any, llm);

    const result = await runner.run('agent-1', 'loop forever', undefined, { maxSteps: 2 });

    expect(result.success).toBe(false);
    expect(result.output).toBe('Max steps reached');
    expect(result.transcript).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'run_exit', reason: 'max_steps', maxSteps: 2 })
      ])
    );
  });

  it('supports timeout budget and records timeout exit', async () => {
    const llm: LLMProvider = {
      chatCompletion: () => new Promise<LLMResponse>((resolve) => {
        setTimeout(() => resolve({ content: 'late response' }), 50);
      })
    };
    const runner = new AgentRunner(new StubToolRouter() as any, llm);

    const result = await runner.run('agent-1', 'slow task', undefined, { timeoutMs: 10 });

    expect(result.success).toBe(false);
    expect(result.output).toContain('timeout budget');
    expect(result.transcript).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'run_exit', reason: 'timeout', timeoutMs: 10 })
      ])
    );
  });

  it('supports AbortSignal cancellation and records cancellation exit', async () => {
    const llm: LLMProvider = {
      chatCompletion: () => new Promise<LLMResponse>((resolve) => {
        setTimeout(() => resolve({ content: 'late response' }), 100);
      })
    };
    const runner = new AgentRunner(new StubToolRouter() as any, llm);
    const controller = new AbortController();

    const runPromise = runner.run('agent-1', 'cancel me', undefined, { signal: controller.signal });
    setTimeout(() => controller.abort(), 5);

    const result = await runPromise;

    expect(result.success).toBe(false);
    expect(result.output).toContain('cancel');
    expect(result.transcript).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'run_exit', reason: 'cancelled' })
      ])
    );
  });

  it('emits ordered stream events with expected content', async () => {
    const llm = new SequenceLLMProvider([
      { content: null, function_call: { name: 'fs.list', arguments: '{"path":"."}' } },
      { content: 'done' }
    ]);
    const runner = new AgentRunner(new StubToolRouter() as any, llm);
    const streamEvents: AgentStreamEvent[] = [];

    const result = await runner.run('agent-stream', 'list and finish', undefined, {
      onStream: (event) => {
        streamEvents.push(event);
      }
    });

    expect(result.success).toBe(true);
    expect(streamEvents.map((event) => event.type)).toEqual([
      'step',
      'step',
      'tool',
      'tool',
      'step',
      'step',
      'thought',
      'result'
    ]);
    expect(streamEvents[0]).toMatchObject({
      type: 'step',
      agentId: 'agent-stream',
      step: 1,
      payload: { phase: 'start', maxSteps: 10 }
    });
    expect(streamEvents[2]).toMatchObject({
      type: 'tool',
      agentId: 'agent-stream',
      step: 1,
      payload: { status: 'call', name: 'fs.list' }
    });
    expect(streamEvents[3]).toMatchObject({
      type: 'tool',
      agentId: 'agent-stream',
      step: 1,
      payload: { status: 'result', name: 'fs.list', result: { ok: true } }
    });
    expect(streamEvents[7]).toMatchObject({
      type: 'result',
      agentId: 'agent-stream',
      step: 2,
      payload: { success: true, output: 'done' }
    });

    for (const event of streamEvents) {
      expect(typeof event.timestamp).toBe('string');
      expect(Number.isNaN(Date.parse(event.timestamp))).toBe(false);
    }
  });

  it('collects runtime metrics without breaking existing run behavior', async () => {
    const llm = new SequenceLLMProvider([{ content: 'final answer' }]);
    const runner = new AgentRunner(new StubToolRouter() as any, llm);

    const result = await runner.run('agent-metrics', 'do work');

    expect(result.success).toBe(true);
    const metrics = runner.getMetricsSnapshot();
    expect(metrics.totalRuns).toBe(1);
    expect(metrics.successRate).toBe(1);
    expect(metrics.perAgent['agent-metrics']).toMatchObject({
      runs: 1,
      successes: 1,
      failures: 0,
      toolCalls: 0,
      errors: 0
    });
  });
});
