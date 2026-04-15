import { TUIResearchAgent } from './tui-agents';
import { TUIArchitectureAgent } from './tui-agents/tui-architecture-agent';
import { TUICodeGenAgent } from './tui-agents/tui-codegen-agent';
import { ResearchParams } from './tui-agents';
import type { ResearchResult } from './tui-agents';
import { discoverBundledPlugins, PluginManifest } from './plugins/discovery';
import { loadAllPlugins } from './cowork/plugin-loader';
import { CommandRegistry } from './cowork/registries/command-registry';
import { AgentRegistry } from './cowork/registries/agent-registry';
import { CoworkOrchestrator } from './cowork/orchestrator/cowork-orchestrator';
import { FoundryOrchestrator, createFoundryExecutionRequest } from './foundry/orchestrator';

export interface TUITool {
  id: string;
  name: string;
  description: string;
  category: 'research' | 'documentation' | 'codegen' | 'qa' | 'delivery' | 'cowork';
  handler: (args: unknown) => Promise<TUIExecutionResult>;
  parameters?: TUIParameter[];
}

export interface TUIParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  required: boolean;
  description: string;
  default?: unknown;
}

export interface TUIExecutionResult {
  success: boolean;
  runtime: 'native-agent' | 'cowork' | 'foundry' | 'plugin';
  toolId: string;
  message: string;
  data?: unknown;
  error?: string;
}

export interface CoworkRuntimeAdapter {
  executeCommand(commandId: string, args: string[]): Promise<unknown>;
  runAgent(agentId: string, task: string, context?: Record<string, unknown>): Promise<unknown>;
}

export interface FoundryRuntimeAdapter {
  runWorkflow(intent: string, repoRoot?: string): Promise<unknown>;
}

export interface TUIRuntimeAdapters {
  cowork: CoworkRuntimeAdapter;
  foundry: FoundryRuntimeAdapter;
}

export interface RegisterTUIToolsOptions {
  runtimeAdapters?: Partial<TUIRuntimeAdapters>;
  manifests?: PluginManifest[];
  pluginLoader?: typeof loadAllPlugins;
}

interface ResearchArgs {
  mode: 'interactive' | 'brief' | 'quick';
  briefPath?: string;
  outputPath?: string;
  company?: string;
  industry?: string;
  description?: string;
  goals?: string[];
  constraints?: string[];
  timeline?: string;
  keywords?: string[];
}

const defaultRuntimeAdapters: TUIRuntimeAdapters = {
  cowork: {
    async executeCommand(commandId: string, args: string[]): Promise<unknown> {
      const orchestrator = new CoworkOrchestrator();
      return orchestrator.execute(commandId, args);
    },
    async runAgent(agentId: string, task: string, context?: Record<string, unknown>): Promise<unknown> {
      const orchestrator = new CoworkOrchestrator();
      return orchestrator.spawnAgent(agentId, task, context);
    },
  },
  foundry: {
    async runWorkflow(intent: string, repoRoot?: string): Promise<unknown> {
      const foundry = new FoundryOrchestrator();
      const request = createFoundryExecutionRequest(intent, repoRoot || process.cwd(), true);
      return foundry.execute(request);
    },
  },
};

export function registerTUITools(options: RegisterTUIToolsOptions = {}): TUITool[] {
  const tools: TUITool[] = [];
  const runtime: TUIRuntimeAdapters = {
    cowork: options.runtimeAdapters?.cowork || defaultRuntimeAdapters.cowork,
    foundry: options.runtimeAdapters?.foundry || defaultRuntimeAdapters.foundry,
  };
  const pluginLoader = options.pluginLoader || loadAllPlugins;

  tools.push({
    id: 'research-agent',
    name: 'Research Agent',
    description: 'Automated client and industry research with competitor analysis',
    category: 'research',
    handler: async (args: unknown) => runResearch(args),
    parameters: [
      {
        name: 'mode',
        type: 'string',
        required: true,
        description: 'Research mode: interactive, brief, or quick',
        default: 'interactive',
      },
    ],
  });

  tools.push({
    id: 'architecture-agent',
    name: 'Architecture Agent',
    description: 'System design and backlog generation',
    category: 'documentation',
    handler: async (args: unknown) => {
      const payload = asObject(args);
      const task = asString(payload.task) || 'Generate architecture and backlog from available context';
      const context = asObject(payload.context);
      try {
        const result = await runtime.cowork.runAgent('architecture-agent', task, context);
        return okResult('architecture-agent', 'cowork', 'Architecture agent completed via Cowork runtime', result);
      } catch {
        const agent = new TUIArchitectureAgent();
        await agent.runInteractive();
        return okResult('architecture-agent', 'native-agent', 'Architecture agent completed in interactive fallback mode');
      }
    },
  });

  tools.push({
    id: 'codegen-agent',
    name: 'CodeGen Agent',
    description: 'Feature scaffolding and code generation',
    category: 'codegen',
    handler: async (args: unknown) => {
      const payload = asObject(args);
      const task = asString(payload.task) || 'Generate implementation scaffolding for the active task';
      const context = asObject(payload.context);
      try {
        const result = await runtime.cowork.runAgent('codegen-agent', task, context);
        return okResult('codegen-agent', 'cowork', 'CodeGen agent completed via Cowork runtime', result);
      } catch {
        const agent = new TUICodeGenAgent();
        await agent.runInteractive();
        return okResult('codegen-agent', 'native-agent', 'CodeGen agent completed in interactive fallback mode');
      }
    },
  });

  tools.push({
    id: 'foundry:orchestrate',
    name: 'Foundry Orchestrator',
    description: 'Run Foundry orchestration workflow from the TUI',
    category: 'delivery',
    handler: async (args: unknown) => {
      const payload = asObject(args);
      const intent = asString(payload.intent) || asString(payload.project) || 'Enterprise implementation workflow';
      const report = await runtime.foundry.runWorkflow(intent, asString(payload.repoRoot));
      return okResult('foundry:orchestrate', 'foundry', 'Foundry workflow completed', report);
    },
  });

  const manifests = options.manifests || discoverBundledPlugins();
  for (const manifest of manifests) {
    const toolId = manifest.id || `plugin:${manifest.name}`;
    const toolName = manifest.name || toolId;
    const description = `Plugin adapterType=${manifest.adapterType} capabilities=${(manifest.capabilities || []).join(', ') || 'none'}`;

    tools.push({
      id: toolId,
      name: toolName,
      description,
      category: 'research',
      handler: async (args: unknown) => {
        const payload = asObject(args);
        return okResult(toolId, 'plugin', 'Plugin manifest metadata loaded', {
          manifest,
          runRequested: Boolean(payload.run),
        });
      },
    });
  }

  try {
    const plugins = pluginLoader();
    const commandRegistry = CommandRegistry.getInstance();
    const agentRegistry = AgentRegistry.getInstance();

    for (const plugin of plugins) {
      commandRegistry.registerMany(plugin.commands);
      agentRegistry.registerMany(plugin.agents);
    }

    const commands = commandRegistry.list();
    for (const cmd of commands) {
      tools.push({
        id: `cowork:command:${cmd.id}`,
        name: cmd.name,
        description: cmd.description,
        category: 'cowork',
        handler: async (args: unknown) => {
          const payload = asObject(args);
          const commandArgs = asStringArray(payload._ || payload.args);
          const result = await runtime.cowork.executeCommand(cmd.id, commandArgs);
          return okResult(`cowork:command:${cmd.id}`, 'cowork', `Executed command ${cmd.id}`, result);
        },
        parameters: [
          {
            name: 'args',
            type: 'array',
            required: false,
            description: cmd.argumentHint || 'Command arguments',
          },
        ],
      });
    }

    const agents = agentRegistry.list();
    for (const agent of agents) {
      tools.push({
        id: `cowork:agent:${agent.id}`,
        name: agent.name,
        description: agent.description,
        category: 'cowork',
        handler: async (args: unknown) => {
          const payload = asObject(args);
          const task = asString(payload.task) || `Execute ${agent.name}`;
          const context = asObject(payload.context);
          const result = await runtime.cowork.runAgent(agent.id, task, context);
          return okResult(`cowork:agent:${agent.id}`, 'cowork', `Executed agent ${agent.id}`, result);
        },
        parameters: [
          {
            name: 'task',
            type: 'string',
            required: true,
            description: 'Task prompt for the agent',
          },
          {
            name: 'context',
            type: 'array',
            required: false,
            description: 'Additional context data',
          },
        ],
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    tools.push({
      id: 'cowork:load-error',
      name: 'Cowork Load Error',
      description: 'Cowork plugin loading failed',
      category: 'cowork',
      handler: async () => failResult('cowork:load-error', 'cowork', `Failed to load Cowork plugins: ${message}`),
    });
  }

  return tools;
}

export class TUIResearchAgentExtended extends TUIResearchAgent {
  async runWithBriefFile(briefPath: string, _outputPath?: string): Promise<unknown> {
    const fsModule = await import('fs');
    const briefContent = await fsModule.promises.readFile(briefPath, 'utf-8');
    const brief = JSON.parse(briefContent) as Record<string, unknown>;

    const params: ResearchParams = {
      company: asString(brief.company) || '',
      industry: asString(brief.industry) || '',
      description: asString(brief.description),
      goals: asStringArray(brief.goals),
      constraints: asStringArray(brief.constraints),
      timeline: asString(brief.timeline),
      keywords: asStringArray(brief.keywords),
      urls: asStringArray(brief.urls),
      priorNotes: asString(brief.priorNotes),
    };

    return this.runWithParams(params);
  }

  async runWithParams(params: ResearchParams): Promise<ResearchResult> {
    return super.runWithParams(params);
  }
}

async function runResearch(args: unknown): Promise<TUIExecutionResult> {
  const payload = asObject(args);
  const mode = asString(payload.mode) as ResearchArgs['mode'] | undefined;
  const agent = new TUIResearchAgentExtended();

  try {
    if (mode === 'interactive') {
      await agent.runInteractive();
      return okResult('research-agent', 'native-agent', 'Research completed in interactive mode');
    }

    const briefPath = asString(payload.briefPath);
    const outputPath = asString(payload.outputPath);
    if (mode === 'brief' && briefPath) {
      const result = await agent.runWithBriefFile(briefPath, outputPath);
      return okResult('research-agent', 'native-agent', 'Research completed from brief file', result);
    }

    const company = asString(payload.company);
    const industry = asString(payload.industry);
    if (mode === 'quick' && company && industry) {
      const params: ResearchParams = {
        company,
        industry,
        description: asString(payload.description),
        goals: asStringArray(payload.goals),
        constraints: asStringArray(payload.constraints),
        timeline: asString(payload.timeline),
        keywords: asStringArray(payload.keywords),
      };
      const result = await agent.runWithParams(params);
      return okResult('research-agent', 'native-agent', 'Research completed in quick mode', result);
    }

    return failResult('research-agent', 'native-agent', 'Invalid research parameters');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return failResult('research-agent', 'native-agent', message);
  }
}

function okResult(toolId: string, runtime: TUIExecutionResult['runtime'], message: string, data?: unknown): TUIExecutionResult {
  return {
    success: true,
    runtime,
    toolId,
    message,
    data,
  };
}

function failResult(toolId: string, runtime: TUIExecutionResult['runtime'], errorMessage: string): TUIExecutionResult {
  return {
    success: false,
    runtime,
    toolId,
    message: errorMessage,
    error: errorMessage,
  };
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0);
}
