#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TOOL_DEFS } from '../tools/mcp/registry';

const logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ${msg}`),
  success: (msg: string) => console.log(`[SUCCESS] ${msg}`),
  warn: (msg: string) => console.warn(`[WARN] ${msg}`),
};

const AUTO_INTEGRATE = process.env.OPENCODE_AUTO_INTEGRATE === '1';

interface IntegrationConfig {
  opencodeConfigDir: string;
  systemPromptPath: string;
  cliPath: string;
}

function getOpenCodeConfigDirectory(): string {
  const xdgConfig = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(xdgConfig, 'opencode');
}

function getOpenCodeDirectory(): string | null {
  const configDir = getOpenCodeConfigDirectory();
  if (fs.existsSync(configDir)) {
    return configDir;
  }

  const legacyPaths = [
    path.join(process.env.APPDATA || '', 'OpenCode'),
    path.join(os.homedir(), '.opencode'),
    path.join(os.homedir(), 'OpenCode'),
    '/usr/local/share/opencode',
    '/opt/opencode',
  ];

  for (const directory of legacyPaths) {
    if (directory && fs.existsSync(directory)) {
      return directory;
    }
  }

  return null;
}

function integrateWithOpenCode(configOrProjectRoot?: IntegrationConfig | string): void {
  logger.info('Integrating with OpenCode...');

  const config = typeof configOrProjectRoot === 'object' && configOrProjectRoot !== null
    ? configOrProjectRoot
    : undefined;
  const packageRoot = typeof configOrProjectRoot === 'string'
    ? configOrProjectRoot
    : path.join(__dirname, '..');

  const opencodeDir = config?.opencodeConfigDir || getOpenCodeDirectory() || getOpenCodeConfigDirectory();
  if (!fs.existsSync(opencodeDir)) {
    fs.mkdirSync(opencodeDir, { recursive: true });
  }

  const opencodeConfigPath = path.join(opencodeDir, 'opencode.json');
  let opencodeConfig: Record<string, unknown> = {};

  if (fs.existsSync(opencodeConfigPath)) {
    try {
      opencodeConfig = JSON.parse(fs.readFileSync(opencodeConfigPath, 'utf-8')) as Record<string, unknown>;
    } catch {
      logger.warn('Could not parse existing opencode.json, creating new config');
    }
  }

  if (!opencodeConfig.mcp || typeof opencodeConfig.mcp !== 'object') {
    opencodeConfig.mcp = {};
  }

  (opencodeConfig.mcp as Record<string, unknown>)['opencode-tools'] = {
    type: 'local',
    command: ['opencode-tools', 'mcp'],
    description: 'Complete developer team automation - research, docs, architecture, code generation',
    enabled: true,
    timeout: 60000,
  };

  if (!opencodeConfig.agent) {
    opencodeConfig.agent = 'foundry';
  }

  fs.writeFileSync(opencodeConfigPath, JSON.stringify(opencodeConfig, null, 2), 'utf-8');
  logger.success('MCP server configuration updated in opencode.json');

  const toolsConfigPath = path.join(opencodeDir, 'opencode-tools.json');
  fs.writeFileSync(
    toolsConfigPath,
    JSON.stringify(
      {
        version: '1.0.0',
        description: 'OpenCode Tools - Complete Developer Team Automation',
        tools: TOOL_DEFS.map((tool) => tool.name),
      },
      null,
      2,
    ),
    'utf-8',
  );
  logger.success('Tool manifest saved to opencode-tools.json');

  registerBundledPlugins(packageRoot, opencodeDir);
}

function setupGlobalCLI(): void {
  logger.info('Setting up global CLI...');

  const packageRoot = path.join(__dirname, '..');
  const cliPath = path.join(packageRoot, 'dist', 'src', 'cli.js');

  if (!fs.existsSync(cliPath)) {
    logger.error(`CLI not found at: ${cliPath}`);
    logger.info('Run "npm run build" first');
    return;
  }

  try {
    fs.chmodSync(cliPath, 0o755);
    logger.success('CLI permissions set');
  } catch (error) {
    logger.error(`Failed to set CLI permissions: ${String(error)}`);
  }

  if (process.platform !== 'win32') {
    try {
      const globalBin = '/usr/local/bin';
      if (fs.existsSync(globalBin)) {
        const symlinkPath = path.join(globalBin, 'opencode-tools');
        if (!fs.existsSync(symlinkPath)) {
          fs.symlinkSync(cliPath, symlinkPath);
          logger.success(`Symlink created: ${symlinkPath} -> ${cliPath}`);
        }
      }
    } catch {
      logger.info('Note: Could not create global symlink. Use "npm link" or install globally.');
    }
  }
}

function registerBundledPlugins(packageRoot: string, opencodeDir: string): void {
  try {
    const agentsDir = path.join(packageRoot, 'vantus_agents');
    if (!fs.existsSync(agentsDir)) {
      return;
    }

    const entries = fs.readdirSync(agentsDir, { withFileTypes: true });
    const registered: string[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const manifestPath = path.join(agentsDir, entry.name, 'manifest.json');
      if (!fs.existsSync(manifestPath)) {
        continue;
      }

      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as { id?: string };
        if (!manifest.id) {
          continue;
        }

        const pluginsDir = path.join(opencodeDir, 'plugins');
        if (!fs.existsSync(pluginsDir)) {
          fs.mkdirSync(pluginsDir, { recursive: true });
        }

        const destPath = path.join(pluginsDir, `${manifest.id.replace(/[^a-z0-9_.-]/gi, '_')}.json`);
        fs.writeFileSync(destPath, JSON.stringify(manifest, null, 2));
        registered.push(manifest.id);
      } catch {
        // ignore malformed manifest
      }
    }

    if (registered.length > 0) {
      logger.success(`Registered bundled plugins in OpenCode: ${registered.join(', ')}`);
    }
  } catch {
    // best-effort only
  }
}

function displayWelcomeMessage(): void {
  console.log('\nOpenCode Tools integration complete.');
}

function main(): void {
  logger.info('OpenCode Tools Native Integration');

  if (!AUTO_INTEGRATE) {
    logger.info('OpenCode auto-integration is disabled by default for safety.');
    logger.info('To enable automatic integration, set OPENCODE_AUTO_INTEGRATE=1');
    logger.info('Or run: opencode-tools integrate (manual integration)');
    return;
  }

  try {
    setupGlobalCLI();

    const configDir = getOpenCodeDirectory() || getOpenCodeConfigDirectory();
    const config: IntegrationConfig = {
      opencodeConfigDir: configDir,
      systemPromptPath: '',
      cliPath: path.join(__dirname, '..', 'dist', 'src', 'cli.js'),
    };
    integrateWithOpenCode(config);

    displayWelcomeMessage();
    logger.success('Integration complete!');
  } catch (error) {
    logger.error(`Integration failed: ${String(error)}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { integrateWithOpenCode, setupGlobalCLI, getOpenCodeConfigDirectory };
