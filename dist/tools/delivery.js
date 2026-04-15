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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRunbook = generateRunbook;
exports.generateNginxConfig = generateNginxConfig;
exports.runSmoketest = runSmoketest;
exports.packageHandoff = packageHandoff;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const archiver = __importStar(require("archiver"));
const axios_1 = __importDefault(require("axios"));
const audit_1 = require("./audit");
const run_context_1 = require("../src/runtime/run-context");
async function generateRunbook(architecture) {
    const context = (0, run_context_1.resolveRunContext)();
    const serviceCount = Array.isArray(architecture?.components) ? architecture.components.length : 0;
    const hasDb = (architecture?.dataModel?.entities?.length ?? 0) > 0;
    const runbook = `# Deployment Runbook

## Preconditions
- Node.js 18+
- CI artifacts available
- Secrets configured in deployment environment

## Deployment Steps
1. Validate migrations and backups
2. Deploy application services (${serviceCount} components detected)
3. Execute health checks and smoke tests

## Rollback Plan
1. Re-deploy previous release artifact
2. Roll back schema changes if required
3. Re-run smoke tests and confirm service health

## Notes
- Data layer required: ${hasDb ? 'yes' : 'no'}
`;
    await (0, audit_1.logToolCall)(context.runId, 'delivery.runbook.generate', {
        serviceCount,
        hasDb
    }, {
        runbookLength: runbook.length
    });
    return { runbook };
}
async function generateNginxConfig(environmentMapping) {
    const context = (0, run_context_1.resolveRunContext)();
    if (environmentMapping.length === 0) {
        throw new Error('delivery.generateNginxConfig requires at least one domain/port mapping.');
    }
    const config = environmentMapping
        .map((mapping) => {
        if (!mapping.domain || mapping.port <= 0) {
            throw new Error('Invalid NGINX mapping: each item needs a valid domain and positive port.');
        }
        return [
            'server {',
            '    listen 80;',
            `    server_name ${mapping.domain};`,
            '    location / {',
            `        proxy_pass http://127.0.0.1:${mapping.port};`,
            '        proxy_http_version 1.1;',
            '        proxy_set_header Host $host;',
            '        proxy_set_header X-Real-IP $remote_addr;',
            '    }',
            '}'
        ].join('\n');
    })
        .join('\n\n');
    await (0, audit_1.logToolCall)(context.runId, 'delivery.nginx.generate', {
        mappings: environmentMapping.length
    }, {
        configLength: config.length
    });
    return { config };
}
async function runSmoketest(url) {
    const context = (0, run_context_1.resolveRunContext)();
    const startedAt = Date.now();
    try {
        const response = await axios_1.default.get(url, {
            timeout: 10000,
            validateStatus: (status) => status >= 200 && status < 500
        });
        const latency = Date.now() - startedAt;
        const success = response.status < 400;
        await (0, audit_1.logToolCall)(context.runId, 'delivery.smoketest.run', { url }, {
            success,
            latency,
            status: response.status
        });
        return { success, latency };
    }
    catch (error) {
        const latency = Date.now() - startedAt;
        await (0, audit_1.logToolCall)(context.runId, 'delivery.smoketest.run', { url }, {
            success: false,
            latency,
            error: error.message
        });
        return { success: false, latency };
    }
}
async function packageHandoff(artifacts) {
    const context = (0, run_context_1.resolveRunContext)();
    const outputDir = path.join(process.cwd(), 'artifacts', 'delivery');
    fs.mkdirSync(outputDir, { recursive: true });
    const handoffPackagePath = path.join(outputDir, `handoff_${Date.now()}.zip`);
    const checklistPath = path.join(outputDir, `handoff_checklist_${Date.now()}.md`);
    const resolvedArtifacts = artifacts
        .map((artifact) => path.resolve(artifact))
        .filter((artifactPath) => fs.existsSync(artifactPath));
    const checklist = [
        '# Delivery Handoff Checklist',
        '',
        `- Artifacts requested: ${artifacts.length}`,
        `- Artifacts packaged: ${resolvedArtifacts.length}`,
        '',
        ...resolvedArtifacts.map((artifactPath) => `- ${artifactPath}`)
    ].join('\n');
    fs.writeFileSync(checklistPath, checklist, 'utf-8');
    await new Promise((resolve, reject) => {
        const output = fs.createWriteStream(handoffPackagePath);
        const archive = archiver.default('zip', { zlib: { level: 9 } });
        output.on('close', () => resolve());
        archive.on('error', (error) => reject(error));
        archive.pipe(output);
        archive.file(checklistPath, { name: path.basename(checklistPath) });
        for (const artifactPath of resolvedArtifacts) {
            archive.file(artifactPath, { name: path.basename(artifactPath) });
        }
        archive.finalize();
    });
    await (0, audit_1.logToolCall)(context.runId, 'delivery.handoff.package', {
        artifactsRequested: artifacts.length
    }, {
        artifactsPackaged: resolvedArtifacts.length,
        handoffPackagePath
    });
    return { handoffPackagePath };
}
//# sourceMappingURL=delivery.js.map