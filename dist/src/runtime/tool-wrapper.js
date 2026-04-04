"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolWrapper = void 0;
const uuid_1 = require("uuid");
const cache_1 = require("./cache");
const replay_1 = require("./replay");
const tool_response_1 = require("./tool-response");
class ToolWrapper {
    constructor(runStore) {
        this.runStore = runStore;
        this.cache = new cache_1.ToolCache(runStore.getContext().baseDir);
        this.replayManager = new replay_1.ReplayManager(runStore.getContext().mode, this.cache);
    }
    async execute(toolId, version, args, implementation) {
        const start = Date.now();
        const callId = (0, uuid_1.v4)();
        // Check Replay
        if (this.replayManager.isReplay()) {
            const cached = await this.replayManager.getReplay(toolId, args, version);
            if (cached) {
                console.log(`[Replay] Using cached result for ${toolId}`);
                const parsed = tool_response_1.ToolResponseEnvelopeSchema.safeParse(cached);
                return (parsed.success ? parsed.data.data : cached);
            }
            throw new Error(`[Replay] No cached result found for ${toolId}`);
        }
        // Validate Input (Redaction/Security check on args could go here)
        // For now, we assume args are safe or will be redacted in logs.
        let result;
        let envelope;
        let error;
        let success = false;
        try {
            const rawResult = await implementation(args);
            envelope = (0, tool_response_1.normalizeToolResponseEnvelope)(toolId, rawResult, this.runStore.getContext().runId);
            result = envelope.data;
            success = true;
            // Cache successful result
            const cacheKey = this.cache.getCacheKey(toolId, args, version);
            await this.cache.set(cacheKey, envelope);
        }
        catch (err) {
            error = err;
            throw err;
        }
        finally {
            const duration = Date.now() - start;
            const record = {
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
exports.ToolWrapper = ToolWrapper;
//# sourceMappingURL=tool-wrapper.js.map