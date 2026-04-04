/**
 * Foundry MCP Tools
 * 
 * Exposes Foundry orchestration capabilities via MCP protocol.
 */

import { FoundryOrchestrator, createFoundryExecutionRequest } from '../src/foundry/orchestrator';
import { createWarmedUpBridge } from '../src/foundry/cowork-bridge';
import type { FoundryExecutionRequest, FoundryExecutionReport } from '../src/foundry/contracts';

export interface FoundryOrchestrateInput {
  projectName: string;
  description?: string;
  repoRoot: string;
  maxIterations?: number;
  runQualityGates?: boolean;
  enforceDeliverableScope?: boolean;
  industry?: string;
  company?: string;
}

export interface FoundryStatusInput {
  projectId?: string;
}

export interface FoundryHealthInput {}

/**
 * Execute a Foundry orchestration workflow
 */
export async function foundryOrchestrate(input: FoundryOrchestrateInput): Promise<{
  success: boolean;
  report?: FoundryExecutionReport;
  error?: string;
}> {
  try {
    const orchestrator = new FoundryOrchestrator();
    
    const request: FoundryExecutionRequest = {
      projectId: `project-${Date.now()}`,
      projectName: input.projectName,
      description: input.description || input.projectName,
      repoRoot: input.repoRoot || process.cwd(),
      maxIterations: input.maxIterations ?? 2,
      runQualityGates: input.runQualityGates ?? true,
      enforceDeliverableScope: input.enforceDeliverableScope ?? true,
      industry: input.industry,
      company: input.company,
    };

    const report = await orchestrator.execute(request);

    return {
      success: report.status === 'completed',
      report,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get Foundry status and health
 */
export async function foundryStatus(input: FoundryStatusInput): Promise<{
  success: boolean;
  bridge?: {
    healthy: boolean;
    agentCount: number;
    commandCount: number;
    pluginCount: number;
    availableRoles: string[];
    missingRoles: string[];
  };
  error?: string;
}> {
  try {
    const bridge = createWarmedUpBridge();
    const health = bridge.healthCheck();

    return {
      success: true,
      bridge: {
        healthy: health.healthy,
        agentCount: health.agentCount,
        commandCount: health.commandCount,
        pluginCount: health.pluginCount,
        availableRoles: health.availableRoles,
        missingRoles: health.missingRoles,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check Foundry health
 */
export async function foundryHealth(_input: FoundryHealthInput): Promise<{
  healthy: boolean;
  components: {
    bridge: boolean;
    eventBus: boolean;
    blackboard: boolean;
    plugins: boolean;
  };
  errors: string[];
}> {
  const errors: string[] = [];
  const components = {
    bridge: false,
    eventBus: false,
    blackboard: false,
    plugins: false,
  };

  try {
    const bridge = createWarmedUpBridge();
    const health = bridge.healthCheck();

    components.bridge = health.healthy;
    components.eventBus = !health.errors.some(e => e.includes('EventBus'));
    components.blackboard = !health.errors.some(e => e.includes('Blackboard'));
    components.plugins = health.pluginCount > 0;

    errors.push(...health.errors);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  const healthy = Object.values(components).every(Boolean);

  return {
    healthy,
    components,
    errors,
  };
}

/**
 * Create a Foundry execution request
 */
export async function foundryCreateRequest(
  intent: string,
  repoRoot: string,
  runQualityGates: boolean = true
): Promise<FoundryExecutionRequest> {
  return createFoundryExecutionRequest(intent, repoRoot, runQualityGates);
}
