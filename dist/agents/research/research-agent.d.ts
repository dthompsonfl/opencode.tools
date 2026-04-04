import { ResearchInput, ResearchOutput } from './types';
import { Database } from '../../src/database/types';
import { ResearchGatekeeper } from '../../src/governance/gatekeeper';
export declare class ResearchError extends Error {
    context?: Record<string, any> | undefined;
    constructor(message: string, context?: Record<string, any> | undefined);
}
export declare class ResearchAgent {
    private provider;
    private readonly agentName;
    private readonly promptVersion;
    private readonly mcpVersion;
    private db;
    private gatekeeper;
    constructor(db?: Database, gatekeeper?: ResearchGatekeeper);
    plan(args: any): Promise<any>;
    gather(args: any): Promise<any>;
    extractClaims(args: any): Promise<any>;
    analyzeCitations(args: any): Promise<any>;
    peerReview(args: any): Promise<any>;
    finalizeDossier(args: any): Promise<any>;
    execute(input: ResearchInput): Promise<ResearchOutput>;
    private generateRunId;
    private gatherCompanyData;
    private gatherIndustryData;
    private gatherCompetitorData;
    private gatherTechStackData;
    private searchWeb;
    private extractCompetitors;
    private extractTechStack;
    private mergeTechStack;
    private generateCompanySummary;
    private generateIndustryOverview;
    private identifyRisks;
    private identifyOpportunities;
    private generateRecommendations;
    private compileSources;
}
//# sourceMappingURL=research-agent.d.ts.map