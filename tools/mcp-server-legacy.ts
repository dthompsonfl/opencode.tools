import { foundryOrchestrate } from './foundry';

export interface CtoSweepInput {
  request: string; // short intent or request body
  repoRoot?: string;
  maxIterations?: number;
  runQualityGates?: boolean;
}

/**
 * Gateway MCP tool to run a CTO sweep end-to-end
 */
export async function cto_sweep(input: CtoSweepInput): Promise<unknown> {
  const repo = input.repoRoot || process.cwd();
  const report = await foundryOrchestrate({
    projectName: input.request.slice(0, 80),
    description: input.request,
    repoRoot: repo,
    maxIterations: input.maxIterations,
    runQualityGates: input.runQualityGates,
  });

  return report;
}