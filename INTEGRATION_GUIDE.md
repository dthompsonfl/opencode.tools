# OpenCode Tools Integration Guide

This guide defines the current integration model for OpenCode Tools with strict production-deliverable guardrails enabled by default.

Production policy: `docs/PRODUCTION_DELIVERABLE_POLICY.md`.
Strategic backlog and enhancement roadmap: `docs/ENTERPRISE_GAP_BACKLOG.md`.

## 1) Integration Surfaces

OpenCode Tools currently integrates through four primary surfaces:

- CLI runtime: `src/cli.ts`
- TUI runtime: `src/tui-app.ts`
- Programmatic TUI tool registration: `src/index.ts` and `src/tui-integration.ts`
- MCP server adapter: `tools/mcp-server.ts`

## 2) Current Maturity (Accurate View)

Use this matrix as the source of truth for integration depth.

| Surface | Current State | Notes |
|---|---|---|
| Foundry orchestration (`orchestrate`) | Implemented, active | Default orchestration path; still has enterprise hardening backlog items |
| Cowork plugin loading/dispatch | Implemented | Command/agent/plugin registration works; further runtime hardening remains |
| CLI command portfolio (`research`, `docs`, `architect`, `pdf`) | Partial | Some command handlers are still lighter-weight than full production workflows |
| TUI tool registration | Implemented | Supports multiple agents and Cowork tools; integration helper modules still have improvement opportunities |
| MCP tool layer | Partial | Works for several paths; some tool contracts and realism improvements remain |

The default orchestration path enforces production-deliverable scope (code/docs/tests only) and release-gate validation.

## 3) Setup and Verification

```bash
# Install dependencies
npm install

# Build
npm run build

# Full quality baseline
npm run lint
npx tsc --noEmit
npm run validate:deliverable-scope
npm run test:all
```

Optional local global-link workflow:

```bash
npm link --force
opencode-tools tui
opencode-tools orchestrate --project "MyApp"
```

## 4) CLI Integration

Primary operator commands:

```bash
opencode-tools orchestrate --project "MyApp"
opencode-tools tui
opencode-tools cowork list
opencode-tools cowork run <command> [args...]
opencode-tools cowork agents
opencode-tools cowork plugins
opencode-tools mcp
```

Notes:

- `orchestrate` routes through the Foundry orchestration flow.
- `cowork` commands depend on loaded plugins and native agent configuration.
- Command behavior maturity is not uniform across all subsystems yet.

## 5) TUI Integration

TUI paths are centered on:

- `src/tui-app.ts`
- `src/tui/agents/index.ts`
- `src/tui-integration.ts`
- `src/tui-commands.ts`

Foundry orchestration is available through the orchestrator agent in the TUI session flow. For details, see `TUI_INTEGRATION.md`.

## 6) Cowork and Plugin Integration

Cowork integration stack:

- Loader: `src/cowork/plugin-loader.ts`
- Registries: `src/cowork/registries/*`
- Runtime orchestrator: `src/cowork/orchestrator/cowork-orchestrator.ts`
- Permission gate: `src/cowork/permissions/tool-gate.ts`

Plugin discovery includes bundled and system plugins. Continue to treat plugin trust, compatibility, and signature hardening as active backlog work.

## 7) Foundry Integration Model

Foundry bridge and orchestration modules:

- `src/foundry/orchestrator.ts`
- `src/foundry/cowork-bridge.ts`
- `src/foundry/state-definition.ts`
- `src/foundry/quality-gates.ts`
- `src/foundry/collaboration-hub.ts`

Foundry currently orchestrates iterative task execution, peer review phases, and quality gate command execution. Persistence and deterministic replay hardening are tracked in backlog items FND-001/FND-003 and AUD-*.

## 8) Contradictions Removed

The following older statements are no longer valid and should not be reused:

- "Fully integrated and production-complete" claims without qualification.
- "Research Agent is exclusive to TUI" claims.
- "No standalone CLI access" claims.

The current supported model is mixed CLI + TUI + MCP, with explicit maturity caveats.

## 9) Documentation Governance

When integration behavior changes, update all of:

- `README.md`
- `AGENTS.md`
- `INTEGRATION_GUIDE.md`
- `TUI_INTEGRATION.md`
- `docs/ENTERPRISE_GAP_BACKLOG.md` (if status or priorities shift)

Do not merge integration changes without aligning docs to runtime reality.
