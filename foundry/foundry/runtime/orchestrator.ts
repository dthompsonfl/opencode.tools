import { createStateMachine } from "@/foundry/runtime/state-machine"
import { createContextStore } from "@/foundry/runtime/context-store"
import { createIntentInterpreter } from "@/foundry/intent/interpreter"
import type { StateMachineDefinition, StateContext, StatePhase, StateEvent, Intent } from "@/foundry/types"
import { Log } from "@/util/log"

interface OrchestratorOptions {
  projectId: string
  stateMachineDef: StateMachineDefinition
  onTransition?: (from: StatePhase, to: StatePhase, event: StateEvent) => void
  onIntent?: (intent: Intent) => void
}

interface Orchestrator {
  currentPhase: StatePhase
  dispatch: (event: StateEvent, payload?: unknown) => Promise<void>
  interpret: (input: string) => Promise<Intent | null>
  getContext: () => Promise<StateContext | null>
}

export function createOrchestrator(options: OrchestratorOptions): Orchestrator {
  const { projectId, stateMachineDef, onTransition, onIntent } = options

  const contextStore = createContextStore()
  const interpreter = createIntentInterpreter({
    schema: {},
    contract: {},
  })

  let stateMachine = createStateMachine({
    definition: stateMachineDef,
    context: {},
    onTransition: (from, to, event) => {
      Log.Default.info("orchestrator:transition", { from, to, event, projectId })
      onTransition?.(from, to, event)
    },
  })

  const init = async () => {
    const ctx = await contextStore.load(projectId)
    if (ctx) {
      // Restore state machine from persisted context
      Log.Default.info("orchestrator:restore", { projectId, phase: ctx.current_phase })
    }
  }

  const dispatch = async (event: StateEvent, payload?: unknown) => {
    Log.Default.info("orchestrator:dispatch", { event, payload, projectId })
    await stateMachine.dispatch(event, payload)

    // Persist context after each transition
    const ctx = (await contextStore.load(projectId)) ?? createDefaultContext(projectId)
    ctx.current_phase = stateMachine.currentState
    await contextStore.save(projectId, ctx)
  }

  const interpret = async (input: string): Promise<Intent | null> => {
    const ctx = await contextStore.load(projectId)
    const result = await interpreter.interpret(input, ctx)

    if (result.intent) {
      onIntent?.(result.intent)

      // Convert intent to state machine event
      const event = intentToEvent(result.intent)
      if (event) {
        await dispatch(event, result.intent.params)
      }
    }

    return result.intent
  }

  const getContext = () => contextStore.load(projectId)

  // Initialize on creation
  init().catch((e) => Log.Default.error("orchestrator:init", { error: e }))

  return {
    get currentPhase() {
      return stateMachine.currentState
    },
    dispatch,
    interpret,
    getContext,
  }
}

function intentToEvent(intent: Intent): StateEvent | null {
  const actionMap: Record<string, StateEvent> = {
    INIT_PROJECT: "INIT_PROJECT",
    RUN_GATES: "RUN_GATES",
    APPROVE_PHASE: "APPROVE_PHASE",
    ADD_TASK: "ADD_TASK",
    COMPLETE_TASK: "COMPLETE_TASK",
    PAUSE: "PAUSE",
    RESUME: "RESUME",
    ABORT: "ABORT",
  }
  return actionMap[intent.action] ?? null
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
