"use strict";
/**
 * OpenCode Tools - TUI Integration Entry Point
 *
 * This module provides the integration point for OpenCode TUI.
 * All tools are registered here and made available exclusively through the TUI.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.researchTools = exports.TUIResearchAgent = exports.registerTUITools = void 0;
exports.getAvailableTools = getAvailableTools;
exports.executeTool = executeTool;
const tui_integration_1 = require("./tui-integration");
Object.defineProperty(exports, "registerTUITools", { enumerable: true, get: function () { return tui_integration_1.registerTUITools; } });
const discovery_1 = require("./plugins/discovery");
const tui_agents_1 = require("./tui-agents");
Object.defineProperty(exports, "TUIResearchAgent", { enumerable: true, get: function () { return tui_agents_1.TUIResearchAgent; } });
/**
 * Get all available TUI tools
 */
function getAvailableTools() {
    // Also include discovered plugin manifests as metadata
    const tools = (0, tui_integration_1.registerTUITools)();
    try {
        const manifests = (0, discovery_1.discoverBundledPlugins)();
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
        const system = (0, discovery_1.discoverSystemPlugins)();
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
    }
    catch (err) {
        // ignore
    }
    return tools;
}
/**
 * Execute a specific tool by ID (called by TUI)
 */
async function executeTool(toolId, args) {
    const tools = (0, tui_integration_1.registerTUITools)();
    const tool = tools.find(t => t.id === toolId);
    if (!tool) {
        throw new Error(`Tool not found: ${toolId}`);
    }
    return await tool.handler(args);
}
/**
 * Research tool shortcuts for TUI
 */
exports.researchTools = {
    /**
     * Run interactive research (full TUI prompts)
     */
    async interactive() {
        const agent = new tui_agents_1.TUIResearchAgent();
        await agent.runInteractive();
    },
    /**
     * Run research from brief file
     */
    async fromBrief(briefPath, outputPath) {
        const agent = new tui_agents_1.TUIResearchAgent();
        // Implementation would handle file reading
        const params = await loadBriefFromFile(briefPath);
        return agent.runWithParams(params);
    },
    /**
     * Run quick research
     */
    async quick(company, industry, description) {
        const agent = new tui_agents_1.TUIResearchAgent();
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
async function loadBriefFromFile(briefPath) {
    const fs = await Promise.resolve().then(() => __importStar(require('fs')));
    const content = await fs.promises.readFile(briefPath, 'utf-8');
    return JSON.parse(content);
}
//# sourceMappingURL=index.js.map