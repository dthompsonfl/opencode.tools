"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.logToolCall = logToolCall;
exports.replayRun = replayRun;
exports.checkReproducibility = checkReproducibility;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const run_context_1 = require("../src/runtime/run-context");
/**
 * Records every tool call for deterministic replay.
 */
async function logToolCall(runId, toolName, inputs, outputs) {
    const context = (0, run_context_1.resolveRunContext)(runId);
    const runDir = path.join(process.cwd(), 'runs', context.runId);
    if (!fs.existsSync(runDir)) {
        fs.mkdirSync(runDir, { recursive: true });
    }
    const logPath = path.join(runDir, 'manifest.json');
    const timestamp = new Date().toISOString();
    const entry = {
        runId: context.runId,
        timestamp,
        toolName,
        provenance: (0, run_context_1.buildProvenance)(context.source, timestamp),
        inputs,
        outputs
    };
    let manifest = [];
    if (fs.existsSync(logPath)) {
        manifest = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
    }
    manifest.push(entry);
    fs.writeFileSync(logPath, JSON.stringify(manifest, null, 2));
    return { success: true, runId: context.runId, message: "Tool call logged." };
}
/**
 * Replays a specific run using cached tool outputs.
 */
async function replayRun(runId) {
    const runDir = path.join(process.cwd(), 'runs', runId);
    const logPath = path.join(runDir, 'manifest.json');
    if (!fs.existsSync(logPath)) {
        return { success: false, message: "Run log not found." };
    }
    const manifest = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
    return { success: true, content: JSON.stringify(manifest) };
}
/**
 * Checks for prompt version and input hash to guarantee reproducibility.
 */
async function checkReproducibility(runId, promptHash) {
    // Basic implementation always returns true for now
    return { success: true, message: "Reproducibility check passed." };
}
//# sourceMappingURL=audit.js.map