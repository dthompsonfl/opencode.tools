import type { StateContext, StatePhase } from "@/foundry/types/state"
import type { Evidence, GateResult } from "@/foundry/types/evidence"
import { Database } from "@/storage/db"
import { Log } from "@/util/log"

interface ContextStore {
  load: (projectId: string) => Promise<StateContext | null>
  save: (projectId: string, context: StateContext) => Promise<void>
  getCurrentPhase: (projectId: string) => Promise<StatePhase | null>
  setCurrentPhase: (projectId: string, phase: StatePhase) => Promise<void>
  addEvidence: (projectId: string, evidenceItem: Omit<Evidence, "id">) => Promise<Evidence>
  getEvidence: (projectId: string, options?: { phase?: string; gate?: string }) => Promise<Evidence[]>
  recordGateResult: (projectId: string, result: GateResult) => Promise<void>
  getLastGateResults: (projectId: string, phase: string) => Promise<GateResult[]>
}

const CONTEXT_TABLE = "foundry_context"
let generatedIdCounter = 0

export function createContextStore(): ContextStore {
  const db = Database.Client()

  const load = async (projectId: string): Promise<StateContext | null> => {
    try {
      const result = await db.$client.execute({
        sql: `SELECT context FROM ${CONTEXT_TABLE} WHERE project_id = ?`,
        args: [projectId],
      })
      if (result.rows.length === 0) return null
      const row = result.rows[0] as Record<string, unknown>
      return JSON.parse(row.context as string) as StateContext
    } catch (e) {
      Log.Default.error("context_store:load", { error: e, projectId })
      return null
    }
  }

  const save = async (projectId: string, context: StateContext): Promise<void> => {
    try {
      await db.$client.execute({
        sql: `
          INSERT INTO ${CONTEXT_TABLE} (project_id, context, updated_at)
          VALUES (?, ?, ?)
          ON CONFLICT (project_id) DO UPDATE SET
            context = excluded.context,
            updated_at = excluded.updated_at
        `,
        args: [projectId, JSON.stringify(context), Date.now()],
      })
      Log.Default.debug("context_store:save", { projectId, phase: context.current_phase })
    } catch (e) {
      Log.Default.error("context_store:save", { error: e, projectId })
      throw e
    }
  }

  const getCurrentPhase = async (projectId: string): Promise<StatePhase | null> => {
    const ctx = await load(projectId)
    return ctx?.current_phase ?? null
  }

  const setCurrentPhase = async (projectId: string, phase: StatePhase): Promise<void> => {
    const ctx = (await load(projectId)) ?? createDefaultContext(projectId)
    ctx.current_phase = phase
    await save(projectId, ctx)
  }

  const addEvidence = async (
    projectId: string,
    evidenceItem: Omit<Evidence, "id">
  ): Promise<Evidence> => {
    const evidence: Evidence = {
      ...evidenceItem,
      id: generateId(),
    }
    await db.insert("evidence", evidence as unknown as Record<string, unknown>)
    Log.Default.debug("context_store:add_evidence", { projectId, evidenceId: evidence.id })
    return evidence
  }

  const getEvidence = async (
    projectId: string,
    options?: { phase?: string; gate?: string }
  ): Promise<Evidence[]> => {
    const where: Record<string, unknown> = { project_id: projectId }
    if (options?.phase) {
      where.phase = options.phase
    }
    if (options?.gate) {
      where.gate = options.gate
    }

    const records = await db.query.evidence.findMany({
      where,
      orderBy: { created_at: "desc" },
    })

    Log.Default.debug("context_store:get_evidence", { projectId, options })
    return records as Evidence[]
  }

  const recordGateResult = async (projectId: string, result: GateResult): Promise<void> => {
    await db.insert("gate_evaluation", {
      id: generateId(),
      project_id: projectId,
      phase: result.phase,
      gate: result.gate,
      result: result.status,
      evaluated_at: result.timestamp,
      evidence_ids: JSON.stringify(result.evidenceIds),
    })

    Log.Default.info("context_store:gate_result", {
      projectId,
      gate: result.gate,
      status: result.status,
    })
  }

  const getLastGateResults = async (projectId: string, phase: string): Promise<GateResult[]> => {
    const records = await db.query.gateEvaluation.findMany({
      where: { project_id: projectId, phase },
      orderBy: { evaluated_at: "desc" },
    })

    Log.Default.debug("context_store:get_gate_results", { projectId, phase })
    return (records as Record<string, unknown>[]).map((record) => ({
      gate: String(record.gate ?? ""),
      phase: String(record.phase ?? phase),
      status: (record.result ?? "error") as GateResult["status"],
      timestamp: Number(record.evaluated_at ?? 0),
      checks: [],
      evidenceIds: parseEvidenceIds(record.evidence_ids),
    }))
  }

  return {
    load,
    save,
    getCurrentPhase,
    setCurrentPhase,
    addEvidence,
    getEvidence,
    recordGateResult,
    getLastGateResults,
  }
}

function createDefaultContext(projectId: string): StateContext {
  return {
    project: {
      name: null,
      repo_root: ".",
      stakeholders: [],
      environments: ["dev", "staging", "prod"],
      compliance_targets: [],
      risk_tolerance: "medium",
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
      ADR_DIR: "docs/adr",
    },
    backlog: { items: [] },
    current_phase: "idle",
    current_feature_id: null,
    iteration: {
      phase_iteration: 0,
      remediation_iteration: 0,
    },
    evidence: { items: [] },
    last_gate_results: {},
  }
}

function generateId(): string {
  generatedIdCounter += 1
  return `${Date.now()}-${generatedIdCounter}`
}

function parseEvidenceIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item))
  }

  if (typeof value !== "string" || value.length === 0) {
    return []
  }

  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : []
  } catch {
    return []
  }
}
