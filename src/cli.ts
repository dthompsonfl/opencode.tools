#!/usr/bin/env node

/**
 * OpenCode Tools CLI
 * 
 * Global CLI entry point for OpenCode Tools
 * Provides access to all agents and capabilities
 */

import './runtime/register-path-aliases';

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { ResearchAgent } from '../agents/research/research-agent';
import { DocumentationAgent } from '../agents/docs';
import { ArchitectureAgent } from '../agents/architecture';
import { PDFGeneratorAgent } from '../agents/pdf/pdf-agent';
import type { PDFInput } from '../agents/pdf/types';
import type { ResearchDossier } from '../agents/research/types';
import { logger } from './runtime/logger';
import { CoworkOrchestrator } from './cowork/orchestrator/cowork-orchestrator';
import { CommandRegistry } from './cowork/registries/command-registry';
import { AgentRegistry } from './cowork/registries/agent-registry';
import { loadAllPlugins, loadNativeAgents } from './cowork/plugin-loader';
import { FoundryOrchestrator, createFoundryExecutionRequest } from './foundry/orchestrator';
import { createWarmedUpBridge } from './foundry/cowork-bridge';
import type { FoundryExecutionRequest } from './foundry/contracts';

const VERSION = process.env.npm_package_version || '1.0.0';

interface CliDependencies {
  createDocumentationAgent: () => DocumentationAgent;
  createArchitectureAgent: () => ArchitectureAgent;
  createPdfAgent: () => PDFGeneratorAgent;
}

const defaultDependencies: CliDependencies = {
  createDocumentationAgent: () => new DocumentationAgent(),
  createArchitectureAgent: () => new ArchitectureAgent(),
  createPdfAgent: () => new PDFGeneratorAgent(),
};

interface DocsCommandInput {
  dossier?: unknown;
  brief?: unknown;
  clientBrief?: unknown;
}

type OrchestrationMode = 'research' | 'docs' | 'architect' | 'code' | 'full';

// Initialize plugin loader and registries
function initializeCowork(): void {
  const plugins = loadAllPlugins();
  const nativeAgents = loadNativeAgents();

  const commandRegistry = CommandRegistry.getInstance();
  const agentRegistry = AgentRegistry.getInstance();

  for (const plugin of plugins) {
    commandRegistry.registerMany(plugin.commands);
    agentRegistry.registerMany(plugin.agents);
  }

  // Register native agents from ~/.config/opencode/opencode.json
  agentRegistry.registerMany(nativeAgents);
}

export function createCliProgram(dependencies: CliDependencies = defaultDependencies): Command {
const program = new Command();

program
  .name('opencode-tools')
  .description('OpenCode Tools - Complete Developer Team Automation (Independent TUI & CLI)')
  .version(VERSION);

program
  .command('research')

  .description('Execute research agent to gather comprehensive dossier')
  .argument('<company>', 'Company name to research')
  .option('-i, --industry <industry>', 'Industry sector')
  .option('-o, --output <output>', 'Output directory', './output')
  .action(async (company, options) => {
    try {
      logger.info(`Starting research for ${company}`);
      const agent = new ResearchAgent();
      const result = await agent.execute({
        brief: {
          company,
          industry: options.industry || 'Technology',
          description: 'Research project for comprehensive analysis',
          goals: ['comprehensive research']
        }
      });
      console.log('Research completed:', result);
    } catch (error) {
      logger.error('Research failed:', error);
      process.exit(1);
    }
  });

program
  .command('docs')
  .description('Generate documentation (PRD and SOW)')
  .argument('<input>', 'Input dossier file path')
  .option('-o, --output <output>', 'Output directory', './output')
  .action(async (input, options) => {
    try {
      logger.info('Generating documentation');
      const inputPath = resolveReadableFile(input);
      const outputDir = resolveOutputDirectory(options.output);
      const payload = parseJsonFile<DocsCommandInput>(inputPath);
      const dossier = extractDossier(payload);
      const brief = extractBrief(payload);

      const agent = dependencies.createDocumentationAgent();
      const documents = await agent.generateDocuments(dossier, brief);

      ensureDirectory(outputDir);
      const prdPath = path.join(outputDir, 'PRD.md');
      const sowPath = path.join(outputDir, 'SOW.md');
      const metadataPath = path.join(outputDir, 'docs.metadata.json');
      fs.writeFileSync(prdPath, documents.prd, 'utf-8');
      fs.writeFileSync(sowPath, documents.sow, 'utf-8');
      if (documents.metadata) {
        fs.writeFileSync(metadataPath, JSON.stringify(documents.metadata, null, 2), 'utf-8');
      }

      console.log(`Documentation generated: PRD=${prdPath} SOW=${sowPath}`);
    } catch (error) {
      logger.error('Documentation generation failed:', error);
      process.exit(1);
    }
  });

program
  .command('architect')
  .description('Generate system architecture and backlog')
  .argument('<prd>', 'PRD file path')
  .option('-o, --output <output>', 'Output directory', './output')
  .action(async (prd, options) => {
    try {
      logger.info('Generating architecture');
      const prdPath = resolveReadableFile(prd);
      const outputDir = resolveOutputDirectory(options.output);
      const prdContent = fs.readFileSync(prdPath, 'utf-8');

      const agent = dependencies.createArchitectureAgent();
      const architecture = await agent.execute({ prd_content: prdContent });

      ensureDirectory(outputDir);
      const diagramPath = path.join(outputDir, 'architecture.mmd');
      const backlogPath = path.join(outputDir, 'backlog.json');
      const metadataPath = path.join(outputDir, 'architecture.metadata.json');
      fs.writeFileSync(diagramPath, architecture.architectureDiagram, 'utf-8');
      fs.writeFileSync(backlogPath, JSON.stringify(architecture.backlog, null, 2), 'utf-8');
      if (architecture.metadata) {
        fs.writeFileSync(metadataPath, JSON.stringify(architecture.metadata, null, 2), 'utf-8');
      }

      console.log(`Architecture generated: diagram=${diagramPath} backlog=${backlogPath}`);
    } catch (error) {
      logger.error('Architecture generation failed:', error);
      process.exit(1);
    }
  });

program
  .command('pdf')
  .description('Generate PDF documents')
  .argument('<config>', 'PDF configuration file')
  .option('-o, --output <output>', 'Output file', './output/document.pdf')
  .action(async (config, options) => {
    try {
      logger.info('Generating PDF');
      const configPath = resolveReadableFile(config);
      const input = parseJsonFile<PDFInput>(configPath);
      const agent = dependencies.createPdfAgent();
      const result = await agent.execute(input);

      const buffer = assertPdfBuffer(result.documentBuffer);

      const outputPath = resolvePdfOutputPath(options.output, result.documentPath);
      ensureDirectory(path.dirname(outputPath));
      fs.writeFileSync(outputPath, buffer);

      const metadataPath = outputPath.replace(/\.pdf$/i, '.metadata.json');
      fs.writeFileSync(
        metadataPath,
        JSON.stringify({ metadata: result.metadata, warnings: result.warnings, meta: result.meta }, null, 2),
        'utf-8',
      );

      console.log(`PDF generated: file=${outputPath} pages=${result.metadata.pageCount}`);
    } catch (error) {
      logger.error('PDF generation failed:', error);
      process.exit(1);
    }
  });

program
  .command('tui')
  .description('Launch interactive TUI')
  .action(async () => {
    // Import and launch TUI
    // Use dynamic import for ESM compatibility and to allow mocks in tests
    const { startTui } = await import("./tui-app");
    await startTui();
  });

program
  .command('orchestrate')
  .description('Start the main orchestration agent for self-iterative development')
  .option('-p, --project <project>', 'Project name')
  .option('-m, --mode <mode>', 'Operation mode: research|docs|architect|code|full', 'full')
  .option('--json', 'Output machine-readable JSON report (no ASCII banner)', false)
  .action(async (options) => {
    try {
      logger.info('Starting orchestration agent');
      console.log(`
╔══════════════════════════════════════════════════════════════╗
║              OpenCode Tools - Orchestration Mode             ║
╠══════════════════════════════════════════════════════════════╣
║  Acting as: Complete Apple-Level Engineering Team            ║
║  - Receptionist: Initial requirements gathering              ║
║  - Project Manager: Task coordination and planning           ║
║  - Senior Engineers: Architecture and code generation        ║
║  - QA Engineers: Testing and validation                      ║
║  - DevOps: Deployment and infrastructure                     ║
║  - CTO: Strategic oversight and final approval               ║
╚══════════════════════════════════════════════════════════════╝
      `);
      
      const intent = options.project || 'Enterprise implementation workflow';
      const mode = normalizeOrchestrationMode(options.mode);
      const foundry = new FoundryOrchestrator();
      const baseRequest = createFoundryExecutionRequest(intent, process.cwd(), true);
      const request = applyOrchestrationMode(baseRequest, mode);
      const report = await foundry.execute(request);

      if (options.json) {
        // Output machine-readable report and exit
        console.log(JSON.stringify(report, null, 2));
      } else {
        console.log('\n🧭 Foundry Report:');
        console.log(`  Status: ${report.status}`);
        console.log(`  Final phase: ${report.phase}`);
        console.log(`  Mode: ${mode}`);
        console.log(`  Tasks: ${report.tasks.filter(t => t.status === 'completed').length}/${report.tasks.length} completed`);
        console.log(`  Quality gates: ${report.gateResults.filter(g => g.passed).length}/${report.gateResults.length} passed`);
        if (report.deliverableScopeReport) {
          console.log(
            `  Deliverable scope: ${report.deliverableScopeReport.passed ? 'pass' : 'fail'} (${report.deliverableScopeReport.included.length} included, ${report.deliverableScopeReport.excluded.length} excluded)`,
          );
        }
        console.log(`  Review: ${report.review.passed ? 'approved' : 'changes requested'} by ${report.review.reviewer}`);
      }
    } catch (error) {
      logger.error('Orchestration failed:', error);
      process.exit(1);
    }
  });

// ============================================================
// MCP Server Command
// ============================================================

program
  .command('mcp')
  .description('Start the MCP server for OpenCode integration')
  .action(async () => {
    try {
      process.env.OPENCODE_MCP = '1';
      
      // Import and run the MCP server
      // The MCP server uses stdio transport for local execution
      const { main } = await import('../tools/mcp-server.js');
      
      // This will run indefinitely until killed
      await main();
    } catch (error) {
      logger.error('MCP server failed to start:', error);
      process.exit(1);
    }
  });

program
  .command('verify')
  .description('Verify Foundry/Cowork runtime wiring and health')
  .action(async () => {
    try {
      await runRuntimeVerification();
    } catch (error) {
      logger.error('Verification failed:', error);
      process.exit(1);
    }
  });

// ============================================================
// Cowork Plugin System Commands
// ============================================================

// cowork list - List commands, agents, and plugins
const coworkCmd = program
  .command('cowork')
  .description('Cowork plugin system');

coworkCmd
  .command('list')
  .description('List commands, agents, and plugins')
  .option('-c, --commands', 'List commands only')
  .option('-a, --agents', 'List agents only')
  .option('-p, --plugins', 'List plugins only')
  .action(async (options) => {
    try {
      initializeCowork();
      
      const plugins = loadAllPlugins();
      const commandRegistry = CommandRegistry.getInstance();
      const agentRegistry = AgentRegistry.getInstance();
      
      if (options.commands || (!options.agents && !options.plugins)) {
        console.log('\n📋 Commands:');
        const commands = commandRegistry.list();
        if (commands.length === 0) {
          console.log('  No commands available');
        } else {
          for (const cmd of commands) {
            console.log(`  ${cmd.name} - ${cmd.description}`);
          }
        }
      }
      
      if (options.agents || (!options.commands && !options.plugins)) {
        console.log('\n🤖 Agents:');
        const agents = agentRegistry.list();
        if (agents.length === 0) {
          console.log('  No agents available');
        } else {
          for (const agent of agents) {
            console.log(`  ${agent.name} - ${agent.description}`);
          }
        }
      }
      
      if (options.plugins || (!options.commands && !options.agents)) {
        console.log('\n📦 Plugins:');
        if (plugins.length === 0) {
          console.log('  No plugins loaded');
        } else {
          for (const plugin of plugins) {
            console.log(`  ${plugin.manifest.name} (${plugin.manifest.version}) - ${plugin.manifest.description || 'No description'}`);
            console.log(`    Commands: ${plugin.commands.length}, Agents: ${plugin.agents.length}, Skills: ${plugin.skills.length}, Hooks: ${plugin.hooks.length}`);
          }
        }
      }
      
      console.log('');
    } catch (error) {
      logger.error('Failed to list cowork items:', error);
      process.exit(1);
    }
  });

// cowork run - Run a command
coworkCmd
  .command('run <command> [args...]')
  .description('Run a cowork command')
  .action(async (command, args) => {
    try {
      initializeCowork();
      
      const orchestrator = new CoworkOrchestrator();
      const result = await orchestrator.execute(command, args);
      
      console.log('\n📊 Result:');
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      logger.error('Command execution failed:', error);
      process.exit(1);
    }
  });

// cowork agents - List available agents
coworkCmd
  .command('agents')
  .description('List available agents')
  .action(async () => {
    try {
      initializeCowork();
      
      const agentRegistry = AgentRegistry.getInstance();
      const agents = agentRegistry.list();
      
      console.log('\n🤖 Available Agents:');
      if (agents.length === 0) {
        console.log('  No agents available');
      } else {
        for (const agent of agents) {
          console.log(`\n  ${agent.name}:`);
          console.log(`    Description: ${agent.description}`);
          if (agent.tools) {
            console.log(`    Tools: ${agent.tools.join(', ')}`);
          }
          if (agent.model) {
            console.log(`    Model: ${agent.model}`);
          }
        }
      }
      console.log('');
    } catch (error) {
      logger.error('Failed to list agents:', error);
      process.exit(1);
    }
  });

// cowork plugins - List loaded plugins
coworkCmd
  .command('plugins')
  .description('List loaded plugins')
  .action(async () => {
    try {
      const plugins = loadAllPlugins();
      
      console.log('\n📦 Loaded Plugins:');
      if (plugins.length === 0) {
        console.log('  No plugins loaded');
      } else {
        for (const plugin of plugins) {
          console.log(`\n  ${plugin.manifest.name} (${plugin.manifest.version})`);
          console.log(`    ID: ${plugin.manifest.id}`);
          if (plugin.manifest.author) {
            console.log(`    Author: ${plugin.manifest.author}`);
          }
          if (plugin.manifest.description) {
            console.log(`    Description: ${plugin.manifest.description}`);
          }
          console.log(`    Commands: ${plugin.commands.length}`);
          console.log(`    Agents: ${plugin.agents.length}`);
          console.log(`    Skills: ${plugin.skills.length}`);
          console.log(`    Hooks: ${plugin.hooks.length}`);
          console.log(`    Path: ${plugin.rootPath}`);
        }
      }
      console.log('');
    } catch (error) {
      logger.error('Failed to list plugins:', error);
      process.exit(1);
    }
  });

// integrate - Manually trigger integration with OpenCode
program
  .command('integrate')
  .description('Integrate with OpenCode installation (manual)')
  .option('-f, --force', 'Force re-integration')
  .action(async (options) => {
    try {
      console.log('[INFO] Running OpenCode integration...');
      
      // Get the project root directory
      const projectRoot = path.resolve(__dirname, '..', '..');
      
      // Run the native integrate script directly
      const nativeIntegratePath = path.join(projectRoot, 'scripts', 'native-integrate.js');
      
      if (fs.existsSync(nativeIntegratePath)) {
        // Use require here because the script is a JS file intended to run in Node directly
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { integrateWithOpenCode } = require(nativeIntegratePath);
        integrateWithOpenCode(projectRoot);
        console.log('[SUCCESS] Integration complete!');
      } else {
        // If the compiled script doesn't exist, run the integration logic inline
        console.log('[INFO] Running inline integration...');
        
        const opencodeDir = path.join(os.homedir(), '.config', 'opencode');
        if (!fs.existsSync(opencodeDir)) {
          fs.mkdirSync(opencodeDir, { recursive: true });
        }
        
        const configPath = path.join(opencodeDir, 'opencode.json');
        let config: Record<string, unknown> = {};
        
        if (fs.existsSync(configPath)) {
          try {
            config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          } catch {
            // Ignore parse errors
          }
        }
        
        if (!config.mcp || typeof config.mcp !== 'object') {
          config.mcp = {};
        }
        
        (config.mcp as Record<string, unknown>)['opencode-tools'] = {
          type: 'local',
          command: ['opencode-tools', 'mcp'],
          description: 'Complete developer team automation',
          enabled: true,
          timeout: 60000,
        };
        
        if (!config.agent) {
          config.agent = 'foundry';
        }
        
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log(`[SUCCESS] Integration complete! Config written to ${configPath}`);
      }
    } catch (error) {
      logger.error('Integration failed:', error);
      process.exit(1);
    }
  });

return program;
}

function ensureDirectory(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

function resolveReadableFile(filePath: string): string {
  const resolved = path.resolve(filePath);
  const stat = fs.statSync(resolved, { throwIfNoEntry: false });
  if (!stat || !stat.isFile()) {
    throw new Error(`Input file does not exist or is not a file: ${resolved}`);
  }

  return resolved;
}

function resolveOutputDirectory(outputPath: string): string {
  return path.resolve(outputPath);
}

function resolvePdfOutputPath(requestedOutput: string, fallbackOutput: string): string {
  const requested = path.resolve(requestedOutput);
  if (requested.toLowerCase().endsWith('.pdf')) {
    return requested;
  }

  const fallbackName = path.basename(fallbackOutput) || 'document.pdf';
  return path.join(requested, fallbackName);
}

function assertPdfBuffer(buffer: Buffer): Buffer {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('PDF generation returned an empty document buffer.');
  }

  const header = buffer.subarray(0, 5).toString('utf-8');
  if (header !== '%PDF-') {
    throw new Error('Generated document is not a valid PDF payload.');
  }

  return buffer;
}

function normalizeOrchestrationMode(mode: string): OrchestrationMode {
  const normalized = mode.trim().toLowerCase();
  if (
    normalized === 'research' ||
    normalized === 'docs' ||
    normalized === 'architect' ||
    normalized === 'code' ||
    normalized === 'full'
  ) {
    return normalized;
  }

  throw new Error(`Unsupported mode: ${mode}`);
}

export function applyOrchestrationMode(
  request: FoundryExecutionRequest,
  mode: OrchestrationMode,
): FoundryExecutionRequest {
  const next: FoundryExecutionRequest = {
    ...request,
    enforceDeliverableScope: request.enforceDeliverableScope !== false,
  };

  switch (mode) {
    case 'research':
      next.maxIterations = 1;
      next.runQualityGates = false;
      break;
    case 'docs':
      next.maxIterations = 1;
      next.runQualityGates = false;
      break;
    case 'architect':
      next.maxIterations = 1;
      next.runQualityGates = true;
      break;
    case 'code':
      next.maxIterations = 2;
      next.runQualityGates = true;
      break;
    case 'full':
      next.maxIterations = 3;
      next.runQualityGates = true;
      break;
    default:
      throw new Error(`Unsupported mode: ${mode}`);
  }

  const baseDescription = request.description?.trim() || request.projectName;
  next.description = `[mode:${mode}] ${baseDescription}`;

  return next;
}

function parseJsonFile<T>(filePath: string): T {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

function extractDossier(payload: DocsCommandInput): ResearchDossier {
  const maybeDossier = (payload && typeof payload === 'object' && 'dossier' in payload)
    ? payload.dossier
    : payload;

  if (!maybeDossier || typeof maybeDossier !== 'object') {
    throw new Error('Documentation input must include a dossier object.');
  }

  return maybeDossier as ResearchDossier;
}

function extractBrief(payload: DocsCommandInput): string {
  if (typeof payload?.brief === 'string' && payload.brief.trim().length > 0) {
    return payload.brief;
  }

  if (payload?.clientBrief) {
    return JSON.stringify(payload.clientBrief, null, 2);
  }

  return 'Client brief not supplied in input payload.';
}

interface VerificationCheck {
  name: string;
  passed: boolean;
  detail: string;
}

async function runRuntimeVerification(): Promise<void> {
  const checks: VerificationCheck[] = [];

  const foundryAliasPath = resolveModulePath('@foundry/core/state-machine');
  const srcFoundryAliasPath = resolveModulePath('@src/foundry/orchestrator');
  const srcCoworkAliasPath = resolveModulePath('@src/cowork/orchestrator/cowork-orchestrator');
  const srcAliasPath = resolveModulePath('@/cowork/orchestrator/cowork-orchestrator');
  const srcPrefixAliasPath = resolveModulePath('src/runtime/logger');
  const runtimeAliasesHealthy = Boolean(
    foundryAliasPath
    && srcFoundryAliasPath
    && srcCoworkAliasPath
    && srcAliasPath
    && srcPrefixAliasPath
  );

  checks.push({
    name: 'Runtime alias bootstrap',
    passed: runtimeAliasesHealthy,
    detail: runtimeAliasesHealthy
      ? 'resolved @foundry/, @src/, @/, and src/ imports'
      : 'failed to resolve one or more configured aliases',
  });

  const originalProvider = process.env.COWORK_LLM_PROVIDER;
  const originalAllowMock = process.env.COWORK_ALLOW_MOCK_LLM;
  const shouldUseMockForVerification = !originalProvider && !process.env.OPENAI_API_KEY;
  let bridgeErrors: string[] = [];

  if (shouldUseMockForVerification) {
    process.env.COWORK_LLM_PROVIDER = 'mock';
    process.env.COWORK_ALLOW_MOCK_LLM = 'true';
  }

  try {
    const bridge = createWarmedUpBridge();
    const bridgeHealth = bridge.healthCheck();
    bridgeErrors = [...bridgeHealth.errors];
    checks.push({
      name: 'FoundryCoworkBridge health',
      passed: bridgeHealth.healthy,
      detail: `agents=${bridgeHealth.agentCount}, commands=${bridgeHealth.commandCount}, missingRoles=${bridgeHealth.missingRoles.length}`,
    });

    const collaboration = await import('./foundry/integration/collaboration-bridge');
    const collaborationBridgeExported = typeof collaboration.FoundryCollaborationBridge === 'function';
    checks.push({
      name: 'FoundryCollaborationBridge wiring',
      passed: collaborationBridgeExported,
      detail: collaborationBridgeExported ? 'module loaded' : 'module export missing',
    });

    const foundryModule = await import('./foundry/orchestrator');
    checks.push({
      name: 'FoundryOrchestrator wiring',
      passed: typeof foundryModule.FoundryOrchestrator === 'function',
      detail: 'module loaded',
    });

    if (shouldUseMockForVerification) {
      checks.push({
        name: 'LLM provider mode',
        passed: true,
        detail: 'used temporary mock provider for verification',
      });
    }
  } finally {
    if (originalProvider === undefined) {
      delete process.env.COWORK_LLM_PROVIDER;
    } else {
      process.env.COWORK_LLM_PROVIDER = originalProvider;
    }

    if (originalAllowMock === undefined) {
      delete process.env.COWORK_ALLOW_MOCK_LLM;
    } else {
      process.env.COWORK_ALLOW_MOCK_LLM = originalAllowMock;
    }
  }

  const failedChecks = checks.filter((check) => !check.passed);

  console.log('\n🔍 OpenCode Runtime Verification');
  console.log('================================');
  for (const check of checks) {
    console.log(`  ${check.passed ? '✅' : '❌'} ${check.name}: ${check.detail}`);
  }

  if (bridgeErrors.length > 0) {
    console.log('\n⚠️ Bridge diagnostics:');
    for (const error of bridgeErrors) {
      console.log(`  - ${error}`);
    }
  }

  if (failedChecks.length > 0) {
    throw new Error(`Verification failed (${failedChecks.length} check(s) did not pass).`);
  }

  console.log('\n✅ Verification completed successfully.');
}

function resolveModulePath(specifier: string): string | null {
  try {
    return require.resolve(specifier);
  } catch {
    return null;
  }
}

if (require.main === module) {
  const cli = createCliProgram();
  const argv = process.argv.length === 2
    ? [...process.argv, 'tui']
    : [...process.argv];

  if (argv.length === 3 && argv[2] === '--verify') {
    argv[2] = 'verify';
  }

  cli.parse(argv);
}
