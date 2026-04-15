export type StatePhase =
  | "idle"
  | "phase_0_discovery"
  | "phase_1_architecture"
  | "phase_2_security_foundation"
  | "phase_3_feature_loop"
  | "phase_4_hardening"
  | "phase_4a_prompt_engineering"
  | "phase_5_release_readiness"
  | "feature_planning"
  | "feature_implementation"
  | "feature_review"
  | "feature_done"
  | "gate_evaluation"
  | "remediation"
  | "remediation_work"
  | "cto_review"
  | "cto_rejection_loop"
  | "escalation"
  | "release_review"
  | "paused"
  | "return_to_caller"
  | "released"
  | "aborted"

export type StateEvent =
  | "INIT_PROJECT"
  | "LOAD_CONTEXT"
  | "SET_ARTIFACT_PATH"
  | "ADD_TASK"
  | "ASSIGN_TASK"
  | "START_PHASE"
  | "COMPLETE_TASK"
  | "REQUEST_REVIEW"
  | "RUN_GATES"
  | "GATES_PASSED"
  | "GATES_FAILED"
  | "START_REMEDIATION"
  | "COMPLETE_REMEDIATION"
  | "START_FEATURE_LOOP"
  | "COMPLETE_FEATURE"
  | "APPROVE_PHASE"
  | "REQUEST_RELEASE"
  | "APPROVE_RELEASE"
  | "REJECT_RELEASE"
  | "CTO_APPROVE"
  | "CTO_REJECT"
  | "RESUME_IMPLEMENTATION"
  | "ESCALATE"
  | "RESOLVE"
  | "REQUEST_CHANGES"
  | "START_PROMPT_ENGINEERING"
  | "COMPLETE_PROMPT_ENGINEERING"
  | "PAUSE"
  | "RESUME"
  | "ABORT"

export interface StateTransition {
  target: StatePhase
  actions?: string[]
}

export interface StateDefinition {
  description: string
  entry_actions?: string[]
  exit_criteria?: string[]
  on: Partial<Record<StateEvent, StateTransition>>
  terminal?: boolean
}

export interface StateMachineDefinition {
  version: string
  id: string
  title: string
  initial_state: StatePhase
  states: Record<StatePhase, StateDefinition>
}

export interface StateContext {
  project: {
    name: string | null
    repo_root: string
    stakeholders: string[]
    environments: string[]
    compliance_targets: string[]
    risk_tolerance: "low" | "medium" | "high"
  }
  artifacts: Record<string, string | null>
  backlog: {
    items: unknown[]
  }
  current_phase: StatePhase
  current_feature_id: string | null
  iteration: {
    phase_iteration: number
    remediation_iteration: number
  }
  evidence: {
    items: unknown[]
  }
  last_gate_results: Record<string, unknown>
}
