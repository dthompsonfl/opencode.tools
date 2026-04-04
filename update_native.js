const fs = require('fs');
const content = fs.readFileSync('scripts/native-integrate.js', 'utf8');

const search = `  // Register MCP server configuration
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

  try { fs.writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2)); logger.success('MCP server configuration updated'); } catch(e) {}`;

const replace = `  // Register MCP server configuration into main opencode.json
  const opencodeJsonPath = path.join(opencodeDir, 'opencode.json');
  let config = {};
  if (fs.existsSync(opencodeJsonPath)) {
    try { config = JSON.parse(fs.readFileSync(opencodeJsonPath, 'utf-8')); } catch(e) {}
  }

  config.mcp = config.mcp || {};
  config.mcp['opencode-tools'] = {
    type: 'local',
    command: ['opencode-tools', 'mcp'],
    enabled: true,
    timeout: 60000,
    description: 'Complete developer team automation'
  };

  // Merge opencode.json from package root to inject agents, tools, plugin
  const packageConfigPath = path.join(packageRoot, 'opencode.json');
  if (fs.existsSync(packageConfigPath)) {
    try {
      const packageConfig = JSON.parse(fs.readFileSync(packageConfigPath, 'utf-8'));
      if (packageConfig.agent) {
        config.agent = Object.assign({}, config.agent || {}, packageConfig.agent);
      }
      if (packageConfig.tools) {
        config.tools = Object.assign({}, config.tools || {}, packageConfig.tools);
      }
      if (packageConfig.plugin) {
        config.plugin = Array.from(new Set([...(config.plugin || []), ...packageConfig.plugin]));
      }
      if (packageConfig.permission) {
        config.permission = Object.assign({}, config.permission || {}, packageConfig.permission);
      }
    } catch(e) {
      logger.error('Failed to parse package opencode.json');
    }
  }

  // Inject system prompt instructions directly into config
  const systemPromptPath = path.join(packageRoot, 'opencode-system-prompt.md');
  if (fs.existsSync(systemPromptPath) && !config.customInstructions) {
    try {
      config.customInstructions = fs.readFileSync(systemPromptPath, 'utf-8');
    } catch(e) {}
  }

  try { fs.writeFileSync(opencodeJsonPath, JSON.stringify(config, null, 2)); logger.success('OpenCode config opencode.json fully integrated and updated'); } catch(e) {}`;

fs.writeFileSync('scripts/native-integrate.js', content.replace(search, replace));
