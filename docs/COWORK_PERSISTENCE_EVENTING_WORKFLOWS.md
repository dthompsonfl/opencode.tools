# Cowork Persistence, Eventing, and Workflow Foundation (Phase 1)

This document describes the Phase 1 Postgres-backed persistence and event-driven workflow foundation for the Cowork runtime.

Production deliverable policy baseline (code/docs/tests-only release scope): `docs/PRODUCTION_DELIVERABLE_POLICY.md`.

## What Is Persisted

- `cowork_workspace_state`: Workspace lifecycle and metadata (create/open/close/archive/delete).
- `cowork_blackboard_entry`: Blackboard artifacts keyed by `(tenant_id, workspace_id, artifact_key)` with optimistic versioning.
- `cowork_blackboard_feedback`: Blackboard/workspace feedback entries.
- `cowork_workspace_snapshot`: Checkpoints and snapshots for workspace state.
- `cowork_event_log`: Persistent append-only domain event stream.
- `cowork_event_consumer_checkpoint`: Consumer checkpoint state for replay/resume.
- `cowork_workflow_definition`: Versioned workflow definitions.
- `cowork_workflow_instance`: Current workflow execution state.
- `cowork_workflow_history`: Workflow transition audit history.

## Tenancy Strategy

Cowork uses a **shared-schema, row-partitioned tenancy model**:

- Every persisted Cowork table is keyed by `tenant_id`.
- `owner_id` is also captured to support multiple business units under one owner account.
- Primary access paths include `tenant_id` in all reads/writes.

Environment variables:

```bash
COWORK_TENANT_ID=tenant-acme
COWORK_TENANT_NAME="Acme Engineering"
COWORK_TENANT_OWNER_ID=owner-enterprise
```


## Persistence Required Mode

Cowork supports strict fail-fast startup for enterprise environments:

```bash
COWORK_PERSISTENCE_REQUIRED=true
```

When enabled, runtime bootstrap fails if Postgres persistence cannot be initialized. This prevents accidental memory-only execution in production.

## Event Bus Model

Event publishing is now Postgres-backed when persistence is configured:

1. `publishAsync(event, payload)` sanitizes payload and writes to `cowork_event_log`.
2. Events are dispatched to in-process subscribers.
3. Durable subscribers (`consumerId`) checkpoint delivery in `cowork_event_consumer_checkpoint`.

Delivery semantics:

- **At-least-once** replay for durable consumers.
- Consumers should remain idempotent (same event may be observed again on recovery boundaries).
- Replay starts from the last stored checkpoint.

## Workflow Foundation

The Phase 1 workflow engine supports:

- Versioned workflow definitions (`WorkflowDefinition`).
- Persisted workflow instances (`WorkflowInstance`) with step/state tracking.
- Transition history for auditability.
- Resume-on-restart for running workflow instances.

Built-in example workflows:

- `workspace-provisioning`
- `blackboard-entry-review-publish`

Both are persisted and auto-registered when workspace persistence is configured.

## Migrations

Cowork migrations are forward-only SQL files in:

- `src/cowork/persistence/migrations`

Rollback strategy:

- New migrations should be used to undo/repair prior schema changes.
- Existing migration files must never be edited after application (checksum integrity is enforced).

## Local Run Instructions

### Build and typecheck

```bash
npm run build
npx tsc --noEmit
```

### Focused unit tests

```bash
npx jest tests/unit/cowork/config/loader.test.ts tests/unit/cowork/persistence/postgres-manager.test.ts tests/unit/cowork/collaboration/collaborative-workspace.test.ts --runInBand
```

### Integration tests (requires Docker)

```bash
npx jest tests/integration/cowork/persistence-and-eventing.integration.test.ts --runInBand
```

Notes:

- Integration tests use Testcontainers and real Postgres.
- If Docker is unavailable locally, integration tests skip unless `CI=true` or `COWORK_INTEGRATION_REQUIRE_DOCKER=true`.
