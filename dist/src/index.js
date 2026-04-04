"use strict";
/**
 * OpenCode Tools - MCP Integration Entry Point
 *
 * This module provides the MCP server integration.
 * All tools are registered through the runtime bootstrap system.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.listRuntimeTools = exports.runtimeHealthCheck = exports.initializeRuntime = exports.getRuntime = void 0;
exports.initForMCP = initForMCP;
exports.getStatus = getStatus;
exports.getTools = getTools;
exports.executeCommand = executeCommand;
const bootstrap_1 = require("./runtime/bootstrap");
/**
 * Initialize the runtime for MCP server
 * This should be called when the MCP server starts
 */
function initForMCP() {
    return (0, bootstrap_1.initializeRuntime)({
        eagerInit: true,
        verbose: process.env.DEBUG === 'true',
    });
}
/**
 * Get runtime status for MCP tools
 */
function getStatus() {
    return (0, bootstrap_1.runtimeHealthCheck)();
}
/**
 * List available tools for MCP
 */
function getTools() {
    return (0, bootstrap_1.listRuntimeTools)();
}
/**
 * Execute a command by ID
 */
async function executeCommand(commandId, args) {
    const runtime = (0, bootstrap_1.getRuntime)();
    return runtime.commandRegistry.execute(commandId, args);
}
/**
 * Get the runtime instance
 */
var bootstrap_2 = require("./runtime/bootstrap");
Object.defineProperty(exports, "getRuntime", { enumerable: true, get: function () { return bootstrap_2.getRuntime; } });
var bootstrap_3 = require("./runtime/bootstrap");
Object.defineProperty(exports, "initializeRuntime", { enumerable: true, get: function () { return bootstrap_3.initializeRuntime; } });
Object.defineProperty(exports, "runtimeHealthCheck", { enumerable: true, get: function () { return bootstrap_3.runtimeHealthCheck; } });
Object.defineProperty(exports, "listRuntimeTools", { enumerable: true, get: function () { return bootstrap_3.listRuntimeTools; } });
//# sourceMappingURL=index.js.map