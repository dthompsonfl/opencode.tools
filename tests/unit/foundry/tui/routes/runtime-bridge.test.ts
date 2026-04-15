import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { StateContext } from '../../../../../foundry/foundry/types/state';

let storedContext: StateContext | null = null;
const evidenceStore: Array<Record<string, unknown>> = [];

jest.mock('../../../../../foundry/foundry/runtime/context-store', () => ({
  createContextStore: () => ({
    load: async () => storedContext,
    save: async (_projectId: string, context: StateContext) => {
      storedContext = context;
    },
    getCurrentPhase: async () => storedContext?.current_phase || null,
    setCurrentPhase: async () => undefined,
    addEvidence: async (_projectId: string, item: Record<string, unknown>) => {
      const value = { id: `${evidenceStore.length + 1}`, ...item };
      evidenceStore.push(value);
      return value;
    },
    getEvidence: async () => evidenceStore,
    recordGateResult: async () => undefined,
    getLastGateResults: async () => [],
  }),
}));

describe('Foundry TUI runtime bridge', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'foundry-bridge-'));
    storedContext = null;
    evidenceStore.length = 0;
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns a snapshot with runtime-backed sections', async () => {
    const { createFoundryTuiRuntimeBridge } = await import('../../../../../foundry/foundry/tui/routes/runtime-bridge');
    const bridge = createFoundryTuiRuntimeBridge();

    const snapshot = await bridge.getSnapshot('proj-1');

    expect(snapshot.projectId).toBe('proj-1');
    expect(snapshot.currentPhase).toBe('idle');
    expect(Array.isArray(snapshot.docs)).toBe(true);
    expect(Array.isArray(snapshot.gates)).toBe(true);
    expect(Array.isArray(snapshot.evidence)).toBe(true);
  });

  it('dispatches INIT_PROJECT and RUN_GATES into persisted runtime state', async () => {
    const docFiles = [
      'docs/PRD.md',
      'docs/DESIGN_DNA.md',
      'docs/NON_FUNCTIONAL.md',
      'docs/THREAT_MODEL.md',
      'docs/ARCHITECTURE.md',
      'docs/RUNBOOK.md',
    ];
    for (const file of docFiles) {
      const absolute = path.join(tempDir, file);
      fs.mkdirSync(path.dirname(absolute), { recursive: true });
      fs.writeFileSync(absolute, '# ok', 'utf-8');
    }

    const { createFoundryTuiRuntimeBridge } = await import('../../../../../foundry/foundry/tui/routes/runtime-bridge');
    const bridge = createFoundryTuiRuntimeBridge();

    await bridge.dispatch('proj-2', 'INIT_PROJECT', {
      projectName: 'Payments Platform',
      repoPath: tempDir,
      complianceTargets: ['SOC2'],
    });

    const afterGates = await bridge.dispatch('proj-2', 'RUN_GATES');

    expect(afterGates.currentPhase).toBe('gate_evaluation');
    expect(afterGates.gates.every((gate) => gate.status === 'passed')).toBe(true);
  });

  it('approves release when readiness checks pass', async () => {
    const requiredDocs = [
      'docs/PRD.md',
      'docs/DESIGN_DNA.md',
      'docs/NON_FUNCTIONAL.md',
      'docs/THREAT_MODEL.md',
      'docs/ARCHITECTURE.md',
      'docs/RUNBOOK.md',
    ];
    for (const file of requiredDocs) {
      const absolute = path.join(tempDir, file);
      fs.mkdirSync(path.dirname(absolute), { recursive: true });
      fs.writeFileSync(absolute, '# ok', 'utf-8');
    }

    const { createFoundryTuiRuntimeBridge } = await import('../../../../../foundry/foundry/tui/routes/runtime-bridge');
    const bridge = createFoundryTuiRuntimeBridge();

    await bridge.initializeProject('proj-3', {
      projectName: 'Release Candidate',
      repoPath: tempDir,
      complianceTargets: [],
    });
    await bridge.runGates('proj-3');

    const release = await bridge.requestRelease('proj-3');
    expect(release.approved).toBe(true);
    expect(release.snapshot.currentPhase).toBe('released');
  });
});
