# Autonomous Coding Agent Prompt: Advanced Context Management & Retrieval

## Objective
Implement advanced context management and retrieval capabilities within the OpenCode Tools codebase. This involves upgrading the existing workspace indexing from simple regex to deep AST/semantic search, extracting dependency graphs, implementing stateful workspace memory, and ingesting API specifications.

## Target Architecture
You are operating within the `Cowork` plugin system and `Foundry` orchestration runtime. Your modifications must adhere to the existing event-driven architecture and TypeScript strict typing rules.

## File-by-File Implementation Instructions

### 1. Intelligent Codebase Indexing (AST/Semantic Search)
**Files to Create/Modify:**
- `package.json`: Add exact dependencies `tree-sitter@0.20.6`, `tree-sitter-typescript@0.20.5`, and `faiss-node@0.5.1` (or a similar local vector store with a pinned version).
- `src/cowork/indexer/ast-parser.ts` (NEW): Create a wrapper class around `tree-sitter` that exposes methods to parse files and extract functions, classes, and variable declarations.
- `src/cowork/indexer/vector-store.ts` (NEW): Implement a local vector database interface using `faiss-node` to store AST node embeddings and provide similarity search functionality.
- `tools/mcp-server.ts`: Expose a new tool called `semantic_search_codebase` that leverages the `ast-parser` and `vector-store`. Define a Zod schema for its input (e.g., query string, language).
- `src/cowork/orchestrator/cowork-orchestrator.ts`: Hook into the initialization phase. If `enableSemanticSearch: true` in `opencode.json`, trigger a background indexing task of the current workspace.

### 2. Dependency Graph Extraction
**Files to Create/Modify:**
- `src/cowork/workspace/dependency-graph.ts` (NEW): Build a static analysis module that parses imports and requires. Implement `getCallGraph(filepath: string)` and `getDependenciesForFile(filepath: string)`.
- `tools/mcp-server.ts`: Expose two new tools: `get_call_graph` and `get_dependencies_for_file`. Validate paths strictly against the workspace root.

### 3. Stateful Workspace Memory
**Files to Create/Modify:**
- `src/cowork/persistence/migrations/0001_add_workspace_memory.sql` (NEW): Add a new table or JSONB column to track `filesReviewed`, `currentHypothesis`, and `pendingTasks` for a given session.
- `src/cowork/runtime/context-store.ts`: Implement methods `updateWorkspaceMemory()` and `getWorkspaceMemory()`.
- `src/cowork/runtime/agent-runner.ts`: Inject the current workspace memory into the agent's system prompt before each execution loop.
- `tools/mcp-server.ts`: Expose an `update_memory` tool allowing the agent to persist its thoughts and task lists.

### 4. Documentation & API Specification Ingestion
**Files to Create/Modify:**
- `package.json`: Add exact dependencies `swagger-parser@10.0.3` and `graphql@16.8.1`.
- `src/cowork/parsers/api-spec-parser.ts` (NEW): Implement logic to detect `swagger.json`, `openapi.yaml`, or `schema.graphql` in the workspace. Create a function to summarize these schemas into markdown.
- `src/cowork/orchestrator/cowork-orchestrator.ts`: On initialization, if an API spec is detected, parse it and inject the summary into the Stateful Workspace Memory.
- `tools/mcp-server.ts`: Expose `ingest_api_spec` tool to manually trigger spec ingestion.

## Testing Requirements
- Create unit tests for `ast-parser.ts` and `dependency-graph.ts` using mock code files.
- Ensure all new tools are tested in `test-mcp-sdk.ts`.
- All tests must pass: `npm run test:unit`.
