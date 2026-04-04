/**
 * OpenCode Tools - MCP Integration Entry Point
 * 
 * This module provides the MCP server integration.
 * All tools are registered through the runtime bootstrap system.
 */

import { initializeRuntime, runtimeHealthCheck, listRuntimeTools, getRuntime } from './runtime/bootstrap';

/**
 * Initialize the runtime for MCP server
 * This should be called when the MCP server starts
 */
export function initForMCP() {
  return initializeRuntime({
    eagerInit: true,
    verbose: process.env.DEBUG === 'true',
  });
}

/**
 * Get runtime status for MCP tools
 */
export function getStatus() {
  return runtimeHealthCheck();
}

/**
 * List available tools for MCP
 */
export function getTools() {
  return listRuntimeTools();
}

/**
 * Execute a command by ID
 */
export async function executeCommand(commandId: string, args?: string[]): Promise<any> {
  const runtime = getRuntime();
  return runtime.commandRegistry.execute(commandId, args);
}

/**
 * Get the runtime instance
 */
export { getRuntime } from './runtime/bootstrap';
export { initializeRuntime, runtimeHealthCheck, listRuntimeTools } from './runtime/bootstrap';
