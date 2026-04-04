import { EventEmitter } from "events";
import type { StateMachineDefinition, StateContext, StatePhase, StateEvent } from "@/foundry/types";

export interface ParallelState {
  type: string;
  status: "active" | "paused" | "error";
  lastCheck: number;
  metrics: Record<string, unknown>;
}

export interface StateTransition {
  id: string;
  timestamp: number;
  from: StatePhase;
  to: StatePhase;
  event: StateEvent;
  actor: string;
  evidenceIds: string[];
}

export interface StateSnapshot {
  phase: StatePhase;
  parallelStates: ParallelState[];
  context: StateContext;
  timestamp: number;
}

export class StateMachineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StateMachineError";
  }
}

export class EnterpriseStateMachine extends EventEmitter {
  private currentPhase: StatePhase = "idle";
  private parallelStates: Map<string, ParallelState> = new Map();
  private history: StateTransition[] = [];
  private context: StateContext;
  private definition: StateMachineDefinition;

  constructor(config: { definition: StateMachineDefinition; context: StateContext }) {
    super();
    this.definition = config.definition;
    this.context = config.context;
    this.initializeParallelStates();
  }

  private initializeParallelStates(): void {
    const defaultParallelStates = [
      "security_monitoring",
      "compliance_monitoring",
      "observability",
    ];

    for (const stateType of defaultParallelStates) {
      this.parallelStates.set(stateType, {
        type: stateType,
        status: "active",
        lastCheck: Date.now(),
        metrics: {},
      });
    }
  }

  async dispatch(event: StateEvent, payload?: unknown): Promise<void> {
    const stateDef = this.definition.states[this.currentPhase];
    if (!stateDef) {
      throw new StateMachineError(`Invalid state: ${this.currentPhase}`);
    }

    const transition = stateDef.on[event];
    if (!transition) {
      throw new StateMachineError(
        `Invalid transition: ${event} from ${this.currentPhase}`
      );
    }

    const prevPhase = this.currentPhase;
    this.currentPhase = transition.target;

    const transitionRecord: StateTransition = {
      id: this.generateId(),
      timestamp: Date.now(),
      from: prevPhase,
      to: this.currentPhase,
      event,
      actor: "SYSTEM",
      evidenceIds: [],
    };

    this.history.push(transitionRecord);
    this.emit("transition", transitionRecord);
    this.updateParallelStates(event, payload);
  }

  getCurrentState(): StateSnapshot {
    return {
      phase: this.currentPhase,
      parallelStates: Array.from(this.parallelStates.values()),
      context: this.context,
      timestamp: Date.now(),
    };
  }

  getCurrentPhase(): StatePhase {
    return this.currentPhase;
  }

  getHistory(): StateTransition[] {
    return [...this.history];
  }

  can(event: StateEvent): boolean {
    const stateDef = this.definition.states[this.currentPhase];
    return event in (stateDef?.on || {});
  }

  getAvailableTransitions(): Array<{ event: StateEvent; target: StatePhase }> {
    const stateDef = this.definition.states[this.currentPhase];
    if (!stateDef?.on) return [];

    return Object.entries(stateDef.on).map(([event, transition]) => ({
      event: event as StateEvent,
      target: transition.target,
    }));
  }

  getParallelState(type: string): ParallelState | undefined {
    return this.parallelStates.get(type);
  }

  updateParallelState(type: string, update: Partial<ParallelState>): void {
    const state = this.parallelStates.get(type);
    if (state) {
      Object.assign(state, update, { lastCheck: Date.now() });
      this.parallelStates.set(type, state);
      this.emit("parallelStateUpdate", { type, state });
    }
  }

  private updateParallelStates(event: StateEvent, payload?: unknown): void {
    if (event.includes("SECURITY") || event.includes("GATE")) {
      this.updateParallelState("security_monitoring", {
        lastCheck: Date.now(),
        metrics: { lastEvent: event },
      });
    }

    if (event.includes("COMPLIANCE") || event.includes("APPROVE")) {
      this.updateParallelState("compliance_monitoring", {
        lastCheck: Date.now(),
        metrics: { lastEvent: event },
      });
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
