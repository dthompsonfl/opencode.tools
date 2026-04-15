import { BacklogItem, ProjectScaffoldResult } from '../types';
export declare class CodeGenAgent {
    private readonly agentName;
    constructor();
    /**
     * Prototypes a feature based on a backlog item.
     * In a production environment, this integrates with LLM to generate code
     * and uses Desktop-Commander to write files.
     */
    execute(backlogItem: BacklogItem): Promise<ProjectScaffoldResult>;
}
//# sourceMappingURL=index.d.ts.map