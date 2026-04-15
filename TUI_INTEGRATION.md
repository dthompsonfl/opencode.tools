# OpenCode TUI Integration

This document describes the current TUI integration model for OpenCode Tools.

Canonical readiness and backlog status is tracked in `docs/ENTERPRISE_GAP_BACKLOG.md`.
Production deliverable policy is defined in `docs/PRODUCTION_DELIVERABLE_POLICY.md`.

## 1) Scope and Truth Statement

- The TUI is a primary interactive interface for multi-agent operation.
- The TUI is **not** the only interface; CLI and MCP paths also exist.
- Do not claim exclusive TUI access for research or orchestration workflows.

## 2) Runtime Entry and Core Files

- TUI entrypoint: `src/tui-app.ts`
- TUI app shell: `src/tui/App.tsx`
- Agent catalog and behavior: `src/tui/agents/index.ts`
- Store and state: `src/tui/store/store.tsx`
- Generic TUI tool registry surface: `src/tui-integration.ts`
- Legacy/helper registration module: `src/tui-commands.ts`

## 3) Orchestrator Behavior in TUI

The orchestrator agent in `src/tui/agents/index.ts` supports interactive commands inside a session:

- `help`
- `status`
- `run <intent>` (Foundry execution with quality gates)
- `quick <intent>` (Foundry execution without quality gates)
- `spawn <agentId> <task>` (direct Cowork spawn path)

`run` mode reports deliverable-scope pass/fail from Foundry release validation.

Natural-language input is interpreted as Foundry intent execution when no explicit command is provided.

## 4) TUI Tool Registration Path

Programmatic TUI tool registration uses:

- `registerTUITools()` from `src/tui-integration.ts`
- `getAvailableTools()` / `executeTool()` from `src/index.ts`

Current registration includes:

- Built-in TUI agents (research, architecture, codegen)
- Discovered plugin metadata
- Cowork commands and agents surfaced as TUI tools

## 5) Known Integration Gaps

The following are active improvement areas and should be treated as non-final:

- `src/tui-commands.ts` still contains placeholder helper patterns for prompt/file picker integration.
- `src/tui-integration.ts` includes legacy comments claiming TUI-only availability; runtime model is broader.
- Foundry TUI route modules under `foundry/foundry/tui/routes/*` are not yet fully coupled to production runtime state transitions.

Track remediation in:

- UIX-002, UIX-003 (`docs/ENTERPRISE_GAP_BACKLOG.md`)

## 6) Integration Validation Checklist

After TUI integration changes, run:

```bash
npm run lint
npm run build
npx tsc --noEmit
npm run validate:deliverable-scope
npm run test:unit
npm run test:e2e
```

Manual checks:

1. Start TUI (`npm run tui`).
2. Create a new orchestrator session.
3. Execute `run <intent>` and confirm Foundry report is displayed.
4. Execute `status` and verify transcript + last Foundry run details.
5. Verify Cowork command and agent tools appear when plugins are loaded.

## 7) Recommended Integration Pattern

For new TUI features:

1. Add typed agent/tool behavior in `src/tui/agents/index.ts` or `src/tui-integration.ts`.
2. Keep state transitions explicit through `src/tui/store/store.tsx` actions.
3. Route orchestration to Foundry/Cowork runtime modules rather than duplicating orchestration logic in UI handlers.
4. Add or update unit/e2e coverage for the interaction flow.
5. Update docs (`README.md`, `INTEGRATION_GUIDE.md`, this file, and backlog status when relevant).

## 8) Deprecated Claims

These statements are deprecated and should not be reintroduced:

- "TUI-exclusive access only"
- "No CLI access"
- "No standalone command paths"

Current model is intentionally multi-surface: TUI, CLI, and MCP.
