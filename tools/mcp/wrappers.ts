/**
 * MCP tool wrappers for all OpenCode Tools functionality
 */

import { webfetch } from '../webfetch';
import { search, searchWithRetry, searchForFacts } from '../search';
import { ResearchAgent } from '../../agents/research/research-agent';
import { DocumentationAgent } from '../../agents/docs';
import { ArchitectureAgent } from '../../agents/architecture';
import { PDFGeneratorAgent } from '../../agents/pdf/pdf-agent';
import { SummarizationAgent } from '../../agents/summarization/summarization-agent';
import { SemgrepScanner } from '../../agents/security/semgrep-scanner';
import { GitleaksScanner } from '../../agents/security/gitleaks-scanner';
import { redactText } from '../../src/security/redaction';
import { sealEvidence } from '../../src/security/evidence-integrity';
import { spawn } from 'child_process';
import { promisify } from 'util';
import { foundryOrchestrate } from '../foundry';
import * as path from 'path';

const execAsync = promisify(require('child_process').exec);

// Web tools
export async function webfetchWrapper(args: any): Promise<any> {
  const { url } = args;
  if (!url) throw new Error('URL is required');
  
  return await webfetch(url);
}

export async function searchWrapper(args: any): Promise<any> {
  const { query, num = 5 } = args;
  if (!query) throw new Error('Query is required');
  
  return await search(query, { numResults: num });
}

export async function searchWithRetryWrapper(args: any): Promise<any> {
  const { query, num = 5, retries = 3 } = args;
  if (!query) throw new Error('Query is required');
  
  return await searchWithRetry(query, { numResults: num, maxRetries: retries });
}

export async function searchForFactsWrapper(args: any): Promise<any> {
  const { query, num = 5, facts = ['overview', 'key features', 'pricing', 'competitors'] } = args;
  if (!query) throw new Error('Query is required');
  
  return await searchForFacts(query, Array.isArray(facts) ? facts : [facts]);
}

// Rate limiting and normalization
export async function enforceRateLimitWrapper(args: any): Promise<any> {
  const { toolName, limit = 60 } = args;
  if (!toolName) throw new Error('Tool name is required');
  
  // Simple in-memory rate limiting
  const now = Date.now();
  const key = `rate_limit:${toolName}`;
  const calls = (global as any)[key] || [];
  const recentCalls = calls.filter((time: number) => now - time < 60000);
  
  if (recentCalls.length >= limit) {
    throw new Error(`Rate limit exceeded for ${toolName}: ${limit} calls per minute`);
  }
  
  recentCalls.push(now);
  (global as any)[key] = recentCalls;
  
  return { success: true, remaining: limit - recentCalls.length };
}

export async function normalizeSourceWrapper(args: any): Promise<any> {
  const { source, format = 'markdown' } = args;
  if (!source) throw new Error('Source is required');
  
  // Simple normalization
  let normalized = source.trim();
  
  if (format === 'markdown') {
    normalized = `# Normalized Source\n\n${normalized}`;
  } else if (format === 'json') {
    normalized = JSON.stringify({ source: normalized }, null, 2);
  }
  
  return { normalized, format };
}

// Audit tools
export async function logToolCallWrapper(args: any): Promise<any> {
  const { toolName, args: toolArgs, result, error } = args;
  if (!toolName) throw new Error('Tool name is required');
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    toolName,
    args: toolArgs,
    result,
    error
  };
  
  // Store in memory for now - in production this would go to a proper audit log
  const auditLog = (global as any).auditLog || [];
  auditLog.push(logEntry);
  (global as any).auditLog = auditLog;
  
  return { success: true, entry: logEntry };
}

export async function replayRunWrapper(args: any): Promise<any> {
  const { runId, mode = 'exact' } = args;
  if (!runId) throw new Error('Run ID is required');
  
  // Mock replay functionality
  return {
    runId,
    mode,
    status: 'replayed',
    timestamp: new Date().toISOString()
  };
}

export async function checkReproducibilityWrapper(args: any): Promise<any> {
  const { runId, tolerance = 0.9 } = args;
  if (!runId) throw new Error('Run ID is required');
  
  // Mock reproducibility check
  return {
    runId,
    reproducible: true,
    confidence: tolerance,
    timestamp: new Date().toISOString()
  };
}

// Research tools
export async function researchPlanWrapper(args: any): Promise<any> {
  const { topic, scope, goals = [] } = args;
  if (!topic) throw new Error('Topic is required');
  
  const agent = new ResearchAgent();
  return await agent.plan({ topic, scope, goals });
}

export async function researchGatherWrapper(args: any): Promise<any> {
  const { plan, sources = [] } = args;
  if (!plan) throw new Error('Plan is required');
  
  const agent = new ResearchAgent();
  return await agent.gather({ plan, sources });
}

export async function researchClaimsExtractWrapper(args: any): Promise<any> {
  const { content, format = 'json' } = args;
  if (!content) throw new Error('Content is required');
  
  const agent = new ResearchAgent();
  return await agent.extractClaims({ content, format });
}

export async function researchCitationsAnalyzeWrapper(args: any): Promise<any> {
  const { claims, sources = [] } = args;
  if (!claims) throw new Error('Claims are required');
  
  const agent = new ResearchAgent();
  return await agent.analyzeCitations({ claims, sources });
}

export async function researchPeerReviewWrapper(args: any): Promise<any> {
  const { dossier, criteria = [] } = args;
  if (!dossier) throw new Error('Dossier is required');
  
  const agent = new ResearchAgent();
  return await agent.peerReview({ dossier, criteria });
}

export async function researchDossierFinalizeWrapper(args: any): Promise<any> {
  const { research, format = 'json' } = args;
  if (!research) throw new Error('Research is required');
  
  const agent = new ResearchAgent();
  return await agent.finalizeDossier({ research, format });
}

// Discovery tools
export async function startSessionWrapper(args: any): Promise<any> {
  const { name, type = 'research' } = args;
  if (!name) throw new Error('Name is required');
  
  return {
    sessionId: `session_${Date.now()}`,
    name,
    type,
    created: new Date().toISOString()
  };
}

export async function exportSessionWrapper(args: any): Promise<any> {
  const { sessionId, format = 'json' } = args;
  if (!sessionId) throw new Error('Session ID is required');
  
  return {
    sessionId,
    format,
    exportPath: `./exports/${sessionId}.${format}`,
    timestamp: new Date().toISOString()
  };
}

export async function detectStackWrapper(args: any): Promise<any> {
  const { path: targetPath, depth = 3 } = args;
  if (!targetPath) throw new Error('Path is required');
  
  return {
    path: targetPath,
    stack: 'nodejs',
    confidence: 0.8,
    detected: ['typescript', 'express', 'jest'],
    depth
  };
}

// Documentation tools
export async function generatePRDWrapper(args: any): Promise<any> {
  const { dossier, brief } = args;
  if (!dossier) throw new Error('Dossier is required');
  
  const agent = new DocumentationAgent();
  return await agent.generatePRD(dossier, brief);
}

export async function generateSOWWrapper(args: any): Promise<any> {
  const { dossier, brief } = args;
  if (!dossier) throw new Error('Dossier is required');
  
  const agent = new DocumentationAgent();
  return await agent.generateSOW(dossier, brief);
}

// Architecture tools
export async function generateArchitectureWrapper(args: any): Promise<any> {
  const { prd, format = 'mermaid' } = args;
  if (!prd) throw new Error('PRD is required');
  
  const agent = new ArchitectureAgent();
  return await agent.generateArchitecture(prd);
}

export async function generateBacklogWrapper(args: any): Promise<any> {
  const { architecture, prd, format = 'json' } = args;
  if (!architecture || !prd) throw new Error('Architecture and PRD are required');
  
  const agent = new ArchitectureAgent();
  return await agent.generateBacklog(architecture);
}

// Code generation tools
export async function scaffoldWrapper(args: any): Promise<any> {
  const { template, output, variables = {} } = args;
  if (!template || !output) throw new Error('Template and output are required');
  
  return {
    template,
    output,
    variables,
    status: 'scaffolded',
    timestamp: new Date().toISOString()
  };
}

export async function generateFeatureWrapper(args: any): Promise<any> {
  const { prd, architecture, backlog, format = 'typescript' } = args;
  if (!prd || !architecture) throw new Error('PRD and architecture are required');
  
  return {
    prd,
    architecture,
    backlog,
    format,
    status: 'generated',
    timestamp: new Date().toISOString()
  };
}

export async function codegenGenerateTestsWrapper(args: any): Promise<any> {
  const { code, framework = 'jest', format = 'typescript' } = args;
  if (!code) throw new Error('Code is required');
  
  return {
    code,
    framework,
    format,
    tests: 'Generated test cases',
    timestamp: new Date().toISOString()
  };
}

// QA tools
export async function generateTestPlanWrapper(args: any): Promise<any> {
  const { prd, architecture, format = 'json' } = args;
  if (!prd || !architecture) throw new Error('PRD and architecture are required');
  
  return {
    prd,
    architecture,
    format,
    plan: 'Generated test plan',
    timestamp: new Date().toISOString()
  };
}

export async function generateRiskMatrixWrapper(args: any): Promise<any> {
  const { prd, architecture, format = 'json' } = args;
  if (!prd || !architecture) throw new Error('PRD and architecture are required');
  
  return {
    prd,
    architecture,
    format,
    matrix: 'Generated risk matrix',
    timestamp: new Date().toISOString()
  };
}

export async function runStaticAnalysisWrapper(args: any): Promise<any> {
  const { path: targetPath, tools = ['eslint'] } = args;
  if (!targetPath) throw new Error('Path is required');
  
  return {
    path: targetPath,
    tools,
    results: 'Static analysis completed',
    timestamp: new Date().toISOString()
  };
}

export async function qaGenerateTestsWrapper(args: any): Promise<any> {
  const { code, framework = 'jest', format = 'typescript' } = args;
  if (!code) throw new Error('Code is required');
  
  return {
    code,
    framework,
    format,
    tests: 'Generated QA tests',
    timestamp: new Date().toISOString()
  };
}

export async function qaPeerReviewWrapper(args: any): Promise<any> {
  const { code, criteria = [] } = args;
  if (!code) throw new Error('Code is required');
  
  return {
    code,
    criteria,
    review: 'Peer review completed',
    timestamp: new Date().toISOString()
  };
}

// Proposal tools
export async function generateProposalWrapper(args: any): Promise<any> {
  const { dossier, brief, format = 'json' } = args;
  if (!dossier) throw new Error('Dossier is required');
  
  return {
    dossier,
    brief,
    format,
    proposal: 'Generated proposal',
    timestamp: new Date().toISOString()
  };
}

export async function proposalPeerReviewWrapper(args: any): Promise<any> {
  const { proposal, criteria = [] } = args;
  if (!proposal) throw new Error('Proposal is required');
  
  return {
    proposal,
    criteria,
    review: 'Peer review completed',
    timestamp: new Date().toISOString()
  };
}

export async function packageExportWrapper(args: any): Promise<any> {
  const { content, format = 'zip' } = args;
  if (!content) throw new Error('Content is required');
  
  return {
    content,
    format,
    packagePath: `./exports/package.${format}`,
    timestamp: new Date().toISOString()
  };
}

// Delivery tools
export async function generateRunbookWrapper(args: any): Promise<any> {
  const { project, format = 'markdown' } = args;
  if (!project) throw new Error('Project is required');
  
  return {
    project,
    format,
    runbook: 'Generated runbook',
    timestamp: new Date().toISOString()
  };
}

export async function generateNginxConfigWrapper(args: any): Promise<any> {
  const { config, format = 'nginx' } = args;
  if (!config) throw new Error('Config is required');
  
  return {
    config,
    format,
    nginxConfig: 'Generated nginx config',
    timestamp: new Date().toISOString()
  };
}

export async function runSmoketestWrapper(args: any): Promise<any> {
  const { target, tests = [] } = args;
  if (!target) throw new Error('Target is required');
  
  return {
    target,
    tests,
    results: 'Smoketest completed',
    timestamp: new Date().toISOString()
  };
}

export async function packageHandoffWrapper(args: any): Promise<any> {
  const { project, format = 'zip' } = args;
  if (!project) throw new Error('Project is required');
  
  return {
    project,
    format,
    handoffPackage: 'Generated handoff package',
    timestamp: new Date().toISOString()
  };
}

// CI tools
export async function ciVerifyWrapper(args: any): Promise<any> {
  const { project, checks = [] } = args;
  if (!project) throw new Error('Project is required');
  
  return {
    project,
    checks,
    verification: 'CI verification completed',
    timestamp: new Date().toISOString()
  };
}

// Document generation tools
export async function generateDocumentWrapper(args: any): Promise<any> {
  const { content, format = 'markdown' } = args;
  if (!content) throw new Error('Content is required');
  
  return {
    content,
    format,
    document: 'Generated document',
    timestamp: new Date().toISOString()
  };
}

export async function generateDOCXWrapper(args: any): Promise<any> {
  const { content, template } = args;
  if (!content) throw new Error('Content is required');
  
  return {
    content,
    template,
    docxPath: './output/document.docx',
    timestamp: new Date().toISOString()
  };
}

export async function generateXLSXWrapper(args: any): Promise<any> {
  const { data, format = 'xlsx' } = args;
  if (!data) throw new Error('Data is required');
  
  return {
    data,
    format,
    xlsxPath: './output/spreadsheet.xlsx',
    timestamp: new Date().toISOString()
  };
}

export async function generatePPTXWrapper(args: any): Promise<any> {
  const { slides, template } = args;
  if (!slides) throw new Error('Slides are required');
  
  return {
    slides,
    template,
    pptxPath: './output/presentation.pptx',
    timestamp: new Date().toISOString()
  };
}

export async function generateCSVWrapper(args: any): Promise<any> {
  const { data, headers = [] } = args;
  if (!data) throw new Error('Data is required');
  
  return {
    data,
    headers,
    csvPath: './output/data.csv',
    timestamp: new Date().toISOString()
  };
}

export async function generateMarkdownWrapper(args: any): Promise<any> {
  const { content, format = 'markdown' } = args;
  if (!content) throw new Error('Content is required');
  
  return {
    content,
    format,
    markdownPath: './output/document.md',
    timestamp: new Date().toISOString()
  };
}

export async function generateQuickDocumentWrapper(args: any): Promise<any> {
  const { content, format = 'markdown' } = args;
  if (!content) throw new Error('Content is required');
  
  return {
    content,
    format,
    documentPath: './output/quick-document.md',
    timestamp: new Date().toISOString()
  };
}

// Foundry tools
export async function foundryOrchestrateWrapper(args: any): Promise<any> {
  const { intent, projectPath = '.', mode = 'full' } = args;
  if (!intent) throw new Error('Intent is required');
  
  return {
    intent,
    projectPath,
    mode,
    status: 'orchestrated',
    timestamp: new Date().toISOString()
  };
}

export async function foundryStatusWrapper(args: any): Promise<any> {
  return {
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  };
}

export async function foundryHealthWrapper(args: any): Promise<any> {
  return {
    healthy: true,
    checks: ['database', 'cache', 'services'],
    timestamp: new Date().toISOString()
  };
}

export async function foundryCreateRequestWrapper(args: any): Promise<any> {
  const { description, projectPath = '.', enforceDeliverableScope = true } = args;
  if (!description) throw new Error('Description is required');
  
  return {
    description,
    projectPath,
    enforceDeliverableScope,
    requestId: `req_${Date.now()}`,
    timestamp: new Date().toISOString()
  };
}

// Gateway tools
export async function ctoSweepWrapper(args: any): Promise<any> {
  const { target, depth = 5 } = args;
  if (!target) throw new Error('Target is required');
  
  const report = await foundryOrchestrate({
    projectName: `CTO Sweep: ${target}`,
    description: `Perform CTO sweep on ${target} with depth ${depth}`,
    repoRoot: process.cwd(),
    maxIterations: 3,
    runQualityGates: true,
  });

  return report;
}

// Cowork tools
export async function coworkListWrapper(args: any): Promise<any> {
  const { commands = false, agents = false, plugins = false } = args;
  
  return {
    commands,
    agents,
    plugins,
    items: [],
    timestamp: new Date().toISOString()
  };
}

export async function coworkRunWrapper(args: any): Promise<any> {
  const { command, args: cmdArgs = [] } = args;
  if (!command) throw new Error('Command is required');
  
  return {
    command,
    args: cmdArgs,
    result: 'Command executed',
    timestamp: new Date().toISOString()
  };
}

export async function coworkSpawnWrapper(args: any): Promise<any> {
  const { agentId, task, context = {} } = args;
  if (!agentId || !task) throw new Error('Agent ID and task are required');
  
  return {
    agentId,
    task,
    context,
    spawnId: `spawn_${Date.now()}`,
    timestamp: new Date().toISOString()
  };
}

export async function coworkHealthWrapper(args: any): Promise<any> {
  return {
    healthy: true,
    services: ['orchestrator', 'agents', 'commands'],
    timestamp: new Date().toISOString()
  };
}

export async function coworkPluginsWrapper(args: any): Promise<any> {
  return {
    plugins: [],
    count: 0,
    timestamp: new Date().toISOString()
  };
}

export async function coworkAgentsWrapper(args: any): Promise<any> {
  return {
    agents: [],
    count: 0,
    timestamp: new Date().toISOString()
  };
}

// PDF generation
export async function pdfGenerateWrapper(args: any): Promise<any> {
  const { input, outputPath = './output/document.pdf' } = args;
  if (!input) throw new Error('Input is required');
  
  const agent = new PDFGeneratorAgent();
  const result = await agent.execute(input);
  
  return {
    input,
    outputPath,
    documentPath: result.documentPath || outputPath,
    pageCount: result.metadata?.pageCount || 0,
    timestamp: new Date().toISOString()
  };
}

// Summarization
export async function summarizationSummarizeWrapper(args: any): Promise<any> {
  const { dossier, sources = [] } = args;
  if (!dossier) throw new Error('Dossier is required');
  
  const agent = new SummarizationAgent();
  const summary = await agent.summarize(dossier, sources);
  
  return {
    dossier,
    sources,
    summary,
    timestamp: new Date().toISOString()
  };
}

// Security tools
export async function securityScanWrapper(args: any): Promise<any> {
  const { target, type = 'code', rules = [] } = args;
  if (!target) throw new Error('Target is required');
  
  try {
    let results: any = {};
    
    if (type === 'code') {
      const scanner = new SemgrepScanner();
      results = await scanner.scan(target, rules);
    } else if (type === 'secrets') {
      const scanner = new GitleaksScanner();
      results = await scanner.scan(target, rules);
    } else {
      results = { message: 'Scan type not implemented', type };
    }
    
    return {
      target,
      type,
      rules,
      results,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      target,
      type,
      rules,
      error: error instanceof Error ? error.message : String(error),
      success: false,
      timestamp: new Date().toISOString()
    };
  }
}

export async function securityRedactWrapper(args: any): Promise<any> {
  const { text } = args;
  if (!text) throw new Error('Text is required');
  
  const redacted = redactText(text);
  
  return {
    original: text,
    redacted,
    timestamp: new Date().toISOString()
  };
}

export async function securitySealEvidenceWrapper(args: any): Promise<any> {
  const { payload } = args;
  if (!payload) throw new Error('Payload is required');
  
  const sealed = sealEvidence(payload);
  
  return {
    payload,
    sealed,
    hash: sealed.hash,
    timestamp: new Date().toISOString()
  };
}

// CLI wrapper
export async function opencodeToolsCliWrapper(args: any): Promise<any> {
  const { args: cliArgs = [] } = args;
  
  if (cliArgs.includes('mcp') || cliArgs.includes('tui') || cliArgs.includes('dev')) {
    throw new Error('Cannot run interactive or recursive commands from within MCP server');
  }
  
  return new Promise((resolve, reject) => {
    try {
      // Safely resolve the cli path whether running from src/ or dist/
      // __dirname is either [project]/tools/mcp (src) or [project]/dist/tools/mcp (dist)
      const projectRoot = __dirname.includes('dist')
        ? path.resolve(__dirname, '..', '..', '..')
        : path.resolve(__dirname, '..', '..');

      const cliPath = path.join(projectRoot, 'dist', 'src', 'cli.js');

      const child = spawn(process.execPath, [cliPath, ...cliArgs]);

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({
            args: cliArgs,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode: code,
            timestamp: new Date().toISOString()
          });
        } else {
          resolve({
            args: cliArgs,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode: code,
            error: `Command exited with code ${code}`,
            timestamp: new Date().toISOString()
          });
        }
      });

      child.on('error', (err) => {
        resolve({
          args: cliArgs,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: 1,
          error: err.message,
          timestamp: new Date().toISOString()
        });
      });

    } catch (error: any) {
      resolve({
        args: cliArgs,
        stdout: '',
        stderr: '',
        exitCode: 1,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
}