import * as fs from 'fs';
import * as path from 'path';
import { createContextStore } from '../../runtime/context-store';
import type { StateContext, StateEvent, StatePhase } from '../../types/state';
import type { Evidence } from '../../types/evidence';

export interface FoundryDocStatus {
  name: string;
  path: string;
  exists: boolean;
  required: boolean;
}

export interface FoundryBacklogItem {
  id: string;
  title: string;
  role: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
}

export interface FoundryGateStatus {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'pending' | 'not_run';
  checks: { name: string; status: 'passed' | 'failed' | 'pending' }[];
}

export interface FoundryReleaseReadiness {
  allGatesPassed: boolean;
  noHighRiskItems: boolean;
  runbookComplete: boolean;
  securitySignoff: boolean;
  qaSignoff: boolean;
}

export interface FoundryTuiSnapshot {
  projectId: string;
  currentPhase: StatePhase;
  docs: FoundryDocStatus[];
  backlog: FoundryBacklogItem[];
  gates: FoundryGateStatus[];
  evidence: Evidence[];
  releaseReadiness: FoundryReleaseReadiness;
}

export interface FoundryProjectSetupInput {
  projectName: string;
  repoPath: string;
  complianceTargets: string[];
}

export interface FoundryTuiRuntimeBridge {
  getSnapshot(projectId: string): Promise<FoundryTuiSnapshot>;
  dispatch(projectId: string, event: StateEvent, payload?: unknown): Promise<FoundryTuiSnapshot>;
  initializeProject(projectId: string, payload: FoundryProjectSetupInput): Promise<FoundryTuiSnapshot>;
  runGates(projectId: string): Promise<FoundryTuiSnapshot>;
  requestRelease(projectId: string): Promise<{ approved: boolean; snapshot: FoundryTuiSnapshot }>;
}

const REQUIRED_DOCS = [
  { name: 'PRD', path: 'docs/PRD.md', required: true },
  { name: 'DESIGN_DNA', path: 'docs/DESIGN_DNA.md', required: true },
  { name: 'NON_FUNCTIONAL', path: 'docs/NON_FUNCTIONAL.md', required: true },
  { name: 'THREAT_MODEL', path: 'docs/THREAT_MODEL.md', required: true },
  { name: 'ARCHITECTURE', path: 'docs/ARCHITECTURE.md', required: true },
  { name: 'TEST_PLAN', path: 'docs/TEST_PLAN.md', required: false },
  { name: 'RUNBOOK', path: 'docs/RUNBOOK.md', required: true },
];

export function createFoundryTuiRuntimeBridge(): FoundryTuiRuntimeBridge {
  const contextStore = createContextStore();

  const getSnapshot = async (projectId: string): Promise<FoundryTuiSnapshot> => {
    const context = (await contextStore.load(projectId)) || createDefaultContext();
    const docs = getDocs(context);
    const backlog = getBacklogItems(context);
    const gates = getGates(context, docs, backlog);
    const evidence = await contextStore.getEvidence(projectId);
    const releaseReadiness = getReleaseReadiness(gates, docs, backlog);

    return {
      projectId,
      currentPhase: context.current_phase,
      docs,
      backlog,
      gates,
      evidence,
      releaseReadiness,
    };
  };

  const initializeProject = async (
    projectId: string,
    payload: FoundryProjectSetupInput,
  ): Promise<FoundryTuiSnapshot> => {
    const context = (await contextStore.load(projectId)) || createDefaultContext();
    context.project.name = payload.projectName;
    context.project.repo_root = payload.repoPath || '.';
    context.project.compliance_targets = payload.complianceTargets;
    context.current_phase = 'phase_0_discovery';
    await contextStore.save(projectId, context);
    return getSnapshot(projectId);
  };

  const runGates = async (projectId: string): Promise<FoundryTuiSnapshot> => {
    const context = (await contextStore.load(projectId)) || createDefaultContext();
    const docs = getDocs(context);
    const backlog = getBacklogItems(context);
    const securityPassed = docs.find((doc) => doc.name === 'THREAT_MODEL')?.exists === true;
    const qualityPassed = backlog.every((item) => item.status === 'done');
    const reliabilityPassed = docs.filter((doc) => doc.required).every((doc) => doc.exists);

    context.last_gate_results = {
      security: securityPassed ? 'passed' : 'failed',
      quality: qualityPassed ? 'passed' : 'failed',
      reliability: reliabilityPassed ? 'passed' : 'failed',
    };
    context.current_phase = 'gate_evaluation';
    await contextStore.save(projectId, context);

    return getSnapshot(projectId);
  };

  const requestRelease = async (projectId: string): Promise<{ approved: boolean; snapshot: FoundryTuiSnapshot }> => {
    const snapshot = await getSnapshot(projectId);
    const approved =
      snapshot.releaseReadiness.allGatesPassed &&
      snapshot.releaseReadiness.noHighRiskItems &&
      snapshot.releaseReadiness.runbookComplete &&
      snapshot.releaseReadiness.securitySignoff &&
      snapshot.releaseReadiness.qaSignoff;

    if (approved) {
      const context = (await contextStore.load(projectId)) || createDefaultContext();
      context.current_phase = 'released';
      await contextStore.save(projectId, context);
      return { approved, snapshot: await getSnapshot(projectId) };
    }

    return { approved, snapshot };
  };

  const dispatch = async (projectId: string, event: StateEvent, payload?: unknown): Promise<FoundryTuiSnapshot> => {
    if (event === 'INIT_PROJECT') {
      const value = parseSetupInput(payload);
      return initializeProject(projectId, value);
    }

    if (event === 'RUN_GATES') {
      return runGates(projectId);
    }

    if (event === 'REQUEST_RELEASE') {
      const result = await requestRelease(projectId);
      return result.snapshot;
    }

    const context = (await contextStore.load(projectId)) || createDefaultContext();
    context.current_phase = mapEventToPhase(event, context.current_phase);
    await contextStore.save(projectId, context);
    return getSnapshot(projectId);
  };

  return {
    getSnapshot,
    dispatch,
    initializeProject,
    runGates,
    requestRelease,
  };
}

function getDocs(context: StateContext): FoundryDocStatus[] {
  const repoRoot = context.project.repo_root || '.';
  return REQUIRED_DOCS.map((doc) => {
    const absolutePath = path.resolve(repoRoot, doc.path);
    return {
      ...doc,
      exists: fs.existsSync(absolutePath),
    };
  });
}

function getBacklogItems(context: StateContext): FoundryBacklogItem[] {
  const backlogItems = Array.isArray(context.backlog.items) ? context.backlog.items : [];
  if (backlogItems.length === 0) {
    return [];
  }

  return backlogItems
    .filter((item) => item && typeof item === 'object')
    .map((item, index) => {
      const value = item as Record<string, unknown>;
      return {
        id: typeof value.id === 'string' ? value.id : `${index + 1}`,
        title: typeof value.title === 'string' ? value.title : `Task ${index + 1}`,
        role: typeof value.role === 'string' ? value.role : 'UNASSIGNED',
        status: parseStatus(value.status),
        priority: parsePriority(value.priority),
      };
    });
}

function getGates(
  context: StateContext,
  docs: FoundryDocStatus[],
  backlog: FoundryBacklogItem[],
): FoundryGateStatus[] {
  const gateMap = asGateMap(context.last_gate_results);
  return [
    {
      id: 'security',
      name: 'Security Gate',
      status: gateMap.security || (docs.some((doc) => doc.name === 'THREAT_MODEL' && doc.exists) ? 'pending' : 'not_run'),
      checks: [
        { name: 'Threat model exists', status: docs.some((doc) => doc.name === 'THREAT_MODEL' && doc.exists) ? 'passed' : 'failed' },
        { name: 'Security baseline documented', status: docs.some((doc) => doc.name === 'NON_FUNCTIONAL' && doc.exists) ? 'passed' : 'pending' },
      ],
    },
    {
      id: 'quality',
      name: 'Quality Gate',
      status: gateMap.quality || (backlog.length > 0 ? 'pending' : 'not_run'),
      checks: [
        { name: 'Backlog tasks complete', status: backlog.length > 0 && backlog.every((item) => item.status === 'done') ? 'passed' : 'pending' },
        { name: 'Architecture doc available', status: docs.some((doc) => doc.name === 'ARCHITECTURE' && doc.exists) ? 'passed' : 'failed' },
      ],
    },
    {
      id: 'reliability',
      name: 'Reliability Gate',
      status: gateMap.reliability || 'not_run',
      checks: [
        { name: 'Runbook available', status: docs.some((doc) => doc.name === 'RUNBOOK' && doc.exists) ? 'passed' : 'failed' },
      ],
    },
  ];
}

function getReleaseReadiness(
  gates: FoundryGateStatus[],
  docs: FoundryDocStatus[],
  backlog: FoundryBacklogItem[],
): FoundryReleaseReadiness {
  const allGatesPassed = gates.every((gate) => gate.status === 'passed');
  const noHighRiskItems = !backlog.some((item) => item.priority === 'high' && item.status !== 'done');
  const runbookComplete = docs.some((doc) => doc.name === 'RUNBOOK' && doc.exists);
  const securitySignoff = gates.find((gate) => gate.id === 'security')?.status === 'passed';
  const qaSignoff = gates.find((gate) => gate.id === 'quality')?.status === 'passed';

  return {
    allGatesPassed,
    noHighRiskItems,
    runbookComplete,
    securitySignoff,
    qaSignoff,
  };
}

function parseSetupInput(value: unknown): FoundryProjectSetupInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { projectName: 'Untitled Project', repoPath: '.', complianceTargets: [] };
  }

  const payload = value as Record<string, unknown>;
  return {
    projectName: typeof payload.projectName === 'string' ? payload.projectName : 'Untitled Project',
    repoPath: typeof payload.repoPath === 'string' ? payload.repoPath : '.',
    complianceTargets: Array.isArray(payload.complianceTargets)
      ? payload.complianceTargets.filter((item): item is string => typeof item === 'string')
      : [],
  };
}

function createDefaultContext(): StateContext {
  return {
    project: {
      name: null,
      repo_root: '.',
      stakeholders: [],
      environments: ['dev', 'staging', 'prod'],
      compliance_targets: [],
      risk_tolerance: 'medium',
    },
    artifacts: {
      PRD: null,
      DESIGN_DNA: null,
      NON_FUNCTIONAL: null,
      FEATURE_LIST: null,
      INTEGRATIONS: null,
      DATA_MODEL: null,
      THREAT_MODEL: null,
      ARCHITECTURE: null,
      TEST_PLAN: null,
      RUNBOOK: null,
      ADR_DIR: 'docs/adr',
    },
    backlog: { items: [] },
    current_phase: 'idle',
    current_feature_id: null,
    iteration: {
      phase_iteration: 0,
      remediation_iteration: 0,
    },
    evidence: { items: [] },
    last_gate_results: {},
  };
}

function parseStatus(value: unknown): FoundryBacklogItem['status'] {
  if (value === 'todo' || value === 'in_progress' || value === 'done') {
    return value;
  }

  return 'todo';
}

function parsePriority(value: unknown): FoundryBacklogItem['priority'] {
  if (value === 'low' || value === 'medium' || value === 'high') {
    return value;
  }

  return 'medium';
}

function asGateMap(value: unknown): Record<string, FoundryGateStatus['status']> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>);
  const map: Record<string, FoundryGateStatus['status']> = {};
  for (const [key, status] of entries) {
    if (status === 'passed' || status === 'failed' || status === 'pending' || status === 'not_run') {
      map[key] = status;
    }
  }

  return map;
}

function mapEventToPhase(event: StateEvent, current: StatePhase): StatePhase {
  switch (event) {
    case 'START_PHASE':
      return 'phase_1_architecture';
    case 'START_FEATURE_LOOP':
      return 'phase_3_feature_loop';
    case 'START_REMEDIATION':
      return 'remediation';
    case 'COMPLETE_REMEDIATION':
      return 'phase_4_hardening';
    case 'APPROVE_RELEASE':
      return 'released';
    case 'REJECT_RELEASE':
      return 'release_review';
    case 'ABORT':
      return 'aborted';
    default:
      return current;
  }
}
