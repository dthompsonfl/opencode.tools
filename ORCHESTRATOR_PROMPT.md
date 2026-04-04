# ORCHESTRATOR_PROMPT.md - Master Prompt for Cowork Implementation

## Overview

This is the **master orchestration prompt** that guides the complete implementation of the Cowork plugin system for OpenCode Tools. Use this prompt to execute all code updates in a coordinated, systematic manner.

---

## Project Context

**Repository:** `C:\Users\drpt0\Developer\opencode.tools`
**Node Version:** v22.22.0
**NPM Version:** 11.7.0
**TypeScript:** Strict mode enabled

### Current Architecture

- **CLI Entry:** `src/cli.ts` - Commander-based CLI with commands: research, docs, architect, pdf, tui, orchestrate
- **TUI Entry:** `src/tui-app.ts` - Interactive terminal UI using readline
- **TUI Integration:** `src/tui-integration.ts` - Registers tools for TUI access
- **Agents:** `agents/` - ResearchAgent, DocumentationAgent, ArchitectureAgent, PDFGeneratorAgent
- **Runtime:** `src/runtime/` - Logger, Errors, Cache, Audit, Artifacts
- **Governance:** `src/governance/` - Gatekeeper, Policy Engine, Rubrics
- **Database:** `src/database/` - JSON-based database
- **Plugins:** `src/plugins/discovery.ts` - Basic plugin manifest discovery
- **Tools:** `tools/` - webfetch, search, discovery, docs, codegen

### Known Gaps (to fix)

1. No Cowork plugin system (commands/agents/skills/hooks)
2. No markdown frontmatter parsing for command/agent definitions
3. No registry system with deterministic resolution
4. No hook system for event-driven scripting
5. No tool permission gating
6. Basic orchestration (no concurrent agents, no deterministic merge)
7. No default Dev Team plugin (/code-review, /feature-dev, etc.)
8. Install script runs automatically (needs opt-in)

---

## Implementation Order

Execute the following modules in this exact order:

### Phase 1: Foundation

1. **PROMPTS/01-cowork-types.md** - Create `src/cowork/types.ts`
2. **PROMPTS/02-markdown-parser.md** - Create `src/cowork/markdown-parser.ts`
3. **PROMPTS/03-plugin-loader.md** - Create `src/cowork/plugin-loader.ts`

### Phase 2: Registries

4. **PROMPTS/04-command-registry.md** - Create `src/cowork/registries/command-registry.ts`
5. **PROMPTS/05-agent-registry.md** - Create `src/cowork/registries/agent-registry.ts`
6. **PROMPTS/06-skill-registry.md** - Create `src/cowork/registries/skill-registry.ts`

### Phase 3: Hooks & Permissions

7. **PROMPTS/07-hook-manager.md** - Create `src/cowork/hooks/hook-manager.ts`
8. **PROMPTS/08-tool-permission-gate.md** - Create `src/cowork/permissions/tool-gate.ts`

### Phase 4: Orchestration

9. **PROMPTS/09-result-merger.md** - Create `src/cowork/orchestrator/result-merger.ts`
10. **PROMPTS/10-agent-spawner.md** - Create `src/cowork/orchestrator/agent-spawner.ts`
11. **PROMPTS/11-cowork-orchestrator.md** - Create `src/cowork/orchestrator/cowork-orchestrator.ts`

### Phase 5: Integration

12. **PROMPTS/12-cli-integration.md** - Modify `src/cli.ts` to add cowork commands
13. **PROMPTS/13-tui-integration.md** - Modify TUI files for Cowork support

### Phase 6: Default Plugin

14. **PROMPTS/14-default-plugin.md** - Create `src/cowork/plugins/dev-team/` plugin

### Phase 7: Safety

15. **PROMPTS/15-install-hardening.md** - Modify `scripts/native-integrate.js` and `package.json`

---

## Execution Instructions

### Step 1: Prepare Environment

```bash
cd C:\Users\drpt0\Developer\opencode.tools
npm run build
npm run lint  # Note current issues for reference
```

### Step 2: Execute Each Prompt

For each prompt in order:

1. Read the prompt file from `PROMPTS/` directory
2. Create the specified file(s)
3. Create corresponding test file in `tests/unit/cowork/`
4. Run tests: `npm test -- --testPathPattern='cowork/[module-name]'`
5. Run lint on new files
6. Fix any issues before proceeding

### Step 3: Validation After Each Module

After completing each module, run:

```bash
# TypeScript compilation
npm run build

# Lint on new files only
npm run lint -- src/cowork/

# Run tests for new module
npm test -- --testPathPattern='[test-path]'
```

### Step 4: Final Validation

After all modules complete:

```bash
# Full build
npm run build

# Full lint check  
npm run lint

# Run all tests
npm test

# Validate command-line
node dist/src/cli.js cowork list
node dist/src/cli.js cowork agents
node dist/src/cli.js cowork plugins
```

---

## Success Criteria

After complete implementation:

- [ ] `npm run build` succeeds with no errors
- [ ] `npm run lint` passes for all new files
- [ ] All unit tests pass
- [ ] CLI commands work: `cowork list`, `cowork run`, `cowork agents`, `cowork plugins`
- [ ] TUI displays Cowork commands
- [ ] Default Dev Team plugin loads with /code-review and /feature-dev commands
- [ ] Install is opt-in (requires OPENCODE_AUTO_INTEGRATE=1)

---

## Code Style Guidelines

Follow these conventions (from AGENTS.md):

### TypeScript
- Use `strict: true` - No implicit any
- Explicit return types on public functions
- Prefer interfaces over type aliases for objects

### Imports
- **Absolute imports only** (no relative paths):
  ```typescript
  // ✅ CORRECT
  import { ResearchAgent } from 'agents/research/research-agent';
  
  // ❌ WRONG  
  import { ResearchAgent } from '../../agents/research/research-agent';
  ```

### Naming
- Classes: PascalCase
- Interfaces: PascalCase (prefix with I where appropriate)
- Functions: camelCase
- Constants: UPPER_SNAKE_CASE
- Files: kebab-case

### Error Handling
- Never swallow errors - Always provide context
- Use custom error classes extending BaseError
- Include metadata for enterprise tracking

---

## File Locations

All new Cowork code goes in:

```
src/cowork/
├── types.ts                    # Phase 1
├── markdown-parser.ts          # Phase 1
├── plugin-loader.ts            # Phase 1
├── registries/
│   ├── command-registry.ts     # Phase 2
│   ├── agent-registry.ts       # Phase 2
│   ├── skill-registry.ts       # Phase 2
│   └── index.ts
├── hooks/
│   ├── hook-manager.ts        # Phase 3
│   └── index.ts
├── permissions/
│   ├── tool-gate.ts           # Phase 3
│   └── index.ts
├── orchestrator/
│   ├── result-merger.ts        # Phase 4
│   ├── agent-spawner.ts       # Phase 4
│   ├── cowork-orchestrator.ts # Phase 4
│   └── index.ts
└── plugins/
    └── dev-team/               # Phase 6
        ├── plugin.json
        ├── commands/
        │   ├── code-review.md
        │   ├── feature-dev.md
        │   ├── bugfix.md
        │   ├── security-audit.md
        │   └── release-prep.md
        └── agents/
            ├── pm.md
            ├── architect.md
            ├── implementer.md
            ├── reviewer.md
            ├── qa.md
            ├── security.md
            ├── performance.md
            └── docs.md
```

All tests go in:

```
tests/unit/cowork/
├── markdown-parser.test.ts
├── plugin-loader.test.ts
├── registries/
│   ├── command-registry.test.ts
│   ├── agent-registry.test.ts
│   └── skill-registry.test.ts
├── hooks/
│   └── hook-manager.test.ts
├── permissions/
│   └── tool-gate.test.ts
└── orchestrator/
    ├── result-merger.test.ts
    ├── agent-spawner.test.ts
    └── cowork-orchestrator.test.ts
```

---

## Dependencies

**Required (verify in package.json):**
- `js-yaml` - YAML frontmatter parsing
- `commander` - CLI framework
- `winston` - Logging

**Development:**
- `jest` - Testing
- `ts-jest` - TypeScript testing

---

## Rollback Plan

If any issues arise:

1. **Git Revert:** Use `git revert` to undo specific commits
2. **Branch:** Work in feature branch: `feature/cowork-implementation`
3. **Backup:** Commit frequently with descriptive messages

---

## Contact & Notes

- This implementation follows the Fortune-500 governance standards
- Security: Hooks run with minimal permissions
- All code requires tests
- No secrets hardcoded - use environment variables

---

## Quick Reference Commands

```bash
# Build
npm run build

# Lint
npm run lint

# Test specific module
npm test -- --testPathPattern='cowork/[module]'

# Full test
npm test

# Validate
npm run validate

# CLI commands (after implementation)
node dist/src/cli.js cowork list
node dist/src/cli.js cowork run code-review ./src
node dist/src/cli.js cowork agents
node dist/src/cli.js cowork plugins
node dist/src/cli.js integrate
```

---

*This orchestrator prompt was generated on 2026-02-13 for OpenCode Tools v1.0.0*
