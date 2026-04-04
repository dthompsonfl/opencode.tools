# OpenCode Agent Manual & Governance

This document outlines the architecture, tool capabilities, and governance policies for the PhD-Level Research Agent and the Enterprise Workflow Pipeline.

## 1. Platform Foundation & Audit (A)

All agent runs are logged for audit and deterministic replay.
*   **Unified Artifact System:** All run data is stored in \`runs/{runId}/\`.
*   **Audit Logging (A2):** Every tool call is logged to \`runs/{runId}/manifest.json\` for traceability.
*   **Caching (A3):** All external calls (webfetch, search) are cached to ensure reproducibility and adhere to rate limits.
*   **Tools (Core):** \`audit.logToolCall\`, \`audit.replayRun\`, \`webfetch\`, \`search\`, \`rate-limit\`, \`source-normalize\`.

## 2. PhD-Level Research Agent (B)

The Research Agent is designed for evidence-first synthesis.

| Tool ID | Function | Stage | Governance Link |
| :--- | :--- | :--- | :--- |
| \`research.plan\` | Question decomposition & Hypothesis generation. | Planning | |
| \`research.gather\` | Query generation, search, and evidence ingestion. | Gathering | Requires \`rate-limit\` and \`search\` checks. |
| \`research.claims.extract\` | Creates the Claims Graph (Claim → Passage → Source). | Ingestion | |
| \`research.citations.analyze\` | Scores source quality and checks for contradiction/consensus (B3). | Analysis | Feeds G1 Policy Gate. |
| \`research.peer_review\` | Runs dossier through Methodology/Citation/Adversarial/Executive Editor. | Review | |
| \`research.dossier.finalize\` | Synthesizes final report only from the Claims Graph. | Finalization | Gated by \`Research_Integrity\` Policy. |

## 3. Workflow Pipeline & Governance

### A. Discovery & QA (C)

Discovery is now captured as a structured artifact (\`discovery/session.json\`).

*   **Discovery Tools:** \`discovery.session.start\`, \`discovery.session.export\`.
*   **QA Tools:** \`qa.testplan.generate\`, \`qa.risk_matrix.generate\`, \`qa.static.run\`, \`qa.peer_review\`.

### B. Proposal & Docs (D)

*   **Agents:** The new \`proposal\` agent manages this flow.
*   **Tools:** \`docs.prd.generate\`, \`docs.sow.generate\`, \`proposal.generate\`, \`proposal.peer_review\`, \`proposal.package.export\`.
*   **Governance:** Proposal export is gated by the \`Proposal_Compliance\` Policy (G1).

### C. Architecture & Codegen (E)

*   **Agents:** \`architecture\` and the renamed \`codegen\` (formerly build).
*   **Architecture Tools:** \`arch.generate\` (structured JSON outputs), \`backlog.generate\`.
*   **Codegen Tools:** \`codegen.scaffold\`, \`codegen.feature\`, \`codegen.tests\`. All code must pass \`ci.verify\` (lint/test/typecheck).

### D. Delivery (F)

*   **Agent:** The renamed \`delivery\` (formerly devops).
*   **Tools:** \`delivery.runbook.generate\`, \`delivery.nginx.generate\`, \`delivery.smoketest.run\`, \`delivery.handoff.package\`.

## 4. Governance Policies (G)

The system enforces policies defined in \`mcp/governance-policy.json\`.

| Policy | Checkpoint | Requirement | Rationale |
| :--- | :--- | :--- | :--- |
| \`Research_Integrity\` | \`research.dossier.finalize\` | All factual claims must be supported by evidence. | Citation Required Enforcement (G1) |
| \`Proposal_Compliance\` | \`proposal.package.export\` | Proposal must contain explicit Assumptions and Exclusions. | Legal/Delivery Gate (G1) |
| \`PII_Security\` | \`proposal.package.export\` | If PII is handled, security appendix and secret scan must pass. | Compliance Traceability (G2, G3) |
| \`Deliverable_Scope\` | Foundry release review + quality gates | Final output scope is code/docs/tests only; generated artifacts are rejected unless allow-listed. | Production readiness and release hygiene |

Reference policy document: `docs/PRODUCTION_DELIVERABLE_POLICY.md`.

## 5. Developer Experience (H)

*   **Documentation (H3):** This manual provides the first step in transparent documentation.
*   **Traceability:** All artifacts are traceable back to the source evidence and governing policy.
*   **CLI/TUI Parity (H2):** The registered tools are designed to be callable from both CLI and TUI contexts.
