# Prompt: Implement Plugin Loader

## Task
Create a plugin loader that discovers and loads plugins in `src/cowork/plugin-loader.ts`.

## Requirements

### Plugin Discovery

1. **Discover Bundled Plugins**
   - Scan `src/cowork/plugins/` for plugin directories
   - Each directory with `plugin.json` is a plugin
   - Return array of loaded plugins

2. **Discover System Plugins**
   - Scan `~/.opencode/cowork/plugins/` for plugins
   - Each `.json` file is a plugin manifest
   - Return array of loaded plugins

3. **Plugin Directory Structure**
   ```
   plugins/
   ├── dev-team/
   │   ├── plugin.json          # Manifest
   │   ├── commands/
   │   │   ├── code-review.md
   │   │   └── feature-dev.md
   │   ├── agents/
   │   │   ├── pm.md
   │   │   └── architect.md
   │   ├── skills/
   │   │   └── coding/
   │   │       └── SKILL.md
   │   └── hooks/
   │       └── hooks.json
   ```

### Plugin Loading

1. **Load Plugin Manifest**
   - Read and parse `plugin.json`
   - Validate required fields (id, name, version)

2. **Load Commands**
   - Scan `commands/` directory for `.md` files
   - Parse each with markdown-parser
   - Return array of CommandDefinition

3. **Load Agents**
   - Scan `agents/` directory for `.md` files
   - Parse each with markdown-parser
   - Return array of AgentDefinition

4. **Load Skills**
   - Scan `skills/**/SKILL.md` pattern
   - Parse each with markdown-parser
   - Return array of SkillDefinition

5. **Load Hooks**
   - Read `hooks/hooks.json`
   - Parse hook definitions
   - Return array of HookDefinition

### Code Structure

```typescript
import { 
  PluginManifest, 
  PluginLoadResult,
  CommandDefinition,
  AgentDefinition,
  SkillDefinition,
  HookDefinition 
} from './types';

/**
 * Discover and load all plugins
 */
export function loadAllPlugins(): PluginLoadResult[];

/**
 * Load a single plugin from directory
 */
export function loadPlugin(pluginPath: string): PluginLoadResult;

/**
 * Get bundled plugins directory path
 */
export function getBundledPluginsDir(): string;

/**
 * Get system plugins directory path
 */
export function getSystemPluginsDir(): string;
```

## Implementation Guidelines

- Use Node.js `fs` and `path` modules
- Handle missing directories gracefully
- Validate plugin structure
- Use markdown-parser from `./markdown-parser`
- Place in `src/cowork/plugin-loader.ts`

## Validation

- Create test file: `tests/unit/cowork/plugin-loader.test.ts`
- Test cases:
  - Load bundled plugins
  - Handle missing directories
  - Handle malformed manifest
  - Load commands/agents/skills/hooks

## Dependencies
- `./types`
- `./markdown-parser`
- Node.js built-in modules (fs, path)
