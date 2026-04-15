"use strict";
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
exports.TUIResearchAgentExtended = void 0;
exports.registerTUITools = registerTUITools;
const tui_agents_1 = require("./tui-agents");
const tui_architecture_agent_1 = require("./tui-agents/tui-architecture-agent");
const tui_codegen_agent_1 = require("./tui-agents/tui-codegen-agent");
const discovery_1 = require("./plugins/discovery");
const plugin_loader_1 = require("./cowork/plugin-loader");
const command_registry_1 = require("./cowork/registries/command-registry");
const agent_registry_1 = require("./cowork/registries/agent-registry");
const cowork_orchestrator_1 = require("./cowork/orchestrator/cowork-orchestrator");
const orchestrator_1 = require("./foundry/orchestrator");
const defaultRuntimeAdapters = {
    cowork: {
        async executeCommand(commandId, args) {
            const orchestrator = new cowork_orchestrator_1.CoworkOrchestrator();
            return orchestrator.execute(commandId, args);
        },
        async runAgent(agentId, task, context) {
            const orchestrator = new cowork_orchestrator_1.CoworkOrchestrator();
            return orchestrator.spawnAgent(agentId, task, context);
        },
    },
    foundry: {
        async runWorkflow(intent, repoRoot) {
            const foundry = new orchestrator_1.FoundryOrchestrator();
            const request = (0, orchestrator_1.createFoundryExecutionRequest)(intent, repoRoot || process.cwd(), true);
            return foundry.execute(request);
        },
    },
};
function registerTUITools(options = {}) {
    const tools = [];
    const runtime = {
        cowork: options.runtimeAdapters?.cowork || defaultRuntimeAdapters.cowork,
        foundry: options.runtimeAdapters?.foundry || defaultRuntimeAdapters.foundry,
    };
    const pluginLoader = options.pluginLoader || plugin_loader_1.loadAllPlugins;
    tools.push({
        id: 'research-agent',
        name: 'Research Agent',
        description: 'Automated client and industry research with competitor analysis',
        category: 'research',
        handler: async (args) => runResearch(args),
        parameters: [
            {
                name: 'mode',
                type: 'string',
                required: true,
                description: 'Research mode: interactive, brief, or quick',
                default: 'interactive',
            },
        ],
    });
    tools.push({
        id: 'architecture-agent',
        name: 'Architecture Agent',
        description: 'System design and backlog generation',
        category: 'documentation',
        handler: async (args) => {
            const payload = asObject(args);
            const task = asString(payload.task) || 'Generate architecture and backlog from available context';
            const context = asObject(payload.context);
            try {
                const result = await runtime.cowork.runAgent('architecture-agent', task, context);
                return okResult('architecture-agent', 'cowork', 'Architecture agent completed via Cowork runtime', result);
            }
            catch {
                const agent = new tui_architecture_agent_1.TUIArchitectureAgent();
                await agent.runInteractive();
                return okResult('architecture-agent', 'native-agent', 'Architecture agent completed in interactive fallback mode');
            }
        },
    });
    tools.push({
        id: 'codegen-agent',
        name: 'CodeGen Agent',
        description: 'Feature scaffolding and code generation',
        category: 'codegen',
        handler: async (args) => {
            const payload = asObject(args);
            const task = asString(payload.task) || 'Generate implementation scaffolding for the active task';
            const context = asObject(payload.context);
            try {
                const result = await runtime.cowork.runAgent('codegen-agent', task, context);
                return okResult('codegen-agent', 'cowork', 'CodeGen agent completed via Cowork runtime', result);
            }
            catch {
                const agent = new tui_codegen_agent_1.TUICodeGenAgent();
                await agent.runInteractive();
                return okResult('codegen-agent', 'native-agent', 'CodeGen agent completed in interactive fallback mode');
            }
        },
    });
    tools.push({
        id: 'foundry:orchestrate',
        name: 'Foundry Orchestrator',
        description: 'Run Foundry orchestration workflow from the TUI',
        category: 'delivery',
        handler: async (args) => {
            const payload = asObject(args);
            const intent = asString(payload.intent) || asString(payload.project) || 'Enterprise implementation workflow';
            const report = await runtime.foundry.runWorkflow(intent, asString(payload.repoRoot));
            return okResult('foundry:orchestrate', 'foundry', 'Foundry workflow completed', report);
        },
    });
    const manifests = options.manifests || (0, discovery_1.discoverBundledPlugins)();
    for (const manifest of manifests) {
        const toolId = manifest.id || `plugin:${manifest.name}`;
        const toolName = manifest.name || toolId;
        const description = `Plugin adapterType=${manifest.adapterType} capabilities=${(manifest.capabilities || []).join(', ') || 'none'}`;
        tools.push({
            id: toolId,
            name: toolName,
            description,
            category: 'research',
            handler: async (args) => {
                const payload = asObject(args);
                return okResult(toolId, 'plugin', 'Plugin manifest metadata loaded', {
                    manifest,
                    runRequested: Boolean(payload.run),
                });
            },
        });
    }
    try {
        const plugins = pluginLoader();
        const commandRegistry = command_registry_1.CommandRegistry.getInstance();
        const agentRegistry = agent_registry_1.AgentRegistry.getInstance();
        for (const plugin of plugins) {
            commandRegistry.registerMany(plugin.commands);
            agentRegistry.registerMany(plugin.agents);
        }
        const commands = commandRegistry.list();
        for (const cmd of commands) {
            tools.push({
                id: `cowork:command:${cmd.id}`,
                name: cmd.name,
                description: cmd.description,
                category: 'cowork',
                handler: async (args) => {
                    const payload = asObject(args);
                    const commandArgs = asStringArray(payload._ || payload.args);
                    const result = await runtime.cowork.executeCommand(cmd.id, commandArgs);
                    return okResult(`cowork:command:${cmd.id}`, 'cowork', `Executed command ${cmd.id}`, result);
                },
                parameters: [
                    {
                        name: 'args',
                        type: 'array',
                        required: false,
                        description: cmd.argumentHint || 'Command arguments',
                    },
                ],
            });
        }
        const agents = agentRegistry.list();
        for (const agent of agents) {
            tools.push({
                id: `cowork:agent:${agent.id}`,
                name: agent.name,
                description: agent.description,
                category: 'cowork',
                handler: async (args) => {
                    const payload = asObject(args);
                    const task = asString(payload.task) || `Execute ${agent.name}`;
                    const context = asObject(payload.context);
                    const result = await runtime.cowork.runAgent(agent.id, task, context);
                    return okResult(`cowork:agent:${agent.id}`, 'cowork', `Executed agent ${agent.id}`, result);
                },
                parameters: [
                    {
                        name: 'task',
                        type: 'string',
                        required: true,
                        description: 'Task prompt for the agent',
                    },
                    {
                        name: 'context',
                        type: 'array',
                        required: false,
                        description: 'Additional context data',
                    },
                ],
            });
        }
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        tools.push({
            id: 'cowork:load-error',
            name: 'Cowork Load Error',
            description: 'Cowork plugin loading failed',
            category: 'cowork',
            handler: async () => failResult('cowork:load-error', 'cowork', `Failed to load Cowork plugins: ${message}`),
        });
    }
    return tools;
}
class TUIResearchAgentExtended extends tui_agents_1.TUIResearchAgent {
    async runWithBriefFile(briefPath, _outputPath) {
        const fsModule = await Promise.resolve().then(() => __importStar(require('fs')));
        const briefContent = await fsModule.promises.readFile(briefPath, 'utf-8');
        const brief = JSON.parse(briefContent);
        const params = {
            company: asString(brief.company) || '',
            industry: asString(brief.industry) || '',
            description: asString(brief.description),
            goals: asStringArray(brief.goals),
            constraints: asStringArray(brief.constraints),
            timeline: asString(brief.timeline),
            keywords: asStringArray(brief.keywords),
            urls: asStringArray(brief.urls),
            priorNotes: asString(brief.priorNotes),
        };
        return this.runWithParams(params);
    }
    async runWithParams(params) {
        return super.runWithParams(params);
    }
}
exports.TUIResearchAgentExtended = TUIResearchAgentExtended;
async function runResearch(args) {
    const payload = asObject(args);
    const mode = asString(payload.mode);
    const agent = new TUIResearchAgentExtended();
    try {
        if (mode === 'interactive') {
            await agent.runInteractive();
            return okResult('research-agent', 'native-agent', 'Research completed in interactive mode');
        }
        const briefPath = asString(payload.briefPath);
        const outputPath = asString(payload.outputPath);
        if (mode === 'brief' && briefPath) {
            const result = await agent.runWithBriefFile(briefPath, outputPath);
            return okResult('research-agent', 'native-agent', 'Research completed from brief file', result);
        }
        const company = asString(payload.company);
        const industry = asString(payload.industry);
        if (mode === 'quick' && company && industry) {
            const params = {
                company,
                industry,
                description: asString(payload.description),
                goals: asStringArray(payload.goals),
                constraints: asStringArray(payload.constraints),
                timeline: asString(payload.timeline),
                keywords: asStringArray(payload.keywords),
            };
            const result = await agent.runWithParams(params);
            return okResult('research-agent', 'native-agent', 'Research completed in quick mode', result);
        }
        return failResult('research-agent', 'native-agent', 'Invalid research parameters');
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return failResult('research-agent', 'native-agent', message);
    }
}
function okResult(toolId, runtime, message, data) {
    return {
        success: true,
        runtime,
        toolId,
        message,
        data,
    };
}
function failResult(toolId, runtime, errorMessage) {
    return {
        success: false,
        runtime,
        toolId,
        message: errorMessage,
        error: errorMessage,
    };
}
function asObject(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return {};
    }
    return value;
}
function asString(value) {
    return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}
function asStringArray(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter((entry) => entry.length > 0);
}
//# sourceMappingURL=tui-integration.js.map