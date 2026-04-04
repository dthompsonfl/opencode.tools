import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ToolResponseEnvelopeSchema, normalizeToolResponseEnvelope } from '../../../src/runtime/tool-response';
import { generateBacklog } from '../../../tools/architecture';
import { generateRunbook } from '../../../tools/delivery';

describe('tool contracts', () => {
  const originalCwd = process.cwd();
  const originalEnv = { ...process.env };
  let sandboxDir: string;

  beforeEach(() => {
    sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tool-contracts-'));
    process.chdir(sandboxDir);
    process.env.OPENCODE_RUN_ID = 'tool-contract-run';
  });

  afterEach(() => {
    process.chdir(originalCwd);
    process.env = { ...originalEnv };
    fs.rmSync(sandboxDir, { recursive: true, force: true });
  });

  it('wraps tool output in strict envelope', () => {
    const envelope = normalizeToolResponseEnvelope('contracts.example', { message: 'ok' });
    const parsed = ToolResponseEnvelopeSchema.parse(envelope);

    expect(parsed.runId).toBe('tool-contract-run');
    expect(parsed.toolName).toBe('contracts.example');
    expect(parsed.data).toEqual({ message: 'ok' });
    expect(parsed.provenance.runtime).toBe('opencode-tools');
  });

  it('generates backlog grounded in architecture components', async () => {
    const result = await generateBacklog({
      components: [{ name: 'Billing Service' }, { name: 'Auth Service' }],
      dataModel: { entities: [{ name: 'Invoice' }] }
    });

    const serviceEpic = result.epics.find((epic) => epic.id === 'epic-services');
    expect(serviceEpic).toBeDefined();
    expect(serviceEpic.stories.some((story: any) => story.title.includes('Billing Service'))).toBe(true);
  });

  it('generates runbook with derived architecture metrics', async () => {
    const runbook = await generateRunbook({
      components: [{ name: 'Gateway' }, { name: 'Worker' }],
      dataModel: { entities: [{ name: 'User' }] }
    });

    expect(runbook.runbook).toContain('2 components detected');
    expect(runbook.runbook).toContain('Data layer required: yes');

    const manifestPath = path.join(sandboxDir, 'runs', 'tool-contract-run', 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as any[];
    expect(manifest[0].runId).toBe('tool-contract-run');
    expect(manifest[0].toolName).toBeDefined();
    expect(manifest[0].provenance.runtime).toBe('opencode-tools');
  });
});
