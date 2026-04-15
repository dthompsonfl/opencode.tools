#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');

// Check for opt-in flag
const AUTO_INTEGRATE = process.env.OPENCODE_AUTO_INTEGRATE === '1';

const logger = {
  info: (m) => console.log('[INFO] ' + m),
  error: (m) => console.error('[ERROR] ' + m),
  success: (m) => console.log('[SUCCESS] ' + m)
};

function getOpenCodeDirectory() {
  const possible = [
    path.join(process.env.APPDATA || '', 'OpenCode'),
    path.join(os.homedir(), '.opencode'),
    path.join(os.homedir(), 'OpenCode'),
    '/usr/local/share/opencode',
    '/opt/opencode'
  ];
  for (const p of possible) {
    try { if (p && fs.existsSync(p)) return p; } catch (e) {}
  }
  return path.join(os.homedir(), '.opencode');
}

function integrateWithOpenCode(packageRoot) {
  // Check for opt-in flag
  if (!AUTO_INTEGRATE) {
    logger.info('OpenCode auto-integration is disabled by default.');
    logger.info('To enable, run with: OPENCODE_AUTO_INTEGRATE=1 npm install');
    logger.info('Or use: opencode-tools integrate');
    return;
  }
  
  const opencodeDir = getOpenCodeDirectory();
  if (!opencodeDir) {
    logger.info('OpenCode not found; skipping integration');
    return;
  }

  logger.success(`Found OpenCode at: ${opencodeDir}`);

  // Install system prompt if present
  const promptsDir = path.join(opencodeDir, 'prompts');
  if (!fs.existsSync(promptsDir)) fs.mkdirSync(promptsDir, { recursive: true });
  const systemPromptSrc = path.join(packageRoot, 'opencode-system-prompt.md');
  const systemPromptDest = path.join(promptsDir, 'opencode-tools-system.md');
  if (fs.existsSync(systemPromptSrc)) {
    try { fs.copyFileSync(systemPromptSrc, systemPromptDest); logger.success(`System prompt installed to: ${systemPromptDest}`); } catch(e) {}
  }

  // Register MCP server configuration
  const mcpConfigPath = path.join(opencodeDir, 'mcp.json');
  let mcpConfig = { servers: {} };
  if (fs.existsSync(mcpConfigPath)) {
    try { mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf-8')); } catch(e) {}
  }

  mcpConfig.servers = mcpConfig.servers || {};
  mcpConfig.servers['opencode-tools'] = {
    name: 'OpenCode Tools',
    type: 'stdio',
    command: 'opencode-tools',
    args: ['mcp'],
    description: 'Complete developer team automation'
  };

  try { fs.writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2)); logger.success('MCP server configuration updated'); } catch(e) {}

  // Register bundled plugin manifests
  registerBundledPlugins(packageRoot, opencodeDir);

  // Attempt to create global symlink for CLI if dist exists
  try {
    const cliPath = path.join(packageRoot, 'dist', 'src', 'cli.js');
    if (fs.existsSync(cliPath) && process.platform !== 'win32') {
      const globalBin = '/usr/local/bin';
      if (fs.existsSync(globalBin)) {
        const symlinkPath = path.join(globalBin, 'opencode-tools');
        if (!fs.existsSync(symlinkPath)) {
          fs.symlinkSync(cliPath, symlinkPath);
          logger.success(`Symlink created: ${symlinkPath} -> ${cliPath}`);
        }
      }
    }
  } catch (e) {
    // best-effort
  }
}

function registerBundledPlugins(packageRoot, opencodeDir) {
  const agentsDir = path.join(packageRoot, 'vantus_agents');
  if (!fs.existsSync(agentsDir)) return;
  const entries = fs.readdirSync(agentsDir, { withFileTypes: true });
  const registered = [];
  const pluginsDir = path.join(opencodeDir, 'plugins');
  if (!fs.existsSync(pluginsDir)) fs.mkdirSync(pluginsDir, { recursive: true });
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const manifestPath = path.join(agentsDir, e.name, 'manifest.json');
    if (!fs.existsSync(manifestPath)) continue;
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      const destName = (manifest.id || e.name).replace(/[^a-z0-9_.-]/gi, '_') + '.json';
      const destPath = path.join(pluginsDir, destName);
      fs.writeFileSync(destPath, JSON.stringify(manifest, null, 2));
      registered.push(manifest.id || e.name);
    } catch (err) {
      // skip
    }
  }
  if (registered.length > 0) logger.success(`Registered bundled plugins in OpenCode: ${registered.join(', ')}`);
}

function main(args = []) {
  const packageRoot = process.cwd();
  
  // Check for manual integration flag
  const manual = args.includes('--manual') || args.includes('-m');
  
  if (manual || AUTO_INTEGRATE) {
    try { 
      integrateWithOpenCode(packageRoot); 
      logger.success('Integration complete!'); 
    } catch (err) { 
      logger.error('Integration failed: ' + err); 
      process.exit(1); 
    }
  } else {
    logger.info('OpenCode auto-integration is disabled by default.');
    logger.info('To enable, run with: OPENCODE_AUTO_INTEGRATE=1 npm install');
    logger.info('Or use: opencode-tools integrate');
  }
}

if (require.main === module) main();

module.exports = { integrateWithOpenCode, registerBundledPlugins };
