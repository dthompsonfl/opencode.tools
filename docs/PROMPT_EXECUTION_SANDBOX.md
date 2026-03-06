# Autonomous Coding Agent Prompt: Enhanced Execution & Sandbox Control

## Objective
Give the agent safer, more powerful execution capabilities: long-running process management, database sandbox migrations, and network mocking.

## Target Architecture
These features will reside primarily in `src/cowork/sandbox/` and be exposed via the MCP server for agent use, respecting strict security boundaries.

## File-by-File Implementation Instructions

### 1. Long-Running Process Manager
**Files to Create/Modify:**
- `src/cowork/sandbox/process-manager.ts` (NEW): Build a manager that uses Node's `child_process.spawn` to run long-lived processes (like web servers). It must maintain a registry of PIDs, pipe stdout/stderr to temporary files, and expose `kill()` methods.
- `tools/mcp-server.ts`: Add `start_background_process(cmd)`, `tail_logs(pid)`, and `kill_process(pid)` tools.
- `src/cowork/runtime/agent-runner.ts`: Ensure all background processes are terminated when a session ends to prevent zombie processes.

### 2. Database Sandbox & Migrations Manager
**Files to Create/Modify:**
- `package.json`: Add exact dependency `testcontainers@10.2.2` if not present.
- `src/cowork/sandbox/db-sandbox.ts` (NEW): Implement logic to spin up temporary PostgreSQL/SQLite containers using `testcontainers`.
- `tools/mcp-server.ts`: Add `start_db_container(type)`, `run_migration(sql)`, and `seed_mock_data(json)` tools.

### 3. Network & API Mocking Engine
**Files to Create/Modify:**
- `package.json`: Add exact dependency `msw@2.3.1` (Mock Service Worker).
- `src/cowork/sandbox/api-mocker.ts` (NEW): Create a module to initialize an MSW server in the Node process. Provide an API to dynamically add request handlers. Must implement strict domain whitelisting to only allow mocking of specified staging/development domains and prevent abuse via sandboxing restrictions.
- `tools/mcp-server.ts`: Expose a `setup_api_mock(endpoint, response_json)` tool. Agents can use this to simulate third-party APIs during test execution. Ensure validation checks prevent the mock engine from intercepting core internal systems or external live production domains.

## Testing Requirements
- Unit tests for the Process Manager (spawning a dummy script and killing it).
- Integration test utilizing `testcontainers` to run a DB migration.
- Ensure all tests pass: `npm run test:unit`.
