import { EventEmitter } from 'events';
import type { StateContext, StateEvent, StateMachineDefinition, StatePhase } from './types';

export interface ParallelState {
  type: string;
  status: 'active' | 'paused' | 'error';
  lastCheck: number;
  metrics: Record<string, unknown>;
}

export interface StateTransitionRecord {
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
  public constructor(message: string) {
    super(message);
    this.name = 'StateMachineError';
  }
}

interface EnterpriseStateMachineConfig {
  definition: StateMachineDefinition;
  context: StateContext;
}

export class EnterpriseStateMachine extends EventEmitter {
  private currentPhase: StatePhase;

  private readonly parallelStates: Map<string, ParallelState> = new Map();

  private readonly history: StateTransitionRecord[] = [];

  private readonly context: StateContext;

  private readonly definition: StateMachineDefinition;

  public constructor(config: EnterpriseStateMachineConfig) {
    super();
    this.definition = config.definition;
    this.context = config.context;
    this.currentPhase = config.definition.initial_state;
    this.ensureDefinitionShape();
    this.initializeParallelStates();
  }

  public async dispatch(event: StateEvent, payload?: unknown): Promise<void> {
    const stateDef = this.definition.states[this.currentPhase];
    if (!stateDef) {
      throw new StateMachineError(`Invalid state: ${this.currentPhase}`);
    }

    const transition = stateDef.on[event];
    if (!transition) {
      throw new StateMachineError(`Invalid transition: ${event} from ${this.currentPhase}`);
    }

    if (!this.definition.states[transition.target]) {
      throw new StateMachineError(`Transition target does not exist: ${transition.target}`);
    }

    const previousPhase = this.currentPhase;
    this.currentPhase = transition.target;

    const transitionRecord: StateTransitionRecord = {
      id: this.generateTransitionId(),
      timestamp: Date.now(),
      from: previousPhase,
      to: this.currentPhase,
      event,
      actor: this.resolveActor(payload),
      evidenceIds: this.resolveEvidenceIds(payload),
    };

    this.history.push(transitionRecord);
    this.emit('transition', transitionRecord);
    this.updateParallelStates(event, payload);
  }

  public can(event: StateEvent): boolean {
    const stateDef = this.definition.states[this.currentPhase];
    return Boolean(stateDef?.on?.[event]);
  }

  public getCurrentPhase(): StatePhase {
    return this.currentPhase;
  }

  public getCurrentState(): StateSnapshot {
    return {
      phase: this.currentPhase,
      parallelStates: Array.from(this.parallelStates.values()),
      context: this.context,
      timestamp: Date.now(),
    };
  }

  public getHistory(): StateTransitionRecord[] {
    return [...this.history];
  }

  public getAvailableTransitions(): Array<{ event: StateEvent; target: StatePhase }> {
    const stateDef = this.definition.states[this.currentPhase];
    if (!stateDef?.on) {
      return [];
    }

    return Object.entries(stateDef.on).map(([event, transition]) => ({
      event: event as StateEvent,
      target: transition.target,
    }));
  }

  public getParallelState(type: string): ParallelState | undefined {
    return this.parallelStates.get(type);
  }

  public updateParallelState(type: string, update: Partial<ParallelState>): void {
    const state = this.parallelStates.get(type);
    if (!state) {
      return;
    }

    const nextState: ParallelState = {
      ...state,
      ...update,
      lastCheck: Date.now(),
      metrics: {
        ...state.metrics,
        ...(update.metrics ?? {}),
      },
    };
    this.parallelStates.set(type, nextState);
    this.emit('parallelStateUpdate', { type, state: nextState });
  }

  private ensureDefinitionShape(): void {
    if (!this.definition?.states || !this.definition.states[this.currentPhase]) {
      throw new StateMachineError(`Initial state is not defined: ${this.currentPhase}`);
    }
  }

  private initializeParallelStates(): void {
    const defaultParallelStateTypes = ['security_monitoring', 'compliance_monitoring', 'observability'];

    for (const stateType of defaultParallelStateTypes) {
      this.parallelStates.set(stateType, {
        type: stateType,
        status: 'active',
        lastCheck: Date.now(),
        metrics: {},
      });
    }
  }

  private updateParallelStates(event: StateEvent, payload?: unknown): void {
    if (event.includes('SECURITY') || event.includes('GATE')) {
      this.updateParallelState('security_monitoring', {
        metrics: {
          lastEvent: event,
          lastPayloadType: payload === null ? 'null' : typeof payload,
        },
      });
    }

    if (event.includes('COMPLIANCE') || event.includes('APPROVE')) {
      this.updateParallelState('compliance_monitoring', {
        metrics: {
          lastEvent: event,
          lastPayloadType: payload === null ? 'null' : typeof payload,
        },
      });
    }
  }

  private resolveActor(payload?: unknown): string {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return 'SYSTEM';
    }

    const actor = (payload as Record<string, unknown>).actor;
    return typeof actor === 'string' && actor.trim().length > 0 ? actor : 'SYSTEM';
  }

  private resolveEvidenceIds(payload?: unknown): string[] {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return [];
    }

    const ids = (payload as Record<string, unknown>).evidenceIds;
    if (!Array.isArray(ids)) {
      return [];
    }

    return ids.filter((id): id is string => typeof id === 'string');
  }

  private generateTransitionId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
}
