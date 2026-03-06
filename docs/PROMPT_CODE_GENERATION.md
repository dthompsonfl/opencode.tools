# Autonomous Coding Agent Prompt: Advanced Code Generation & Refactoring

## Objective
Implement advanced code generation and refactoring tools, including multi-file atomic transactions, pattern-aware scaffolding, incremental shadow compilation, and dependency management automation.

## Target Architecture
These features must integrate with the `Cowork` workspace manager and `Foundry` orchestration engine, specifically enhancing the implementation and refactoring phases.

## File-by-File Implementation Instructions

### 1. Multi-File Atomic Refactoring (Transactions)
**Files to Create/Modify:**
- `src/cowork/workspace/transaction-manager.ts` (NEW): Implement a class that uses Git worktrees or temporary branching to apply changes. It must have `begin()`, `commit()`, and `rollback()` methods.
- `tools/mcp-server.ts`: Add an `apply_atomic_refactor` tool taking a list of file diffs.
- `src/foundry/orchestrator.ts`: Wrap multi-file modification phases in a transaction. If tests fail post-refactor, automatically call `rollback()`.

### 2. Pattern-Aware Scaffolders
**Files to Create/Modify:**
- `src/cowork/generation/pattern-analyzer.ts` (NEW): Implement a module that queries the AST index to find existing patterns (e.g., finding all React hooks or Django models) and extracts a template structure. The implementation must robustly verify that the AST index is fully initialized before querying; if unavailable, gracefully fallback to regex-based heuristics or trigger an explicit initialization request before proceeding.
- `tools/mcp-server.ts`: Expose a `scaffold_from_pattern` tool that accepts a target path and a pattern type. It generates a new file based on the inferred pattern rather than hardcoded strings.

### 3. Incremental "Shadow" Compilation
**Files to Create/Modify:**
- `src/cowork/sandbox/shadow-env.ts` (NEW): Create a class that mirrors the workspace into a temporary directory (using hardlinks or `rsync`) where compilation commands can run.
- `src/cowork/runtime/compiler-runner.ts` (NEW): Implement asynchronous execution of `tsc`, `eslint`, or Python's `mypy` against the shadow environment.
- `src/cowork/runtime/agent-runner.ts`: Intercept code modification tool calls. Run the changes in the shadow environment first. If the shadow compilation fails, return the error to the agent and abort the actual file write.

### 4. Design-Pattern Enforcers
**Files to Create/Modify:**
- `src/governance/design-patterns.ts` (NEW): Define validation logic for specific patterns (e.g., ensuring a class implementing the Singleton pattern has a private constructor).
- `src/foundry/quality-gates.ts`: Integrate pattern enforcement into the quality gates. If a pattern rule is violated, block the workflow.
- `tools/mcp-server.ts`: Expose an `enforce_pattern` tool for agents to self-check.

### 5. Automated Dependency Management
**Files to Create/Modify:**
- `src/cowork/tools/dependency-manager.ts` (NEW): Wrapper for `npm` or `pip`. Implement `installAndResolve(package, version)`.
- `tools/mcp-server.ts`: Expose `npm_install_and_resolve` tool.
- `src/cowork/runtime/agent-runner.ts`: Ensure dependency management is guarded by strict permission checks (`COWORK_SECURITY_ENFORCE_RBAC`).

## Testing Requirements
- Mock Git operations to test `transaction-manager.ts` rollback logic.
- E2E tests for shadow compilation ensuring main workspace is untouched on failure.
- Ensure all tests pass: `npm run test:unit`.
