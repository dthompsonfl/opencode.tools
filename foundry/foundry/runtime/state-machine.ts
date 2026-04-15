import type {
  StatePhase,
  StateEvent,
  StateTransition,
  StateDefinition,
  StateMachineDefinition,
} from "@/foundry/types/state"
import { Log } from "@/util/log"

interface StateMachineOptions {
  definition: StateMachineDefinition
  context: unknown
  onTransition?: (from: StatePhase, to: StatePhase, event: StateEvent) => void
  onAction?: (action: string, context: unknown) => void
}

interface StateMachine {
  currentState: StatePhase
  context: unknown
  dispatch: (event: StateEvent, payload?: unknown) => Promise<void>
  can: (event: StateEvent) => boolean
  getAvailableTransitions: () => StateEvent[]
}

export function createStateMachine(options: StateMachineOptions): StateMachine {
  const { definition, context, onTransition, onAction } = options
  let currentState = definition.initial_state

  const executeActions = async (actions: string[] | undefined) => {
    if (!actions) return
    for (const action of actions) {
      Log.Default.debug("state_machine:action", { action })
      onAction?.(action, context)
    }
  }

  const transition = async (event: StateEvent, payload?: unknown) => {
    const stateDef = definition.states[currentState]
    if (!stateDef) {
      throw new Error(`Invalid state: ${currentState}`)
    }

    const transition = stateDef.on[event]
    if (!transition) {
      throw new Error(`Invalid transition: ${event} from ${currentState}`)
    }

    const prevState = currentState
    currentState = transition.target

    Log.Default.info("state_machine:transition", {
      from: prevState,
      to: currentState,
      event,
      payload,
    })

    await executeActions(transition.actions)
    onTransition?.(prevState, currentState, event)
  }

  return {
    get currentState() {
      return currentState
    },
    get context() {
      return context
    },
    dispatch: transition,
    can: (event: StateEvent) => {
      const stateDef = definition.states[currentState]
      return event in (stateDef?.on ?? {})
    },
    getAvailableTransitions: () => {
      const stateDef = definition.states[currentState]
      return Object.keys(stateDef?.on ?? {}) as StateEvent[]
    },
  }
}

export function loadStateMachine(yamlContent: string): StateMachineDefinition {
  // YAML parsing will be done by caller using yaml library
  // This function provides a type-safe wrapper
  return JSON.parse(yamlContent) as StateMachineDefinition
}
