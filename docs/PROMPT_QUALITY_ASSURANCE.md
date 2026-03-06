# Autonomous Coding Agent Prompt: Comprehensive Quality Assurance & Testing

## Objective
Implement comprehensive QA and testing tools: TDD enforcer loops, mutation testing, visual regression testing, security scanning, and code coverage analysis.

## Target Architecture
These features will heavily modify the `Foundry` Quality Gates and the `ProjectDeliveryWorkflow` to enforce strict testing policies before code submission.

## File-by-File Implementation Instructions

### 1. Test-Driven Development (TDD) Enforcer Loop
**Files to Create/Modify:**
- `src/workflows/project-delivery.ts`: Modify the phases. Insert a mandatory `WriteTests` phase before the `Implementation` phase.
- `src/foundry/orchestrator.ts`: Add state machine logic to enforce that tests must fail *before* implementation begins, and must pass *after* implementation. If implementation fails tests, loop back to the implementation agent up to a configured retry limit.

### 2. Mutation Testing Runner
**Files to Create/Modify:**
- `package.json`: Add exact dependency `@stryker-mutator/core@8.2.6`.
- `src/foundry/quality-gates/mutation-gate.ts` (NEW): Implement a new quality gate. Configure it to run Stryker only against files modified in the current session. Define a threshold (e.g., 80% mutation score) required to pass the gate.
- `src/foundry/quality-gates.ts`: Register the `MutationGate`.

### 3. Visual Regression Testing Automation
**Files to Create/Modify:**
- `package.json`: Add exact dependency `playwright@1.45.1` (or a pinned `puppeteer` version).
- `src/cowork/tools/visual-testing.ts` (NEW): Implement a wrapper that spins up a headless browser, navigates to a URL, captures a screenshot, and compares it to a baseline image using pixel diffing (e.g., `pixelmatch`).
- `tools/mcp-server.ts`: Expose `capture_screenshot` and `compare_visual_diff` tools.

### 4. Automated Security & Vulnerability Scanning
**Files to Create/Modify:**
- `src/foundry/quality-gates/security-gate.ts` (NEW): Implement a gate that executes a lightweight static analysis tool (e.g., calling out to Semgrep CLI if installed, or using a Node-based AST scanner).
- `src/foundry/quality-gates.ts`: Register the `SecurityGate`. Fail the release approval if critical injection, path traversal, or prototype pollution vulnerabilities are found.

### 5. Code Coverage Analyzer
**Files to Create/Modify:**
- `src/cowork/tools/coverage-analyzer.ts` (NEW): Parse `coverage/coverage-summary.json` or `lcov.info`. Extract specific line numbers that lack coverage in newly modified files.
- `tools/mcp-server.ts`: Expose a `get_coverage_gaps` tool that returns the exact file paths and missing line numbers to the QA agent.

## Testing Requirements
- Unit tests for the `coverage-analyzer.ts` parser.
- Integration test for the TDD Enforcer loop ensuring the state transitions correctly.
- Ensure all tests pass: `npm run test:unit`.
