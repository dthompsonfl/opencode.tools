import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  entryPoint: { type: string; path: string; cmd?: string[] };
  adapterType: string;
  capabilities?: string[];
  requiredResources?: { cpu?: string; memory?: string; disk?: string };
  dependencyHints?: Record<string, any>;
  license?: string;
}

export function discoverBundledPlugins(packageRoot?: string): PluginManifest[] {
  const root = packageRoot || path.resolve(__dirname, '..', '..');
  const agentsDir = path.join(root, 'vantus_agents');
  if (!fs.existsSync(agentsDir)) return [];

  const manifests: PluginManifest[] = [];
  for (const d of fs.readdirSync(agentsDir, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const mpath = path.join(agentsDir, d.name, 'manifest.json');
    if (!fs.existsSync(mpath)) continue;
    try {
      const manifest = JSON.parse(fs.readFileSync(mpath, 'utf-8')) as PluginManifest;
      manifests.push(manifest);
    } catch (err) {
      // skip malformed
    }
  }
  return manifests;
}

export function discoverSystemPlugins(opencodeDir?: string): PluginManifest[] {
  const home = opencodeDir || path.join(os.homedir(), '.config', 'opencode');
  const pluginsDir = path.join(home, 'plugins');
  if (!fs.existsSync(pluginsDir)) return [];

  const manifests: PluginManifest[] = [];
  for (const f of fs.readdirSync(pluginsDir)) {
    const p = path.join(pluginsDir, f);
    if (!fs.existsSync(p)) continue;
    try {
      const m = JSON.parse(fs.readFileSync(p, 'utf-8')) as PluginManifest;
      manifests.push(m);
    } catch (err) {
      // skip
    }
  }

  return manifests;
}
