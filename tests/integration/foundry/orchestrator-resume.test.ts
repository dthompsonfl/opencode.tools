import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { FoundryOrchestrator } from '../../../src/foundry/orchestrator';
import { FoundryCoworkBridge } from '../../../src/foundry/cowork-bridge';
import { resetDatabaseForTests } from '../../../src/storage/db';

describe('foundry orchestrator resume', () => {
  let dbPath: string;

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `orchestrator-resume-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
    process.env.FOUNDRY_DB_FORCE_JSON = '1';
    process.env.FOUNDRY_DB_PATH = dbPath;
    resetDatabaseForTests();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    resetDatabaseForTests();
    delete process.env.FOUNDRY_DB_FORCE_JSON;
    delete process.env.FOUNDRY_DB_PATH;
    if (fs.existsSync(dbPath)) {
      fs.rmSync(dbPath, { force: true });
    }
  });

  it('skips completed task signatures on rerun', async () => {
    jest.spyOn(FoundryCoworkBridge.prototype, 'initialize').mockImplementation(() => undefined);
    const dispatchSpy = jest
      .spyOn(FoundryCoworkBridge.prototype, 'dispatchRoleTask')
      .mockResolvedValue({ metadata: { success: true }, output: 'ok', agentId: 'mock' } as never);

    const request = {
      projectId: 'resume-project-a',
      projectName: 'Resume Project',
      repoRoot: process.cwd(),
      maxIterations: 1,
      runQualityGates: false,
    };

    const orchestratorA = new FoundryOrchestrator();
    const firstReport = await orchestratorA.execute(request);
    expect(dispatchSpy).toHaveBeenCalled();

    const initialCalls = dispatchSpy.mock.calls.length;
    dispatchSpy.mockClear();

    const orchestratorB = new FoundryOrchestrator();
    const secondReport = await orchestratorB.execute(request);

    expect(initialCalls).toBeGreaterThan(0);
    expect(dispatchSpy).toHaveBeenCalledTimes(0);
    expect(secondReport.tasks).toHaveLength(firstReport.tasks.length);
    expect(secondReport.messages.length).toBeGreaterThanOrEqual(firstReport.messages.length);
    expect(secondReport.messages.length - firstReport.messages.length).toBeLessThanOrEqual(2);
  });

  it('resumes from explicit resume key even with different project id', async () => {
    jest.spyOn(FoundryCoworkBridge.prototype, 'initialize').mockImplementation(() => undefined);
    const dispatchSpy = jest
      .spyOn(FoundryCoworkBridge.prototype, 'dispatchRoleTask')
      .mockResolvedValue({ metadata: { success: true }, output: 'ok', agentId: 'mock' } as never);

    const orchestratorA = new FoundryOrchestrator();
    await orchestratorA.execute({
      projectId: 'resume-project-b-1',
      resumeKey: 'shared-resume-key',
      projectName: 'Resume Project',
      repoRoot: process.cwd(),
      maxIterations: 1,
      runQualityGates: false,
    });

    dispatchSpy.mockClear();

    const orchestratorB = new FoundryOrchestrator();
    await orchestratorB.execute({
      projectId: 'resume-project-b-2',
      resumeKey: 'shared-resume-key',
      projectName: 'Resume Project',
      repoRoot: process.cwd(),
      maxIterations: 1,
      runQualityGates: false,
    });

    expect(dispatchSpy).toHaveBeenCalledTimes(0);
  });
});
