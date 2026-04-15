# Foundry TUI Guide

## Purpose

Use the dedicated Foundry TUI (`src/tui-foundry/*`) for full Foundry/Cowork runtime control:

- project-level collaboration control,
- team-wide and per-agent directives,
- workspace-scoped execution,
- runtime settings updates (including active LLM provider/model).

## Commands

```bash
# Dedicated Foundry TUI entrypoint
npm run foundry:tui

# General TUI entrypoint
npm run tui
```

Implementation entrypoint: `src/tui-foundry/index.ts`.

## Runtime Surface

- App root: `src/tui-foundry/App.tsx`
- Store provider: `src/tui-foundry/store/store.tsx`
- Runtime singleton + controllers:
  - `src/tui-foundry/runtime/tui-runtime.ts`
  - `src/tui-foundry/runtime/controllers/foundry-controller.ts`
  - `src/tui-foundry/runtime/controllers/cowork-controller.ts`
- Core control screens:
  - `src/tui-foundry/screens/AgentHubScreen.tsx`
  - `src/tui-foundry/screens/ExecutionScreen.tsx`
  - `src/tui-foundry/screens/WorkspacesScreen.tsx`
  - `src/tui-foundry/screens/WorkspaceDetailScreen.tsx`
  - `src/tui-foundry/screens/SettingsScreen.tsx`

## Operator Controls

### Settings screen (granular runtime/LLM controls)

- `[Tab]` switch between LLM/runtime settings sections.
- `[P]` cycle LLM provider (`openai`, `anthropic`, `google`, `azure`, `local`, `custom`).
- `[M]` cycle model for the selected provider, `[X]` edit a custom model string.
- `[K]` edit API key, `[U]` edit base URL, `[Z]` edit max tokens.
- `[E]` toggle LLM enabled/disabled, `[V]` run provider config connection test.
- `[←/→]` adjust temperature.
- `[N]` notifications toggle, `[A]` auto-scroll toggle, `[C]` compact mode toggle, `[T]` theme cycle.

### Agent hub screen (team + individual control)

- `[↑/↓]` select an agent in the project team roster.
- `[G]` open a prompt and send a custom group directive (all team members in active project/workspace scope).
- `[I]` open a prompt and send a custom direct instruction to selected agent.
- `[R]` open a prompt and request review from selected agent for a specific artifact key.
- `[Enter]` submits active prompt and `[Esc]` cancels prompt mode.

These actions route through the Cowork runtime controller and publish activity entries/errors into TUI state.

## Production Deliverable Policy

- Foundry runs default to strict deliverable-scope enforcement (`enforceDeliverableScope: true`).
- Execution results surface deliverable-scope pass/fail in orchestrator summaries.
- Policy baseline: `docs/PRODUCTION_DELIVERABLE_POLICY.md`.

## Verification

```bash
npm run lint
npm run build
npx tsc --noEmit
npm run validate:deliverable-scope
npx jest tests/unit/foundry/tui/routes/runtime-bridge.test.ts --runInBand
```
