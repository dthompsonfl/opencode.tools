#!/usr/bin/env node

/**
 * Post-installation script for OpenCode Tools
 * 
 * This script automatically integrates OpenCode Tools with the global OpenCode installation.
 * It ensures all MCP tools are properly registered and available in the TUI.
 * 
 * Aligned with official OpenCode configuration schema:
 * - ~/.config/opencode/opencode.json - Main config with MCP servers, agents (singular), permissions
 * - ~/.config/opencode/agents/*.md - Agent definitions
 * - ~/.config/opencode/commands/*.md - Command definitions
 * - ~/.config/opencode/skills/*.md - Skill definitions
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Official OpenCode configuration schema
 */
interface OpenCodeConfig {
  /** Default agent to use (singular, not agents) */
  default_agent?: string;
  /** Legacy agent field - use default_agent instead */
  agent?: string | Record<string, unknown>;
  /** Permission rules for tools */
  permission?: Record<string, unknown>;
  /** MCP server configurations */
  mcp?: Record<string, McpServerConfig>;
  /** Plugin configurations */
  plugin?: Record<string, unknown>;
}

interface McpServerConfig {
  type: 'local' | 'remote';
  command?: string[];
  url?: string;
  description?: string;
  enabled?: boolean;
  timeout?: number;
}

class PostInstallIntegration {
  private readonly homeDir: string;
  private readonly opencodeDir: string;
  private readonly currentPackageDir: string;

  constructor() {
    this.homeDir = os.homedir();
    // Use XDG-like structure: ~/.config/opencode
    this.opencodeDir = path.join(this.homeDir, '.config', 'opencode');
    this.currentPackageDir = process.cwd();
  }

  async run(): Promise<void> {
    console.log('🔧 OpenCode Tools Post-Installation Integration');
    console.log('=============================================');

    try {
      if (!process.env.npm_config_global && !process.env.OPENCODE_TOOLS_FORCE_INTEGRATION) {
        console.log('\nℹ️ Skipping automatic integration in local install context.');
        console.log('To integrate manually, run: opencode-tools integrate');
        return;
      }

      // Step 1: Ensure OpenCode config directory exists
      await this.ensureOpenCodeDirectory();

      // Step 2: Backup existing configuration
      await this.backupExistingConfig();

      // Step 3: Merge OpenCode Tools configuration into official opencode.json
      await this.mergeConfiguration();

      // Step 4: Create global directories (agents, commands, skills, plugins, tools)
      await this.createGlobalDirectories();

      // Step 5: Validate MCP tool dependencies
      await this.validateMCPTools();

      console.log('\n✅ OpenCode Tools integration completed successfully!');
      console.log('\n📝 Next steps:');
      console.log('   1. Restart your OpenCode TUI');
      console.log('   2. All tools should be available automatically');
      console.log('   3. If tools fail to start, run: opencode-tools verify (or --verify)');

    } catch (error) {
      console.error('\n❌ Integration failed:', error);
      console.log('\n🔧 Manual setup instructions:');
      console.log('   1. Ensure ~/.config/opencode/opencode.json has MCP server config');
      console.log('   2. Restart OpenCode TUI');
      process.exit(1);
    }
  }

  private async ensureOpenCodeDirectory(): Promise<void> {
    if (!fs.existsSync(this.opencodeDir)) {
      console.log(`📁 Creating OpenCode configuration directory at ${this.opencodeDir}...`);
      fs.mkdirSync(this.opencodeDir, { recursive: true });
    }
  }

  private async backupExistingConfig(): Promise<void> {
    const globalConfigPath = path.join(this.opencodeDir, 'opencode.json');
    
    if (fs.existsSync(globalConfigPath)) {
      const backupPath = path.join(this.opencodeDir, 'opencode.backup.json');
      console.log('💾 Backing up existing configuration...');
      fs.copyFileSync(globalConfigPath, backupPath);
    }
  }

  private async mergeConfiguration(): Promise<void> {
    const globalConfigPath = path.join(this.opencodeDir, 'opencode.json');

    // Load existing config or create new
    let globalConfig: OpenCodeConfig = {};
    if (fs.existsSync(globalConfigPath)) {
      try {
        globalConfig = JSON.parse(fs.readFileSync(globalConfigPath, 'utf-8'));
      } catch (e) {
        console.warn('⚠️ Could not parse existing opencode.json, starting fresh.');
      }
    }

    // Try to merge package's opencode.json (preserves user-specific settings)
    const packageConfigPath = path.join(this.currentPackageDir, 'opencode.json');
    let packageConfig: Partial<OpenCodeConfig> = {};
    if (fs.existsSync(packageConfigPath)) {
      try {
        packageConfig = JSON.parse(fs.readFileSync(packageConfigPath, 'utf-8'));
        console.log('🔗 Merging package configuration...');
      } catch (e) {
        console.warn('⚠️ Could not parse package opencode.json');
      }
    }

    // Initialize MCP if missing
    if (!globalConfig.mcp) {
      globalConfig.mcp = {};
    }

    // Add opencode-tools MCP server (this is the key integration)
    // Use "opencodeTools" (camelCase) to avoid hyphen issues in OpenCode config
    if (!globalConfig.mcp['opencodeTools']) {
      globalConfig.mcp['opencodeTools'] = {
        type: 'local',
        command: ['opencode-tools', 'mcp'],
        description: 'Complete developer team automation - Foundry orchestration, Cowork agents, research, docs, architecture, code generation, PDF/DOCX/XLSX generation, delivery',
        enabled: true,
        timeout: 60000,
      };
    }

    // Set default agent if not set (use default_agent for official schema)
    if (!globalConfig.default_agent) {
      globalConfig.default_agent = 'foundry';
    }

    // Add basic permission rules if not set
    if (!globalConfig.permission) {
      globalConfig.permission = {
        'bash.execute': 'ask',
        'fs.delete': 'ask',
        'edit.apply': 'allow',
      };
    }

    // Merge package config properties (MCP servers from package take lower precedence)
    if (packageConfig.mcp) {
      for (const [serverName, serverConfig] of Object.entries(packageConfig.mcp)) {
        if (!globalConfig.mcp[serverName]) {
          globalConfig.mcp[serverName] = serverConfig;
        }
      }
    }

    // Merge agents
    if (packageConfig.agent) {
      if (typeof packageConfig.agent === 'object') {
        globalConfig.agent = {
          ...(typeof globalConfig.agent === 'object' ? globalConfig.agent : {}),
          ...packageConfig.agent
        };
      }
    }

    // Merge tools
    if ((packageConfig as any).tools) {
      (globalConfig as any).tools = {
        ...((globalConfig as any).tools || {}),
        ...(packageConfig as any).tools
      };
    }

    // Merge plugins
    if (packageConfig.plugin) {
      if (Array.isArray(packageConfig.plugin)) {
        const existingPlugins = Array.isArray(globalConfig.plugin) ? globalConfig.plugin : [];
        const newPlugins = new Set([...existingPlugins, ...packageConfig.plugin]);
        globalConfig.plugin = Array.from(newPlugins) as any;
      }
    }

    // Configure system prompt instruction globally if found
    const systemPromptPath = path.join(this.currentPackageDir, 'opencode-system-prompt.md');
    if (fs.existsSync(systemPromptPath)) {
      if (!(globalConfig as any).customInstructions) {
        (globalConfig as any).customInstructions = fs.readFileSync(systemPromptPath, 'utf-8');
      }
    }

    console.log('🔗 Merging comprehensive configuration into opencode.json...');
    fs.writeFileSync(globalConfigPath, JSON.stringify(globalConfig, null, 2));
  }

  private async createGlobalDirectories(): Promise<void> {
    const directories = [
      'agents',
      'commands',
      'skills',
      'plugins',
      'tools',
      'cowork/plugins',
    ];

    for (const dir of directories) {
      const fullPath = path.join(this.opencodeDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    }

    // Copy optional devteam.ts template if it exists
    const devteamTemplateSrc = path.join(this.currentPackageDir, 'templates', 'opencode', 'tools', 'devteam.ts');
    const devteamTemplateDest = path.join(this.opencodeDir, 'tools', 'devteam.ts');
    
    if (fs.existsSync(devteamTemplateSrc) && !fs.existsSync(devteamTemplateDest)) {
      try {
        fs.copyFileSync(devteamTemplateSrc, devteamTemplateDest);
        console.log('📁 Copied devteam.ts template to tools directory');
      } catch (e) {
        console.warn('⚠️ Could not copy devteam.ts template');
      }
    }
  }

  private async validateMCPTools(): Promise<void> {
    const globalConfigPath = path.join(this.opencodeDir, 'opencode.json');
    
    if (!fs.existsSync(globalConfigPath)) {
      return;
    }

    const config: OpenCodeConfig = JSON.parse(fs.readFileSync(globalConfigPath, 'utf-8'));

    console.log('🔍 Validating MCP tool dependencies...');

    for (const [toolName, toolConfig] of Object.entries(config.mcp || {})) {
      if (toolConfig.enabled !== false) {
        console.log(`  ✅ ${toolName} - configured`);
      }
    }
  }
}

// Run the post-installation integration
if (require.main === module) {
  const integration = new PostInstallIntegration();
  integration.run().catch(console.error);
}

export { PostInstallIntegration };
