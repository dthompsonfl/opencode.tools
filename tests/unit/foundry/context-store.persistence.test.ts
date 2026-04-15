import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { StateContext } from '../../../foundry/foundry/types/state';
import { createContextStore } from '../../../foundry/foundry/runtime/context-store';
import { resetDatabaseForTests } from '../../../src/storage/db';

describe('context store persistence', () => {
  let dbPath: string;

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `context-store-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
    process.env.FOUNDRY_DB_FORCE_JSON = '1';
    process.env.FOUNDRY_DB_PATH = dbPath;
    resetDatabaseForTests();
  });

  afterEach(() => {
    resetDatabaseForTests();
    delete process.env.FOUNDRY_DB_FORCE_JSON;
    delete process.env.FOUNDRY_DB_PATH;
    if (fs.existsSync(dbPath)) {
      fs.rmSync(dbPath, { force: true });
    }
  });

  it('round-trips context and persists evidence and gate results', async () => {
    const projectId = 'proj-ctx-1';
    const store = createContextStore();

    const context: StateContext = {
      project: {
        name: 'test',
        repo_root: '.',
        stakeholders: [],
        environments: ['dev'],
        compliance_targets: [],
        risk_tolerance: 'medium',
      },
      artifacts: { PRD: 'docs/prd.md' },
      backlog: { items: [] },
      current_phase: 'phase_1_architecture',
      current_feature_id: null,
      iteration: { phase_iteration: 1, remediation_iteration: 0 },
      evidence: { items: [] },
      last_gate_results: {},
    };

    await store.save(projectId, context);
    const loaded = await store.load(projectId);
    expect(loaded).toEqual(context);

    await store.setCurrentPhase(projectId, 'phase_2_security_foundation');
    const phase = await store.getCurrentPhase(projectId);
    expect(phase).toBe('phase_2_security_foundation');

    const persistedEvidence = await store.addEvidence(projectId, {
      project_id: projectId,
      phase: 'phase_2_security_foundation',
      gate: 'security',
      task_id: null,
      type: 'file',
      name: 'security-baseline',
      description: null,
      file_path: null,
      file_hash: null,
      ci_run_id: null,
      ci_url: null,
      content_json: null,
      content_summary: null,
      created_at: 100,
      created_by: 'agent',
      signature: null,
    });
    expect(persistedEvidence.id).toBeTruthy();

    const evidence = await store.getEvidence(projectId, { phase: 'phase_2_security_foundation', gate: 'security' });
    expect(evidence).toHaveLength(1);
    expect(evidence[0].id).toBe(persistedEvidence.id);

    await store.recordGateResult(projectId, {
      gate: 'security',
      phase: 'phase_2_security_foundation',
      status: 'failed',
      timestamp: 110,
      checks: [],
      evidenceIds: [persistedEvidence.id],
    });
    await store.recordGateResult(projectId, {
      gate: 'security',
      phase: 'phase_2_security_foundation',
      status: 'passed',
      timestamp: 120,
      checks: [],
      evidenceIds: [persistedEvidence.id],
    });

    const gateResults = await store.getLastGateResults(projectId, 'phase_2_security_foundation');
    expect(gateResults).toHaveLength(2);
    expect(gateResults[0].timestamp).toBe(120);
    expect(gateResults[0].evidenceIds).toEqual([persistedEvidence.id]);
  });
});
