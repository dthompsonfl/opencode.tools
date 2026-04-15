/**
 * Cowork Plugin Loader
 *
 * Loads bundled and user-installed plugins and resolves markdown definitions.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  CoworkPlugin,
  CoworkPluginManifest,
  AgentDefinition,
  CommandDefinition,
  CoworkAgent,
  CoworkSkill,
} from './types';
import {
  parseAgentMarkdown,
  parseCommandMarkdown,
  parseSkillMarkdown,
} from './markdown-parser';
import { logger } from '../runtime/logger';

const XDG_PLUGINS_DIR = path.join(os.homedir(), '.config', 'opencode', 'cowork', 'plugins');
const LEGACY_PLUGINS_DIR = path.join(os.homedir(), '.opencode', 'cowork', 'plugins');

function readJsonFile<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return null;
  }
}

function directoryExists(dirPath: string): boolean {
  try {
    const stat = fs.statSync(dirPath);
    return typeof stat.isDirectory === 'function' ? stat.isDirectory() : false;
  } catch {
    return false;
  }
}

function listDirNames(dirPath: string): string[] {
  if (!directoryExists(dirPath)) {
    return [];
  }

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true }) as Array<
      string | { name: string; isDirectory?: () => boolean; isFile?: () => boolean }
    >;

    const names: string[] = [];
    for (const entry of entries) {
      if (typeof entry === 'string') {
        names.push(entry);
        continue;
      }

      if (!entry || !entry.name) {
        continue;
      }

      names.push(entry.name);
    }

    return names;
  } catch {
    return [];
  }
}

function listSubdirectories(dirPath: string): string[] {
  if (!directoryExists(dirPath)) {
    return [];
  }

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true }) as Array<
      string | { name: string; isDirectory?: () => boolean; isFile?: () => boolean }
    >;

    const dirs: string[] = [];
    for (const entry of entries) {
      if (typeof entry === 'string') {
        const fullPath = path.join(dirPath, entry);
        if (directoryExists(fullPath)) {
          dirs.push(fullPath);
        }
        continue;
      }

      if (!entry || !entry.name) {
        continue;
      }

      const isDirectory = typeof entry.isDirectory === 'function' ? entry.isDirectory() : false;
      if (isDirectory) {
        dirs.push(path.join(dirPath, entry.name));
      }
    }

    return dirs.sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

function createDefaultCommandHandler(command: CommandDefinition) {
  return async (args: string[]) => {
    return {
      success: true,
      data: {
        commandId: command.id,
        args,
        body: command.body || '',
      },
    };
  };
}

function resolveManifest(pluginPath: string): { manifest: CoworkPluginManifest; manifestPath: string } {
  const manifestCandidates = [
    path.join(pluginPath, 'plugin.json'),
    path.join(pluginPath, 'manifest.json'),
  ];

  for (const manifestPath of manifestCandidates) {
    const manifest = readJsonFile<CoworkPluginManifest>(manifestPath);
    if (manifest) {
      if (!manifest.id || !manifest.name || !manifest.version) {
        throw new Error(`missing required manifest fields in ${manifestPath}`);
      }

      return { manifest, manifestPath };
    }
  }

  throw new Error(`no valid plugin.json or manifest.json found in ${pluginPath}`);
}

function loadCommands(pluginPath: string): CommandDefinition[] {
  const commandsDir = path.join(pluginPath, 'commands');
  if (!directoryExists(commandsDir)) {
    return [];
  }

  const commands: CommandDefinition[] = [];
  for (const name of listDirNames(commandsDir)) {
    if (!name.endsWith('.md')) {
      continue;
    }

    const fullPath = path.join(commandsDir, name);
    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const id = path.basename(name, '.md');
      commands.push(parseCommandMarkdown(content, id));
    } catch (error) {
      logger.warn(`Failed to parse command markdown: ${fullPath}`, error);
    }
  }

  return commands;
}

function loadAgents(pluginPath: string): CoworkAgent[] {
  const agentsDir = path.join(pluginPath, 'agents');
  if (!directoryExists(agentsDir)) {
    return [];
  }

  const agents: CoworkAgent[] = [];
  for (const name of listDirNames(agentsDir)) {
    if (!name.endsWith('.md')) {
      continue;
    }

    const fullPath = path.join(agentsDir, name);
    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const id = path.basename(name, '.md');
      const parsed = parseAgentMarkdown(content, id);
      agents.push({
        id: parsed.id,
        name: parsed.name,
        description: parsed.description,
        tools: parsed.tools,
        model: parsed.model,
        body: parsed.body,
        execute: async (task: string, context?: unknown) => {
          return {
            success: true,
            data: {
              task,
              context,
              prompt: parsed.body || '',
            },
            message: `${parsed.name} completed task`,
          };
        },
      });
    } catch (error) {
      logger.warn(`Failed to parse agent markdown: ${fullPath}`, error);
    }
  }

  return agents;
}

function loadSkills(pluginPath: string): CoworkSkill[] {
  const skillsDir = path.join(pluginPath, 'skills');
  if (!directoryExists(skillsDir)) {
    return [];
  }

  const skills: CoworkSkill[] = [];
  for (const name of listDirNames(skillsDir)) {
    if (!name.endsWith('.md')) {
      continue;
    }

    const fullPath = path.join(skillsDir, name);
    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const id = path.basename(name, '.md');
      const parsed = parseSkillMarkdown(content, id);
      skills.push({
        id: parsed.id,
        name: parsed.name,
        description: parsed.description || parsed.body || parsed.name,
        execute: async (input: unknown) => {
          return {
            skillId: parsed.id,
            input,
            body: parsed.body || '',
          };
        },
      });
    } catch (error) {
      logger.warn(`Failed to parse skill markdown: ${fullPath}`, error);
    }
  }

  return skills;
}

/**
 * Get the bundled plugins directory path.
 * 
 * Returns the appropriate path based on whether the code is running
 * from source (development) or from a built/installed package (production).
 */
export function getBundledPluginsDir(): string {
  // Check if we're running from a built package (production) or source (development)
  // In production: __dirname is like dist/src/cowork/, so we go to dist/assets/cowork/plugins
  // In development: __dirname is like src/cowork/, so we go to src/cowork/plugins
  
  const isProduction = __dirname.includes('dist' + path.sep);
  
  if (isProduction) {
    // Running from built package - use dist/assets/cowork/plugins
    const projectRoot = path.resolve(__dirname, '..', '..', '..');
    return path.join(projectRoot, 'dist', 'assets', 'cowork', 'plugins');
  } else {
    // Running from source - use src/cowork/plugins
    const projectRoot = path.resolve(__dirname, '..', '..', '..');
    return path.join(projectRoot, 'src', 'cowork', 'plugins');
  }
}

/**
 * Get the preferred system plugins directory path.
 *
 * Returns XDG path when present, otherwise legacy path.
 */
export function getSystemPluginsDir(): string {
  if (directoryExists(XDG_PLUGINS_DIR)) {
    return XDG_PLUGINS_DIR;
  }
  return LEGACY_PLUGINS_DIR;
}

function getSystemPluginDirectories(): string[] {
  const dirs = [XDG_PLUGINS_DIR, LEGACY_PLUGINS_DIR];
  const unique = Array.from(new Set(dirs));
  return unique.filter((dirPath) => directoryExists(dirPath));
}

/**
 * Parse JSONC (JSON with Comments) content.
 * Strips single-line (//) and multi-line (/* * /) comments.
 */
function parseJsonc<T>(content: string): T | null {
  try {
    // Remove single-line comments
    let cleaned = content.replace(/\/\/.*$/gm, '');
    // Remove multi-line comments
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

/**
 * Read a JSON or JSONC file.
 */
function readJsonOrJsoncFile<T>(filePath: string): T | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    // Try standard JSON first
    try {
      return JSON.parse(content) as T;
    } catch {
      // Fall back to JSONC parsing
      return parseJsonc<T>(content);
    }
  } catch {
    return null;
  }
}

/**
 * Load native agents from OpenCode configuration.
 *
 * Supports both official OpenCode schema (`agent` singular) and legacy (`agents` plural).
 * Configuration files are loaded in order of precedence:
 * 1. ~/.config/opencode/opencode.json (official)
 * 2. ~/.config/opencode/opencode.jsonc (official with comments)
 * 3. ~/.config/opencode/opencode-tools.json (legacy)
 *
 * Also supports loading from global agents directory:
 * ~/.config/opencode/agents/*.md
 */
export function loadNativeAgents(): AgentDefinition[] {
  const configDir = path.join(os.homedir(), '.config', 'opencode');
  const officialConfigPath = path.join(configDir, 'opencode.json');
  const officialConfigPathJsonc = path.join(configDir, 'opencode.jsonc');
  const legacyConfigPath = path.join(configDir, 'opencode-tools.json');

  // Type for config that supports both `agent` (official) and `agents` (legacy)
  type ConfigWithAgents = {
    agent?: Record<string, unknown>;
    agents?: Record<string, unknown>;
  };

  let config: ConfigWithAgents | null = null;
  let agentSource = '';

  // Try official config first (JSON and JSONC)
  config = readJsonOrJsoncFile<ConfigWithAgents>(officialConfigPath);
  if (config) {
    agentSource = officialConfigPath;
  }

  if (!config) {
    config = readJsonOrJsoncFile<ConfigWithAgents>(officialConfigPathJsonc);
    if (config) {
      agentSource = officialConfigPathJsonc;
    }
  }

  // Fall back to legacy config
  if (!config) {
    config = readJsonOrJsoncFile<ConfigWithAgents>(legacyConfigPath);
    if (config) {
      agentSource = legacyConfigPath;
    }
  }

  // Support both `agent` (official OpenCode schema) and `agents` (legacy)
  const agentsConfig = config?.agent ?? config?.agents;

  const agents: AgentDefinition[] = [];

  // Load from config file
  if (agentsConfig && typeof agentsConfig === 'object') {
    for (const [id, rawConfig] of Object.entries(agentsConfig)) {
      if (!rawConfig || typeof rawConfig !== 'object') {
        continue;
      }

      const agentConfig = rawConfig as Record<string, unknown>;
      const tools: string[] = [];

      const toolMap = agentConfig.tools;
      if (toolMap && typeof toolMap === 'object') {
        for (const [toolName, enabled] of Object.entries(toolMap as Record<string, unknown>)) {
          if (enabled === true) {
            tools.push(toolName);
          }
        }
      }

      const formattedName = id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, ' ') + ' Agent';

      agents.push({
        id,
        name: formattedName,
        description: typeof agentConfig.description === 'string' ? agentConfig.description : '',
        body: typeof agentConfig.prompt === 'string' ? agentConfig.prompt : '',
        tools,
        model: typeof agentConfig.model === 'string' ? agentConfig.model : undefined,
        color: 'blue',
      });
    }
  }

  // Also load from global agents directory (~/.config/opencode/agents/*.md)
  const globalAgentsDir = path.join(configDir, 'agents');
  if (directoryExists(globalAgentsDir)) {
    for (const name of listDirNames(globalAgentsDir)) {
      if (!name.endsWith('.md')) {
        continue;
      }

      const fullPath = path.join(globalAgentsDir, name);
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const id = path.basename(name, '.md');
        const parsed = parseAgentMarkdown(content, id);

        // Don't override if already loaded from config
        if (!agents.find(a => a.id === id)) {
          agents.push({
            id: parsed.id,
            name: parsed.name,
            description: parsed.description,
            body: parsed.body,
            tools: parsed.tools,
            model: parsed.model,
            color: 'blue',
          });
        }
      } catch (error) {
        logger.warn(`Failed to parse global agent markdown: ${fullPath}`, error);
      }
    }
  }

  if (agents.length > 0) {
    logger.info(`Loaded ${agents.length} native agent(s) from ${agentSource || 'global agents directory'}`);
  }

  return agents;
}

/**
 * Load a single plugin from a directory.
 */
export function loadPlugin(pluginPath: string): CoworkPlugin {
  const { manifest } = resolveManifest(pluginPath);

  const commands = loadCommands(pluginPath).map((command) => ({
    ...command,
    handler: command.handler || createDefaultCommandHandler(command),
  }));
  const agents = loadAgents(pluginPath);
  const skills = loadSkills(pluginPath);

  const plugin: CoworkPlugin = {
    manifest,
    commands,
    agents,
    skills,
    hooks: [],
    rootPath: pluginPath,
  };

  const indexPath = path.join(pluginPath, 'index.js');
  try {
    const stat = fs.statSync(indexPath);
    const isFile = typeof stat.isFile === 'function' ? stat.isFile() : false;
    if (isFile) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pluginModule = require(indexPath) as Record<string, unknown>;

      if (typeof pluginModule.init === 'function') {
        (pluginModule.init as (pluginDef: CoworkPlugin) => void)(plugin);
      }

      if (Array.isArray(pluginModule.commands)) {
        plugin.commands = pluginModule.commands as CoworkPlugin['commands'];
      }
      if (Array.isArray(pluginModule.agents)) {
        plugin.agents = pluginModule.agents as CoworkPlugin['agents'];
      }
      if (Array.isArray(pluginModule.skills)) {
        plugin.skills = pluginModule.skills as CoworkPlugin['skills'];
      }
      if (Array.isArray(pluginModule.hooks)) {
        plugin.hooks = pluginModule.hooks as CoworkPlugin['hooks'];
      }
    }
  } catch {
    // Index module is optional.
  }

  return plugin;
}

function loadPluginsFromDirectory(pluginRoot: string): CoworkPlugin[] {
  const plugins: CoworkPlugin[] = [];
  for (const pluginDir of listSubdirectories(pluginRoot)) {
    try {
      plugins.push(loadPlugin(pluginDir));
    } catch (error) {
      logger.warn(`Failed to load plugin from ${pluginDir}:`, error);
    }
  }
  return plugins;
}

/**
 * Load all available plugins from bundled and system locations.
 */
export function loadAllPlugins(): CoworkPlugin[] {
  const mergedPlugins = new Map<string, CoworkPlugin>();

  // Bundled first.
  const bundledDir = getBundledPluginsDir();
  const bundledPlugins = loadPluginsFromDirectory(bundledDir);
  for (const plugin of bundledPlugins) {
    mergedPlugins.set(plugin.manifest.id, plugin);
  }

  // System plugins override bundled plugins by id.
  for (const systemDir of getSystemPluginDirectories()) {
    const systemPlugins = loadPluginsFromDirectory(systemDir);
    for (const plugin of systemPlugins) {
      mergedPlugins.set(plugin.manifest.id, plugin);
    }
  }

  const plugins = Array.from(mergedPlugins.values()).sort((a, b) => {
    return a.manifest.id.localeCompare(b.manifest.id);
  });

  logger.info(`Loaded ${plugins.length} plugin(s)`);
  return plugins;
}

/**
 * Discover plugin manifests without fully loading plugin modules.
 */
export function discoverPlugins(): CoworkPluginManifest[] {
  const manifests = new Map<string, CoworkPluginManifest>();
  const pluginRoots = [getBundledPluginsDir(), ...getSystemPluginDirectories()];

  for (const root of pluginRoots) {
    for (const pluginDir of listSubdirectories(root)) {
      try {
        const { manifest } = resolveManifest(pluginDir);
        manifests.set(manifest.id, manifest);
      } catch {
        // Ignore invalid manifests during discovery.
      }
    }
  }

  return Array.from(manifests.values()).sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Register a plugin dynamically.
 */
export function registerPlugin(plugin: CoworkPlugin): void {
  logger.info(`Registering plugin: ${plugin.manifest.name} (${plugin.manifest.version})`);
}
