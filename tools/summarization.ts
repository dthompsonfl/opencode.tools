/**
 * Summarization Tool
 * 
 * Provides AI-powered summarization functionality for MCP server
 */

import { SummarizationAgent } from '../agents/summarization/summarization-agent';
import { Source } from '../agents/research/types';

export interface SummarizeDossierInput {
  dossier: any;
  sources?: string[];
}

export interface SummarizeDossierResult {
  success: boolean;
  summary?: string;
  keyInsights?: string[];
  error?: string;
}

/**
 * Summarize a research dossier using AI
 */
export async function summarizeDossier(input: SummarizeDossierInput): Promise<SummarizeDossierResult> {
  try {
    const { dossier, sources = [] } = input;
    
    if (!dossier) {
      throw new Error('Dossier is required');
    }
    
    const formattedSources: Source[] = sources.map(s => ({
      url: s,
      title: s, // Assuming title can be derived from url for simplicity
      relevance: "1.0", // Default relevance
      accessedAt: new Date().toISOString() // Current timestamp
    }));

    // Create summarization agent
    const agent = new SummarizationAgent();
    
    // Generate summary
    const summary = await agent.summarize(dossier, formattedSources);
    
    return {
      success: true,
      summary: summary.summary || 'Summary generated successfully',
      keyInsights: summary.keyInsights || []
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}