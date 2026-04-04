# Autonomous Coding Agent Prompt: Peer Review & Multi-Agent Collaboration

## Objective
Implement multi-agent peer review mechanisms: an adversarial code reviewer, rubber duck debugging protocol, and performance benchmarking.

## Target Architecture
You will be modifying the `CoworkOrchestrator` to support new specialized agent roles and adding self-reflection capabilities to the `AgentRunner`.

## File-by-File Implementation Instructions

### 1. Adversarial Code Reviewer Agent
**Files to Create/Modify:**
- `agents/adversarial-reviewer/index.ts` (NEW): Create a new agent configuration. The prompt must instruct the agent to aggressively look for edge cases, performance bottlenecks, and security flaws, rather than just style.
- `AGENTS.md`: Document the new `adversarial-reviewer` agent.
- `src/cowork/plugins/dev-team/plugin.json` (if exists) or `src/cowork/registries/agent-registry.ts`: Register the new agent.
- `src/workflows/project-delivery.ts`: Add a mandatory review step where the `Implementer` output is passed to the `AdversarialReviewer` before moving to QA.

### 2. Automated "Rubber Duck" Debugging Protocol
**Files to Create/Modify:**
- `src/cowork/runtime/agent-runner.ts`: Intercept bash execution errors or test failures. When an error occurs, pause the main task loop. Trigger a sub-prompt requiring the agent to explain the bug in plain English.
- `src/cowork/persistence/context-store.ts`: Save this "rubber duck" explanation to the blackboard memory for context tracking.

### 3. Performance Benchmarking Agent
**Files to Create/Modify:**
- `agents/performance/index.ts` (NEW): Create a specialized performance agent.
- `src/cowork/tools/benchmarker.ts` (NEW): Implement a wrapper using `perf_hooks` to execute specific functions or scripts and measure CPU time and memory allocation.
- `tools/mcp-server.ts`: Expose `benchmark_before` and `benchmark_after` tools.
- `src/workflows/project-delivery.ts`: Add a performance check phase that executes the benchmark agent on critical code paths.

## Testing Requirements
- Mock the adversarial reviewer in unit tests to ensure it correctly fails a workflow when a vulnerability is flagged.
- Test the rubber duck protocol injection when simulated errors occur.
- Ensure all tests pass: `npm run test:unit`.
