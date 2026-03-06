# Comprehensive Feature Implementation Plans

This document provides a detailed, enterprise-level implementation plan for each feature outlined in the OpenCode Tools feature roadmap. These plans integrate directly with the existing Foundry orchestration and Cowork runtime architectures.

---

## 1. Advanced Context Management & Retrieval

### 1.1 Intelligent Codebase Indexing (AST/Semantic Search)
**Objective:** Replace regex matching with deep semantic search using AST parsing and a vector index.
*   **Architecture Update:** Integrate `tree-sitter` for AST parsing of major languages (TS, Python, etc.) within `src/cowork/workspace/`. Introduce a lightweight local vector store (e.g., `chromadb` or an in-memory solution like `faiss-node`).
*   **Implementation Steps:**
    1.  Create `src/cowork/indexer/ast-parser.ts` wrapping `tree-sitter`.
    2.  Create `src/cowork/indexer/vector-store.ts` for embedding and similarity search.
    3.  Develop a new `AgentSkill` or `Tool` (e.g., `semantic_search_codebase`) in `tools/mcp-server.ts`.
    4.  Update the `CoworkOrchestrator` to index the workspace on initialization if AST indexing is enabled in `opencode.json`.
*   **Testing:** Unit tests verifying AST extraction and vector matching accuracy. E2E tests confirming agents can locate symbols effectively.

### 1.2 Dependency Graph Extraction
**Objective:** Map internal imports and call graphs to assess downstream impacts before refactoring.
*   **Architecture Update:** Implement a static analyzer within the workspace module to map `import`, `require`, and call patterns.
*   **Implementation Steps:**
    1.  Create `src/cowork/workspace/dependency-graph.ts`.
    2.  Implement methods: `getCallGraph(filepath)` and `getDependenciesForFile(filepath)`.
    3.  Expose tools `get_call_graph` and `get_dependencies_for_file` in MCP and the internal tool router.
    4.  Update the refactoring agent prompt to enforce checking dependency graphs before making changes.
*   **Testing:** Graph traversal unit tests on mock repositories.

### 1.3 Stateful Workspace Memory
**Objective:** Maintain a "blackboard" memory across tasks to prevent loop execution and retain constraints.
*   **Architecture Update:** Enhance the existing `Blackboard` or `ContextStore` in `src/cowork/persistence/` to track specific fields: `filesReviewed`, `currentHypothesis`, `pendingTasks`.
*   **Implementation Steps:**
    1.  Extend the Postgres schema in `src/cowork/persistence/migrations/` for the Workspace model.
    2.  Update `src/cowork/runtime/context-store.ts` with API methods to append/update memory traits.
    3.  Expose a `update_memory` tool to agents.
    4.  Inject the stateful memory into the `system_prompt` dynamically in `AgentRunner`.
*   **Testing:** Integration tests ensuring memory persists between tool calls and agent loops.

### 1.4 Documentation & API Specification Ingestion
**Objective:** Parse OpenAPI, GraphQL, and Protocol Buffers to load API contracts into agent context.
*   **Architecture Update:** Introduce schema parsers in `src/cowork/parsers/` and sync with `AGENTS.md`/architecture docs.
*   **Implementation Steps:**
    1.  Integrate `swagger-parser` and `graphql/type` modules.
    2.  Create an automated job in `Foundry Orchestrator` that detects schema files on startup.
    3.  Translate schema definitions into markdown summaries stored in the `Stateful Workspace Memory`.
    4.  Provide an `ingest_api_spec` tool.
*   **Testing:** Unit tests validating correct markdown generation from varied OpenAPI v3 specs.

---

## 2. Advanced Code Generation & Refactoring

### 2.1 Multi-File Atomic Refactoring (Transactions)
**Objective:** Propose multi-file changes as a single transaction with automatic rollback on test failure.
*   **Architecture Update:** Implement Git-based transaction management or file-system snapshots in `src/cowork/workspace/transaction.ts`.
*   **Implementation Steps:**
    1.  Create `TransactionManager` using Git worktrees or temporary branching.
    2.  Expose an `apply_atomic_refactor` tool taking a list of file diffs.
    3.  Orchestrator automatically runs `npm test` (or configured test command) post-refactor.
    4.  If tests fail, call `TransactionManager.rollback()` and feedback the error trace to the agent.
*   **Testing:** E2E tests simulating a multi-file rename that introduces a bug, verifying rollback occurs.

### 2.2 Pattern-Aware Scaffolders
**Objective:** Generate scaffolding based on existing patterns found in the codebase.
*   **Architecture Update:** Utilize the AST indexer to extract templates (e.g., React hooks, API controllers).
*   **Implementation Steps:**
    1.  Create `src/cowork/generation/pattern-analyzer.ts`.
    2.  Implement a tool `scaffold_from_pattern` that takes a target directory and pattern type.
    3.  The tool searches the AST index for similar implementations, creates a parameterized template, and generates the new file.
*   **Testing:** Unit tests verifying structural similarity of generated code to existing examples.

### 2.3 Incremental "Shadow" Compilation
**Objective:** Run modifications in an isolated shadow environment to capture errors instantly.
*   **Architecture Update:** Use Docker or lightweight isolated process execution in `src/cowork/sandbox/`.
*   **Implementation Steps:**
    1.  Create `src/cowork/sandbox/shadow-env.ts` to duplicate the workspace state rapidly (e.g., via hard links or overlayfs).
    2.  Execute `tsc` or linters against the shadow environment asynchronously.
    3.  Intercept compiler/linter errors and map them to the original file paths.
    4.  Feed errors back to the agent *before* committing to the main workspace.
*   **Testing:** Integration tests proving changes don't affect the main workspace until shadow compilation passes.

### 2.4 Design-Pattern Enforcers
**Objective:** Verify and generate specific design patterns cleanly.
*   **Architecture Update:** Introduce policy validators in `src/governance/design-patterns.ts`.
*   **Implementation Steps:**
    1.  Define structural rules using the AST parser for common patterns (Singleton, Repository, etc.).
    2.  Create an `enforce_pattern` tool that audits a file against a pattern.
    3.  Add pattern adherence checks to the `QualityGates`.
*   **Testing:** Unit tests providing valid and invalid implementations of a Repository pattern.

### 2.5 Automated Dependency Management
**Objective:** Autonomously evaluate, select, install, and resolve version conflicts for libraries.
*   **Architecture Update:** Build a package manager wrapper in `src/cowork/tools/dependency-manager.ts`.
*   **Implementation Steps:**
    1.  Implement `npm_install_and_resolve`, `analyze_dependency_impact` tools.
    2.  Integrate `npm audit` checks before approving installation.
    3.  Update the `AgentRunner` to allow dependency management if enabled in policy.
*   **Testing:** E2E test where an agent installs a new dependency and handles a simulated peer-dependency conflict.

---

## 3. Comprehensive Quality Assurance & Testing

### 3.1 Test-Driven Development (TDD) Enforcer Loop
**Objective:** Enforce TDD workflow: tests first -> fail -> implement -> pass.
*   **Architecture Update:** Create a specialized `TDDOrchestrator` extending `Foundry Orchestrator`.
*   **Implementation Steps:**
    1.  Modify the Phase definitions in `ProjectDeliveryWorkflow` to enforce a `Write Tests` step before `Implementation`.
    2.  The Orchestrator must verify test failure before proceeding to implementation.
    3.  If implementation fails tests, loop back to implementation (with a retry limit).
*   **Testing:** Workflow integration tests validating the state transitions (Fail -> Implement -> Pass).

### 3.2 Mutation Testing Runner
**Objective:** Integrate Stryker to measure test suite quality by catching intentional bugs.
*   **Architecture Update:** Add mutation testing to the `QualityGates` runner.
*   **Implementation Steps:**
    1.  Create `src/foundry/quality-gates/mutation-gate.ts`.
    2.  Configure a lightweight Stryker run focused only on changed files.
    3.  Set a threshold (e.g., >80% mutation score) for the gate to pass.
*   **Testing:** Integration test where poorly written tests fail the mutation gate.

### 3.3 Visual Regression Testing Automation
**Objective:** Automatically spin up a headless browser to capture visual diffs against a baseline.
*   **Architecture Update:** Integrate Playwright into the QA agent's toolset.
*   **Implementation Steps:**
    1.  Create `src/cowork/tools/visual-testing.ts`.
    2.  Implement `capture_screenshot(url, selector)` and `compare_visual_diff(baseline, current)`.
    3.  The QA agent can flag visual regressions and prompt the UI agent to adjust CSS/components.
*   **Testing:** Unit tests verifying image diffing thresholds using mocked baseline images.

### 3.4 Automated Security & Vulnerability Scanning
**Objective:** Deep integration with Semgrep/CodeQL to analyze proposed code before submission.
*   **Architecture Update:** Add a Security `QualityGate`.
*   **Implementation Steps:**
    1.  Create `src/foundry/quality-gates/security-gate.ts`.
    2.  Run Semgrep synchronously on changed files during the "QA" phase.
    3.  Block release if critical/high vulnerabilities are detected.
*   **Testing:** Integration tests providing payloads with SQL injection and verifying the gate fails.

### 3.5 Code Coverage Analyzer
**Objective:** Allow the agent to target lines of code it just wrote but failed to cover.
*   **Architecture Update:** Enhance the QA agent to parse `lcov` or `json-summary` reports.
*   **Implementation Steps:**
    1.  Implement a `get_coverage_gaps` tool parsing `coverage-summary.json`.
    2.  Map coverage gaps to specific line numbers in recently modified files.
    3.  Instruct the QA agent to generate targeted test cases for uncovered branches.
*   **Testing:** Unit tests parsing mock lcov files and extracting correct uncovered line ranges.

---

## 4. Enhanced Execution & Sandbox Control

### 4.1 Long-Running Process Manager
**Objective:** Allow agents to start web servers and watch logs without blocking.
*   **Architecture Update:** Create `ProcessManager` in `src/cowork/sandbox/` tracking PIDs.
*   **Implementation Steps:**
    1.  Implement tools: `start_background_process(cmd)`, `tail_logs(pid)`, `kill_process(pid)`.
    2.  Pipe stdout/stderr to files mapped by PID.
    3.  Ensure the Orchestrator cleans up all background processes on session end.
*   **Testing:** Integration tests starting an Express server, making a request, and killing the server.

### 4.2 Database Sandbox & Migrations Manager
**Objective:** Spin up temporary SQLite/Postgres containers for safe schema migration testing.
*   **Architecture Update:** Integrate `testcontainers-node` into the sandbox tools.
*   **Implementation Steps:**
    1.  Create `src/cowork/tools/db-sandbox.ts`.
    2.  Implement tools: `start_db_container(type)`, `run_migration(sql)`, `seed_mock_data(json)`.
    3.  Allow the agent to query the sandbox DB to verify schema changes.
*   **Testing:** Integration tests spinning up Postgres, applying a mock schema, and tearing it down.

### 4.3 Network & API Mocking Engine
**Objective:** Built-in interceptor (like MSW) for simulating external APIs during local testing.
*   **Architecture Update:** Create a proxy server in the sandbox environment.
*   **Implementation Steps:**
    1.  Create `src/cowork/sandbox/api-mocker.ts`.
    2.  Implement tool: `setup_api_mock(endpoint, response)`.
    3.  Route outgoing agent requests through the proxy if configured.
*   **Testing:** E2E tests executing a function that makes an HTTP call and ensuring the mock responds.

---

## 5. Peer Review & Multi-Agent Collaboration

### 5.1 Adversarial Code Reviewer Agent
**Objective:** Secondary LLM role that aggressively looks for edge cases and security flaws.
*   **Architecture Update:** Add an `AdversarialReviewer` agent definition to `AGENTS.md`/registry.
*   **Implementation Steps:**
    1.  Create `agents/adversarial-reviewer/index.ts`.
    2.  Define prompt instructions focused strictly on breaking the proposed code.
    3.  Update the Orchestrator to route implementer output to the Reviewer before the QA phase.
*   **Testing:** Mocks simulating an implementation containing a subtle race condition, verifying the reviewer flags it.

### 5.2 Automated "Rubber Duck" Debugging Protocol
**Objective:** Force the agent to write a plain-English explanation of bugs before fixing.
*   **Architecture Update:** Add a required self-reflection step in the `AgentRunner` for error states.
*   **Implementation Steps:**
    1.  If a test or compiler error occurs, intercept the failure in `AgentRunner`.
    2.  Trigger a sub-prompt asking the agent to explain the root cause in Markdown.
    3.  Store this explanation in the `Stateful Workspace Memory`.
*   **Testing:** Unit tests verifying the "rubber duck" prompt is injected when `npm test` returns a non-zero exit code.

### 5.3 Performance Benchmarking Agent
**Objective:** Run before/after benchmarks to ensure code doesn't degrade performance.
*   **Architecture Update:** Create a new `Performance` agent and associated tools.
*   **Implementation Steps:**
    1.  Create `agents/performance/index.ts`.
    2.  Implement tools `benchmark_before` and `benchmark_after` using Node's `perf_hooks`.
    3.  Integrate the agent into the delivery phase.
*   **Testing:** E2E tests running a simulated CPU-intensive loop and verifying the benchmark agent reports timing diffs.

---

## 6. Developer Experience & Integration Tools

### 6.1 Interactive PR Generator
**Objective:** Generate human-readable Pull Request descriptions.
*   **Architecture Update:** Create a `PRGenerator` utility within the delivery agent.
*   **Implementation Steps:**
    1.  Aggregate logs from the `Stateful Workspace Memory`, Git diffs, and test results.
    2.  Prompt the LLM to synthesize this data into a structured PR template.
    3.  Implement a `create_github_pr` tool.
*   **Testing:** Unit tests generating PR bodies from mock git diffs and commit histories.

### 6.2 Changelog & Semantic Versioning Automation
**Objective:** Automatically update CHANGELOG.md and bump versions using AST analysis.
*   **Architecture Update:** Enhance the delivery phase with semantic analysis.
*   **Implementation Steps:**
    1.  Use the AST index to determine if public APIs were modified (breaking changes).
    2.  Implement `bump_semver(level)` and `update_changelog(entries)` tools.
    3.  Execute this step as the final action in the delivery workflow.
*   **Testing:** Integration tests verifying a function signature change results in a MAJOR version bump.

### 6.3 Jira/Linear/GitHub Issues Synchronizer
**Objective:** Two-way syncing to read acceptance criteria and transition ticket states.
*   **Architecture Update:** Add integration providers in `src/cowork/integrations/`.
*   **Implementation Steps:**
    1.  Implement API wrappers for Jira, Linear, and GitHub.
    2.  Create tools: `read_ticket(id)`, `transition_ticket(id, status)`.
    3.  The `PM Agent` uses these tools to populate the initial workspace context.
*   **Testing:** Unit tests mocking vendor APIs and validating tool outputs.

### 6.4 Natural Language to Shell Translator / Safe Execution
**Objective:** Explain bash commands before running them to prevent sandbox errors.
*   **Architecture Update:** Wrap the bash execution tool with an LLM evaluation step.
*   **Implementation Steps:**
    1.  Modify `run_in_bash_session` or create `safe_bash_execution`.
    2.  If the command contains dangerous tokens (e.g., `rm -rf`), intercept it.
    3.  Use a lightweight LLM call to evaluate safety and generate an explanation.
    4.  Prompt the user in the TUI for approval if the risk score is high.
*   **Testing:** E2E tests attempting an `rm -rf /` command and ensuring it is blocked or requests approval.

---

## 7. Data Analytics & Feedback Loop

### 7.1 Error Categorization & Memory
**Objective:** Persistent database of past failures and solutions.
*   **Architecture Update:** Introduce an `ErrorKnowledgeBase` powered by Postgres/vector db.
*   **Implementation Steps:**
    1.  When a bug is successfully fixed (tests turn green), extract the error message, the diff, and the root cause explanation.
    2.  Store in the database.
    3.  Implement a `query_past_mistakes(error_string)` tool for agents encountering new errors.
*   **Testing:** Integration test seeding the DB with a mock error, then querying it to retrieve the solution.

### 7.2 Telemetry & Confidence Scoring
**Objective:** Require agents to score confidence; force escalation if low.
*   **Architecture Update:** Add a confidence schema to agent response parsing.
*   **Implementation Steps:**
    1.  Modify the base `ToolRouter` prompt to require a JSON envelope containing `{"confidence": 85, "rationale": "...", "action": {...}}`.
    2.  If confidence < 70%, trigger a `request_human_input` escalation via the TUI.
    3.  Log confidence scores to `src/cowork/monitoring/parallel-state-monitor.ts`.
*   **Testing:** Unit tests verifying that parsing correctly isolates the confidence score and triggers the appropriate workflow branch.
