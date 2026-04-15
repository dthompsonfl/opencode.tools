import { TUIExecutionResult } from './tui-integration';
import { TUIResearchAgent } from './tui-agents';
type ToolExecutor = (toolId: string, args: unknown) => Promise<TUIExecutionResult>;
export interface PromptAdapter {
    prompt(message: string): Promise<string>;
    pickFile(message: string): Promise<string | null>;
}
export interface ResearchCommandDependencies {
    promptAdapter?: PromptAdapter;
    executeTool?: ToolExecutor;
}
export interface TUIMenuOption {
    key: string;
    label: string;
    description: string;
    action: () => Promise<TUIExecutionResult | void>;
}
export interface TUICommandDefinition {
    id: string;
    name: string;
    description: string;
    category: string;
    menu: {
        title: string;
        description: string;
        options: TUIMenuOption[];
    };
}
export declare function createReadlinePromptAdapter(input?: NodeJS.ReadableStream, output?: NodeJS.WritableStream): PromptAdapter;
export declare function createResearchCommand(dependencies?: ResearchCommandDependencies): TUICommandDefinition;
export declare function registerResearchAgentWithTUI(tuiRegistry: {
    registerCommand: (command: TUICommandDefinition) => void;
}, dependencies?: ResearchCommandDependencies): void;
export declare const researchCommand: TUICommandDefinition;
export declare const tuiIntegration: {
    initialize(tuiContext: {
        tools: {
            register: (tool: {
                id: string;
                name: string;
                category: string;
                description: string;
                handlers: {
                    interactive: () => Promise<TUIExecutionResult>;
                    fromBrief: (briefPath: string) => Promise<TUIExecutionResult>;
                    quick: (company: string, industry: string, description?: string) => Promise<TUIExecutionResult>;
                };
            }) => void;
        };
    }): void;
    getAgent(): TUIResearchAgent;
};
export {};
//# sourceMappingURL=tui-commands.d.ts.map