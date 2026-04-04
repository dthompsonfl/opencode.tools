# OpenCode MCP Servers: Update & Upgrade Guide

This document provides a comprehensive and exhaustive guide to resolving the \`MCP error -32000: Connection closed\` errors and ensuring that the OpenCode MCP servers and tools are operating at peak performance and reliability.

## 1. Root Cause Analysis: \`-32000 Connection closed\`

The \`-32000: Connection closed\` error in the Model Context Protocol (MCP) typically occurs when the client unexpectedly loses connection to the server process over standard input/output (stdio) or HTTP/SSE. The most common causes are:

1. **Process Crashes (Unhandled Exceptions/Rejections):** The underlying MCP server process (e.g., \`npx mcp-server-actor-critic-thinking\`, \`npx @modelcontextprotocol/server-memory\`) threw an unhandled error and crashed, breaking the stdio pipe.
2. **Timeouts during Boot or Execution:** The server took longer to initialize or process a request than the client's configured \`timeout\` (e.g., \`5000ms\` or \`15000ms\` in \`opencode.json\`), causing the client to forcefully terminate the connection.
3. **Out of Memory (OOM):** The server process consumed too much memory and was killed by the OS (especially common with heavy tools or large datasets).
4. **Network/Proxy Issues (Remote Servers):** For remote servers (e.g., Stripe, Better Auth), network latency, rate limiting, or transient errors can cause the HTTP/SSE connection to close prematurely.
5. **Stdout/Stderr Pollution:** If a local server process writes non-JSON data (e.g., debug logs, \`console.log\`) to \`stdout\`, the MCP client fails to parse the JSON-RPC messages and closes the connection.

## 2. Immediate Fixes & Configuration Updates

### 2.1. Increase Timeouts in \`opencode.json\`
Some tools simply take longer to start (especially \`npx\` commands downloading dependencies) or execute complex tasks. Update \`opencode.json\` to give them more breathing room.

*   **Memory:** Increase from \`5000\` to \`15000\` (15 seconds).
*   **critical-thinking:** Increase from \`15000\` to \`30000\` (30 seconds).
*   **Serena:** Increase from \`15000\` to \`30000\` or even \`60000\` (code analysis can be slow).
*   **Remote Servers (Stripe, Better Auth):** Explicitly add a timeout of \`10000\` or \`15000\` to account for network latency.

### 2.2. Pre-install \`npx\` Packages Globally or Locally
Using \`npx -y <package>\` for every invocation means the process might spend valuable seconds resolving or downloading the package, leading to timeouts.
*   **Action:** Install the MCP servers as explicit `devDependencies` or `dependencies` in your `package.json` or globally on the host machine.
*   **Example:** \`npm install -g @modelcontextprotocol/server-memory@latest\` and change the command in \`opencode.json\` from \`["npx", "-y", ...]\` to simply \`["mcp-server-memory"]\`.

## 3. Server Code hardening & Upgrade Strategies

To ensure the local OpenCode MCP server (\`tools/mcp-server.ts\`) and other tools are top-notch:

### 3.1. Strict Stdout Management
Ensure absolutely **no** application logs go to \`stdout\`. \`stdout\` must be exclusively reserved for JSON-RPC MCP communication.
*   Verify that the console patch in \`tools/mcp-server.ts\` completely redirects \`console.log\`, \`console.info\`, \`console.warn\`, and \`console.debug\` to \`process.stderr.write\`.
*   Ensure third-party libraries used within your tools do not write to \`stdout\`.

### 3.2. Robust Error Boundaries
Wrap all tool handler executions in robust \`try/catch\` blocks. Never let a tool crash the main MCP server process.
*   Currently, \`tools/mcp-server.ts\` catches errors and throws \`McpError(ErrorCode.InternalError)\`. Ensure this catches asynchronous rejections as well.
*   Add global unhandled rejection handlers to the MCP server:
    \`\`\`typescript
    process.on('unhandledRejection', (reason, promise) => {
      process.stderr.write(\`Unhandled Rejection: \${reason}\\n\`);
    });
    process.on('uncaughtException', (error) => {
      process.stderr.write(\`Uncaught Exception: \${error.message}\\n\`);
    });
    \`\`\`

### 3.3. Dependency Updates
Outdated dependencies can contain bugs that lead to memory leaks or crashes.
*   Regularly update \`@modelcontextprotocol/sdk\` to the latest version.
*   Update \`zod\` and other schema validation libraries.
*   Run \`npm audit fix\` and resolve the deprecated package warnings (e.g., \`glob\`, \`inflight\`).

### 3.4. Input Validation (Zod)
Ensure that the inputs provided by the LLM exactly match the expected schema before executing the tool. The current implementation dynamically maps JSON Schema to Zod. Ensure this mapping is robust and doesn't fail on complex nested schemas.

## 4. Operational Best Practices

### 4.1. Monitoring and Logging
*   Capture the \`stderr\` output of all MCP sub-processes. The \`-32000\` error hides the actual crash reason. By logging \`stderr\` to a file (e.g., \`/logs/mcp-memory.log\`), you can see exactly why the process died.
*   Implement a health-check mechanism.

### 4.2. Graceful Degradation & Retries
If an MCP tool connection closes, the orchestration client should attempt to restart the server and retry the operation at least once before failing the entire agent workflow.

### 4.3. Resource Limits
Node.js processes might need `--max-old-space-size=4096` if they are processing large datasets (like codebases or wikis).

## 5. Summary Checklist

- [ ] Update \`timeout\` values in \`opencode.json\` for heavy tools (Serena, critical-thinking, Memory).
- [ ] Add explicit timeouts for remote MCP servers.
- [ ] Avoid \`npx -y\` overhead by pre-installing MCP server packages.
- [ ] Add \`unhandledRejection\` and \`uncaughtException\` listeners to \`tools/mcp-server.ts\` (logging to \`stderr\`).
- [ ] Capture and persist \`stderr\` logs for all spawned MCP processes to diagnose future crashes.
- [ ] Update \`@modelcontextprotocol/sdk\` to the latest version.
- [ ] Implement client-side retry logic for \`-32000 Connection closed\` errors.
