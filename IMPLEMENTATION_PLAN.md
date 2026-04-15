# Complete Implementation Plan: Cowork System for OpenCode Tools

## Executive Summary

This document outlines a comprehensive implementation plan to add a **Cowork** plugin system to OpenCode Tools, enabling:
- Plugin-based architecture with directory-based plugins
- Command definitions via Markdown with YAML frontmatter
- Agent definitions as specialized coworkers
- Skills as reusable instruction modules
- Hooks for event-driven scripting
- Tool permission allowlists per command/agent
- Orchestration runtime for multi-agent coordination
- Default "Dev Team" plugin with standard workflows

---

## Phase 1: Core Infrastructure (Foundation)

### 1.1 Plugin System Foundation

**Purpose:** Establish the base plugin loading and discovery infrastructure

**Files to Create:**
- `src/cowork/plugin-loader.ts` - Discovers and loads plugins
- `src/cowork/types.ts` - Core type definitions for Cowork system
- `src/cowork/markdown-parser.ts` - YAML frontmatter + body parser

**Files to Modify:**
- `src/index.ts` - Export Cowork modules
- `package.json` - Add js-yaml dependency if not present

**Tests to Create:**
- `tests/unit/cowork/plugin-loader.test.ts`
- `tests/unit/cowork/markdown-parser.test.ts`

### 1.2 Registry System

**Purpose:** Create registries for commands, agents, skills with deterministic resolution

**Files to Create:**
- `src/cowork/registries/command-registry.ts` - Command registration and lookup
- `src/cowork/registries/agent-registry.ts` - Agent registration and lookup
- `src/cowork/registries/skill-registry.ts` - Skill registration and lookup
- `src/cowork/registries/index.ts` - Registry exports

**Resolution Rules:**
1. Bundled plugins load first (alphabetically)
2. System plugins load second (alphabetically)
3. User plugins load last (alphabetically)
4. Duplicate names: later plugins override earlier ones

**Tests to Create:**
- `tests/unit/cowork/registries/command-registry.test.ts`
- `tests/unit/cowork/registries/agent-registry.test.ts`

---

## Phase 2: Hook System

### 2.1 Hook Manager

**Purpose:** Implement event-driven hooks for session lifecycle and tool control

**Files to Create:**
- `src/cowork/hooks/hook-manager.ts` - Hook loading and event dispatch
- `src/cowork/hooks/hook-event.ts` - Event type definitions
- `src/cowork/hooks/hook-result.ts` - Decision result types

**Hook Events:**
- `SessionStart` - When a session begins
- `UserPromptSubmit` - When user submits a prompt
- `PreToolUse` - Before a tool is executed
- `PostToolUse` - After a tool executes
- `Stop` - When session tries to stop
- `SessionEnd` - When session ends

**Hook Script Interface:**
- Receives JSON on stdin with: `event_name`, `tool_name`, `tool_input`, `project_dir`, `plugin_root`, `transcript_path`, `timestamp`
- Returns exit code 0 = allow, exit code 2 = deny/block
- Can also output JSON: `{ "decision": "allow"|"deny"|"block", "message": "..." }`

**Tests to Create:**
- `tests/unit/cowork/hooks/hook-manager.test.ts`

### 2.2 Tool Permission Gate

**Purpose:** Enforce tool allowlists per command and per agent

**Files to Create:**
- `src/cowork/permissions/tool-gate.ts` - Permission checking logic

**Tests to Create:**
- `tests/unit/cowork/permissions/tool-gate.test.ts`

---

## Phase 3: Orchestration Runtime

### 3.1 Cowork Orchestrator

**Purpose:** Multi-agent coordination with deterministic result merging

**Files to Create:**
- `src/cowork/orchestrator/cowork-orchestrator.ts` - Main orchestrator class
- `src/cowork/orchestrator/agent-spawner.ts` - Agent spawning logic
- `src/cowork/orchestrator/result-merger.ts` - Deterministic merge strategy

**Orchestrator Features:**
- Execute command prompt as "manager"
- Spawn subagents by name with task + context
- Run concurrent agent tasks when safe
- Merge results via deterministic synthesis step
- Record transcripts/logs for hooks and debugging

**Tests to Create:**
- `tests/unit/cowork/orchestrator/cowork-orchestrator.test.ts`
- `tests/unit/cowork/orchestrator/result-merger.test.ts`

---

## Phase 4: CLI Integration

### 4.1 Cowork CLI Commands

**Purpose:** Expose Cowork functionality via CLI

**Files to Modify:**
- `src/cli.ts` - Add cowork subcommands

**New CLI Commands:**
```
opencode-tools cowork list                    # List commands, agents, plugins
opencode-tools cowork run <command> [args...]  # Run a command
opencode-tools cowork agents                   # List available agents
opencode-tools cowork plugins                  # List loaded plugins
```

---

## Phase 5: TUI Integration

### 5.1 TUI Tool Registration

**Purpose:** Register Cowork commands in the TUI

**Files to Modify:**
- `src/tui-integration.ts` - Add Cowork tool registration
- `src/tui-commands.ts` - Add Cowork command entries

**Features:**
- Display Cowork commands in TUI menu
- Execute commands through TUI interface
- Show agent status and progress

---

## Phase 6: Default Dev Team Plugin

### 6.1 Plugin Structure

**Purpose:** Provide a bundled default plugin with standard workflows

**Files to Create:**
- `src/cowork/plugins/dev-team/plugin.json` - Plugin manifest
- `src/cowork/plugins/dev-team/commands/code-review.md` - /code-review command
- `src/cowork/plugins/dev-team/commands/feature-dev.md` - /feature-dev command
- `src/cowork/plugins/dev-team/commands/bugfix.md` - /bugfix command
- `src/cowork/plugins/dev-team/commands/security-audit.md` - /security-audit command
- `src/cowork/plugins/dev-team/commands/release-prep.md` - /release-prep command
- `src/cowork/plugins/dev-team/agents/pm.md` - PM agent definition
- `src/cowork/plugins/dev-team/agents/architect.md` - Architect agent definition
- `src/cowork/plugins/dev-team/agents/implementer.md` - Implementer agent definition
- `src/cowork/plugins/dev-team/agents/reviewer.md` - Reviewer agent definition
- `src/cowork/plugins/dev-team/agents/qa.md` - QA agent definition
- `src/cowork/plugins/dev-team/agents/security.md` - Security agent definition
- `src/cowork/plugins/dev-team/agents/performance.md` - Performance agent definition
- `src/cowork/plugins/dev-team/agents/docs.md` - Docs agent definition

### 6.2 Command Frontmatter Schema

```yaml
---
description: "Perform comprehensive code review"
allowed-tools:
  - read
  - grep
  - glob
model: "gpt-4"
argument-hint: "<path> [--scope=files|commit|PR]"
---
# Code Review Workflow

## Phase 1: Preparation
- Clone repository
- Identify review scope

## Phase 2: Static Analysis
- Run linters
- Check formatting
- Analyze complexity

## Phase 3: Security Review
- Check for vulnerabilities
- Review authentication
- Check dependencies

## Phase 4: Report Generation
- Summarize findings
- Provide recommendations
```

### 6.3 Agent Frontmatter Schema

```yaml
---
name: "implementer"
description: "Senior software engineer for feature implementation"
tools:
  - read
  - write
  - edit
  - glob
  - grep
  - bash
model: "gpt-4"
color: "green"
---
# Implementer Agent

You are a senior software engineer specializing in...
[Full prompt content]
```

---

## Phase 7: Safety & Install Hardening

### 7.1 Opt-in Integration

**Purpose:** Make native integration opt-in for user safety

**Files to Modify:**
- `scripts/native-integrate.js` - Add OPENCODE_AUTO_INTEGRATE=1 flag check
- `package.json` - Adjust postinstall script

**Changes:**
- Default: `postinstall: "npm run build && node scripts/postinstall.js"`
- Native integration: Only runs with `OPENCODE_AUTO_INTEGRATE=1` environment variable
- Add explicit CLI command: `opencode-tools integrate`

---

## Phase 8: Testing & Validation

### 8.1 Test Coverage Requirements

**Coverage Thresholds:**
- Global: 70% branches, functions, lines, statements
- `./src/cowork/`: 80% all metrics
- Tests must cover: parsing, loading, hook decisions, permission gating, orchestrator merge

### 8.2 Validation Commands

```bash
# Run all tests
npm test

# Run Cowork-specific tests
npm test -- --testPathPattern='cowork'

# Run lint
npm run lint

# Run build
npm run build

# Full validation
npm run validate
```

---

## Implementation Order (Topological)

```
1. Types (src/cowork/types.ts)
2. Markdown Parser (src/cowork/markdown-parser.ts)
3. Plugin Loader (src/cowork/plugin-loader.ts)
4. Command Registry (src/cowork/registries/command-registry.ts)
5. Agent Registry (src/cowork/registries/agent-registry.ts)
6. Skill Registry (src/cowork/registries/skill-registry.ts)
7. Hook Manager (src/cowork/hooks/hook-manager.ts)
8. Tool Permission Gate (src/cowork/permissions/tool-gate.ts)
9. Result Merger (src/cowork/orchestrator/result-merger.ts)
10. Agent Spawner (src/cowork/orchestrator/agent-spawner.ts)
11. Cowork Orchestrator (src/cowork/orchestrator/cowork-orchestrator.ts)
12. CLI Integration (src/cli.ts)
13. TUI Integration (src/tui-integration.ts)
14. Default Dev Team Plugin (src/cowork/plugins/dev-team/)
15. Install Hardening (scripts/native-integrate.js, package.json)
```

---

## Dependencies

**Required (verify in package.json):**
- `js-yaml` - YAML frontmatter parsing
- `commander` - CLI framework (already present)
- `winston` - Logging (already present)

**Development:**
- `jest` - Testing (already present)
- `ts-jest` - TypeScript testing (already present)

---

## Risk Mitigation

1. **Small Commits:** Each module in separate commit with tests
2. **Incremental Validation:** Run tests after each module
3. **Self-Heal Loop:** Up to 6 iterations if validation fails
4. **Rollback Plan:** Git revert for any breaking changes

---

## Success Criteria

- [ ] Plugin loader discovers and loads plugins correctly
- [ ] Markdown frontmatter parsing works for commands and agents
- [ ] Registries resolve names deterministically
- [ ] Hook system dispatches events and enforces decisions
- [ ] Tool permission gating enforces allowlists
- [ ] Orchestrator spawns agents and merges results deterministically
- [ ] CLI exposes cowork commands
- [ ] TUI integrates cowork tools
- [ ] Default Dev Team plugin provides /code-review and /feature-dev
- [ ] Install is opt-in and safe
- [ ] All new code passes lint and tests
