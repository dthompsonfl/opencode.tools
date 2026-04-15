import { CoworkOrchestrator } from '../cowork/orchestrator/cowork-orchestrator';
import { ProjectInitSchema } from '../schemas/project-init';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../runtime/logger';
import { execFileSync } from 'child_process';

export class ProjectDeliveryWorkflow {
    private orchestrator: CoworkOrchestrator;
    private projectDir: string;

    constructor(projectDir: string) {
        this.projectDir = projectDir;
        this.orchestrator = new CoworkOrchestrator({ projectDir });
    }

    public async run(projectInitPath: string) {
        logger.info('🚀 Starting Project Delivery Workflow...');

        // 1. Validation
        if (!fs.existsSync(projectInitPath)) {
            throw new Error(`Project init file not found: ${projectInitPath}`);
        }

        const initContent = fs.readFileSync(projectInitPath, 'utf8');
        let projectInit;
        try {
            const yaml = require('js-yaml');
            const data = yaml.load(initContent);
            projectInit = ProjectInitSchema.parse(data);
        } catch (e: any) {
            throw new Error(`Invalid project-init schema: ${e.message}`);
        }

        logger.info(`Project: ${projectInit.brief.title}`);

        // 2. Discovery Phase
        logger.info('🔍 Phase 1: Discovery');
        await this.orchestrator.spawnAgent('research', 'Analyze project brief and extract requirements and risks', { brief: projectInit.brief });

        // 3. IA + UX Phase
        logger.info('🧠 Phase 2: IA + UX');
        await this.orchestrator.spawnAgent('architect', 'Create sitemap and user flows', { brief: projectInit.brief });

        // 4. Creative Direction
        logger.info('🎨 Phase 3: Creative Direction');
        // Assuming creative agent exists or using architect/research
        await this.orchestrator.spawnAgent('research', 'Define style bible and motion language', { brand: projectInit.brand });

        // 5. Architecture
        logger.info('🏗️ Phase 4: Architecture');
        await this.orchestrator.spawnAgent('architect', 'Define stack and folder structure', { tech: projectInit.tech });

        // 6. Implementation Loop
        logger.info('💻 Phase 5: Implementation & QA Loop');
        let gatesPassed = false;
        let iterations = 0;
        const maxIterations = 5;

        while (!gatesPassed && iterations < maxIterations) {
            iterations++;
            logger.info(`Iteration ${iterations}/${maxIterations}`);

            // Implementation
            await this.orchestrator.spawnAgent('codegen', 'Implement features based on architecture', { features: projectInit.brief.features });

            // QA Gates
            const buildPassed = await this.runGate('build', ['run', 'build']);
            const lintPassed = await this.runGate('lint', ['run', 'lint']);
            const testPassed = await this.runGate('unit', ['test']);

            // Bespoke Gate (Simulation)
            const bespokePassed = true; // implement bespoke check logic here

            if (buildPassed && lintPassed && testPassed && bespokePassed) {
                gatesPassed = true;
                logger.info('✅ All gates passed!');
            } else {
                logger.warn('⚠️ Gates failed. Triggering fix cycle.');
                await this.orchestrator.spawnAgent('codegen', 'Fix build/lint/test errors', {
                    errors: { build: !buildPassed, lint: !lintPassed, test: !testPassed }
                });
            }
        }

        if (!gatesPassed) {
            throw new Error('Project delivery failed to pass gates within max iterations.');
        }

        // 7. Release
        logger.info('📦 Phase 6: Release');
        await this.orchestrator.spawnAgent('codegen', 'Prepare release bundle', { version: '1.0.0' });

        logger.info('🎉 Project Delivery Complete!');
    }

    private async runGate(name: string, args: string[]): Promise<boolean> {
        logger.info(`Running Gate: ${name} (npm ${args.join(' ')})`);
        try {
            // Use execFileSync to avoid shell injection vulnerabilities
            // Ensure npm is in PATH
            execFileSync('npm', args, { stdio: 'ignore', cwd: this.projectDir });
            logger.info(`Gate ${name} Passed`);
            return true;
        } catch (e) {
            logger.warn(`Gate ${name} Failed`);
            return false;
        }
    }
}
