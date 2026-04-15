import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ToolRouter } from '../../../../src/cowork/runtime/tool-router';

describe('cowork/runtime/tool-router', () => {
  const originalEnv = { ...process.env };
  let sandboxDir: string;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.COWORK_FS_BASE_PATH;

    sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cowork-router-'));
    fs.writeFileSync(path.join(sandboxDir, 'hello.txt'), 'hello');
    fs.mkdirSync(path.join(sandboxDir, 'nested'));
    fs.writeFileSync(path.join(sandboxDir, 'nested', 'inside.txt'), 'inside');
  });

  afterEach(() => {
    fs.rmSync(sandboxDir, { recursive: true, force: true });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('keeps permission gating deny-by-default', async () => {
    const router = new ToolRouter({ fsBasePath: sandboxDir });

    await expect(router.execute('agent-1', 'fs.list', { path: '.' })).rejects.toThrow(
      'does not have permission'
    );
  });

  it('is deny-safe when fs base path is not configured', async () => {
    const router = new ToolRouter();
    router.setAllowlist('agent-1', ['fs.list']);

    await expect(router.execute('agent-1', 'fs.list', { path: '.' })).rejects.toThrow(
      'Filesystem tools are disabled'
    );
  });

  it('supports base path configuration from constructor and allows in-bound reads', async () => {
    const router = new ToolRouter({ fsBasePath: sandboxDir });
    router.setAllowlist('agent-1', ['fs.list', 'fs.read']);

    const entries = await router.execute('agent-1', 'fs.list', { path: '.' });
    const fileContent = await router.execute('agent-1', 'fs.read', { path: 'hello.txt' });

    expect(Array.isArray(entries) ? entries.map((e: any) => e.name ?? e) : (entries.entries || []).map((e: any) => e.name ?? e)).toContain('hello.txt');
    expect(typeof fileContent === 'string' ? fileContent : fileContent.content).toBe('hello');
  });

  it('supports base path configuration from environment variable', async () => {
    process.env.COWORK_FS_BASE_PATH = sandboxDir;
    const router = new ToolRouter();
    router.setAllowlist('agent-1', ['fs.list']);

    const entries = await router.execute('agent-1', 'fs.list', { path: 'nested' });

    expect(Array.isArray(entries) ? entries.map((e: any) => e.name ?? e) : (entries.entries || []).map((e: any) => e.name ?? e)).toContain('inside.txt');
  });

  it('blocks traversal attacks for fs.list', async () => {
    const router = new ToolRouter({ fsBasePath: sandboxDir });
    router.setAllowlist('agent-1', ['fs.list']);

    await expect(router.execute('agent-1', 'fs.list', { path: '../' })).rejects.toThrow(
      'escapes configured filesystem boundary'
    );
  });

  it('blocks traversal attacks for fs.read', async () => {
    const router = new ToolRouter({ fsBasePath: sandboxDir });
    router.setAllowlist('agent-1', ['fs.read']);

    await expect(router.execute('agent-1', 'fs.read', { path: '../secret.txt' })).rejects.toThrow(
      'escapes configured filesystem boundary'
    );
  });
});
