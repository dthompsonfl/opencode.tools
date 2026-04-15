#!/usr/bin/env node

/**
 * Global OpenCode Integration Research
 * 
 * This script analyzes the global OpenCode installation to understand
 * how plugins and tools are discovered and integrated.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface GlobalOpenCodeConfig {
  version?: string;
  installationPath?: string;
  configPath?: string;
  pluginDirectories?: string[];
  toolRegistry?: Record<string, any>;
  mcpTools?: Record<string, any>;
  discoveryMethod?: 'config-file' | 'directory-scan' | 'registry';
}

class GlobalOpenCodeResearcher {
  private readonly homeDir: string;
  private readonly possiblePaths: string[];

  constructor() {
    this.homeDir = os.homedir();
    this.possiblePaths = [
      path.join(this.homeDir, '.opencode'),
      path.join(this.homeDir, '.config', 'opencode'),
      path.join('/usr', 'local', 'share', 'opencode'),
      path.join('/opt', 'opencode'),
      path.join(process.cwd(), '.opencode') // Current directory
    ];
  }

  async research(): Promise<void> {
    console.log('🔍 Researching Global OpenCode Installation');
    console.log('==========================================\n');

    const globalConfig = await this.findGlobalInstallation();
    
    if (!globalConfig.installationPath) {
      console.log('⚠️  Could not find global OpenCode installation');
      console.log('\n💡 Recommendations:');
      console.log('1. Ensure OpenCode is installed globally');
      console.log('2. Check installation paths in PATH');
      console.log('3. Verify configuration directory exists');
      return;
    }

    await this.analyzeInstallation(globalConfig);
    await this.identifyIntegrationStrategy(globalConfig);
    await this.generateIntegrationPlan(globalConfig);
  }

  private async findGlobalInstallation(): Promise<GlobalOpenCodeConfig> {
    const config: GlobalOpenCodeConfig = {};

    for (const installPath of this.possiblePaths) {
      console.log(`🔎 Checking path: ${installPath}`);

      if (fs.existsSync(installPath)) {
        console.log(`✅ Found OpenCode directory: ${installPath}`);
        config.installationPath = installPath;
        config.configPath = path.join(installPath, 'config.json');

        // Analyze structure
        const structure = await this.analyzeDirectoryStructure(installPath);
        Object.assign(config, structure);

        // Load existing configuration
        if (fs.existsSync(config.configPath)) {
          try {
            const existingConfig = JSON.parse(fs.readFileSync(config.configPath, 'utf-8'));
            config.toolRegistry = existingConfig.tools || {};
            config.mcpTools = existingConfig.mcp || {};
            config.version = existingConfig.version;
          } catch (error) {
            console.warn(`⚠️  Could not parse existing config: ${error}`);
          }
        }

        break;
      }
    }

    return config;
  }

  private async analyzeDirectoryStructure(installPath: string): Promise<Partial<GlobalOpenCodeConfig>> {
    const structure: Partial<GlobalOpenCodeConfig> = {};
    
    const contents = fs.readdirSync(installPath, { withFileTypes: true });
    
    // Look for common patterns
    structure.pluginDirectories = [];
    
    for (const item of contents) {
      if (item.isDirectory()) {
        const name = path.basename(item.name);
        
        if (name === 'plugins' || name === 'tools' || name === 'extensions') {
          structure.pluginDirectories?.push(path.join(installPath, name));
          console.log(`📁 Found plugin directory: ${name}`);
        }
        
        // Check for MCP tools
        const mcpPath = path.join(installPath, name, 'mcp');
        if (fs.existsSync(mcpPath)) {
          console.log(`🔌 Found MCP tools directory: ${mcpPath}`);
        }
      }
    }

    return structure;
  }

  private async analyzeInstallation(config: GlobalOpenCodeConfig): Promise<void> {
    console.log('\n📊 Installation Analysis');
    console.log('======================');

    console.log(`📂 Installation Path: ${config.installationPath}`);
    console.log(`⚙️  Config File: ${config.configPath}`);
    console.log(`🔧 Version: ${config.version || 'Unknown'}`);
    
    if (config.pluginDirectories && config.pluginDirectories.length > 0) {
      console.log(`📦 Plugin Directories: ${config.pluginDirectories.length}`);
      config.pluginDirectories.forEach(dir => {
        console.log(`   - ${dir}`);
      });
    }

    // Analyze existing tools
    if (config.toolRegistry) {
      const toolCount = Object.keys(config.toolRegistry).length;
      console.log(`🛠️  Registered Tools: ${toolCount}`);
      
      if (config.mcpTools) {
        const mcpCount = Object.keys(config.mcpTools).length;
        console.log(`🔌 MCP Tools: ${mcpCount}`);
      }
    }
  }

  private async identifyIntegrationStrategy(config: GlobalOpenCodeConfig): Promise<void> {
    console.log('\n🎯 Integration Strategy');
    console.log('====================');

    // Determine discovery method
    if (fs.existsSync(config.configPath!)) {
      config.discoveryMethod = 'config-file';
      console.log('📋 Discovery Method: Config File Based');
    } else {
      config.discoveryMethod = 'directory-scan';
      console.log('🔍 Discovery Method: Directory Scanning');
    }

    // Check for package manager integration
    const globalNpmModules = path.join(this.homeDir, '.npm', 'global_modules');
    const hasGlobalNpm = fs.existsSync(globalNpmModules);
    console.log(`📦 Global NPM Support: ${hasGlobalNpm ? 'Yes' : 'No'}`);

    // Check for PATH integration
    const pathEnv = process.env.PATH || '';
    const hasPathIntegration = this.possiblePaths.some(p => 
      pathEnv.includes(p) || pathEnv.includes(path.dirname(p))
    );
    console.log(`🛤️  PATH Integration: ${hasPathIntegration ? 'Yes' : 'No'}`);

    // Identify best integration approach
    if (config.discoveryMethod === 'config-file') {
      console.log('\n💡 Recommended Integration: Config File Merge');
      console.log('   - Merge opencode.json with existing global config');
      console.log('   - Use post-install script to automate');
    } else {
      console.log('\n💡 Recommended Integration: Directory Creation');
      console.log('   - Create config file in standard location');
      console.log('   - Register tools via config merge');
    }
  }

  private async generateIntegrationPlan(config: GlobalOpenCodeConfig): Promise<void> {
    console.log('\n📋 Integration Plan');
    console.log('=================');

    const currentPackagePath = process.cwd();
    const localConfigPath = path.join(currentPackagePath, 'opencode.json');
    
    if (!fs.existsSync(localConfigPath)) {
      console.log('❌ Local opencode.json not found');
      return;
    }

    const toolsConfig = JSON.parse(fs.readFileSync(localConfigPath, 'utf-8'));
    
    console.log('🎯 Integration Steps:');
    console.log(`1. Backup existing config to: ${config.configPath}.backup`);
    console.log(`2. Merge local configuration into: ${config.configPath}`);
    console.log(`3. Register ${Object.keys(toolsConfig.mcp || {}).length} MCP tools`);
    console.log(`4. Register ${Object.keys(toolsConfig.agents || {}).length} agents`);
    console.log('5. Restart OpenCode TUI to detect changes');

    console.log('\n⚡ Auto-Integration Commands:');
    console.log(`   npm install  # Triggers post-install script`);
    console.log(`   npm run integrate  # Manual integration command`);
    console.log(`   npm run verify:global  # Verify integration status`);

    // Generate verification commands
    await this.generateVerificationScript(config);
  }

  private async generateVerificationScript(config: GlobalOpenCodeConfig): Promise<void> {
    const script = `#!/bin/bash
# OpenCode Tools Integration Verification Script
# This script verifies that OpenCode Tools is properly integrated

echo "🔍 Verifying OpenCode Tools Integration"
echo "======================================"

# Check if config exists
if [ -f "${config.configPath}" ]; then
    echo "✅ Global config exists: ${config.configPath}"
else
    echo "❌ Global config missing: ${config.configPath}"
    exit 1
fi

# Check if tools are registered
TOOLS_COUNT=\$(grep -o '"[^"]*":' "${config.configPath}" | wc -l)
echo "📊 Registered tools: \$TOOLS_COUNT"

# Check specific OpenCode Tools markers
if grep -q "opencode-tools" "${config.configPath}"; then
    echo "✅ OpenCode Tools integration detected"
else
    echo "⚠️  OpenCode Tools integration not found"
fi

echo ""
echo "🎯 Integration Status: \$([ \$TOOLS_COUNT -gt 0 ] && echo 'SUCCESS' || echo 'NEEDS SETUP')"
`;

    const scriptPath = path.join(process.cwd(), 'scripts', 'verify-global-integration.sh');
    fs.writeFileSync(scriptPath, script, { mode: 0o755 });
    console.log(`📝 Created verification script: ${scriptPath}`);
  }
}

// Run research if called directly
if (require.main === module) {
  const researcher = new GlobalOpenCodeResearcher();
  researcher.research().catch(console.error);
}

export { GlobalOpenCodeResearcher, GlobalOpenCodeConfig };