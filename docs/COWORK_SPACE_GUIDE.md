# Cowork Workspace Guide

## Scope

Collaborative workspace APIs are implemented in `src/cowork/collaboration/collaborative-workspace.ts` and related modules in `src/cowork/collaboration/*`.

## Core APIs

```ts
const workspace = CollaborativeWorkspace.getInstance();

const ws = workspace.createWorkspace(projectId, name, createdBy, options?);
workspace.addMember(ws.id, memberId, addedBy);

workspace.updateArtifact(
  ws.id,
  artifactKey,
  payload,
  source,
  author,
  { changeDescription, metadata }
);

workspace.addFeedback(
  ws.id,
  artifactKey,
  author,
  title,
  content,
  'blocking'
);

const pkg = workspace.generateCompliancePackage(ws.id, generatedBy);
```

## Lifecycle + Persistence

- Workspace lifecycle methods:
  - `openWorkspace(workspaceId, openedBy)`
  - `closeWorkspace(workspaceId, closedBy, reason?)`
  - `archiveWorkspace(workspaceId, archivedBy, reason?)`
  - `deleteWorkspace(workspaceId, deletedBy, reason?)`
- Persistence/configuration:
  - `configurePersistence(store?, options?)`
  - `flushPersistence()`
  - `createCheckpoint(workspaceId, createdBy, snapshotType?, metadata?)`
  - `listCheckpoints(workspaceId, limit?)`

## Event Names (Current)

- Versioning: `artifact:version:created`, `artifact:version:updated`, `artifact:version:rollback`
- Feedback: `feedback:thread:created`, `feedback:thread:resolved`, `feedback:escalated`
- Workspace: `workspace:created`, `workspace:status:changed`, `workspace:artifact:updated`
- Conflicts: `workspace:conflict:detected`, `workspace:conflict:resolved`
- Compliance: `workspace:compliance:package_generated`, `workspace:compliance:package_signed`

## Related APIs

- Monitoring writes findings to workspace artifacts via `ParallelStateMonitor` in `src/cowork/monitoring/parallel-state-monitor.ts`
- Evidence is exported via `EvidenceCollector.exportEvidencePackage(filter)` in `src/cowork/evidence/collector.ts`
- Foundry deliverable-scope verification runs via `src/foundry/deliverable-scope.ts` before release approval
- Policy baseline: `docs/PRODUCTION_DELIVERABLE_POLICY.md`

## Quick Validation

```bash
npm run test:unit -- --testPathPattern=collaboration
npm run test:integration -- --testPathPattern=persistence-and-eventing.integration.test.ts
npm run validate:deliverable-scope
```
