# Cowork Test Fixes

## Task 0 Test Hardening

Task 0 standardized singleton teardown across Cowork/Foundry tests to remove cross-test state leakage and flaky behavior.

Primary helper:

- `resetCoworkSingletonsForTests()` in `tests/unit/cowork/test-helpers.ts`

## Reset APIs Added/Used

- `CollaborativeWorkspace.resetForTests()` (`src/cowork/collaboration/collaborative-workspace.ts`)
- `EvidenceCollector.resetForTests()` (`src/cowork/evidence/collector.ts`)
- `CollaborationProtocol.resetForTests()` (`src/cowork/team/collaboration-protocol.ts`)
- `TaskRouter.resetForTests()` (`src/cowork/routing/task-router.ts`)
- `CoworkPersistenceRuntime.resetForTests()` (`src/cowork/persistence/runtime.ts`)
- `CoworkConfigManager.resetForTests()` (`src/cowork/config/loader.ts`)

Additional cleanup used by the helper:

- `EventBus.getInstance().resetForTests()`
- `Blackboard.resetForTests()`
- `TeamManager.getInstance().clear()`
- `CapabilityMatcher.getInstance().clear()`

## Recommended Test Pattern

```ts
import { resetCoworkSingletonsForTests } from '../test-helpers';

beforeEach(() => {
  resetCoworkSingletonsForTests();
});

afterEach(() => {
  resetCoworkSingletonsForTests();
});
```

Use this for any suite touching EventBus, collaboration protocol, workspace persistence, monitoring, evidence collection, or Foundry-Cowork bridge behavior.

## Regression Coverage Anchors

- `tests/unit/cowork/evidence/collector.test.ts`
- `tests/unit/cowork/monitoring/parallel-state-monitor.test.ts`
- `tests/integration/cowork/persistence-and-eventing.integration.test.ts`
- `tests/unit/foundry/integration/collaboration-bridge.test.ts`
- `tests/unit/foundry/deliverable-scope.test.ts`

## Deliverable Scope Guardrail

The production delivery path now enforces code/docs/tests-only scope:

- Runtime evaluator: `src/foundry/deliverable-scope.ts`
- Gate command: `scripts/validate-deliverable-scope.js`
- Policy doc: `docs/PRODUCTION_DELIVERABLE_POLICY.md`

## Validation Commands

```bash
npm run lint
npm run build
npx tsc --noEmit
npm run validate:deliverable-scope
npm run test:unit -- --testPathPattern=cowork
npm run test:integration -- --testPathPattern=persistence-and-eventing.integration.test.ts
```
