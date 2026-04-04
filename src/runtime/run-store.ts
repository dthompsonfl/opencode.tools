import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { RunContext, RunManifest, ToolConfig } from '../types/run';
import { AuditLogger } from './audit';
import { ArtifactManager } from './artifacts';

export class RunStore {
  private context: RunContext;
  private auditLogger: AuditLogger;
  private artifactManager: ArtifactManager;

  constructor(runId: string = uuidv4(), baseDir: string = 'runs') {
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

    this.auditLogger = new AuditLogger(runDir);
    this.artifactManager = new ArtifactManager(runDir);
  }

  getContext(): RunContext {
    return this.context;
  }

  getAuditLogger(): AuditLogger {
    return this.auditLogger;
  }

  getArtifactManager(): ArtifactManager {
    return this.artifactManager;
  }

  async saveManifest(): Promise<void> {
    const manifestPath = path.join(this.context.baseDir, 'manifest.json');
    await fs.promises.writeFile(manifestPath, JSON.stringify(this.context.manifest, null, 2));
  }

  async complete(): Promise<void> {
    this.context.manifest.status = 'completed';
    this.context.manifest.endTime = new Date().toISOString();
    await this.saveManifest();
  }

  async fail(error: Error): Promise<void> {
    this.context.manifest.status = 'failed';
    this.context.manifest.endTime = new Date().toISOString();
    // Log error to manifest or separate error log
    await this.saveManifest();
  }
}
