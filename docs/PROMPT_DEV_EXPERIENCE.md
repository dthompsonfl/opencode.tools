# Autonomous Coding Agent Prompt: Developer Experience & Integration Tools

## Objective
Blend the agent into human workflows by implementing Interactive PR Generation, Changelog/Semver automation, Ticket Synchronization, and Safe Bash Execution.

## Target Architecture
These features act as final output stages in the delivery workflow and safety wrappers in the tool router.

## File-by-File Implementation Instructions

### 1. Interactive PR Generator
**Files to Create/Modify:**
- `src/cowork/integrations/git/pr-generator.ts` (NEW): Create a class that aggregates Git diffs, task descriptions from the memory blackboard, and test results. Prompt the LLM to generate a PR body.
- `tools/mcp-server.ts`: Expose a `create_github_pr` tool (requires GitHub token integration).

### 2. Changelog & Semantic Versioning Automation
**Files to Create/Modify:**
- `src/cowork/generation/semver-automation.ts` (NEW): Analyze the AST or git diffs. If public API signatures changed, flag as a MAJOR bump. Implement logic to rewrite `CHANGELOG.md` and `package.json`.
- `tools/mcp-server.ts`: Expose `bump_semver` and `update_changelog` tools.

### 3. Jira/Linear/GitHub Issues Synchronizer
**Files to Create/Modify:**
- `src/cowork/integrations/issue/tracker.ts` (NEW): Implement generic interfaces and specific adapters for fetching ticket details and transitioning status using REST APIs.
- `tools/mcp-server.ts`: Expose `read_ticket(id)` and `transition_ticket(id, status)` tools. Ensure all API keys and credentials are drawn securely from `process.env` (or a secure local vault) and are never hardcoded in the wrappers.

### 4. Natural Language to Shell Translator / Safe Execution
**Files to Create/Modify:**
- `src/cowork/runtime/safe-bash.ts` (NEW): Wrap bash execution. For any command submitted by an agent, parse it for dangerous flags (`rm -rf`, etc.). If risky, use a secure, locally-hosted LLM process to explain the command's intent in English. Do not transmit bash commands to an external LLM to prevent leaking potentially sensitive environmental or internal data.
- `src/tui-app.ts` / `src/cli.ts`: If a command is flagged as risky, prompt the user for explicit approval (`[y/N]`) before executing.

## Testing Requirements
- E2E tests for the Safe Bash execution, simulating an `rm -rf` call and verifying it is intercepted.
- Unit tests for Semver logic (e.g., verifying a backwards-compatible change only bumps MINOR/PATCH).
- Ensure all tests pass: `npm run test:unit`.
