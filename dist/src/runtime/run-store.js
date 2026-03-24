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
exports.RunStore = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
const audit_1 = require("./audit");
const artifacts_1 = require("./artifacts");
class RunStore {
    constructor(runId = (0, uuid_1.v4)(), baseDir = 'runs') {
        // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
        const runDir = path.join(baseDir, runId);
        if (!fs.existsSync(runDir)) {
            fs.mkdirSync(runDir, { recursive: true });
        }
        this.context = {
            runId,
            mode: 'live', // Default to live
            baseDir: runDir,
            startTime: new Date().toISOString(),
            manifest: {
                runId,
                startTime: new Date().toISOString(),
                status: 'running',
                tools: {},
                artifacts: [],
                gates: [],
                environment: {}
            }
        };
        this.auditLogger = new audit_1.AuditLogger(runDir);
        this.artifactManager = new artifacts_1.ArtifactManager(runDir);
    }
    getContext() {
        return this.context;
    }
    getAuditLogger() {
        return this.auditLogger;
    }
    getArtifactManager() {
        return this.artifactManager;
    }
    async saveManifest() {
        const manifestPath = path.join(this.context.baseDir, 'manifest.json');
        await fs.promises.writeFile(manifestPath, JSON.stringify(this.context.manifest, null, 2));
    }
    async complete() {
        this.context.manifest.status = 'completed';
        this.context.manifest.endTime = new Date().toISOString();
        await this.saveManifest();
    }
    async fail(error) {
        this.context.manifest.status = 'failed';
        this.context.manifest.endTime = new Date().toISOString();
        // Log error to manifest or separate error log
        await this.saveManifest();
    }
}
exports.RunStore = RunStore;
//# sourceMappingURL=run-store.js.map