import { v4 as uuidv4 } from 'uuid';
import { RunStore } from './run-store';
import { ToolCache } from './cache';
import { ReplayManager } from './replay';
import { ToolCallRecord } from '../types/run';
import { PolicyViolationError } from './errors';
import { redactText } from '../security/redaction';
import { normalizeToolResponseEnvelope, ToolResponseEnvelopeSchema } from './tool-response';

export class ToolWrapper {
  private runStore: RunStore;
  private cache: ToolCache;
  private replayManager: ReplayManager;

  constructor(runStore: RunStore) {
    this.runStore = runStore;
    this.cache = new ToolCache(runStore.getContext().baseDir);
    this.replayManager = new ReplayManager(runStore.getContext().mode, this.cache);
  }

  async execute<TArgs, TResult>(
    toolId: string,
    version: string,
    args: TArgs,
    implementation: (args: TArgs) => Promise<TResult>
  ): Promise<TResult> {
    const start = Date.now();
    const callId = uuidv4();

    // Check Replay
    if (this.replayManager.isReplay()) {
      const cached = await this.replayManager.getReplay(toolId, args, version);
      if (cached) {
        console.log(`[Replay] Using cached result for ${toolId}`);
        const parsed = ToolResponseEnvelopeSchema.safeParse(cached);
        return (parsed.success ? parsed.data.data : cached) as TResult;
      }
      throw new Error(`[Replay] No cached result found for ${toolId}`);
    }

    // Validate Input (Redaction/Security check on args could go here)
    // For now, we assume args are safe or will be redacted in logs.
    
    let result: TResult | undefined;
    let envelope: ReturnType<typeof normalizeToolResponseEnvelope<TResult>> | undefined;
    let error: any;
    let success = false;

    try {
      const rawResult = await implementation(args);
      envelope = normalizeToolResponseEnvelope(toolId, rawResult, this.runStore.getContext().runId);
      result = envelope.data as TResult;
      success = true;

      // Cache successful result
      const cacheKey = this.cache.getCacheKey(toolId, args, version);
      await this.cache.set(cacheKey, envelope);

    } catch (err: any) {
      error = err;
      throw err;
    } finally {
      const duration = Date.now() - start;
      
      const record: ToolCallRecord = {
        id: callId,
        toolId,
        args,
        timestamp: new Date().toISOString(),
        durationMs: duration,
        success,
        output: envelope ?? result,
        error: error ? { message: error.message, stack: error.stack } : undefined
      };

      // Audit Log (Redacted inside logger)
      await this.runStore.getAuditLogger().log(record);
    }

    return result;
  }
}
