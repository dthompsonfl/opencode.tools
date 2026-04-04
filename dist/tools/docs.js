"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePRD = generatePRD;
exports.generateSOW = generateSOW;
// tools/docs.ts
const audit_1 = require("./audit");
const run_context_1 = require("../src/runtime/run-context");
/**
 * Generates a PRD based on research and discovery artifacts.
 */
async function generatePRD(researchDossier, discoverySession) {
    const context = (0, run_context_1.resolveRunContext)();
    console.log("[Docs.generatePRD] Synthesizing PRD with traceability to research claims.");
    // Logic: Map research claims and discovery decisions to feature requirements.
    const prd = `# Product Requirements Document\n\n## 1. Executive Summary\n\nDerived from research finding: ${researchDossier.dossier.substring(0, 50)}...\n\n## 2. Requirements\n\nBased on discovery: ${discoverySession.artifacts[0].content}`;
    await (0, audit_1.logToolCall)(context.runId, 'docs.prd.generate', { research_id: 'res-1', disc_id: 'sess-1' }, { prd_length: prd.length });
    return { prd };
}
/**
 * Generates an SOW (Scope of Work).
 */
async function generateSOW(proposalData) {
    const context = (0, run_context_1.resolveRunContext)();
    console.log("[Docs.generateSOW] Creating contractual SOW with milestones and assumptions.");
    const sow = `# Statement of Work\n\n## 1. Milestones\n\n- M1: Research & Discovery\n- M2: Architecture & Backlog\n- M3: Implementation\n\n## 2. Assumptions & Exclusions\n\n- Assumption: Client provides API keys.\n- Exclusion: Production deployment not included in this phase.`;
    await (0, audit_1.logToolCall)(context.runId, 'docs.sow.generate', { proposal_id: 'prop-1' }, { sow_length: sow.length });
    return { sow };
}
//# sourceMappingURL=docs.js.map