import { LLMProvider, getLLMProvider, LLMMessage, LLMResponse } from './llm-provider';
import { ToolRouter } from './tool-router';
import { logger } from '../../runtime/logger';
import { MetricsCollector, RuntimeMetricsSnapshot } from './metrics-collector';
import { AgentStreamCallback, AgentStreamEventType } from './stream-events';

export interface AgentRunOptions {
  maxSteps?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Progress callback for streaming updates */
  onProgress?: (percent: number, message: string) => void;
  /** Structured stream callback for runtime events */
  onStream?: AgentStreamCallback;
  /** Custom system prompt for agent persona */
  systemPrompt?: string;
}

/**
 * Agent Execution Result
 */
export interface AgentExecutionResult {
  success: boolean;
  output: string;
  transcript: any[];
}

/**
 * Agent Runner
 * Executes an agent loop:
 * 1. Model proposes next step (tool call or reasoning)
 * 2. Tool router executes allowed tool
 * 3. Transcript logs result
 * 4. Repeat until "final" result or max steps
 */
export class AgentRunner {
  private llm: LLMProvider;
  private tools: ToolRouter;
  private metrics: MetricsCollector;
  private maxSteps: number = 10;

  constructor(tools: ToolRouter, llm?: LLMProvider, metrics?: MetricsCollector) {
    this.llm = llm ?? getLLMProvider();
    this.tools = tools;
    this.metrics = metrics ?? new MetricsCollector();
  }

  public getMetricsSnapshot(): RuntimeMetricsSnapshot {
    return this.metrics.snapshot();
  }

  /**
   * Run an agent task
   */
  public async run(agentId: string, task: string, context?: any, options?: AgentRunOptions): Promise<AgentExecutionResult> {
    // Build system prompt: use provided persona prompt with agent identification, or fallback to generic
    const personaPrompt = options?.systemPrompt ?? context?.systemPrompt;
    const systemContent = personaPrompt
      ? `You are agent ${agentId}.\n\n${personaPrompt}`
      : `You are agent ${agentId}. Your goal is to complete the user task.`;

    const messages: LLMMessage[] = [
      { role: 'system', content: systemContent },
      { role: 'user', content: task }
    ];

    const transcript: any[] = [];
    let steps = 0;
    const maxSteps = options?.maxSteps ?? context?.maxSteps ?? this.maxSteps;
    const startedAt = Date.now();
    const timeoutMs = options?.timeoutMs ?? context?.timeoutMs ?? context?.timeBudgetMs;
    const deadline = timeoutMs !== undefined ? startedAt + timeoutMs : undefined;
    const signal = options?.signal ?? context?.signal;
    let toolCalls = 0;
    let errorCount = 0;

    logger.info(`Starting agent run for ${agentId}`, { task });

    // Progress callback
    const onProgress = options?.onProgress || context?.onProgress;
    const onStream: AgentStreamCallback | undefined = options?.onStream || context?.onStream;
    const reportProgress = (percent: number, message: string) => {
      if (onProgress) {
        onProgress(percent, message);
      }
    };
    const reportStream = (type: AgentStreamEventType, step: number, payload: unknown): void => {
      if (!onStream) {
        return;
      }

      onStream({
        type,
        agentId,
        step,
        timestamp: new Date().toISOString(),
        payload
      });
    };

    // Report initial progress
    reportProgress(0, 'Starting agent execution');

    // Ensure tools are available for this run
    if (context?.tools) {
        this.tools.setAllowlist(agentId, context.tools);
    }

    while (steps < maxSteps) {
      steps++;

      try {
        this.throwIfCancelledOrOutOfBudget(steps, signal, deadline);
        reportStream('step', steps, { phase: 'start', maxSteps });

        // Report progress before LLM call
        const progressPercent = Math.round((steps / maxSteps) * 50); // First 50% for reasoning
        reportProgress(progressPercent, `Step ${steps}/${maxSteps}: Thinking...`);
        reportStream('step', steps, { phase: 'thinking', message: `Step ${steps}/${maxSteps}: Thinking...` });

        // 1. Get model response
        // Note: toolDefinitions might need to be passed in specific format depending on provider
        // For now we assume provider handles it.
        const response: LLMResponse = await this.awaitWithRunControls(
          () => this.llm.chatCompletion(messages, this.tools.getDefinitions()),
          signal,
          deadline
        );

        // Log the thought/response
        const assistantMsg: LLMMessage = {
            role: 'assistant',
            content: response.content || ''
        };

        if (response.function_call) {
            assistantMsg.function_call = response.function_call;
            transcript.push({ type: 'tool_call', name: response.function_call.name, args: response.function_call.arguments });
            reportStream('tool', steps, {
              status: 'call',
              name: response.function_call.name,
              args: response.function_call.arguments
            });
        } else if (response.content) {
            transcript.push({ type: 'thought', content: response.content });
            reportStream('thought', steps, { content: response.content });
        }

        messages.push(assistantMsg);

        // 2. Check for tool call
        if (response.function_call) {
          const toolName = response.function_call.name;
          toolCalls += 1;
          let toolArgs = {};
          try {
              toolArgs = JSON.parse(response.function_call.arguments);
          } catch (e) {
              logger.error('Failed to parse tool arguments', { toolName, args: response.function_call.arguments });
          }

          logger.info(`Agent ${agentId} calling tool ${toolName}`, toolArgs);

          // Report progress for tool execution
          reportProgress(50 + Math.round((steps / maxSteps) * 40), `Step ${steps}/${maxSteps}: Executing ${toolName}...`);

          // 3. Execute tool
          let toolResult;
          try {
             toolResult = await this.awaitWithRunControls(
                () => this.tools.execute(agentId, toolName, toolArgs),
                signal,
                deadline
              );
              transcript.push({ type: 'tool_result', name: toolName, result: toolResult });
              reportStream('tool', steps, {
                status: 'result',
                name: toolName,
                result: toolResult
              });

             messages.push({
                 role: 'function',
                 name: toolName,
                 content: JSON.stringify(toolResult)
             });
           } catch (err: any) {
              if (err instanceof AgentRunExitError) {
                throw err;
              }

              errorCount += 1;
               toolResult = `Error: ${err.message}`;
               transcript.push({ type: 'tool_error', name: toolName, error: err.message });
              reportStream('tool', steps, {
                status: 'error',
                name: toolName,
                error: err.message
              });

             messages.push({
                 role: 'function',
                 name: toolName,
                 content: JSON.stringify({ error: err.message })
             });
          }
        } else {
          // If no tool call, this is the final answer
          logger.info(`Agent ${agentId} finished run`);
          reportProgress(100, 'Completed successfully');
          reportStream('result', steps, { success: true, output: response.content || 'No content' });
          return this.finalizeRun(
            agentId,
            true,
            response.content || 'No content',
            transcript,
            startedAt,
            toolCalls,
            errorCount
          );
        }

      } catch (error: any) {
        if (error instanceof AgentRunExitError) {
          const exitEntry = this.createRunExitEntry(error.reason, steps, maxSteps, startedAt, timeoutMs);
          transcript.push(exitEntry);
          logger.warn(`Agent ${agentId} exited due to ${error.reason}`, exitEntry);
          errorCount += 1;
          reportStream('result', steps, { success: false, output: error.message, reason: error.reason });
          return this.finalizeRun(agentId, false, error.message, transcript, startedAt, toolCalls, errorCount);
        }

        logger.error(`Agent loop error: ${error.message}`);
        errorCount += 1;
        reportStream('result', steps, { success: false, output: error.message, reason: 'error' });
        return this.finalizeRun(agentId, false, error.message, transcript, startedAt, toolCalls, errorCount);
      }
    }

    const maxStepsExit = this.createRunExitEntry('max_steps', steps, maxSteps, startedAt, timeoutMs);
    transcript.push(maxStepsExit);
    reportStream('result', steps, { success: false, output: 'Max steps reached', reason: 'max_steps' });

    return this.finalizeRun(agentId, false, 'Max steps reached', transcript, startedAt, toolCalls, errorCount);
  }

  private finalizeRun(
    agentId: string,
    success: boolean,
    output: string,
    transcript: any[],
    startedAt: number,
    toolCalls: number,
    errorCount: number
  ): AgentExecutionResult {
    this.metrics.recordRun(agentId, {
      success,
      durationMs: Date.now() - startedAt,
      toolCalls,
      errorCount
    });

    return {
      success,
      output,
      transcript
    };
  }

  private createRunExitEntry(
    reason: 'max_steps' | 'timeout' | 'cancelled',
    step: number,
    maxSteps: number,
    startedAt: number,
    timeoutMs?: number
  ): Record<string, unknown> {
    return {
      type: 'run_exit',
      reason,
      step,
      maxSteps,
      timeoutMs,
      elapsedMs: Date.now() - startedAt
    };
  }

  private throwIfCancelledOrOutOfBudget(step: number, signal?: AbortSignal, deadline?: number): void {
    if (signal?.aborted) {
      throw new AgentRunExitError('cancelled', `Run cancelled at step ${step}.`);
    }

    if (deadline !== undefined && Date.now() >= deadline) {
      throw new AgentRunExitError('timeout', `Run exceeded timeout budget before step ${step}.`);
    }
  }

  private async awaitWithRunControls<T>(
    executor: () => Promise<T>,
    signal?: AbortSignal,
    deadline?: number
  ): Promise<T> {
    const cancellablePromise = executor();

    let timeoutHandle: NodeJS.Timeout | undefined;
    let abortHandler: (() => void) | undefined;

    const timeoutPromise = new Promise<T>((_, reject) => {
      if (deadline === undefined) {
        return;
      }

      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) {
        reject(new AgentRunExitError('timeout', 'Run exceeded timeout budget.'));
        return;
      }

      timeoutHandle = setTimeout(() => {
        reject(new AgentRunExitError('timeout', 'Run exceeded timeout budget.'));
      }, remainingMs);
    });

    const abortPromise = new Promise<T>((_, reject) => {
      if (!signal) {
        return;
      }

      if (signal.aborted) {
        reject(new AgentRunExitError('cancelled', 'Run cancelled by abort signal.'));
        return;
      }

      abortHandler = () => {
        reject(new AgentRunExitError('cancelled', 'Run cancelled by abort signal.'));
      };

      signal.addEventListener('abort', abortHandler, { once: true });
    });

    try {
      return await Promise.race([cancellablePromise, timeoutPromise, abortPromise]);
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      if (signal && abortHandler) {
        signal.removeEventListener('abort', abortHandler);
      }
    }
  }
}

class AgentRunExitError extends Error {
  public readonly reason: 'timeout' | 'cancelled' | 'max_steps';

  constructor(reason: 'timeout' | 'cancelled' | 'max_steps', message: string) {
    super(message);
    this.name = 'AgentRunExitError';
    this.reason = reason;
  }
}
