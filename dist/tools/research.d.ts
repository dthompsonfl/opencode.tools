import { ClaimsGraph, Claim, Source, CitationAnalysis } from '../src/types/research';
export declare function plan(brief: string): Promise<{
    questions: string[];
    hypotheses: string[];
}>;
export declare function gather(query: string, sources: {
    url: string;
}[]): Promise<{
    normalizedEvidence: {
        source: Source;
        content: string;
    }[];
}>;
export declare function extractClaims(normalizedEvidence: {
    source: Source;
    content: string;
}[], originalQuestions: string[]): Promise<ClaimsGraph>;
export declare function analyzeCitations(claimsGraph: ClaimsGraph): Promise<CitationAnalysis>;
export declare function peerReview(dossier: {
    claims?: Claim[];
    analysis?: CitationAnalysis;
}, reviewer: 'Methodology' | 'Citation' | 'Adversarial' | 'ExecutiveEditor'): Promise<{
    notes: string;
    rubricScore: number;
    requiredRevisions: string[];
}>;
export declare function finalizeDossier(claimGraph: ClaimsGraph, analysis: CitationAnalysis): Promise<{
    dossier: string;
    deliverables: Record<string, unknown>;
}>;
//# sourceMappingURL=research.d.ts.map