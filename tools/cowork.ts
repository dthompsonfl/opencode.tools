/**
 * Cowork MCP Tools
 * 
 * Exposes Cowork multi-agent runtime capabilities via MCP protocol.
 */

import { CoworkOrchestrator } from '../src/cowork/orchestrator/cowork-orchestrator';
import { CommandRegistry } from '../src/cowork/registries/command-registry';
import { AgentRegistry } from '../src/cowork/registries/agent-registry';
import { loadAllPlugins, loadNativeAgents, discoverPlugins } from '../src/cowork/plugin-loader';
import type { CoworkPlugin } from '../src/cowork/types';

export interface CoworkListInput {
  type?: 'commands' | 'agents' | 'plugins' | 'all';
}

export interface CoworkRunInput {
  commandId: string;
  args?: string[];
}

export interface CoworkSpawnInput {
  agentId: string;
  task: string;
  context?: Record<string, unknown>;
}

export interface CoworkHealthInput {}

/**
 * List Cowork resources (commands, agents, plugins)
 */
export async function coworkList(input: CoworkListInput): Promise<{
  success: boolean;
  commands?: Array<{ id: string; name: string; description: string }>;
  agents?: Array<{ id: string; name: string; description: string; tools?: string[] }>;
  plugins?: Array<{ id: string; name: string; version: string; description?: string }>;
  error?: string;
}> {
  try {
    // Load plugins
    const plugins = loadAllPlugins();
    const commandRegistry = CommandRegistry.getInstance();
    const agentRegistry = AgentRegistry.getInstance();

    // Register plugins
    for (const plugin of plugins) {
      commandRegistry.registerMany(plugin.commands);
      agentRegistry.registerMany(plugin.agents);
    }

    // Load native agents
    const nativeAgents = loadNativeAgents();
    agentRegistry.registerMany(nativeAgents);

    const type = input.type || 'all';

    const result: ReturnType<typeof coworkList> extends Promise<infer T> ? T : never = {
      success: true,
    };

    if (type === 'commands' || type === 'all') {
      result.commands = commandRegistry.list().map(cmd => ({
        id: cmd.id,
        name: cmd.name,
        description: cmd.description || '',
      }));
    }

    if (type === 'agents' || type === 'all') {
      result.agents = agentRegistry.list().map(agent => ({
        id: agent.id,
        name: agent.name,
        description: agent.description || '',
        tools: agent.tools,
      }));
    }

    if (type === 'plugins' || type === 'all') {
      result.plugins = plugins.map(p => ({
        id: p.manifest.id,
        name: p.manifest.name,
        version: p.manifest.version,
        description: p.manifest.description,
      }));
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Run a Cowork command
 */
export async function coworkRun(input: CoworkRunInput): Promise<{
  success: boolean;
  result?: unknown;
  error?: string;
}> {
  try {
    // Initialize plugins
    const plugins = loadAllPlugins();
    const commandRegistry = CommandRegistry.getInstance();
    const agentRegistry = AgentRegistry.getInstance();

    for (const plugin of plugins) {
      commandRegistry.registerMany(plugin.commands);
      agentRegistry.registerMany(plugin.agents);
    }

    const nativeAgents = loadNativeAgents();
    agentRegistry.registerMany(nativeAgents);

    const orchestrator = CoworkOrchestrator.getInstance();
    const result = await orchestrator.execute(input.commandId, input.args);

    return {
      success: result.metadata?.allSucceeded ?? true,
      result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Spawn a Cowork agent
 */
export async function coworkSpawn(input: CoworkSpawnInput): Promise<{
  success: boolean;
  result?: {
    agentId: string;
    agentName: string;
    output: unknown;
    metadata: {
      runId: string;
      timestamp: string;
      success: boolean;
      error?: string;
    };
  };
  error?: string;
}> {
  try {
    // Initialize plugins
    const plugins = loadAllPlugins();
    const agentRegistry = AgentRegistry.getInstance();

    for (const plugin of plugins) {
      agentRegistry.registerMany(plugin.agents);
    }

    const nativeAgents = loadNativeAgents();
    agentRegistry.registerMany(nativeAgents);

    const orchestrator = CoworkOrchestrator.getInstance();
    const result = await orchestrator.spawnAgent(
      input.agentId,
      input.task,
      input.context
    );

    return {
      success: result.metadata.success,
      result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check Cowork health
 */
export async function coworkHealth(_input: CoworkHealthInput): Promise<{
  healthy: boolean;
  components: {
    orchestrator: boolean;
    commandRegistry: boolean;
    agentRegistry: boolean;
    plugins: boolean;
    nativeAgents: boolean;
  };
  counts: {
    plugins: number;
    commands: number;
    agents: number;
    nativeAgents: number;
  };
  errors: string[];
}> {
  const errors: string[] = [];
  const components = {
    orchestrator: false,
    commandRegistry: false,
    agentRegistry: false,
    plugins: false,
    nativeAgents: false,
  };
  const counts = {
    plugins: 0,
    commands: 0,
    agents: 0,
    nativeAgents: 0,
  };

  try {
    // Check plugins
    const plugins = loadAllPlugins();
    counts.plugins = plugins.length;
    components.plugins = true;

    // Check registries
    const commandRegistry = CommandRegistry.getInstance();
    const agentRegistry = AgentRegistry.getInstance();

    // Register and count
    for (const plugin of plugins) {
      commandRegistry.registerMany(plugin.commands);
      agentRegistry.registerMany(plugin.agents);
    }

    counts.commands = commandRegistry.count();
    counts.agents = agentRegistry.size();
    components.commandRegistry = true;
    components.agentRegistry = true;

    // Check native agents
    const nativeAgents = loadNativeAgents();
    counts.nativeAgents = nativeAgents.length;
    components.nativeAgents = true;

    // Check orchestrator
    CoworkOrchestrator.getInstance();
    components.orchestrator = true;
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  const healthy = Object.values(components).every(Boolean);

  return {
    healthy,
    components,
    counts,
    errors,
  };
}

/**
 * Discover available Cowork plugins
 */
export async function coworkPlugins(): Promise<{
  success: boolean;
  plugins: Array<{
    id: string;
    name: string;
    version: string;
    description?: string;
    author?: string;
  }>;
  error?: string;
}> {
  try {
    const manifests = discoverPlugins();

    return {
      success: true,
      plugins: manifests.map(m => ({
        id: m.id,
        name: m.name,
        version: m.version,
        description: m.description,
        author: m.author,
      })),
    };
  } catch (error) {
    return {
      success: false,
      plugins: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get Cowork agent details
 */
export async function coworkAgents(): Promise<{
  success: boolean;
  agents: Array<{
    id: string;
    name: string;
    description: string;
    tools?: string[];
    model?: string;
  }>;
  error?: string;
}> {
  try {
    const plugins = loadAllPlugins();
    const agentRegistry = AgentRegistry.getInstance();

    for (const plugin of plugins) {
      agentRegistry.registerMany(plugin.agents);
    }

    const nativeAgents = loadNativeAgents();
    agentRegistry.registerMany(nativeAgents);

    return {
      success: true,
      agents: agentRegistry.list().map(a => ({
        id: a.id,
        name: a.name,
        description: a.description || '',
        tools: a.tools,
        model: a.model,
      })),
    };
  } catch (error) {
    return {
      success: false,
      agents: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
