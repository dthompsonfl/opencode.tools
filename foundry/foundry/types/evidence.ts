export type EvidenceType =
  | "file"
  | "ci_job"
  | "test_report"
  | "vuln_report"
  | "audit_report"
  | "config_ref"
  | "doc_ref"
  | "screenshot"

export interface Evidence {
  id: string
  project_id: string
  phase: string
  gate: string | null
  task_id: string | null
  type: EvidenceType
  name: string
  description: string | null
  file_path: string | null
  file_hash: string | null
  ci_run_id: string | null
  ci_url: string | null
  content_json: string | null
  content_summary: string | null
  created_at: number
  created_by: string | null
  signature: string | null
}

export interface EvidenceTag {
  evidence_id: string
  tag: string
}

export interface GateEvaluation {
  id: string
  project_id: string
  phase: string
  gate: string
  result: "passed" | "failed" | "error"
  evaluated_at: number
  evidence_ids: string[]
}

export interface GateCheck {
  id: string
  status: "passed" | "failed" | "error" | "missing"
  evidenceId?: string
  message: string
  details?: unknown
}

export interface GateResult {
  gate: string
  phase: string
  status: "passed" | "failed" | "error"
  timestamp: number
  checks: GateCheck[]
  evidenceIds: string[]
}

export interface Gate {
  id: string
  description: string
  required: boolean
  checks: {
    id: string
    evidenceType: EvidenceType
    mustMatch?: string[]
    validator?: string
    params?: Record<string, unknown>
  }[]
}
