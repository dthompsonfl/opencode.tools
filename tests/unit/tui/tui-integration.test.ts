import { AgentRegistry } from '../../../src/cowork/registries/agent-registry';
import { CommandRegistry } from '../../../src/cowork/registries/command-registry';
import { createResearchCommand } from '../../../src/tui-commands';
import { registerTUITools } from '../../../src/tui-integration';

describe('TUI integration runtime handlers', () => {
  beforeEach(() => {
    CommandRegistry.getInstance().clear();
    AgentRegistry.getInstance().clear();
  });

  it('dispatches architecture tool into cowork runtime adapter', async () => {
    const runAgent = jest.fn(async () => ({ ok: true }));

    const tools = registerTUITools({
      manifests: [],
      pluginLoader: () => [],
      runtimeAdapters: {
        cowork: {
          executeCommand: jest.fn(async () => ({ ok: true })),
          runAgent,
        },
      },
    });

    const architectureTool = tools.find((tool) => tool.id === 'architecture-agent');
    expect(architectureTool).toBeDefined();

    const result = await architectureTool!.handler({ task: 'Design service boundaries', context: { service: 'billing' } });

    expect(runAgent).toHaveBeenCalledWith('architecture-agent', 'Design service boundaries', { service: 'billing' });
    expect(result.success).toBe(true);
    expect(result.runtime).toBe('cowork');
  });

  it('registers cowork command tools with structured results', async () => {
    const executeCommand = jest.fn(async () => ({ merged: true }));

    const tools = registerTUITools({
      manifests: [],
      runtimeAdapters: {
        cowork: {
          executeCommand,
          runAgent: jest.fn(async () => ({ ok: true })),
        },
      },
      pluginLoader: () => [
        {
          manifest: { id: 'plugin.test', name: 'Plugin Test', version: '1.0.0' },
          rootPath: '.',
          commands: [
            {
              id: 'sync-status',
              name: 'Sync Status',
              description: 'Sync command',
              handler: async () => ({ success: true }),
              body: 'echo sync',
            },
          ],
          agents: [],
          skills: [],
          hooks: [],
        },
      ],
    });

    const commandTool = tools.find((tool) => tool.id === 'cowork:command:sync-status');
    expect(commandTool).toBeDefined();

    const result = await commandTool!.handler({ args: ['--json'] });

    expect(executeCommand).toHaveBeenCalledWith('sync-status', ['--json']);
    expect(result.success).toBe(true);
    expect(result.runtime).toBe('cowork');
  });

  it('uses injected prompt adapter and executor in research command', async () => {
    const executeTool = jest.fn(async () => ({
      success: true,
      runtime: 'native-agent' as const,
      toolId: 'research-agent',
      message: 'ok',
    }));

    const researchCommand = createResearchCommand({
      promptAdapter: {
        prompt: jest
          .fn()
          .mockResolvedValueOnce('Acme')
          .mockResolvedValueOnce('FinTech')
          .mockResolvedValueOnce('Optional description'),
        pickFile: jest.fn(async () => null),
      },
      executeTool,
    });

    const quickAction = researchCommand.menu.options.find((option) => option.key === '3');
    expect(quickAction).toBeDefined();

    const result = await quickAction!.action();

    expect(executeTool).toHaveBeenCalledWith('research-agent', {
      mode: 'quick',
      company: 'Acme',
      industry: 'FinTech',
      description: 'Optional description',
    });
    expect(result).toBeDefined();
  });
});
