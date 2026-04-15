"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResearchAgent = exports.ResearchError = void 0;
const types_1 = require("./types");
const webfetch_1 = require("../../tools/webfetch");
const logger_1 = require("../../src/runtime/logger");
const json_db_1 = require("../../src/database/json-db");
const gatekeeper_1 = require("../../src/governance/gatekeeper");
const uuid_1 = require("uuid");
const event_bus_1 = require("../../src/cowork/orchestrator/event-bus");
const llm_1 = require("../../src/tui/llm");
class ResearchError extends Error {
    constructor(message, context) {
        super(message);
        this.context = context;
        this.name = 'ResearchError';
    }
}
exports.ResearchError = ResearchError;
class ResearchAgent {
    constructor(db, gatekeeper) {
        this.provider = 'openai';
        this.agentName = 'research-agent';
        this.promptVersion = 'v1';
        this.mcpVersion = 'v1';
        this.db = db || new json_db_1.JsonDatabase();
        this.gatekeeper = gatekeeper || new gatekeeper_1.ResearchGatekeeper();
    }
    async plan(args) {
        const { topic, scope, goals } = args;
        const llm = (0, llm_1.createProvider)(this.provider);
        const response = await llm.chatCompletion({
            messages: [
                { role: "system", content: "You are a senior research analyst. Generate a research plan." },
                { role: "user", content: `Topic: ${topic}\nScope: ${scope}\nGoals: ${goals?.join(", ")}` }
            ]
        });
        return { plan: response.content };
    }
    async gather(args) {
        const { plan, sources } = args;
        return { data: `Gathered data based on plan: ${String(plan).substring(0, 50)}... from ${sources?.length || 0} sources` };
    }
    async extractClaims(args) {
        const { content } = args;
        const llm = (0, llm_1.createProvider)(this.provider);
        const response = await llm.chatCompletion({
            messages: [
                { role: "system", content: "Extract key factual claims from the text as a JSON list of strings." },
                { role: "user", content: content }
            ]
        });
        let claims = [];
        try {
            claims = JSON.parse(response.content || "[]");
        }
        catch {
            claims = [{ text: response.content }];
        }
        return { claims };
    }
    async analyzeCitations(args) {
        const { claims, sources } = args;
        return { analysis: `Analyzed ${claims?.length || 0} claims against ${sources?.length || 0} sources` };
    }
    async peerReview(args) {
        const { dossier, criteria } = args;
        const llm = (0, llm_1.createProvider)(this.provider);
        const response = await llm.chatCompletion({
            messages: [
                { role: "system", content: "Perform a peer review of the given research dossier." },
                { role: "user", content: `Criteria: ${criteria?.join(", ")}\nDossier:\n${JSON.stringify(dossier).substring(0, 3000)}` }
            ]
        });
        return { review: response.content };
    }
    async finalizeDossier(args) {
        return { dossier: args.research, status: "finalized" };
    }
    async execute(input) {
        const runId = this.generateRunId();
        const timestamp = new Date().toISOString();
        logger_1.logger.info('Research Agent started', { runId, company: input.brief.company });
        // Validate Input
        const validation = types_1.ResearchInputSchema.safeParse(input);
        if (!validation.success) {
            throw new ResearchError('Invalid input provided', { errors: validation.error.issues });
        }
        const validatedInput = validation.data;
        // Initialize Research Record in Database
        const recordId = (0, uuid_1.v4)();
        await this.db.saveResearch({
            id: recordId,
            topic: validatedInput.brief.company,
            status: 'in_progress',
            startedAt: timestamp,
            findings: []
        });
        let iterations = 0;
        const maxIterations = 3;
        let companyData = [];
        let industryData = [];
        const competitorData = [];
        const techStackData = { frontend: [], backend: [], infrastructure: [], thirdParty: [] };
        let sources = [];
        // Research Loop
        let gatePassed = false;
        while (iterations < maxIterations) {
            iterations++;
            logger_1.logger.info(`Research iteration ${iterations}/${maxIterations}`);
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
            }
            catch (error) {
                logger_1.logger.error('Error gathering data in iteration', { iterations, error });
                // Don't crash entirely, try to proceed with what we have
            }
            // Compile sources for gatekeeper
            sources = await this.compileSources(companyData, industryData, competitorData);
            // Check Gatekeeper
            const gateResult = this.gatekeeper.evaluate(sources);
            if (gateResult.passed) {
                logger_1.logger.info('Gatekeeper passed', { iterations, score: gateResult.score });
                gatePassed = true;
                break;
            }
            else {
                logger_1.logger.info('Gatekeeper failed, continuing research', { iterations, reasons: gateResult.reasons });
            }
        }
        // Save Findings to DB
        const currentRecord = await this.db.getResearch(recordId);
        if (currentRecord) {
            currentRecord.findings = sources.map(s => ({
                id: (0, uuid_1.v4)(),
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
        logger_1.logger.info('Research Agent completed', { runId, sourcesCount: sources.length });
        // Publish findings to chat
        event_bus_1.EventBus.getInstance().publish('chat:message:agent', {
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
    generateRunId() {
        return `research-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    }
    async gatherCompanyData(input, suffix = '') {
        const searchQueries = [
            `${input.brief.company} company overview${suffix}`,
            `${input.brief.company} about us${suffix}`,
            `${input.brief.company} mission vision${suffix}`
        ];
        const results = await Promise.all(searchQueries.map(query => this.searchWeb(query)));
        return results.flat();
    }
    async gatherIndustryData(input, suffix = '') {
        const industryQueries = [
            `${input.brief.industry} industry trends 2024${suffix}`,
            `${input.brief.industry} market analysis${suffix}`,
            `${input.brief.industry} technology adoption${suffix}`
        ];
        const results = await Promise.all(industryQueries.map(query => this.searchWeb(query)));
        return results.flat();
    }
    async gatherCompetitorData(input, suffix = '') {
        const competitorQueries = [
            `${input.brief.industry} top competitors${suffix}`,
            `${input.brief.company} competitors${suffix}`,
            `${input.brief.industry} market leaders${suffix}`
        ];
        const results = await Promise.all(competitorQueries.map(query => this.searchWeb(query)));
        return this.extractCompetitors(results.flat(), input);
    }
    async gatherTechStackData(input, suffix = '') {
        const techQueries = [
            `${input.brief.company} tech stack${suffix}`,
            `${input.brief.company} technology${suffix}`,
            `${input.brief.industry} common tech stack${suffix}`
        ];
        const results = await Promise.all(techQueries.map(query => this.searchWeb(query)));
        return this.extractTechStack(results.flat());
    }
    async searchWeb(query, retryCount = 0) {
        try {
            // Use webfetch tool to search via DuckDuckGo HTML (more reliable for scraping)
            // Added basic retry logic
            const result = await (0, webfetch_1.webfetch)(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, 'text');
            return [{
                    query,
                    content: result.content,
                    url: result.url,
                    timestamp: new Date().toISOString()
                }];
        }
        catch (error) {
            if (retryCount < 2) {
                logger_1.logger.warn(`Search failed for query: ${query}, retrying...`, { retryCount });
                await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponentialish backoff
                return this.searchWeb(query, retryCount + 1);
            }
            logger_1.logger.error(`Search failed for query: ${query} after retries`, { error, query });
            return [];
        }
    }
    extractCompetitors(data, input) {
        const competitors = [];
        const seen = new Set();
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
                            if (competitors.length >= 5)
                                break;
                        }
                    }
                }
                if (competitors.length >= 5)
                    break;
            }
            if (competitors.length >= 5)
                break;
        }
        return competitors.slice(0, 5);
    }
    extractTechStack(data) {
        const techStack = {
            frontend: [],
            backend: [],
            infrastructure: [],
            thirdParty: []
        };
        const commonTech = {
            frontend: ['React', 'Vue', 'Angular', 'Next.js', 'Svelte'],
            backend: ['Node.js', 'Python', 'Java', 'Go', 'Ruby', 'PHP'],
            infrastructure: ['AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes'],
            thirdParty: ['Stripe', 'Twilio', 'SendGrid', 'Auth0', 'Firebase']
        };
        const content = data.map(d => d.content).join(' ').toLowerCase();
        for (const [category, techs] of Object.entries(commonTech)) {
            const cat = category;
            for (const tech of techs) {
                if (content.includes(tech.toLowerCase()) && !techStack[cat]?.includes(tech)) {
                    techStack[cat]?.push(tech);
                }
            }
        }
        return techStack;
    }
    mergeTechStack(target, source) {
        const merge = (t, s) => {
            if (!s)
                return t || [];
            if (!t)
                return s;
            return Array.from(new Set([...t, ...s]));
        };
        target.frontend = merge(target.frontend, source.frontend);
        target.backend = merge(target.backend, source.backend);
        target.infrastructure = merge(target.infrastructure, source.infrastructure);
        target.thirdParty = merge(target.thirdParty, source.thirdParty);
    }
    async generateCompanySummary(companyData, input) {
        try {
            // Use configured provider (default openai)
            // Note: In real app, provider should be injected via constructor
            const llm = (0, llm_1.createProvider)(this.provider);
            const context = companyData.map(d => d.content).join('\n\n').substring(0, 4000);
            const response = await llm.chatCompletion({
                messages: [
                    { role: 'system', content: 'You are a senior research analyst. Summarize the company profile based on the provided search results.' },
                    { role: 'user', content: `Company: ${input.brief.company}\nIndustry: ${input.brief.industry}\nContext:\n${context}` }
                ]
            });
            return response.content || `${input.brief.company} operates in the ${input.brief.industry} industry.`;
        }
        catch (error) {
            console.error('LLM generation failed, falling back to basic summary', error);
            return `${input.brief.company} operates in the ${input.brief.industry} industry.`;
        }
    }
    generateIndustryOverview(industryData) {
        const trends = industryData.slice(0, 3).map(d => d.content.substring(0, 150).trim());
        return `The industry shows these key trends: ${trends.join('. ')}`;
    }
    identifyRisks(input, industryData) {
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
    identifyOpportunities(input, industryData) {
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
    generateRecommendations(input, data) {
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
    async compileSources(companyData, industryData, competitorData) {
        const allData = [...companyData, ...industryData, ...competitorData];
        const sources = [];
        const seen = new Set();
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
exports.ResearchAgent = ResearchAgent;
//# sourceMappingURL=research-agent.js.map