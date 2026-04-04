import { logger } from '../../src/runtime/logger';
import { ResearchDossier } from '../research/types';
import * as crypto from 'crypto';
import { resolveRunContext } from '../../src/runtime/run-context';

export interface Documents {
    prd: string;
    sow: string;
    metadata?: {
        runId: string;
        generatedAt: string;
        provenance: {
            briefHash: string;
            dossierHash: string;
        };
    };
}

export class DocumentationAgent {
    private readonly agentName = 'documentation-agent';

    constructor() {}

    /**
     * Generates a PRD and SOW based on research findings.
     */
    public async generateDocuments(dossier: ResearchDossier, brief: string): Promise<Documents> {
        const context = resolveRunContext();
        const generatedAt = new Date().toISOString();
        logger.info('Documentation Agent started', { agent: this.agentName, company: dossier.companySummary.split(' ')[0] });

        // Logic to construct a professional PRD
        const prd = this.constructPRD(dossier, brief, generatedAt);
        
        // Logic to construct a professional SOW
        const sow = this.constructSOW(dossier, brief, generatedAt);

        logger.info('Documentation Agent completed', { agent: this.agentName });

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

    private constructPRD(dossier: ResearchDossier, brief: string, generatedAt: string): string {
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

    private constructSOW(dossier: ResearchDossier, brief: string, generatedAt: string): string {
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

    public async generatePRD(dossier: ResearchDossier, brief: string): Promise<string> {
        const docs = await this.generateDocuments(dossier, brief);
        return docs.prd;
    }

    public async generateSOW(dossier: ResearchDossier, brief: string): Promise<string> {
        const docs = await this.generateDocuments(dossier, brief);
        return docs.sow;
    }
}

// Functional wrapper for backward compatibility
export async function generateDocuments(dossier: ResearchDossier, brief: string): Promise<Documents> {
    const agent = new DocumentationAgent();
    return agent.generateDocuments(dossier, brief);
}
