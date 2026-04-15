import { TUIResearchAgent } from './tui-agents';
import { ResearchParams } from './tui-agents';
import type { ResearchResult } from './tui-agents';
import { PluginManifest } from './plugins/discovery';
import { loadAllPlugins } from './cowork/plugin-loader';
export interface TUITool {
    id: string;
    name: string;
    description: string;
    category: 'research' | 'documentation' | 'codegen' | 'qa' | 'delivery' | 'cowork';
    handler: (args: unknown) => Promise<TUIExecutionResult>;
    parameters?: TUIParameter[];
}
export interface TUIParameter {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array';
    required: boolean;
    description: string;
    default?: unknown;
}
export interface TUIExecutionResult {
    success: boolean;
    runtime: 'native-agent' | 'cowork' | 'foundry' | 'plugin';
    toolId: string;
    message: string;
    data?: unknown;
    error?: string;
}
export interface CoworkRuntimeAdapter {
    executeCommand(commandId: string, args: string[]): Promise<unknown>;
    runAgent(agentId: string, task: string, context?: Record<string, unknown>): Promise<unknown>;
}
export interface FoundryRuntimeAdapter {
    runWorkflow(intent: string, repoRoot?: string): Promise<unknown>;
}
export interface TUIRuntimeAdapters {
    cowork: CoworkRuntimeAdapter;
    foundry: FoundryRuntimeAdapter;
}
export interface RegisterTUIToolsOptions {
    runtimeAdapters?: Partial<TUIRuntimeAdapters>;
    manifests?: PluginManifest[];
    pluginLoader?: typeof loadAllPlugins;
}
export declare function registerTUITools(options?: RegisterTUIToolsOptions): TUITool[];
export declare class TUIResearchAgentExtended extends TUIResearchAgent {
    runWithBriefFile(briefPath: string, _outputPath?: string): Promise<unknown>;
    runWithParams(params: ResearchParams): Promise<ResearchResult>;
}
//# sourceMappingURL=tui-integration.d.ts.map