# OpenCode Tools

**MCP-based developer team automation for OpenCode.**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/opencode/ai-tool)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

OpenCode Tools provides a multi-agent runtime that combines Foundry orchestration and Cowork plugin-based delegation through the Model Context Protocol (MCP).

## Current Status

- **MCP is now the primary interface** - all functionality is accessed through MCP tools.
- Foundry is wired as the internal orchestration engine.
- Cowork command/agent/plugin loading is integrated and test-covered.
- Quality gates run through lint/build/typecheck/tests plus strict deliverable-scope validation.
- Production-deliverable enforcement is enabled by default (`enforceDeliverableScope: true`).

## Core Capabilities

- **MCP Server**: Access all tools via the Model Context Protocol
- **Foundry Orchestration**: phased execution, iterative loops, peer review, and release gating (internal)
- **Cowork Runtime**: command registry, agent registry, plugin loading, permission gates, persistent event bus
- **Specialized Agents**: research, docs, architecture, codegen, QA, delivery, PDF generation (available via MCP)
- **Production Deliverable Guardrails**: strict scope policy (code/docs/tests only)

## 🆕 Collaborative Development Teams (New!)

OpenCode Tools now supports **parallel, event-driven autonomous development teams**:

### Real-Time Autonomous Teams
- **Dynamic team formation** from project requirements
- **Multiple agents working simultaneously** on different tasks
- **Intelligent task routing** based on capabilities and workload
- **Automatic team health monitoring** with recovery
- **Role-based collaboration** with specialized agents

### Parallel State Monitoring
- **Continuous security monitoring** (vulnerability scanning, dependency audits)
- **Compliance monitoring** (SOX, GDPR, PCI-DSS support)
- **Observability metrics** (performance, errors, throughput)
- **Automatic escalation** to human operators when thresholds exceeded
- **Background execution** while other agents work

### Team Collaboration
- **Agent-to-agent communication** via secure messaging
- **Help request system** with capability-based routing
- **Review coordination** with multi-party approval workflows
- **Issue escalation** with severity levels and context
- **Broadcast messaging** for team announcements

### Evidence Collection
- **Automatic evidence collection** from all system events
- **Cryptographic signing** (RSA-SHA256) for tamper-proof audit trails
- **Evidence chain verification** for compliance
- **Compliance package export** for regulatory audits
- **Full traceability** of all decisions and actions

### Quick Start with Teams

```bash
# Execute project with full team collaboration
opencode-tools orchestrate --project "MyApp" --mode full

```

### Configuration

Foundry collaboration is wired through runtime components in `src/foundry/integration/collaboration-bridge.ts` and `src/cowork/*`.

Cowork runtime config is loaded via `src/cowork/config/loader.ts` and can be provided through environment variables:

```bash
COWORK_PERSISTENCE_CONNECTION_STRING=postgres://localhost:5432/opencode
COWORK_PERSISTENCE_MAX_CONNECTIONS=20
COWORK_PERSISTENCE_IDLE_TIMEOUT_MS=10000
COWORK_PERSISTENCE_CONNECTION_TIMEOUT_MS=30000
COWORK_PERSISTENCE_SSL=false
COWORK_PERSISTENCE_AUTO_MIGRATE=true
COWORK_PERSISTENCE_REQUIRED=false
COWORK_TENANT_ID=default
COWORK_TENANT_NAME="Default Tenant"
COWORK_TENANT_OWNER_ID=default-owner

COWORK_COLLABORATION_ENABLED=true
COWORK_COLLABORATION_MAX_EDITORS=8
COWORK_COLLABORATION_CONFLICT_WINDOW_MS=300000

COWORK_WORKFLOW_DEFAULT_TIMEOUT_MS=300000
COWORK_WORKFLOW_MAX_STEPS=50
COWORK_WORKFLOW_CHECKPOINT_INTERVAL_MS=60000

COWORK_SECURITY_ENFORCE_RBAC=true
COWORK_SECURITY_REDACT_SECRETS=true
COWORK_SECURITY_AUDIT_RETENTION_DAYS=90

COWORK_LLM_PROVIDER=openai
OPENAI_API_KEY=<redacted>
OPENAI_MODEL=gpt-4o-mini
```

See `docs/FOUNDRY_COWORK_INTEGRATION_GUIDE.md` for API-level examples.

If you need a fail-fast production posture, set `COWORK_PERSISTENCE_REQUIRED=true`. When enabled, Cowork/Foundry orchestration will fail startup if Postgres persistence cannot be initialized instead of silently continuing in memory-only mode.

## Quick Start

```bash
# Install dependencies
npm install

# Build
npm run build

# Start MCP server (primary interface)
npm run mcp

# Or use the CLI to start MCP
opencode-tools mcp
```

### Using with an MCP Client

Configure your MCP client to connect to the opencode-tools server:

```bash
# The MCP server runs on stdio by default
opencode-tools mcp
```

## CLI Commands

```bash
# Start MCP server (primary interface)
opencode-tools mcp

# Verify runtime health
opencode-tools verify
opencode-tools doctor

# Check runtime status
npm run verify
npm run doctor
```

```

Notes:

- `orchestrate` executes via Foundry orchestrator flow and supports `--mode research|docs|architect|code|full`.
- Mode presets currently tune iteration and quality-gate behavior (`research/docs` skip gates, `architect/code/full` run gates).
- Deliverable scope is enforced in strict mode by default and reported in Foundry execution output.
- `cowork` commands operate through loaded plugins and native agent config.
- `verify` checks Foundry/Cowork wiring, bridge health, and runtime alias resolution (`--verify` is supported for compatibility).
- Foundry collaboration API method is `executeWithTeam(request)` in `src/foundry/integration/collaboration-bridge.ts`.
- Monitoring API surface is `startMonitoring`, `pauseMonitoring`, `resumeMonitoring`, `stopMonitoring`, and `getMonitoringReport` in `src/cowork/monitoring/parallel-state-monitor.ts`.
- Evidence export API is `exportEvidencePackage(filter)` plus `verifyEvidenceChain()` in `src/cowork/evidence/collector.ts`.
- `pdf` command now validates generated bytes and fails fast if the payload is empty or not a valid PDF header.
- Additional commands like `research`, `docs`, and `architect` exist, with depth depending on subsystem maturity.

## Development

```bash
# TypeScript build
npm run build

npm run dev

# Lint
npm run lint

# Typecheck
npx tsc --noEmit

# Deliverable scope policy
npm run validate:deliverable-scope

# Full validation (lint + build + full tests)
npm run validate
```

## Testing

```bash
# Standard
npm test

# Segmented suites
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:security

# Full pipeline
npm run test:all

# Cowork Postgres integration tests (requires Docker)
npx jest tests/integration/cowork/persistence-and-eventing.integration.test.ts --runInBand
```

`test:security` currently runs with `--passWithNoTests`, so it exits cleanly when no dedicated security tests are present.

## Architecture Map

- CLI entry: `src/cli.ts`
- Foundry runtime bridge: `src/foundry/*`
- Cowork runtime: `src/cowork/*`
- Agent implementations: `agents/*`
- MCP tool server: `tools/mcp-server.ts`

## Governance and Security

- Policy/gatekeeping: `src/governance/*`
- Review workflows: `src/review/*`
- Secret redaction: `src/security/*`
- Audit/runtime trace layers: `src/runtime/*`

## Documentation

- Developer guide: `AGENTS.md`
- Integration: `INTEGRATION_GUIDE.md`
- **Seamless OpenCode Integration**: `docs/OPENCODE_INTEGRATION_GUIDE.md`
- Foundry implementation notes: `FOUNDRY_IMPLEMENTATION_SUMMARY.md`
- **Collaborative Teams Guide**: `docs/FOUNDRY_COWORK_INTEGRATION_GUIDE.md`
- **Cowork Workspace Guide**: `docs/COWORK_SPACE_GUIDE.md`
- **Cowork Test Hardening Notes**: `docs/COWORK_TEST_FIXES.md`
- **Production Deliverable Policy**: `docs/PRODUCTION_DELIVERABLE_POLICY.md`
- **API Reference**: `docs/API_REFERENCE.md`
- **Implementation Summary**: `docs/IMPLEMENTATION_SUMMARY.md`
- **Cowork Persistence/Eventing/Workflows (Phase 1)**: `docs/COWORK_PERSISTENCE_EVENTING_WORKFLOWS.md`
- Enterprise backlog and roadmap: `docs/ENTERPRISE_GAP_BACKLOG.md`

## Contributing

1. Create a branch from `develop`.
2. Implement focused changes.
3. Run `npm run validate`.
4. Update docs for behavior changes.
5. Open PR with test evidence and risk notes.

## License

MIT - see `LICENSE`.
