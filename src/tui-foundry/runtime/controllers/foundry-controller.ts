import { FoundryOrchestrator } from '../../../foundry/orchestrator';
import type { FoundryExecutionReport, FoundryExecutionRequest } from '../../../foundry/contracts';

export class FoundryController {
  private readonly orchestrator = new FoundryOrchestrator();
  private readonly runAbortControllers = new Map<string, AbortController>();
  private readonly pausedRuns = new Set<string>();
  private readonly reports = new Map<string, FoundryExecutionReport>();

  public async startExecution(request: FoundryExecutionRequest): Promise<FoundryExecutionReport> {
    const runId = `${request.projectId}:${request.resumeKey ?? 'new'}`;
    this.runAbortControllers.set(runId, new AbortController());
    const report = await this.orchestrator.execute(request);
    this.reports.set(runId, report);
    return report;
  }

  public async resumeExecution(projectId: string, resumeKey: string, baseRequest: Omit<FoundryExecutionRequest, 'projectId' | 'resumeKey'>): Promise<FoundryExecutionReport> {
    return this.startExecution({
      ...baseRequest,
      projectId,
      resumeKey,
    });
  }

  public pauseExecution(runId: string): boolean {
    this.pausedRuns.add(runId);
    return true;
  }

  public abortExecution(runId: string): boolean {
    const controller = this.runAbortControllers.get(runId);
    if (!controller) return false;
    controller.abort();
    this.runAbortControllers.delete(runId);
    this.pausedRuns.delete(runId);
    return true;
  }

  public async runQualityGates(request: FoundryExecutionRequest): Promise<FoundryExecutionReport> {
    return this.startExecution({ ...request, runQualityGates: true });
  }

  public async requestReleaseReview(request: FoundryExecutionRequest): Promise<FoundryExecutionReport> {
    return this.startExecution({ ...request, runQualityGates: true, maxIterations: 1 });
  }

  public getSnapshot(runId: string): FoundryExecutionReport | null {
    return this.reports.get(runId) ?? null;
  }
}
