# Production Deliverable Policy

## Purpose

This policy enforces enterprise-grade delivery quality for Foundry/Cowork orchestration. Every run must produce deliverables that are production-ready, project-specific, and traceable.

## Mandatory Standards

- Deliverables must be bespoke to the client context; do not ship placeholder or generic boilerplate text as final output.
- Final delivery scope is limited to code, documentation, and tests.
- Generated or runtime artifacts are excluded from final delivery by default (`dist/`, `coverage/`, `.jest-cache/`, `test-results/`, archives, logs, binary media).
- Quality evidence is required before release approval (lint/build/typecheck/tests and review outcomes).

## Enforcement Points

- Runtime guardrails in `src/foundry/role-prompts.ts` require project-specific and production-ready outputs.
- Deliverable scope classification and verification are implemented in `src/foundry/deliverable-scope.ts`.
- Foundry release review blocks approval when strict scope verification detects blocking non-source artifacts (`FoundryExecutionRequest.enforceDeliverableScope`, default `true`).
- Quality-gate command `node scripts/validate-deliverable-scope.js` verifies changed artifacts are inside code/docs/tests scope.

## Exception Handling

- Exceptions must be explicit and auditable through `FoundryExecutionRequest.deliverableScopeAllowList`.
- Exceptions are path-based and should be narrowly scoped to approved artifacts only.
- Advisory mode is available by setting `enforceDeliverableScope: false`, but strict mode is the default and recommended for production.

## Operator Verification

Run these checks before release:

```bash
npm run validate:deliverable-scope
npm run lint
npm run build
npx tsc --noEmit
npm run test:all
```
