/**
 * Orchestrator Agent
 * 
 * Main orchestration agent that coordinates all sub-agents
 * in self-iterative loops for complete project development.
 */

import { logger } from '../../src/runtime/logger';
import { ResearchAgent } from '../../agents/research/research-agent';
import { DocumentationAgent } from '../../agents/docs';
import { ArchitectureAgent } from '../../agents/architecture';
import { Blackboard } from '../cowork/orchestrator/blackboard';
import { EventBus } from '../cowork/orchestrator/event-bus';

export interface OrchestratorInput {
  project?: string;
  intent?: string;
  mode?: 'research' | 'docs' | 'architect' | 'code' | 'full';
}

export class OrchestratorAgent {
  private blackboard: Blackboard;
  private eventBus: EventBus;
  private artifacts: Record<string, unknown> = {};

  constructor() {
    this.blackboard = Blackboard.getInstance();
    this.eventBus = EventBus.getInstance();
  }

  /**
   * Refines a user intent into a structured mobilization plan
   */
  async refine(intent: string): Promise<string> {
    logger.info('Refining intent', { intent });
    // In a real scenario, this would call an LLM to decompose the intent
    return `mobilization:planned: Decomposing project "${intent}". I will mobilize:
1. Research Agent: To analyze the industry and competitors.
2. Architecture Agent: To design the tech stack and system topology.
3. CodeGen Agent: To scaffold the production-ready implementation.

Does this plan meet your expectations?`;
  }

  async execute(input: OrchestratorInput): Promise<any> {
    const { project = 'unnamed-project', mode = 'full', intent } = input;
    
    logger.info('Orchestrator mobilizing team', { project, mode });
    this.blackboard.transitionTo('planning');
    this.eventBus.publish('agent:mobilize', { team: ['researcher', 'architect', 'developer'] });

    try {
      // Phase 1: Research
      if (mode === 'full' || mode === 'research') {
        this.updateActivity('research', 'thinking', 'Analyzing industry trends...');
        const agent = new ResearchAgent();
        const result = await agent.execute({
          brief: {
            company: project,
            industry: 'Technology',
            description: intent || 'Enterprise project',
            goals: ['comprehensive research']
          }
        });
        this.blackboard.updateArtifact('research_dossier', result, 'researcher', 'document');
        this.updateActivity('research', 'success', 'Dossier completed.');
      }

      // Phase 2: Documentation
      if (mode === 'full' || mode === 'docs') {
        this.updateActivity('docs', 'working', 'Generating PRD/SOW...');
        const dossier = this.blackboard.getArtifact('research_dossier');
        const agent = new DocumentationAgent();
        const result = await agent.generateDocuments(dossier as any, 'Refined intent implementation');
        this.blackboard.updateArtifact('prd', result.prd, 'architect', 'spec');
        this.updateActivity('docs', 'success', 'Specifications finalized.');
      }

      // Phase 3: Architecture
      if (mode === 'full' || mode === 'architect') {
        this.updateActivity('architecture', 'working', 'Designing system topology...');
        const prd = this.blackboard.getArtifact('prd');
        const agent = new ArchitectureAgent();
        const result = await agent.execute({ prd_content: prd as string });
        this.blackboard.updateArtifact('architecture_diagram', result.architectureDiagram, 'architect', 'design');
        this.updateActivity('architecture', 'success', 'System design completed.');
      }

      this.blackboard.transitionTo('completed');
      logger.info('Project development phase completed successfully');
      
      return { success: true };
    } catch (error) {
      this.blackboard.transitionTo('failed');
      logger.error('Orchestration failed:', error);
      return { success: false, error };
    }
  }

  private updateActivity(agentId: string, status: any, log: string) {
      this.eventBus.publish('agent:activity:update', {
          agentId,
          status,
          lastLog: log,
          timestamp: Date.now()
      });
  }
}


export default OrchestratorAgent;
