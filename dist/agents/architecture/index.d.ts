export interface ArchitectureOutput {
    architectureDiagram: string;
    backlog: {
        epics: Array<{
            id: string;
            title: string;
            description: string;
            stories: Array<{
                id: string;
                title: string;
                description?: string;
                acceptanceCriteria: string[];
            }>;
        }>;
    };
    metadata?: {
        runId: string;
        generatedAt: string;
        prdHash: string;
    };
}
export declare class ArchitectureAgent {
    private readonly agentName;
    constructor();
    /**
     * Generates a complete system architecture and backlog based on PRD content.
     */
    execute(input: {
        prd_content: string;
    }): Promise<ArchitectureOutput>;
    private generateMermaidDiagram;
    generateArchitecture(prd_content: string): Promise<string>;
    generateBacklog(content: string): {
        epics: {
            id: string;
            title: string;
            description: string;
            stories: {
                id: string;
                title: string;
                acceptanceCriteria: string[];
            }[];
        }[];
    };
}
export declare function generateArchitecture(prd_sow_content: string): Promise<ArchitectureOutput>;
//# sourceMappingURL=index.d.ts.map