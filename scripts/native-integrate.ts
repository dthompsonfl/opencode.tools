#!/usr/bin/env ts-node
/**
 * OpenCode Tools Native Integration Script
 * 
 * This script runs during npm install to:
 * 1. Build the TypeScript project
 * 2. Register the CLI globally
 * 3. Integrate with OpenCode if available
 * 4. Set up system prompt
 * 
 * IMPORTANT: OpenCode uses ~/.config/opencode/ as its config directory (XDG standard)
 * and configures MCP servers in opencode.json under the "mcp" key.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

const logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ${msg}`),
  success: (msg: string) => console.log(`[SUCCESS] ${msg}`),
  warn: (msg: string) => console.warn(`[WARN] ${msg}`)
};

// Check for opt-in flag - integration only runs with explicit consent
const AUTO_INTEGRATE = process.env.OPENCODE_AUTO_INTEGRATE === '1';

interface IntegrationConfig {
  opencodeConfigDir: string;
  systemPromptPath: string;
  cliPath: string;
}

function getOpenCodeConfigDirectory(): string {
  // Use XDG_CONFIG_HOME standard: ~/.config/opencode/
  const xdgConfig = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(xdgConfig, 'opencode');
}

function getOpenCodeDirectory(): string | null {
  // Check for OpenCode installation in standard locations
  const configDir = getOpenCodeConfigDirectory();
  if (fs.existsSync(configDir)) {
    return configDir;
  }
  
  // Fallback: check legacy locations
  const legacyPaths = [
    path.join(process.env.APPDATA || '', 'OpenCode'),
    path.join(os.homedir(), '.opencode'),
    path.join(os.homedir(), 'OpenCode'),
    '/usr/local/share/opencode',
    '/opt/opencode'
  ];

  for (const dir of legacyPaths) {
    if (fs.existsSync(dir)) {
      // Migrate to XDG standard location if using legacy path
      logger.info(`Found legacy OpenCode at: ${dir}`);
      logger.info(`Migrating to XDG standard: ${configDir}`);
      return dir;
    }
  }

  return null;
}

function integrateWithOpenCode(config: IntegrationConfig): void {
  logger.info('Checking for OpenCode installation...');
  
  const opencodeDir = getOpenCodeDirectory() || getOpenCodeConfigDirectory();
  
  // Ensure config directory exists
  if (!fs.existsSync(opencodeDir)) {
    fs.mkdirSync(opencodeDir, { recursive: true });
    logger.info(`Created OpenCode config directory: ${opencodeDir}`);
  }
  
  logger.success(`Using OpenCode config at: ${opencodeDir}`);

  // Install system prompt
  const promptsDir = path.join(opencodeDir, 'prompts');
  if (!fs.existsSync(promptsDir)) {
    fs.mkdirSync(promptsDir, { recursive: true });
  }

  const systemPromptDest = path.join(promptsDir, 'opencode-tools-system.md');
  const systemPromptSrc = path.join(__dirname, '..', 'opencode-system-prompt.md');
  
  if (fs.existsSync(systemPromptSrc)) {
    fs.copyFileSync(systemPromptSrc, systemPromptDest);
    logger.success(`System prompt installed to: ${systemPromptDest}`);
  } else {
    logger.info('System prompt source not found, skipping');
  }

  // Register MCP server configuration in opencode.json
  // OpenCode uses "mcp" key for MCP server configuration
  const opencodeConfigPath = path.join(opencodeDir, 'opencode.json');
  let opencodeConfig: any = {};
  
  if (fs.existsSync(opencodeConfigPath)) {
    try {
      opencodeConfig = JSON.parse(fs.readFileSync(opencodeConfigPath, 'utf-8'));
    } catch (e) {
      logger.warn('Could not parse existing opencode.json, creating new config');
      opencodeConfig = {};
    }
  }

  // Ensure mcp key exists
  if (!opencodeConfig.mcp) {
    opencodeConfig.mcp = {};
  }

  // Add our MCP server configuration
  // OpenCode expects: type: "local" with command array, or type: "remote" with url
  opencodeConfig.mcp['opencode-tools'] = {
    type: 'local',
    command: ['opencode-tools', 'mcp'],
    description: 'Complete developer team automation - research, docs, architecture, code generation',
    enabled: true
  };

  fs.writeFileSync(opencodeConfigPath, JSON.stringify(opencodeConfig, null, 2));
  logger.success('MCP server configuration added to opencode.json');
  
  // Also copy CLI entry point to make it accessible
  const binDir = path.join(opencodeDir, 'bin');
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }
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

  // Make CLI executable
  try {
    fs.chmodSync(cliPath, 0o755);
    logger.success('CLI permissions set');
  } catch (error) {
    logger.error(`Failed to set CLI permissions: ${error}`);
  }

  // Create symlink if needed (Unix systems)
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
    } catch (error) {
      logger.info('Note: Could not create global symlink. Use "npm link" or install globally.');
    }
  }
}

/**
 * Register any bundled plugin manifests found under the repository's 'vantus_agents' directory into
 * the OpenCode installation (if available).
 */
function registerBundledPlugins(packageRoot: string, opencodeDir: string): void {
  try {
    const agentsDir = path.join(packageRoot, 'vantus_agents');
    if (!fs.existsSync(agentsDir)) return;

    const entries = fs.readdirSync(agentsDir, { withFileTypes: true });
    const registered: string[] = [];

    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const manifestPath = path.join(agentsDir, e.name, 'manifest.json');
      if (!fs.existsSync(manifestPath)) continue;

      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        // Copy manifest into opencode's plugins directory
        // NOTE: OpenCode plugins dir is ~/.config/opencode/plugins/
        const pluginsDir = path.join(opencodeDir, 'plugins');
        if (!fs.existsSync(pluginsDir)) fs.mkdirSync(pluginsDir, { recursive: true });

        const destPath = path.join(pluginsDir, `${manifest.id.replace(/[^a-z0-9_.-]/gi, '_')}.json`);
        fs.writeFileSync(destPath, JSON.stringify(manifest, null, 2));
        registered.push(manifest.id);
      } catch (err) {
        // ignore malformed manifest
      }
    }

    if (registered.length > 0) {
      console.log(`Registered bundled plugins in OpenCode: ${registered.join(', ')}`);
    }
  } catch (err) {
    // best-effort only
  }
}

function displayWelcomeMessage(): void {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║              OpenCode Tools - Installation Complete           ║
║                                                               ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Available commands:                                          ║
║  • opencode-tools research <company>    - Research agent      ║
║  • opencode-tools docs <input>          - Documentation       ║
║  • opencode-tools architect <prd>       - Architecture        ║
║  • opencode-tools pdf <config>          - PDF generation      ║
║  • opencode-tools tui                   - Interactive TUI     ║
║  • opencode-tools orchestrate           - Full team mode      ║
║  • opencode-tools mcp                   - Run MCP server     ║
║                                                               ║
║  Short alias: oct <command>                                   ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
}

function main(): void {
  logger.info('OpenCode Tools Native Integration');
  logger.info('=================================\n');

  // Check for opt-in consent
  if (!AUTO_INTEGRATE) {
    logger.info('OpenCode auto-integration is disabled by default for safety.');
    logger.info('To enable automatic integration, set OPENCODE_AUTO_INTEGRATE=1');
    logger.info('Or run: opencode-tools integrate (for manual integration)');
    logger.info('');
    logger.info('No changes have been made to your system.');
    return;
  }

  try {
    // Setup global CLI
    setupGlobalCLI();

    // Integrate with OpenCode if available
    const configDir = getOpenCodeDirectory() || getOpenCodeConfigDirectory();
    const config: IntegrationConfig = {
      opencodeConfigDir: configDir,
      systemPromptPath: '',
      cliPath: path.join(__dirname, '..', 'dist', 'src', 'cli.js')
    };
    integrateWithOpenCode(config);

    // Discover and register bundled plugin manifests under vantus_agents
    // Use XDG standard location
    const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
    const standardOpencodeDir = path.join(configHome, 'opencode');
    registerBundledPlugins(process.cwd(), standardOpencodeDir);

    // Display welcome
    displayWelcomeMessage();

    logger.success('Integration complete!');
  } catch (error) {
    logger.error(`Integration failed: ${error}`);
    process.exit(1);
  }
}

// Run main if called directly
if (require.main === module) {
  main();
}

export { integrateWithOpenCode, setupGlobalCLI, getOpenCodeConfigDirectory };
