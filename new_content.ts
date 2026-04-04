  private async mergeConfiguration(): Promise<void> {
    const toolsConfigPath = path.join(this.currentPackageDir, 'opencode.json');
    const globalConfigPath = path.join(this.opencodeDir, 'opencode.json');
    const toolsOutputConfigPath = path.join(this.opencodeDir, 'opencode-tools.json');

    if (!fs.existsSync(toolsConfigPath)) {
      throw new Error('opencode.json not found in package directory');
    }

    const toolsConfig: OpenCodeConfig = JSON.parse(fs.readFileSync(toolsConfigPath, 'utf-8'));

    // 1. Handle opencode-tools.json (agents, tools, integrations)
    let toolsGlobalConfig: Partial<OpenCodeConfig> = { agents: {}, tools: {}, integrations: {} };
    if (fs.existsSync(toolsOutputConfigPath)) {
      try {
        toolsGlobalConfig = JSON.parse(fs.readFileSync(toolsOutputConfigPath, 'utf-8'));
      } catch (e) {
        console.warn('⚠️ Could not parse existing opencode-tools.json, starting fresh.');
      }
    }

    const mergedToolsConfig = {
      agents: { ...toolsConfig.agents, ...(toolsGlobalConfig.agents || {}) },
      tools: { ...toolsConfig.tools, ...(toolsGlobalConfig.tools || {}) },
      integrations: {
        ...(toolsGlobalConfig.integrations || {}),
        'opencode-tools': {
          version: '1.0.0',
          installedAt: new Date().toISOString(),
          packagePath: this.currentPackageDir
        }
      }
    };

    console.log('🔗 Merging OpenCode Tools configuration into opencode-tools.json...');
    fs.writeFileSync(toolsOutputConfigPath, JSON.stringify(mergedToolsConfig, null, 2));

    // 2. Handle opencode.json (mcp only)
    let globalConfig: Record<string, any> = {};
    if (fs.existsSync(globalConfigPath)) {
      try {
        globalConfig = JSON.parse(fs.readFileSync(globalConfigPath, 'utf-8'));
      } catch (e) {
        console.warn('⚠️ Could not parse existing global config, starting fresh.');
      }
    }

    // Initialize mcp if missing
    if (!globalConfig.mcp) {
      globalConfig.mcp = {};
    }

    // Merge MCP config (global overrides default toolsConfig, but we merge keys)
    globalConfig.mcp = { ...toolsConfig.mcp, ...globalConfig.mcp };

    // CLEANUP: Remove agents, tools, integrations from opencode.json if present
    const keysToRemove = ['agents', 'tools', 'integrations'];
    let cleaned = false;
    for (const key of keysToRemove) {
      if (key in globalConfig) {
        delete globalConfig[key];
        cleaned = true;
      }
    }

    if (cleaned) {
      console.log('🧹 Cleaned up legacy configuration from opencode.json');
    }

    console.log('🔗 Merging MCP configuration into opencode.json...');
    fs.writeFileSync(globalConfigPath, JSON.stringify(globalConfig, null, 2));
  }
