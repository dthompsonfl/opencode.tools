#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');

function getOpenCodeDirectory() {
  const possible = [
    path.join(process.env.APPDATA || '', 'OpenCode'),
    path.join(os.homedir(), '.opencode'),
    path.join(os.homedir(), 'OpenCode'),
    '/usr/local/share/opencode',
    '/opt/opencode'
  ];

  for (const p of possible) {
    try {
      if (p && fs.existsSync(p)) return p;
    } catch (e) {}
  }

  // Fallback to ~/.opencode
  return path.join(os.homedir(), '.opencode');
}

function registerBundledPlugins(packageRoot, opencodeDir) {
  const agentsDir = path.join(packageRoot, 'vantus_agents');
  if (!fs.existsSync(agentsDir)) return [];

  const entries = fs.readdirSync(agentsDir, { withFileTypes: true });
  const registered = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const manifestPath = path.join(agentsDir, e.name, 'manifest.json');
    if (!fs.existsSync(manifestPath)) continue;
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      const pluginsDir = path.join(opencodeDir, 'plugins');
      if (!fs.existsSync(pluginsDir)) fs.mkdirSync(pluginsDir, { recursive: true });
      const destName = (manifest.id || e.name).replace(/[^a-z0-9_.-]/gi, '_') + '.json';
      const destPath = path.join(pluginsDir, destName);
      fs.writeFileSync(destPath, JSON.stringify(manifest, null, 2));
      registered.push(manifest.id || e.name);
    } catch (err) {
      // skip malformed
    }
  }
  return registered;
}

function main() {
  const packageRoot = process.cwd();
  const opencodeDir = getOpenCodeDirectory();
  try {
    const registered = registerBundledPlugins(packageRoot, opencodeDir);
    if (registered.length > 0) {
      console.log(`Registered bundled plugins in OpenCode: ${registered.join(', ')}`);
    } else {
      console.log('No bundled plugin manifests found to register.');
    }
  } catch (err) {
    console.error('Postinstall registration failed:', err);
  }
}

if (require.main === module) main();

module.exports = { getOpenCodeDirectory, registerBundledPlugins };
