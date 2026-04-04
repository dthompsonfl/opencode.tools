import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TOOL_DEFS } from '../tools/mcp/registry';

const logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ${msg}`),
  success: (msg: string) => console.log(`[SUCCESS] ${msg}`),
  warn: (msg: string) => console.warn(`[WARN] ${msg}`)
};

function getOpenCodeConfigDirectory(): string {
  const xdgConfig = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(xdgConfig, 'opencode');
}

function integrateWithOpenCode(): void {
  logger.info('Integrating with OpenCode...');
  
  const opencodeDir = getOpenCodeConfigDirectory();
  if (!fs.existsSync(opencodeDir)) {
    fs.mkdirSync(opencodeDir, { recursive: true });
  }

  const toolsConfigPath = path.join(opencodeDir, 'opencode-tools.json');
  const toolsConfig = {
    version: "1.0.0",
    description: "OpenCode Tools - Complete Developer Team Automation",
    tools: TOOL_DEFS.map(t => t.name),
    agents: [
      "foundry", "orchestrator", "architecture", "codegen", "database",
      "proposal", "qa", "delivery", "research", "security", "pdf", "summarization"
    ]
  };
  
  fs.writeFileSync(toolsConfigPath, JSON.stringify(toolsConfig, null, 2));
  logger.success('Tools configuration saved to opencode-tools.json');

  // Also update opencode.json directly
  const opencodeJsonPath = path.join(opencodeDir, 'opencode.json');
  let globalConfig: Record<string, any> = {};

  if (fs.existsSync(opencodeJsonPath)) {
    try {
      globalConfig = JSON.parse(fs.readFileSync(opencodeJsonPath, 'utf-8'));
    } catch (e) {
      logger.warn('Could not parse global opencode.json');
    }
  }

  // Ensure tools object exists
  globalConfig.tools = globalConfig.tools || {};

  // Add all tools globally
  for (const tool of TOOL_DEFS) {
    globalConfig.tools[tool.name] = true;
  }

  // Merge into agent specific tools
  globalConfig.agent = globalConfig.agent || {};
  for (const agentName of toolsConfig.agents) {
    if (!globalConfig.agent[agentName]) {
      globalConfig.agent[agentName] = {};
    }
    globalConfig.agent[agentName].tools = globalConfig.agent[agentName].tools || {};
    for (const tool of TOOL_DEFS) {
      globalConfig.agent[agentName].tools[tool.name] = true;
    }
  }

  try {
    fs.writeFileSync(opencodeJsonPath, JSON.stringify(globalConfig, null, 2));
    logger.success('Global opencode.json tools configuration updated');
  } catch (e) {
    logger.error('Failed to update global opencode.json');
  }
}

if (require.main === module) {
  integrateWithOpenCode();
}