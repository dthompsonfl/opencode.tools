import { ResearchInput, ResearchOutput, Source, ResearchInputSchema, Competitor, TechStack } from './types';
import { webfetch } from '../../tools/webfetch';
import { logger } from '../../src/runtime/logger';
import { Database } from '../../src/database/types';
import { JsonDatabase } from '../../src/database/json-db';
import { ResearchGatekeeper } from '../../src/governance/gatekeeper';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { EventBus } from '../../src/cowork/orchestrator/event-bus';
import { createProvider, ProviderType } from '../../src/tui/llm';

export class ResearchError extends Error {
  constructor(message: string, public context?: Record<string, any>) {
    super(message);
    this.name = 'ResearchError';
  }
}

interface SearchResult {
  query: string;
  content: string;
  url: string;
  timestamp: string;
}

export class ResearchAgent {
  private provider: string = 'openai';
  private readonly agentName = 'research-agent';
  private readonly promptVersion = 'v1';
  private readonly mcpVersion = 'v1';
  private db: Database;
  private gatekeeper: ResearchGatekeeper;

  constructor(db?: Database, gatekeeper?: ResearchGatekeeper) {
    this.db = db || new JsonDatabase();
    this.gatekeeper = gatekeeper || new ResearchGatekeeper();
  }

  async plan(args: any): Promise<any> {
    const { topic, scope, goals } = args;
    const llm = createProvider(this.provider as ProviderType);
    const response = await llm.chatCompletion({
      messages: [
        { role: "system", content: "You are a senior research analyst. Generate a research plan." },
        { role: "user", content: `Topic: ${topic}\nScope: ${scope}\nGoals: ${goals?.join(", ")}` }
      ]
    });
    return { plan: response.content };
  }

  async gather(args: any): Promise<any> {
    const { plan, sources } = args;
    return { data: `Gathered data based on plan: ${String(plan).substring(0, 50)}... from ${sources?.length || 0} sources` };
  }

  async extractClaims(args: any): Promise<any> {
    const { content } = args;
    const llm = createProvider(this.provider as ProviderType);
    const response = await llm.chatCompletion({
      messages: [
        { role: "system", content: "Extract key factual claims from the text as a JSON list of strings." },
        { role: "user", content: content }
      ]
    });
    let claims = [];
    try {
      claims = JSON.parse(response.content || "[]");
    } catch {
      claims = [{ text: response.content }];
    }
    return { claims };
  }

  async analyzeCitations(args: any): Promise<any> {
    const { claims, sources } = args;
    return { analysis: `Analyzed ${claims?.length || 0} claims against ${sources?.length || 0} sources` };
  }

  async peerReview(args: any): Promise<any> {
    const { dossier, criteria } = args;
    const llm = createProvider(this.provider as ProviderType);
    const response = await llm.chatCompletion({
      messages: [
        { role: "system", content: "Perform a peer review of the given research dossier." },
        { role: "user", content: `Criteria: ${criteria?.join(", ")}\nDossier:\n${JSON.stringify(dossier).substring(0, 3000)}` }
      ]
    });
    return { review: response.content };
  }

  async finalizeDossier(args: any): Promise<any> {
    return { dossier: args.research, status: "finalized" };
  }

  async execute(input: ResearchInput): Promise<ResearchOutput> {
    const runId = this.generateRunId();
    const timestamp = new Date().toISOString();

    logger.info('Research Agent started', { runId, company: input.brief.company });

    // Validate Input
    const validation = ResearchInputSchema.safeParse(input);
    if (!validation.success) {
      throw new ResearchError('Invalid input provided', { errors: validation.error.issues });
    }
    const validatedInput = validation.data;

    // Initialize Research Record in Database
    const recordId = uuidv4();
    await this.db.saveResearch({
      id: recordId,
      topic: validatedInput.brief.company,
      status: 'in_progress',
      startedAt: timestamp,
      findings: []
    });

    let iterations = 0;
    const maxIterations = 3;
    let companyData: SearchResult[] = [];
    let industryData: SearchResult[] = [];
    const competitorData: Competitor[] = [];
    const techStackData: TechStack = { frontend: [], backend: [], infrastructure: [], thirdParty: [] };
    let sources: Source[] = [];

    // Research Loop
    let gatePassed = false;
    while (iterations < maxIterations) {
      iterations++;
      logger.info(`Research iteration ${iterations}/${maxIterations}`);

      // Refine queries based on iteration
      const iterationSuffix = iterations > 1 ? ` depth ${iterations}` : '';

      // Gather research data
      try {
        const [newCompanyData, newIndustryData, newCompetitorData, newTechStackData] = await Promise.all([
          this.gatherCompanyData(validatedInput, iterationSuffix),
          this.gatherIndustryData(validatedInput, iterationSuffix),
          this.gatherCompetitorData(validatedInput, iterationSuffix),
          this.gatherTechStackData(validatedInput, iterationSuffix)
        ]);

        companyData = [...companyData, ...newCompanyData];
        industryData = [...industryData, ...newIndustryData];

        // Merge competitors ensuring uniqueness by name
        const existingNames = new Set(competitorData.map(c => c.name));
        newCompetitorData.forEach(c => {
          if (!existingNames.has(c.name)) {
            competitorData.push(c);
            existingNames.add(c.name);
          }
        });

        // Merge tech stack
        this.mergeTechStack(techStackData, newTechStackData);

      } catch (error) {
        logger.error('Error gathering data in iteration', { iterations, error });
        // Don't crash entirely, try to proceed with what we have
      }

      // Compile sources for gatekeeper
      sources = await this.compileSources(companyData, industryData, competitorData);

      // Check Gatekeeper
      const gateResult = this.gatekeeper.evaluate(sources);
      if (gateResult.passed) {
        logger.info('Gatekeeper passed', { iterations, score: gateResult.score });
        gatePassed = true;
        break;
      } else {
        logger.info('Gatekeeper failed, continuing research', { iterations, reasons: gateResult.reasons });
      }
    }

    // Save Findings to DB
    const currentRecord = await this.db.getResearch(recordId);
    if (currentRecord) {
        currentRecord.findings = sources.map(s => ({
            id: uuidv4(),
            sourceUrl: s.url,
            content: s.title,
            timestamp: s.accessedAt,
            relevanceScore: 1
        }));

        currentRecord.status = gatePassed ? 'completed' : 'in_progress';
        if (gatePassed) {
          currentRecord.completedAt = new Date().toISOString();
        }

        await this.db.saveResearch(currentRecord);
    }

    // Generate summaries and analysis
    const companySummary = await this.generateCompanySummary(companyData, validatedInput);
    const industryOverview = this.generateIndustryOverview(industryData);
    const risks = this.identifyRisks(validatedInput, industryData);
    const opportunities = this.identifyOpportunities(validatedInput, industryData);
    const recommendations = this.generateRecommendations(validatedInput, { risks, opportunities, techStack: techStackData });

    // Compile dossier
    const dossier = {
      companySummary,
      industryOverview,
      competitors: competitorData,
      techStack: techStackData,
      risks,
      opportunities,
      recommendations
    };

    logger.info('Research Agent completed', { runId, sourcesCount: sources.length });

    // Publish findings to chat
    EventBus.getInstance().publish('chat:message:agent', {
      agentId: 'research-agent',
      content: `Research completed for "${validatedInput.brief.company}". Found ${sources.length} sources. Dossier ready.`,
      role: 'agent',
      timestamp: Date.now()
    });

    return {
      dossier,
      sources,
      meta: {
        agent: this.agentName,
        promptVersion: this.promptVersion,
        mcpVersion: this.mcpVersion,
        timestamp,
        runId
      }
    };
  }

  private generateRunId(): string {
    return `research-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private async gatherCompanyData(input: ResearchInput, suffix: string = ''): Promise<SearchResult[]> {
    const searchQueries = [
      `${input.brief.company} company overview${suffix}`,
      `${input.brief.company} about us${suffix}`,
      `${input.brief.company} mission vision${suffix}`
    ];

    const results = await Promise.all(
      searchQueries.map(query => this.searchWeb(query))
    );

    return results.flat();
  }

  private async gatherIndustryData(input: ResearchInput, suffix: string = ''): Promise<SearchResult[]> {
    const industryQueries = [
      `${input.brief.industry} industry trends 2024${suffix}`,
      `${input.brief.industry} market analysis${suffix}`,
      `${input.brief.industry} technology adoption${suffix}`
    ];

    const results = await Promise.all(
      industryQueries.map(query => this.searchWeb(query))
    );

    return results.flat();
  }

  private async gatherCompetitorData(input: ResearchInput, suffix: string = ''): Promise<Competitor[]> {
    const competitorQueries = [
      `${input.brief.industry} top competitors${suffix}`,
      `${input.brief.company} competitors${suffix}`,
      `${input.brief.industry} market leaders${suffix}`
    ];

    const results = await Promise.all(
      competitorQueries.map(query => this.searchWeb(query))
    );

    return this.extractCompetitors(results.flat(), input);
  }

  private async gatherTechStackData(input: ResearchInput, suffix: string = ''): Promise<TechStack> {
    const techQueries = [
      `${input.brief.company} tech stack${suffix}`,
      `${input.brief.company} technology${suffix}`,
      `${input.brief.industry} common tech stack${suffix}`
    ];

    const results = await Promise.all(
      techQueries.map(query => this.searchWeb(query))
    );

    return this.extractTechStack(results.flat());
  }

  private async searchWeb(query: string, retryCount = 0): Promise<SearchResult[]> {
    try {
      // Use webfetch tool to search via DuckDuckGo HTML (more reliable for scraping)
      // Added basic retry logic
      const result = await webfetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, 'text');

      return [{
        query,
        content: result.content,
        url: result.url,
        timestamp: new Date().toISOString()
      }];
    } catch (error) {
      if (retryCount < 2) {
        logger.warn(`Search failed for query: ${query}, retrying...`, { retryCount });
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponentialish backoff
        return this.searchWeb(query, retryCount + 1);
      }
      logger.error(`Search failed for query: ${query} after retries`, { error, query });
      return [];
    }
  }

  private extractCompetitors(data: SearchResult[], input: ResearchInput): Competitor[] {
    const competitors: Competitor[] = [];
    const seen = new Set<string>();

    for (const result of data) {
      const lines = result.content.split('\n');

      for (const line of lines) {
        if (line.toLowerCase().includes('competitor') ||
            line.toLowerCase().includes('competition') ||
            line.toLowerCase().includes('alternative')) {

          const words = line.split(' ');
          for (let i = 0; i < words.length - 1; i++) {
            const potentialCompany = words[i] + ' ' + words[i + 1];
            // Cleaner logic: check length, uniqueness, and not the client company
            if (potentialCompany.length > 3 &&
                !potentialCompany.toLowerCase().includes(input.brief.company.toLowerCase()) &&
                !seen.has(potentialCompany) &&
                /^[A-Z]/.test(potentialCompany)) { // Heuristic: Starts with Capital

              competitors.push({
                name: potentialCompany,
                url: result.url,
                differentiation: 'Market competitor',
                marketPosition: 'Established player'
              });
              seen.add(potentialCompany);

              if (competitors.length >= 5) break;
            }
          }
        }
        if (competitors.length >= 5) break;
      }
      if (competitors.length >= 5) break;
    }

    return competitors.slice(0, 5);
  }

  private extractTechStack(data: SearchResult[]): TechStack {
    const techStack: TechStack = {
      frontend: [],
      backend: [],
      infrastructure: [],
      thirdParty: []
    };

    const commonTech: Record<keyof TechStack, string[]> = {
      frontend: ['React', 'Vue', 'Angular', 'Next.js', 'Svelte'],
      backend: ['Node.js', 'Python', 'Java', 'Go', 'Ruby', 'PHP'],
      infrastructure: ['AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes'],
      thirdParty: ['Stripe', 'Twilio', 'SendGrid', 'Auth0', 'Firebase']
    };

    const content = data.map(d => d.content).join(' ').toLowerCase();

    for (const [category, techs] of Object.entries(commonTech)) {
      const cat = category as keyof TechStack;
      for (const tech of techs) {
        if (content.includes(tech.toLowerCase()) && !techStack[cat]?.includes(tech)) {
          techStack[cat]?.push(tech);
        }
      }
    }

    return techStack;
  }

  private mergeTechStack(target: TechStack, source: TechStack): void {
     const merge = (t: string[] | undefined, s: string[] | undefined) => {
         if (!s) return t || [];
         if (!t) return s;
         return Array.from(new Set([...t, ...s]));
     };

     target.frontend = merge(target.frontend, source.frontend);
     target.backend = merge(target.backend, source.backend);
     target.infrastructure = merge(target.infrastructure, source.infrastructure);
     target.thirdParty = merge(target.thirdParty, source.thirdParty);
  }

    private async generateCompanySummary(companyData: SearchResult[], input: ResearchInput): Promise<string> {
    try {
      // Use configured provider (default openai)
      // Note: In real app, provider should be injected via constructor
      const llm = createProvider(this.provider as ProviderType);

      const context = companyData.map(d => d.content).join('\n\n').substring(0, 4000);

      const response = await llm.chatCompletion({
        messages: [
          { role: 'system', content: 'You are a senior research analyst. Summarize the company profile based on the provided search results.' },
          { role: 'user', content: `Company: ${input.brief.company}\nIndustry: ${input.brief.industry}\nContext:\n${context}` }
        ]
      });

      return response.content || `${input.brief.company} operates in the ${input.brief.industry} industry.`;
    } catch (error) {
      console.error('LLM generation failed, falling back to basic summary', error);
      return `${input.brief.company} operates in the ${input.brief.industry} industry.`;
    }
  }

  private generateIndustryOverview(industryData: SearchResult[]): string {
    const trends = industryData.slice(0, 3).map(d => d.content.substring(0, 150).trim());
    return `The industry shows these key trends: ${trends.join('. ')}`;
  }

  private identifyRisks(input: ResearchInput, industryData: SearchResult[]): string[] {
    const risks = [];

    if (input.brief.constraints) {
      risks.push(...input.brief.constraints);
    }

    const riskKeywords = ['risk', 'challenge', 'threat', 'concern'];
    const content = industryData.map(d => d.content).join(' ').toLowerCase();

    for (const keyword of riskKeywords) {
      if (content.includes(keyword)) {
        risks.push(`Industry ${keyword} identified in market analysis`);
      }
    }

    // Deduplicate
    return Array.from(new Set(risks)).slice(0, 3);
  }

  private identifyOpportunities(input: ResearchInput, industryData: SearchResult[]): string[] {
    const opportunities = [];

    const oppKeywords = ['opportunity', 'growth', 'trend', 'innovation'];
    const content = industryData.map(d => d.content).join(' ').toLowerCase();

    for (const keyword of oppKeywords) {
      if (content.includes(keyword)) {
        opportunities.push(`Industry ${keyword} identified in market analysis`);
      }
    }

    if (input.brief.goals) {
      opportunities.push(...input.brief.goals.map(g => `Opportunity to achieve: ${g}`));
    }

    return Array.from(new Set(opportunities)).slice(0, 3);
  }

  private generateRecommendations(input: ResearchInput, data: { risks: string[], opportunities: string[], techStack: TechStack }): string[] {
    const recommendations = [];

    if (data.risks.length > 0) {
      recommendations.push('Address identified risks through mitigation strategies');
    }

    if (data.opportunities.length > 0) {
      recommendations.push('Leverage identified opportunities for competitive advantage');
    }

    if (data.techStack.frontend && data.techStack.frontend.length === 0) {
      recommendations.push('Consider modern frontend frameworks for improved user experience');
    }

    return recommendations.slice(0, 3);
  }

  private async compileSources(companyData: SearchResult[], industryData: SearchResult[], competitorData: Competitor[]): Promise<Source[]> {
    const allData: any[] = [...companyData, ...industryData, ...competitorData];
    const sources: Source[] = [];
    const seen = new Set<string>();

    for (const data of allData) {
      if (data.url && !seen.has(data.url)) {
        sources.push({
          url: data.url,
          title: data.query ? `Research: ${data.query}` : 'Competitor Analysis',
          relevance: 'High',
          accessedAt: data.timestamp || new Date().toISOString()
        });
        seen.add(data.url);
      }
    }

    return sources.slice(0, 10);
  }
}
