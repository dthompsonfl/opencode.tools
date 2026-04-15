# Foundry-Cowork Integration Guide

## Overview

Foundry and Cowork integrate through `src/foundry/integration/collaboration-bridge.ts` and `src/cowork/*` to provide team execution, monitoring, evidence collection, and TUI-visible events.

Primary runtime APIs:

- `FoundryCollaborationBridge.executeWithTeam(request)`
- `ParallelStateMonitor.getMonitoringReport(projectId)`
- `CollaborationProtocol.requestHelp(fromAgentId, toAgentId, task, context?, priority?, timeout?)`
- `EvidenceCollector.exportEvidencePackage(filter)`
- `evaluateRepositoryDeliverableScope(repoRoot, options)` in `src/foundry/deliverable-scope.ts`

Production deliverable policy reference: `docs/PRODUCTION_DELIVERABLE_POLICY.md`

## Operator Commands

```bash
# Foundry orchestration
opencode-tools orchestrate --project "MyApp" --mode full

# General TUI
opencode-tools tui

# Dedicated Foundry TUI
npm run foundry:tui

# Runtime wiring checks
opencode-tools verify
```

## API Corrections (Current)

## Foundry collaboration bridge

```ts
import { FoundryCollaborationBridge } from '@/foundry/integration/collaboration-bridge';

const bridge = new FoundryCollaborationBridge();
await bridge.initialize();

const report = await bridge.executeWithTeam(request);
const health = bridge.healthCheck();
```

- Use `executeWithTeam(...)` (not `executeProject(...)`).
- `startProject(...)` and `runPhaseWithCollaboration(...)` publish Foundry lifecycle events.

## Parallel monitoring

```ts
import { ParallelStateMonitor } from '@/cowork/monitoring/parallel-state-monitor';

const monitor = ParallelStateMonitor.getInstance();
monitor.startMonitoring(projectId);

const report = monitor.getMonitoringReport(projectId);
monitor.pauseMonitoring(projectId);
monitor.resumeMonitoring(projectId);
monitor.stopMonitoring(projectId);
```

- Use `startMonitoring/getMonitoringReport` (not `monitorProject/getProjectStatus`).

## Collaboration protocol

```ts
import { CollaborationProtocol } from '@/cowork/team/collaboration-protocol';

const protocol = CollaborationProtocol.getInstance();

await protocol.requestHelp(
  fromAgentId,
  toAgentId,
  'Review auth flow',
  { area: 'oauth' },
  'high',
  120000
);

await protocol.requestReview(fromAgentId, artifactId, 'security', { path: 'src/auth.ts' });
await protocol.escalate(fromAgentId, { title: 'Critical finding', description: '...', severity: 'critical' });
```

- `requestHelp` signature is positional and explicit; it does not take a single options object.

## Deliverable Scope Enforcement

Foundry execution requests support strict deliverable policy enforcement:

```ts
const report = await foundry.execute({
  projectId,
  projectName,
  repoRoot,
  runQualityGates: true,
  enforceDeliverableScope: true, // default
  deliverableScopeAllowList: ['runs/custom-approved/'], // optional exceptions
});
```

Execution reports include `deliverableScopeReport` with included/excluded artifact classification.
Generated artifacts are excluded and reported; strict mode blocks release on non-source policy violations.

## Evidence export and integrity

```ts
import { EvidenceCollector } from '@/cowork/evidence/collector';

const collector = EvidenceCollector.getInstance();
collector.startCollecting();

const pkg = collector.exportEvidencePackage({ projectId, type: 'finding' });
const integrity = collector.verifyEvidenceChain();
```

- Use `exportEvidencePackage(filter)` (not `exportCompliancePackage(projectId)`).
- `verifyEvidenceChain()` validates signatures for collected evidence.

## Event Names (Current)

## Foundry-Cowork bridge events

- `foundry:collaboration_bridge:initialized`
- `foundry:project:started`
- `foundry:phase:complete`
- `team:activity`
- `team:activity:update`

## Monitoring events

- `monitoring:started`, `monitoring:stopped`
- `monitoring:paused`, `monitoring:resumed`
- `monitoring:state:updated`
- `monitoring:finding`, `monitoring:finding:critical`, `monitoring:finding:high`
- `monitoring:finding:escalated`

## Evidence events

- `evidence:collected`
- `evidence:package_exported`

## Workspace/collaboration events

- `workspace:created`, `workspace:status:changed`, `workspace:artifact:updated`
- `workspace:conflict:detected`, `workspace:conflict:resolved`
- `workspace:compliance:package_generated`, `workspace:compliance:package_signed`
- `artifact:version:created`, `artifact:version:updated`, `artifact:version:rollback`
- `feedback:thread:created`, `feedback:thread:resolved`, `feedback:escalated`

## Config and Environment Keys (Current)

Configured in `src/cowork/config/loader.ts` and `src/cowork/runtime/llm-provider.ts`.

```bash
# Tenant
COWORK_TENANT_ID=default
COWORK_TENANT_NAME="Default Tenant"
COWORK_TENANT_OWNER_ID=default-owner

# Postgres persistence
COWORK_PERSISTENCE_CONNECTION_STRING=postgres://localhost:5432/opencode
COWORK_PERSISTENCE_MAX_CONNECTIONS=20
COWORK_PERSISTENCE_IDLE_TIMEOUT_MS=10000
COWORK_PERSISTENCE_CONNECTION_TIMEOUT_MS=30000
COWORK_PERSISTENCE_MIGRATIONS_DIR=src/cowork/persistence/migrations
COWORK_PERSISTENCE_SSL=false
COWORK_PERSISTENCE_AUTO_MIGRATE=true

# Collaboration/workflow/security
COWORK_COLLABORATION_ENABLED=true
COWORK_COLLABORATION_MAX_EDITORS=8
COWORK_COLLABORATION_CONFLICT_WINDOW_MS=300000
COWORK_COLLABORATION_AUTO_RESOLVE=false

COWORK_WORKFLOW_DEFAULT_TIMEOUT_MS=300000
COWORK_WORKFLOW_MAX_STEPS=50
COWORK_WORKFLOW_CHECKPOINT_INTERVAL_MS=60000

COWORK_SECURITY_ENFORCE_RBAC=true
COWORK_SECURITY_REDACT_SECRETS=true
COWORK_SECURITY_AUDIT_RETENTION_DAYS=90

# LLM provider
COWORK_LLM_PROVIDER=openai
COWORK_ALLOW_MOCK_LLM=false
OPENAI_API_KEY=<redacted>
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_TEMPERATURE=0

# Filesystem tool router
COWORK_FS_BASE_PATH=/absolute/path
```

## Task 0 Test Hardening

Task 0 introduced deterministic singleton reset helpers to prevent cross-test leakage.

- Helper: `tests/unit/cowork/test-helpers.ts` (`resetCoworkSingletonsForTests`)
- Reset APIs:
  - `CollaborativeWorkspace.resetForTests()`
  - `EvidenceCollector.resetForTests()`
  - `CollaborationProtocol.resetForTests()`
  - `TaskRouter.resetForTests()`
  - `CoworkPersistenceRuntime.resetForTests()`
  - `CoworkConfigManager.resetForTests()`

Recommended pattern:

```ts
beforeEach(() => resetCoworkSingletonsForTests());
afterEach(() => resetCoworkSingletonsForTests());
```

## Validation

```bash
npm run lint
npm run build
npx tsc --noEmit
npm run validate:deliverable-scope
npm run test:unit
npm run test:integration
```
