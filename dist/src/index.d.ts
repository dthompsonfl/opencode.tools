/**
 * OpenCode Tools - MCP Integration Entry Point
 *
 * This module provides the MCP server integration.
 * All tools are registered through the runtime bootstrap system.
 */
/**
 * Initialize the runtime for MCP server
 * This should be called when the MCP server starts
 */
export declare function initForMCP(): import("./runtime/bootstrap").RuntimeBootstrapResult;
/**
 * Get runtime status for MCP tools
 */
export declare function getStatus(): {
    initialized: boolean;
    pluginCount: number;
    agentCount: number;
    commandCount: number;
    fsBasePath: string | undefined;
    foundryBridgeHealthy: boolean | null;
    errors: string[];
    timestamp: string;
};
/**
 * List available tools for MCP
 */
export declare function getTools(): {
    name: string;
    description: string;
}[];
/**
 * Execute a command by ID
 */
export declare function executeCommand(commandId: string, args?: string[]): Promise<any>;
/**
 * Get the runtime instance
 */
export { getRuntime } from './runtime/bootstrap';
export { initializeRuntime, runtimeHealthCheck, listRuntimeTools } from './runtime/bootstrap';
//# sourceMappingURL=index.d.ts.map