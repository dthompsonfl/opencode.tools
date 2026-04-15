import { AgentDefinition } from '../types';
import { PhdResearchWorkflow } from '../../workflows/phd-research-workflow';
import { ArchitectureAgent } from '../../../agents/architecture';
import { CodeGenAgent } from '../../../agents/codegen';
import { OrchestratorAgent } from '../../agents/orchestrator';
import { CoworkOrchestrator } from '../../cowork/orchestrator/cowork-orchestrator';
import { CommandRegistry } from '../../cowork/registries/command-registry';
import { logger } from '../../runtime/logger';
import { FoundryOrchestrator, createFoundryExecutionRequest } from '../../foundry/orchestrator';
import type { FoundryExecutionReport } from '../../foundry/contracts';
import * as fs from 'fs';
import * as path from 'path';

// Helper to save results (mimicking TUIResearchAgent)
const saveResearchResults = async (result: any, companyName: string) => {
    const artifactsDir = 'artifacts';
    if (!fs.existsSync(artifactsDir)) {
      try {
        fs.mkdirSync(artifactsDir, { recursive: true });
      } catch (e) {
        // Directory may already exist or permission denied, continue anyway
      }
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeCompanyName = companyName.replace(/[^a-zA-Z0-9]/g, '_');
    const baseName = `${safeCompanyName}-research-${timestamp}`;
    const basePath = path.join(artifactsDir, baseName);

    fs.writeFileSync(`${basePath}.json`, JSON.stringify(result, null, 2));
    if (result.research) {
        fs.writeFileSync(`${basePath}-dossier.json`, JSON.stringify(result.research.dossier, null, 2));
    }
    return basePath;
};

// Singleton orchestrator instance for REPL
let orchestratorInstance: CoworkOrchestrator | null = null;
let foundryInstance: FoundryOrchestrator | null = null;
let lastFoundryReport: FoundryExecutionReport | null = null;

const getOrchestrator = () => {
    if (!orchestratorInstance) {
        orchestratorInstance = new CoworkOrchestrator({
            projectDir: process.cwd(),
            maxConcurrent: 5
        });

        // Register default commands
        const registry = CommandRegistry.getInstance();
        if (!registry.has('help')) {
            registry.register({
                id: 'help',
                name: 'help',
                description: 'Show available commands',
                body: 'Help command', handler: async () => ({ success: true }),
            });
        }
        if (!registry.has('status')) {
             registry.register({
                id: 'status',
                name: 'status',
                description: 'Show orchestrator status',
                body: 'Status command', handler: async () => ({ success: true }),
            });
        }
        if (!registry.has('spawn')) {
             registry.register({
                id: 'spawn',
                name: 'spawn',
                description: 'Spawn an agent: spawn <agentId> <task>',
                body: 'Spawn command', handler: async () => ({ success: true }),
            });
        }
    }
    return orchestratorInstance;
};

const getFoundryOrchestrator = () => {
    if (!foundryInstance) {
        foundryInstance = new FoundryOrchestrator();
    }

    return foundryInstance;
};

export const AGENTS: AgentDefinition[] = [
  {
    id: 'orchestrator',
    name: 'Foundry Orchestrator',
    description: 'Enterprise multi-agent execution with peer review and quality gates',
    interactive: true,
    repl: true,
    steps: [],
    execute: async (answers, log) => {
        log('Initializing Foundry Orchestrator REPL...');
        const orch = getOrchestrator();
        getFoundryOrchestrator();
        log('Foundry orchestrator ready. You have complete control.');
        log('Type "help" for commands or enter natural language intent.');
        return { success: true };
    },
    onInput: async (input, log) => {
        const orch = getOrchestrator();
        const cmdParts = input.trim().split(' ');
        const cmdName = cmdParts[0].toLowerCase();
        const args = cmdParts.slice(1);

        log(`> ${input}`);

        if (cmdName === 'help') {
            const registry = CommandRegistry.getInstance();
            const commands = registry.list();
            log('Available Commands:');
            log(' - run <intent>: Execute foundry workflow with quality gates');
            log(' - quick <intent>: Execute foundry workflow without quality gates');
            log(' - status: Show latest foundry execution status');
            commands.forEach(c => log(` - ${c.name}: ${c.description}`));
        } else if (cmdName === 'status') {
            const transcript = orch.getTranscript();
            const activeCount = transcript.filter(t => t.type === 'spawn').length - transcript.filter(t => t.type === 'complete' || t.type === 'error').length;
            log(`Status: ${activeCount} agents active.`);
            log('Recent Activity:');
            transcript.slice(-5).forEach(t => log(`[${t.timestamp}] ${t.message}`));
            if (lastFoundryReport) {
                log(`Foundry Last Run: ${lastFoundryReport.status} in phase ${lastFoundryReport.phase}`);
                log(`Quality Gates: ${lastFoundryReport.gateResults.filter(g => g.passed).length}/${lastFoundryReport.gateResults.length} passed`);
                if (lastFoundryReport.deliverableScopeReport) {
                    log(`Deliverable Scope: ${lastFoundryReport.deliverableScopeReport.passed ? 'pass' : 'fail'} (${lastFoundryReport.deliverableScopeReport.included.length} included, ${lastFoundryReport.deliverableScopeReport.excluded.length} excluded)`);
                }
            }
        } else if (cmdName === 'run' || cmdName === 'quick') {
            const intent = args.join(' ').trim();
            if (!intent) {
                log(`Usage: ${cmdName} <intent>`);
                return;
            }

            const foundry = getFoundryOrchestrator();
            const runQualityGates = cmdName !== 'quick';
            const request = createFoundryExecutionRequest(intent, process.cwd(), runQualityGates);

            log(`Executing Foundry workflow for: "${intent}"`);
            log(`Quality gates: ${runQualityGates ? 'enabled' : 'disabled'}`);

            lastFoundryReport = await foundry.execute(request);

            log(`Workflow status: ${lastFoundryReport.status}`);
            log(`Final phase: ${lastFoundryReport.phase}`);
            log(`Tasks completed: ${lastFoundryReport.tasks.filter(t => t.status === 'completed').length}/${lastFoundryReport.tasks.length}`);
            if (runQualityGates) {
                log(`Quality gates passed: ${lastFoundryReport.gateResults.filter(g => g.passed).length}/${lastFoundryReport.gateResults.length}`);
            }
            if (lastFoundryReport.deliverableScopeReport) {
                log(`Deliverable scope: ${lastFoundryReport.deliverableScopeReport.passed ? 'pass' : 'fail'} (${lastFoundryReport.deliverableScopeReport.included.length} included, ${lastFoundryReport.deliverableScopeReport.excluded.length} excluded)`);
            }
            log(`Review: ${lastFoundryReport.review.passed ? 'approved' : 'changes requested'} by ${lastFoundryReport.review.reviewer}`);
        } else if (cmdName === 'spawn') {
            if (args.length < 2) {
                log('Usage: spawn <agentId> <task>');
                return;
            }
            const agentId = args[0];
            const task = args.slice(1).join(' ');
            try {
                log(`Spawning agent "${agentId}" for task: "${task}"...`);
                const result = await orch.spawnAgent(agentId, task);
                if (result.metadata.success) {
                    log(`✅ Agent "${agentId}" completed: ${JSON.stringify(result.output)}`);
                } else {
                    log(`❌ Agent "${agentId}" failed: ${result.metadata.error}`);
                }
            } catch (e: any) {
                log(`Error spawning agent: ${e.message}`);
            }
        } else {
             if (input.trim()) {
                 const foundry = getFoundryOrchestrator();
                 const request = createFoundryExecutionRequest(input, process.cwd(), true);
                 log(`Interpreting input as Foundry intent: "${input}"`);
                 lastFoundryReport = await foundry.execute(request);
                 log(`Workflow status: ${lastFoundryReport.status} (${lastFoundryReport.phase})`);
                 return;
             }

             const registry = CommandRegistry.getInstance();
             const command = registry.getByName(cmdName);
             if (command) {
                 log(`Executing command "${command.name}"...`);
                 await orch.execute(command.id, args);
                 log('Command completed.');
             } else {
                 log(`Unknown command: "${cmdName}". Type "help" for options.`);
             }
        }
    }
  },
  {
    id: 'research',
    name: 'PhD Research Agent',
    description: 'Automated client and industry research',
    steps: [
      { key: 'company', question: 'What is the Company Name?', type: 'text', required: true },
      { key: 'industry', question: 'What Industry is it in?', type: 'text', required: true },
      { key: 'description', question: 'Brief Description (optional):', type: 'text' },
      { key: 'goals', question: 'Goals (comma-separated):', type: 'text' },
      { key: 'constraints', question: 'Constraints (comma-separated):', type: 'text' },
      { key: 'timeline', question: 'Timeline:', type: 'text' },
      { key: 'keywords', question: 'Keywords (comma-separated):', type: 'text' },
    ],
    execute: async (answers, log) => {
      log('Initializing Research Workflow...');
      const workflow = new PhdResearchWorkflow();

      const input = {
        brief: {
          company: answers.company,
          industry: answers.industry,
          description: answers.description || `${answers.company} operates in the ${answers.industry} industry.`,
          goals: answers.goals ? answers.goals.split(',').map((s: string) => s.trim()) : ['Market research'],
          constraints: answers.constraints ? answers.constraints.split(',').map((s: string) => s.trim()) : [],
          timeline: answers.timeline || 'Not specified'
        },
        keywords: answers.keywords ? answers.keywords.split(',').map((s: string) => s.trim()) : [],
        urls: [],
        priorNotes: ''
      };

      log(`Starting research for ${input.brief.company}...`);

      const originalLog = console.log;
      const originalError = console.error;

      try {
          console.log = (...args) => {
              log(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
          };
          console.error = (...args) => {
              log(`ERROR: ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`);
          };

          const result = await workflow.execute(input);

          log('Research completed.');
          const savedPath = await saveResearchResults(result, input.brief.company);
          log(`Results saved to: ${savedPath}`);

          if (result.approved) {
              log('✅ Research approved by Council.');
          } else {
              log('⚠️ Research completed with warnings.');
          }

          return result;
      } finally {
          console.log = originalLog;
          console.error = originalError;
      }
    }
  },
  {
    id: 'architecture',
    name: 'Architecture Agent',
    description: 'System design from PRD',
    steps: [
      { key: 'prdPath', question: 'Path to PRD (markdown file):', type: 'text', required: true }
    ],
    execute: async (answers, log) => {
        log('Initializing Architecture Agent...');
        const agent = new ArchitectureAgent();

        if (!fs.existsSync(answers.prdPath)) {
            throw new Error(`File not found: ${answers.prdPath}`);
        }

        const prdContent = fs.readFileSync(answers.prdPath, 'utf-8');
        log(`Loaded PRD from ${answers.prdPath} (${prdContent.length} chars).`);

        const originalLog = console.log;
        const originalError = console.error;
        try {
            console.log = (...args) => log(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
            console.error = (...args) => log(`ERROR: ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`);

            const result = await agent.execute({ prd_content: prdContent });

            log('Architecture design completed.');

            const artifactsDir = 'artifacts/architecture';
            if (!fs.existsSync(artifactsDir)) {
                try {
                    fs.mkdirSync(artifactsDir, { recursive: true });
                } catch (e) {
                    // Directory may already exist or permission denied, continue anyway
                }
            }
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const baseName = path.basename(answers.prdPath, '.md');
            const outPath = path.join(artifactsDir, `${baseName}-architecture-${timestamp}`);

            fs.writeFileSync(`${outPath}-diagram.mmd`, result.architectureDiagram);
            fs.writeFileSync(`${outPath}-backlog.json`, JSON.stringify(result.backlog, null, 2));

            log(`Saved diagram to ${outPath}-diagram.mmd`);
            return result;
        } finally {
            console.log = originalLog;
            console.error = originalError;
        }
    }
  },
  {
    id: 'codegen',
    name: 'CodeGen Agent',
    description: 'Scaffold features',
    steps: [
      { key: 'title', question: 'Feature Title:', type: 'text', required: true },
      { key: 'techStack', question: 'Tech Stack:', type: 'text', required: true }
    ],
    execute: async (answers, log) => {
        log('Initializing CodeGen Agent...');
        const agent = new CodeGenAgent();

        const originalLog = console.log;
        const originalError = console.error;
        try {
            console.log = (...args) => log(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
            console.error = (...args) => log(`ERROR: ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`);

            const result = await agent.execute({
                id: 'TUI-RUN',
                title: answers.title,
                description: 'Generated via OpenCode TUI',
                techStack: answers.techStack
            });

            log('Scaffolding completed.');
            log(`Files created: ${result.filesCreated.join(', ')}`);
            return result;
        } finally {
             console.log = originalLog;
             console.error = originalError;
        }
    }
  }
];
