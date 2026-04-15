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
exports.tuiIntegration = exports.researchCommand = void 0;
exports.createReadlinePromptAdapter = createReadlinePromptAdapter;
exports.createResearchCommand = createResearchCommand;
exports.registerResearchAgentWithTUI = registerResearchAgentWithTUI;
const readline = __importStar(require("readline"));
const tui_integration_1 = require("./tui-integration");
const tui_agents_1 = require("./tui-agents");
function createReadlinePromptAdapter(input = process.stdin, output = process.stdout) {
    return {
        async prompt(message) {
            return new Promise((resolve) => {
                const rl = readline.createInterface({ input, output });
                rl.question(`${message} `, (answer) => {
                    rl.close();
                    resolve(answer.trim());
                });
            });
        },
        async pickFile(message) {
            const filePath = await this.prompt(`${message} (enter path)`);
            return filePath.length > 0 ? filePath : null;
        },
    };
}
const defaultExecutor = async (toolId, args) => {
    const tools = (0, tui_integration_1.registerTUITools)();
    const tool = tools.find((item) => item.id === toolId);
    if (!tool) {
        return {
            success: false,
            runtime: 'native-agent',
            toolId,
            message: `Tool not found: ${toolId}`,
            error: `Tool not found: ${toolId}`,
        };
    }
    return tool.handler(args);
};
function createResearchCommand(dependencies = {}) {
    const promptAdapter = dependencies.promptAdapter || createReadlinePromptAdapter();
    const executeTool = dependencies.executeTool || defaultExecutor;
    return {
        id: 'research-agent',
        name: 'Research Agent',
        description: 'Automated client and industry research',
        category: 'Research Tools',
        menu: {
            title: 'Research Agent',
            description: 'Generate comprehensive research dossiers for client projects',
            options: [
                {
                    key: '1',
                    label: 'Interactive Research',
                    description: 'Guided research with TUI prompts',
                    action: async () => executeTool('research-agent', { mode: 'interactive' }),
                },
                {
                    key: '2',
                    label: 'Research from Brief',
                    description: 'Research using client brief file',
                    action: async () => {
                        const briefPath = await promptAdapter.pickFile('Select client brief file:');
                        if (!briefPath) {
                            return {
                                success: false,
                                runtime: 'native-agent',
                                toolId: 'research-agent',
                                message: 'No brief file selected',
                                error: 'No brief file selected',
                            };
                        }
                        return executeTool('research-agent', {
                            mode: 'brief',
                            briefPath,
                        });
                    },
                },
                {
                    key: '3',
                    label: 'Quick Research',
                    description: 'Fast research with minimal input',
                    action: async () => {
                        const company = await promptAdapter.prompt('Company name:');
                        const industry = await promptAdapter.prompt('Industry:');
                        const description = await promptAdapter.prompt('Description (optional):');
                        if (!company || !industry) {
                            return {
                                success: false,
                                runtime: 'native-agent',
                                toolId: 'research-agent',
                                message: 'Company and industry are required',
                                error: 'Company and industry are required',
                            };
                        }
                        return executeTool('research-agent', {
                            mode: 'quick',
                            company,
                            industry,
                            description,
                        });
                    },
                },
            ],
        },
    };
}
function registerResearchAgentWithTUI(tuiRegistry, dependencies = {}) {
    tuiRegistry.registerCommand(createResearchCommand(dependencies));
}
exports.researchCommand = createResearchCommand();
exports.tuiIntegration = {
    initialize(tuiContext) {
        tuiContext.tools.register({
            id: 'research-agent',
            name: 'Research Agent',
            category: 'Research',
            description: 'Automated client and industry research',
            handlers: {
                interactive: () => defaultExecutor('research-agent', { mode: 'interactive' }),
                fromBrief: (briefPath) => defaultExecutor('research-agent', { mode: 'brief', briefPath }),
                quick: (company, industry, description) => {
                    return defaultExecutor('research-agent', { mode: 'quick', company, industry, description });
                },
            },
        });
    },
    getAgent() {
        return new tui_agents_1.TUIResearchAgent();
    },
};
//# sourceMappingURL=tui-commands.js.map