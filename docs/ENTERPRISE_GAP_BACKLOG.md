# Enterprise Gap Backlog

Last updated: 2026-02-16

This backlog tracks what remains to make OpenCode Tools a complete, corporate-level autonomous delivery team that consistently produces production-ready outputs.

## Maturity Snapshot

- Current estimated maturity: **42/100**
- Strong scaffolding exists (Foundry/Cowork architecture, policy/review modules, CLI/TUI entrypoints).
- Critical runtime depth still needs hardening (persistence, de-mocking, authz enforcement, end-to-end determinism).

## Already Implemented (High-Level)

- Foundry orchestration flow and contracts in `src/foundry/*`.
- Cowork plugin/runtime architecture in `src/cowork/*`.
- Cowork Phase 0 foundation modules for persistence contracts, PostgreSQL manager/migrations, and validated config loading in `src/cowork/persistence/*` and `src/cowork/config/*`.
- Quality gate runner in `src/foundry/quality-gates.ts`.
- Deliverable scope enforcement (`code/docs/tests` only) in `src/foundry/deliverable-scope.ts` and `scripts/validate-deliverable-scope.js`.
- Governance/security primitives in `src/governance/*` and `src/security/*`.
- Broad test suites across unit/integration/e2e.

Policy reference: `docs/PRODUCTION_DELIVERABLE_POLICY.md`.

## High-Priority Backlog

## Foundry and Runtime

| ID | Priority | Effort | Owner | Gap | Evidence | Definition of Done |
|---|---|---|---|---|---|---|
| FND-001 | P0 | L | Foundry Lead | Replace context/evidence stubs with persistent store | `foundry/foundry/runtime/context-store.ts`, `foundry/foundry/evidence/schema.sql.ts` | Evidence, gate results, and artifacts persist/reload across runs |
| FND-002 | P0 | M | Platform | Replace storage DB stub | `src/storage/db.ts` | Real storage adapter with tests, no stub behavior |
| FND-003 | P0 | M | Runtime | Deterministic resume/retry semantics | `src/foundry/orchestrator.ts` | Checkpoint-based resume and idempotent retry behavior |
| FND-004 | P1 | M | Foundry | Policy-driven quality gate outputs | `src/foundry/quality-gates.ts` | Structured machine-readable gate verdicts and policy mapping |
| FND-005 | P1 | M | Architecture | Unify `src/foundry` and `foundry/foundry` boundaries | `src/foundry/*`, `foundry/foundry/*` | Single authoritative runtime path documented and enforced |

## Cowork Runtime

| ID | Priority | Effort | Owner | Gap | Evidence | Definition of Done |
|---|---|---|---|---|---|---|
| CWK-001 | P0 | M | Runtime | Remove mock LLM default from production path | `src/cowork/runtime/llm-provider.ts` | Startup fails fast on invalid provider config; mock-only in tests |
| CWK-002 | P0 | S | Security | Remove hardcoded tool-router base path | `src/cowork/runtime/tool-router.ts` | Config-driven path policy with traversal tests |
| CWK-003 | P1 | M | Platform | Plugin compatibility/signature checks | `src/cowork/plugin-loader.ts` | Signed/validated manifests and semver compatibility enforcement |
| CWK-004 | P1 | M | Runtime | Cancellation/budget controls for agent execution | `src/cowork/runtime/agent-runner.ts` | Hierarchical timeout/budget policy with audits |

## Agent Capability Depth

| ID | Priority | Effort | Owner | Gap | Evidence | Definition of Done |
|---|---|---|---|---|---|---|
| AGT-001 | P0 | L | AI Lead | Upgrade docs/architecture/codegen/qa/delivery agents from template-heavy flows | `agents/docs/index.ts`, `agents/architecture/index.ts`, `agents/codegen/index.ts`, `agents/qa/index.ts`, `agents/delivery/index.ts` | Agents produce verifiable, context-grounded artifacts and pass contract tests |
| AGT-002 | P1 | M | Safety | Confidence + abstain/escalate policies | `agents/*`, `src/governance/*` | Low-confidence outputs trigger escalation gates |
| AGT-003 | P1 | M | Data | Standardized output schemas per agent | `src/review/validators/*` | Invalid agent output blocks workflow progression |

## Tooling and Integrations

| ID | Priority | Effort | Owner | Gap | Evidence | Definition of Done |
|---|---|---|---|---|---|---|
| TLS-001 | P0 | L | Tooling | Replace placeholder/synthetic tool outputs with real execution | `tools/research.ts`, `tools/proposal.ts`, `tools/architecture.ts`, `tools/codegen.ts`, `tools/qa.ts`, `tools/delivery.ts` | Tool outputs are grounded and provenance-linked |
| TLS-002 | P0 | M | Runtime | Remove hardcoded mock run IDs | `tools/*`, `src/runtime/run-store.ts` | Real run IDs generated and correlated end-to-end |
| TLS-003 | P1 | M | API | Unified tool response contracts | `tools/mcp-server.ts`, `src/runtime/tool-wrapper.ts` | Consistent envelope semantics and strict schema checks |

## CLI/TUI Product Flow

| ID | Priority | Effort | Owner | Gap | Evidence | Definition of Done |
|---|---|---|---|---|---|---|
| UIX-001 | P0 | M | CLI | Replace placeholder command handlers with full implementations | `src/cli.ts` | All public commands execute production-ready flows |
| UIX-002 | P0 | M | TUI | Replace placeholder integration helpers and bind to live runtime | `src/tui-commands.ts`, `src/tui-integration.ts` | TUI actions drive real orchestration state and persisted runs |
| UIX-003 | P1 | M | TUI | Wire Foundry TUI routes away from mock data/actions | `foundry/foundry/tui/routes/*` | Route actions reflect real runtime events and outcomes |

## Security, Governance, and Audit

| ID | Priority | Effort | Owner | Gap | Evidence | Definition of Done |
|---|---|---|---|---|---|---|
| SEC-001 | P0 | L | Security | Centralized secrets management and rotation strategy | `src/security/secrets.ts`, `src/runtime/openai-provider.ts` | Managed secret sourcing + rotation + redaction coverage |
| SEC-002 | P0 | M | Security | Enforce authn/authz at orchestration and tool boundaries | `src/agents/orchestrator.ts`, `tools/mcp-server.ts`, `foundry/foundry/core/rbac.ts` | Unauthorized invocations blocked with auditable events |
| AUD-001 | P0 | M | Platform | Causal traceability across run, tool, artifact, and gate events | `src/runtime/audit.ts`, `src/runtime/run-store.ts`, `tools/*` | End-to-end replayable and queryable run timeline |
| SEC-003 | P1 | M | GRC | SOC2-style policy mappings and automated control evidence | `src/governance/policy-engine.ts`, `src/governance/rubric-definitions.ts` | Explicit control mapping and evidence generation |

## Testing and CI/CD

| ID | Priority | Effort | Owner | Gap | Evidence | Definition of Done |
|---|---|---|---|---|---|---|
| TST-001 | P0 | M | QA | Trusted coverage signal and enforcement | `coverage/coverage-summary.json`, `jest.config.js` | Accurate coverage reporting blocks regressions |
| TST-002 | P0 | L | QA | End-to-end autonomous flow tests (entrypoint to release gate) | `src/cli.ts`, `src/tui-app.ts`, `src/foundry/orchestrator.ts`, `src/cowork/orchestrator/cowork-orchestrator.ts` | Golden and failure-path E2E scenarios stable in CI |
| TST-003 | P1 | M | QA | Tool and agent contract tests | `tools/*`, `agents/*` | Contract breakages fail CI deterministically |
| CICD-001 | P1 | M | DevOps | Pipeline rationalization and stage ownership | `.github/workflows/test-pipeline.yml` | Stable pipeline with clear owner and SLO/SLA targets |

## Documentation and Operational Readiness

| ID | Priority | Effort | Owner | Gap | Evidence | Definition of Done |
|---|---|---|---|---|---|---|
| DOC-001 | P0 | S | Docs/PM | Resolve contradictory readiness claims across docs | `TODO.md`, `PRODUCTION_READINESS_ASSESSMENT.md`, `IMPLEMENTATION_STATUS.md` | Single canonical status document aligned with runtime reality |
| DOC-002 | P1 | M | Docs | Publish one architecture map from entrypoints to runtime modules | `README.md`, `INTEGRATION_GUIDE.md`, `TUI_INTEGRATION.md` | Cross-doc consistency and accurate operator guidance |
| DOC-003 | P1 | M | SRE | Incident/rollback/degraded-mode runbooks | `docs/*` | Actionable runbooks validated in simulation |

## Top 20 Actions (Execution Order)

1. FND-001
2. TLS-001
3. AGT-001
4. CWK-001
5. FND-002
6. TST-002
7. UIX-001
8. UIX-002
9. SEC-002
10. AUD-001
11. TST-001
12. CWK-002
13. TLS-002
14. FND-003
15. SEC-001
16. UIX-003
17. DOC-001
18. TST-003
19. SEC-003
20. CICD-001

## Suggested Delivery Phases

## Phase 0 - Reality and Safety Baseline

- DOC-001, CWK-002, TLS-002, TST-001

## Phase 1 - Core Runtime Hardening

- FND-001, FND-002, CWK-001, UIX-001, UIX-002, AUD-001

## Phase 2 - Production Autonomous Flow

- AGT-001, TLS-001, TST-002, FND-003, SEC-002

## Phase 3 - Governance and Reliability at Scale

- SEC-001, SEC-003, TST-003, chaos/fault tests, replay/evidence hardening

## Phase 4 - Optimization and Operational Excellence

- CICD-001+, advanced observability, runbooks, and UX/operator improvements

## Risks if Backlog Is Not Addressed

- False production confidence from docs/runtime mismatch.
- Unreliable autonomous outputs due to placeholders and weak persistence.
- Security/compliance exposure from incomplete authz/secrets controls.
- Inadequate auditability and replay confidence in enterprise incidents.
- Slower delivery due to unstable CI quality signals.
