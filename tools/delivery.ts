import * as fs from 'fs';
import * as path from 'path';
import * as archiver from 'archiver';
import axios from 'axios';
import { logToolCall } from './audit';
import { resolveRunContext } from '../src/runtime/run-context';

export async function generateRunbook(architecture: any): Promise<{ runbook: string }> {
  const context = resolveRunContext();
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

  await logToolCall(context.runId, 'delivery.runbook.generate', {
    serviceCount,
    hasDb
  }, {
    runbookLength: runbook.length
  });

  return { runbook };
}

export async function generateNginxConfig(
  environmentMapping: { domain: string; port: number }[]
): Promise<{ config: string }> {
  const context = resolveRunContext();

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

  await logToolCall(context.runId, 'delivery.nginx.generate', {
    mappings: environmentMapping.length
  }, {
    configLength: config.length
  });

  return { config };
}

export async function runSmoketest(url: string): Promise<{ success: boolean; latency: number }> {
  const context = resolveRunContext();
  const startedAt = Date.now();

  try {
    const response = await axios.get(url, {
      timeout: 10000,
      validateStatus: (status) => status >= 200 && status < 500
    });
    const latency = Date.now() - startedAt;
    const success = response.status < 400;

    await logToolCall(context.runId, 'delivery.smoketest.run', { url }, {
      success,
      latency,
      status: response.status
    });

    return { success, latency };
  } catch (error: any) {
    const latency = Date.now() - startedAt;
    await logToolCall(context.runId, 'delivery.smoketest.run', { url }, {
      success: false,
      latency,
      error: error.message
    });
    return { success: false, latency };
  }
}

export async function packageHandoff(artifacts: string[]): Promise<{ handoffPackagePath: string }> {
  const context = resolveRunContext();
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

  await new Promise<void>((resolve, reject) => {
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

  await logToolCall(context.runId, 'delivery.handoff.package', {
    artifactsRequested: artifacts.length
  }, {
    artifactsPackaged: resolvedArtifacts.length,
    handoffPackagePath
  });

  return { handoffPackagePath };
}
