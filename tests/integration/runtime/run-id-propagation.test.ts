import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { RunStore } from '../../../src/runtime/run-store';
import { ToolWrapper } from '../../../src/runtime/tool-wrapper';

describe('runtime run-id propagation', () => {
  let sandboxDir: string;

  beforeEach(() => {
    sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-runid-'));
  });

  afterEach(() => {
    fs.rmSync(sandboxDir, { recursive: true, force: true });
  });

  it('propagates runId to wrapped output and audit record', async () => {
    const runStore = new RunStore('run-propagation-001', sandboxDir);
    const wrapper = new ToolWrapper(runStore);

    const result = await wrapper.execute('integration.tool', 'v1', { value: 1 }, async () => {
      return { value: 42 };
    });

    const records = await runStore.getAuditLogger().readAll();
    const parsedRecord = typeof records[0] === 'string' ? JSON.parse(records[0]) : records[0];
    const output = parsedRecord.output as any;

    expect(result).toEqual({ value: 42 });
    expect(records).toHaveLength(1);
    expect(output.runId).toBe('run-propagation-001');
    expect(output.toolName).toBe('integration.tool');
    expect(output.provenance.runtime).toBe('opencode-tools');
  });
});
