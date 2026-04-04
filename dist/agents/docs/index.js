"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentationAgent = void 0;
exports.generateDocuments = generateDocuments;
const logger_1 = require("../../src/runtime/logger");
const crypto = __importStar(require("crypto"));
const run_context_1 = require("../../src/runtime/run-context");
class DocumentationAgent {
    constructor() {
        this.agentName = 'documentation-agent';
    }
    /**
     * Generates a PRD and SOW based on research findings.
     */
    async generateDocuments(dossier, brief) {
        const context = (0, run_context_1.resolveRunContext)();
        const generatedAt = new Date().toISOString();
        logger_1.logger.info('Documentation Agent started', { agent: this.agentName, company: dossier.companySummary.split(' ')[0] });
        // Logic to construct a professional PRD
        const prd = this.constructPRD(dossier, brief, generatedAt);
        // Logic to construct a professional SOW
        const sow = this.constructSOW(dossier, brief, generatedAt);
        logger_1.logger.info('Documentation Agent completed', { agent: this.agentName });
        return {
            prd,
            sow,
            metadata: {
                runId: context.runId,
                generatedAt,
                provenance: {
                    briefHash: crypto.createHash('sha256').update(brief).digest('hex'),
                    dossierHash: crypto.createHash('sha256').update(JSON.stringify(dossier)).digest('hex')
                }
            }
        };
    }
    constructPRD(dossier, brief, generatedAt) {
        return `
# Product Requirements Document (PRD)

Generated: ${generatedAt}

## Project Overview
${dossier.companySummary}

## Client Brief Context
${brief}

## Industry Analysis
${dossier.industryOverview}

## Target Competitors
${dossier.competitors.map(c => `- ${c.name}: ${c.differentiation}`).join('\n')}

## Proposed Tech Stack
- Frontend: ${dossier.techStack.frontend?.join(', ') || 'TBD'}
- Backend: ${dossier.techStack.backend?.join(', ') || 'TBD'}
- Infrastructure: ${dossier.techStack.infrastructure?.join(', ') || 'TBD'}

## Risks and Mitigations
${dossier.risks.map(r => `- ${r}`).join('\n')}

## Strategic Recommendations
${dossier.recommendations.map(rec => `- ${rec}`).join('\n')}

## Traceability
- Inputs: research dossier + client brief
- Evidence links: ${dossier.competitors.length} competitor references, ${dossier.risks.length} risk references
`;
    }
    constructSOW(dossier, brief, generatedAt) {
        return `
# Statement of Work (SOW)

Generated: ${generatedAt}

## Project Scope
Implementation of a strategic solution based on the requirements identified in the PRD for ${brief.substring(0, 50)}...

## Deliverables
1. Professional Research Dossier
2. System Architecture Design
3. Full Technical Specification (PRD)
4. Functional Project Prototype

## Timeline
Estimated delivery: 8-12 weeks from project kickoff.

## Quality Gates
1. Architecture review complete
2. Security controls verified for listed risks (${dossier.risks.length})
3. Delivery readiness checklist approved
`;
    }
    async generatePRD(dossier, brief) {
        const docs = await this.generateDocuments(dossier, brief);
        return docs.prd;
    }
    async generateSOW(dossier, brief) {
        const docs = await this.generateDocuments(dossier, brief);
        return docs.sow;
    }
}
exports.DocumentationAgent = DocumentationAgent;
// Functional wrapper for backward compatibility
async function generateDocuments(dossier, brief) {
    const agent = new DocumentationAgent();
    return agent.generateDocuments(dossier, brief);
}
//# sourceMappingURL=index.js.map