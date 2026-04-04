# AGENTS.md - OpenCode Tools Developer Guide

This guide defines practical standards for contributors and coding agents working in this repository.

## 1) Engineering Principles

- Build for deterministic, traceable execution.
- Prefer real integrations over placeholders.
- Keep security and governance controls explicit and testable.
- Treat docs as operational contracts: update docs with behavior changes.
- Enforce production-deliverable scope: final artifacts must be code/docs/tests only.
- Prefer bespoke, project-specific output over generic boilerplate deliverables.

## 2) Runtime Topology

- CLI entry: `src/cli.ts`
- Runtime alias bootstrap: `src/runtime/register-path-aliases.ts` (loaded first by CLI)
- TUI entry: `src/tui-app.ts`
- Foundry orchestration: `src/foundry/*`
- Cowork runtime and plugin system: `src/cowork/*`
- Cowork Postgres persistence + tenancy/event stores: `src/cowork/persistence/*`
- Cowork workflow foundation: `src/cowork/workflow/*`
- Agent implementations: `agents/*`
- MCP server and tool adapters: `tools/*`

When changing orchestration behavior, validate the full flow from entrypoint to runtime to agent/tool execution.

## 3) Required Commands

## Build and quality

```bash
npm run build
npm run lint
npx tsc --noEmit
npm run validate:deliverable-scope
```

## Testing

```bash
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:security
npm run test:all
```

## Full validation

```bash
npm run validate
```

## Interactive runtime

```bash
npm run tui
npm run foundry:tui
opencode-tools verify
```

## 4) Coding Standards

## TypeScript

- `strict: true` is enabled in `tsconfig.json`.
- Public methods should have explicit return types.
- Use schema-driven parsing (`zod`) for untrusted input.
- Avoid introducing new `any` where practical; use typed contracts.

## Imports

- Existing code uses mixed styles (absolute aliases and relative imports).
- For new modules, prefer stable import paths and avoid deep relative chains when aliases are available.

## Error handling

- Do not swallow errors silently.
- Throw typed errors with context when possible.
- Include failure metadata useful for audit and troubleshooting.

## Logging

- Use structured logging through runtime logger modules.
- Never log secrets or raw credentials.
- Include identifiers (run ID, command ID, agent ID) when available.

## 5) Foundry and Cowork Change Rules

## Foundry (`src/foundry/*`)

- Keep orchestration state transitions explicit and auditable.
- Preserve peer-review and quality-gate stages when modifying flow logic.
- Keep request/report contracts synchronized with orchestration behavior.

## Cowork (`src/cowork/*`)

- Maintain command/agent registry compatibility.
- Validate plugin loader changes against bundled and system plugin discovery.
- Keep permission gating deny-safe by default for new tool paths.
- For production/staging rollouts, prefer `COWORK_PERSISTENCE_REQUIRED=true` so Cowork startup fails fast if Postgres persistence is unavailable.

## 6) Testing Expectations by Change Type

- **Foundry orchestration changes**: run unit tests plus end-to-end orchestration path checks.
- **Cowork runtime changes**: run `tests/unit/cowork/*` suites.
- **Agent or tool changes**: add or update targeted unit/integration tests.
- **Cowork persistence/eventing/workflow changes**: run unit coverage plus `tests/integration/cowork/persistence-and-eventing.integration.test.ts` with Docker available.
- **CLI/TUI behavior changes**: validate command path and visible operator output.

At minimum, run `npm run lint`, `npm run build`, `npx tsc --noEmit`, and relevant test suites before finalizing.
For release-facing work, also run `npm run validate:deliverable-scope`.

## 7) Security and Governance Requirements

- Protect filesystem/tool execution boundaries.
- Preserve redaction controls in `src/security/*`.
- Keep policy and review checks wired in `src/governance/*` and `src/review/*`.
- Avoid introducing hardcoded secrets, paths, or mock IDs into production code paths.
- Preserve strict deliverable-scope enforcement in `src/foundry/deliverable-scope.ts` and `scripts/validate-deliverable-scope.js`.

## 8) Documentation Maintenance

If behavior changes, update at least:

- `README.md` (operator-facing behavior)
- `AGENTS.md` (developer process/standards)
- Any impacted architecture/integration docs (`INTEGRATION_GUIDE.md`, `TUI_INTEGRATION.md`, Foundry docs)
- `docs/PRODUCTION_DELIVERABLE_POLICY.md` when delivery scope or release guardrails change

For strategic remediation planning, keep `docs/ENTERPRISE_GAP_BACKLOG.md` current.

## 9) Definition of Done

A change is done when:

1. Implementation is complete and coherent with runtime architecture.
2. Tests and validation commands pass for impacted areas.
3. Security/governance implications are addressed.
4. Documentation reflects the new behavior.
5. Deliverable-scope policy is satisfied (or explicit allow-list exceptions are documented).

---

## 10) Foundry-Cowork-Agents-TUI Integration Architecture

### Overview

The system follows an **event-driven architecture** with EventBus as the central nervous system:

```
┌─────────────────────────────────────────────────────────────────┐
│                     TUI (React Ink)                              │
│                   Subscribes to EventBus                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │ EventBus
┌──────────────────────────▼──────────────────────────────────────┐
│                     FoundryOrchestrator                          │
│              Uses warmed-up FoundryCoworkBridge                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ spawnAgent()
┌──────────────────────────▼──────────────────────────────────────┐
│                     CoworkOrchestrator                           │
│              Injects EventBus into AgentSpawner                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ run()
┌──────────────────────────▼──────────────────────────────────────┐
│                     AgentRunner                                  │
│              Reports progress via callbacks                      │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

1. **EventBusBridge** (`src/cowork/orchestrator/event-bus-bridge.ts`)
   - Connects FoundryCollaborationHub with EventBus
   - Enables bidirectional message flow
   - Automatic event capture and forwarding

2. **AgentSpawner** (`src/cowork/orchestrator/agent-spawner.ts`)
   - Injects EventBus into agent context
   - Provides `AgentEventSystem` interface to agents
   - Supports progress callbacks

3. **TUI Store** (`src/tui/store/store.tsx`)
   - Subscribes to EventBus events
   - Dispatches actions for agent lifecycle
   - Shows real-time progress updates

4. **FoundryCoworkBridge** (`src/foundry/cowork-bridge.ts`)
   - Eager initialization via `warmup()`
   - Health checks with `healthCheck()`
   - EventBus integration for all operations

### Event Flow

```
Agent Execution:
1. FoundryCollaborationBridge.initialize() publishes 'foundry:collaboration_bridge:initialized'
2. startProject() publishes 'foundry:project:started'
3. runPhaseWithCollaboration() publishes 'foundry:phase:complete'
4. Team updates publish 'team:activity' and 'team:activity:update'
5. ParallelStateMonitor publishes monitoring lifecycle events (for example 'monitoring:started', 'monitoring:state:updated')
6. EvidenceCollector publishes 'evidence:collected' and 'evidence:package_exported'
```

### Using the Integration

**In Agents:**
```typescript
// Agent receives EventBus access via context
async function agentHandler(context: TaskContext) {
  // Publish custom events
  context.events?.publish('my_agent:event', { data: 'value' });
  
  // Subscribe to other agents
  const unsubscribe = context.events?.subscribe('other_agent:event', callback);
  
  // Report progress
  context.onProgress?.(50, 'Halfway done');
  
  // Cleanup
  unsubscribe?.();
}
```

**In TUI:**
```typescript
// TUI automatically receives updates via StoreProvider
function MyComponent() {
  const { state } = useStore();
  const activities = state.sessions.find(s => s.id === state.activeSessionId)?.activities;
  
  // activities contains real-time agent progress
}
```

**Health Checking:**
```typescript
import { createWarmedUpBridge } from './foundry/cowork-bridge';

const bridge = createWarmedUpBridge();
const health = bridge.healthCheck();
console.log(`Healthy: ${health.healthy}, Agents: ${health.agentCount}`);
```

### Testing Integration

When modifying integration code:

1. Run all validation commands:
   ```bash
   npm run build
   npm run lint
   npx tsc --noEmit
   npm run test:unit
   ```

2. Test event flow:
   - Verify `foundry:project:started` when collaboration execution begins
   - Verify `foundry:phase:complete` for each collaboration phase
   - Verify `team:activity:update` events are emitted for visibility
   - Verify monitoring/evidence events (`monitoring:*`, `evidence:*`) flow to subscribers

3. Test health checks:
   - Verify bridge reports healthy status
   - Verify missing agents are detected
   - Verify EventBus connectivity

### Documentation

- Architecture Review: `docs/ARCHITECTURE_REVIEW_FOUNDRY_COWORK_TUI.md`
- Implementation Summary: `docs/INTEGRATION_IMPLEMENTATION_SUMMARY.md`

---

## 11) Collaborative Workspace System (Phase 1)

### Overview

Phase 1 of the Foundry-Cowork Integration introduces a comprehensive **Collaborative Workspace System** that enables parallel, event-driven agent collaboration. This system provides project-scoped workspaces, artifact versioning, feedback threads, and compliance package generation.

### Components

Located in `src/cowork/collaboration/`:

1. **ArtifactVersioning** (`artifact-versioning.ts`)
   - Version history and lineage tracking
   - Diff capabilities between versions
   - Rollback support with audit trail
   - Immutable version storage

2. **FeedbackThreads** (`feedback-threads.ts`)
   - Threaded conversations on artifacts
   - Severity levels: nit, blocking, critical
   - Status tracking: pending, addressed, wontfix, in_progress
   - Location-aware feedback with file/line/column
   - Tag-based categorization

3. **CollaborativeWorkspace** (`collaborative-workspace.ts`)
   - Project-scoped workspace management
   - Member management and role tracking
   - Conflict detection for concurrent edits
   - Compliance package generation
   - Workspace metrics and reporting

### Usage

```typescript
import { CollaborativeWorkspace } from './src/cowork/collaboration';

const workspace = CollaborativeWorkspace.getInstance();

// Create project workspace
const ws = workspace.createWorkspace('project-1', 'Feature Dev', 'cto');

// Add artifacts with versioning
workspace.updateArtifact(
  ws.id,
  'architecture.md',
  { content: '## Design' },
  'design-tool',
  'architect'
);

// Add feedback
workspace.addFeedback(
  ws.id,
  'architecture.md',
  'security-lead',
  'Missing auth',
  'Add authentication requirements',
  'blocking'
);

// Generate compliance package
const pkg = workspace.generateCompliancePackage(ws.id, 'compliance-officer');
```

Current integration API references:
- `FoundryCollaborationBridge.executeWithTeam(request)` in `src/foundry/integration/collaboration-bridge.ts`
- `ParallelStateMonitor.getMonitoringReport(projectId)` in `src/cowork/monitoring/parallel-state-monitor.ts`
- `CollaborationProtocol.requestHelp(fromAgentId, toAgentId, task, context?, priority?, timeout?)` in `src/cowork/team/collaboration-protocol.ts`
- `EvidenceCollector.exportEvidencePackage(filter)` in `src/cowork/evidence/collector.ts`

### Events

The collaboration system publishes events to EventBus:
- `artifact:version:created`, `artifact:version:updated`, `artifact:version:rollback`
- `feedback:thread:created`, `feedback:thread:resolved`, `feedback:escalated`
- `workspace:created`, `workspace:status:changed`, `workspace:artifact:updated`
- `workspace:conflict:detected`, `workspace:conflict:resolved`
- `workspace:compliance:package_generated`, `workspace:compliance:package_signed`

### Tests

All collaboration components have comprehensive test coverage:
- `tests/unit/cowork/collaboration/artifact-versioning.test.ts`
- `tests/unit/cowork/collaboration/feedback-threads.test.ts`
- `tests/unit/cowork/collaboration/collaborative-workspace.test.ts`

Run tests with:
```bash
npm run test:unit -- --testPathPattern=collaboration
```

### Task 0 Test Hardening and Singleton Reset Helpers

Task 0 test hardening standardized singleton cleanup to remove cross-test state leakage in Cowork/Foundry integration tests.

- Primary helper: `tests/unit/cowork/test-helpers.ts` (`resetCoworkSingletonsForTests`)
- Core reset APIs:
  - `CollaborativeWorkspace.resetForTests()` in `src/cowork/collaboration/collaborative-workspace.ts`
  - `EvidenceCollector.resetForTests()` in `src/cowork/evidence/collector.ts`
  - `CollaborationProtocol.resetForTests()` in `src/cowork/team/collaboration-protocol.ts`
  - `TaskRouter.resetForTests()` in `src/cowork/routing/task-router.ts`
  - `CoworkPersistenceRuntime.resetForTests()` in `src/cowork/persistence/runtime.ts`
  - `CoworkConfigManager.resetForTests()` in `src/cowork/config/loader.ts`
- Use these in `beforeEach`/`afterEach` for any suite touching EventBus, workspace persistence, monitoring, collaboration protocol, or evidence collection.

### Documentation

- Phase 1 Summary: `docs/PHASE1_IMPLEMENTATION_SUMMARY.md`
