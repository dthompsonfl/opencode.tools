/**
 * OpenCode Tools - TUI Integration Entry Point
 * 
 * This module provides the integration point for OpenCode TUI.
 * All tools are registered here and made available exclusively through the TUI.
 */

import { registerTUITools } from './tui-integration';
import { discoverBundledPlugins, discoverSystemPlugins } from './plugins/discovery';
import { TUIResearchAgent } from './tui-agents';

// Export the tool registration function
export { registerTUITools };

// Export individual agents for direct TUI access if needed
export { TUIResearchAgent };

// Export types
export type { ResearchParams, ResearchResult } from './tui-agents';
export type { TUITool, TUIParameter } from './tui-integration';

/**
 * Get all available TUI tools
 */
export function getAvailableTools() {
  // Also include discovered plugin manifests as metadata
  const tools = registerTUITools();
  try {
    const manifests = discoverBundledPlugins();
    for (const m of manifests) {
      tools.push({
        id: m.id,
        name: m.name,
        description: `Discovered plugin (${m.adapterType})`,
        category: 'research',
        handler: async () => ({
          success: true,
          runtime: 'plugin',
          toolId: m.id,
          message: 'Discovered bundled plugin manifest',
          data: { manifest: m },
        }),
      });
    }

    // Also include any plugins already registered in the user's OpenCode home
    const system = discoverSystemPlugins();
    for (const m of system) {
      tools.push({
        id: m.id,
        name: m.name,
        description: `System-registered plugin (${m.adapterType})`,
        category: 'research',
        handler: async () => ({
          success: true,
          runtime: 'plugin',
          toolId: m.id,
          message: 'Discovered system plugin manifest',
          data: { manifest: m },
        }),
      });
    }
  } catch (err) {
    // ignore
  }

  return tools;
}

/**
 * Execute a specific tool by ID (called by TUI)
 */
export async function executeTool(toolId: string, args: any): Promise<any> {
  const tools = registerTUITools();
  const tool = tools.find(t => t.id === toolId);
  
  if (!tool) {
    throw new Error(`Tool not found: ${toolId}`);
  }
  
  return await tool.handler(args);
}

/**
 * Research tool shortcuts for TUI
 */
export const researchTools = {
  /**
   * Run interactive research (full TUI prompts)
   */
  async interactive() {
    const agent = new TUIResearchAgent();
    await agent.runInteractive();
  },
  
  /**
   * Run research from brief file
   */
  async fromBrief(briefPath: string, outputPath?: string) {
    const agent = new TUIResearchAgent();
    // Implementation would handle file reading
    const params = await loadBriefFromFile(briefPath);
    return agent.runWithParams(params);
  },
  
  /**
   * Run quick research
   */
  async quick(company: string, industry: string, description?: string) {
    const agent = new TUIResearchAgent();
    return agent.runWithParams({
      company,
      industry,
      description: description || `${company} operates in the ${industry} industry.`
    });
  }
};

/**
 * Helper function to load brief from file
 */
async function loadBriefFromFile(briefPath: string): Promise<any> {
  const fs = await import('fs');
  const content = await fs.promises.readFile(briefPath, 'utf-8');
  return JSON.parse(content);
}
