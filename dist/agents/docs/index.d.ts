import { ResearchDossier } from '../research/types';
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
export declare class DocumentationAgent {
    private readonly agentName;
    constructor();
    /**
     * Generates a PRD and SOW based on research findings.
     */
    generateDocuments(dossier: ResearchDossier, brief: string): Promise<Documents>;
    private constructPRD;
    private constructSOW;
    generatePRD(dossier: ResearchDossier, brief: string): Promise<string>;
    generateSOW(dossier: ResearchDossier, brief: string): Promise<string>;
}
export declare function generateDocuments(dossier: ResearchDossier, brief: string): Promise<Documents>;
//# sourceMappingURL=index.d.ts.map