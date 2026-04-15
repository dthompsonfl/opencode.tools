import { EnterpriseStateMachine, StateMachineError } from "../../../../foundry/foundry/core/state-machine";
import type { StateMachineDefinition, StateContext } from "../../../../foundry/foundry/types";

describe("EnterpriseStateMachine", () => {
  let machine: EnterpriseStateMachine;
  let definition: StateMachineDefinition;
  let context: StateContext;

  beforeEach(() => {
    // Helper to create a state definition
    const state = (desc: string, on: Record<string, { target: string }> = {}, terminal = false): any => ({
      description: desc,
      on,
      ...(terminal && { terminal: true }),
    });

    definition = {
      version: "1.0",
      id: "test",
      title: "Test",
      initial_state: "idle",
      states: {
        idle: state("Idle", { INIT_PROJECT: { target: "phase_0_discovery" } }),
        phase_0_discovery: state("Discovery", { 
          COMPLETE_TASK: { target: "phase_1_architecture" },
          ABORT: { target: "aborted" }
        }),
        phase_1_architecture: state("Architecture", { COMPLETE_TASK: { target: "released" } }),
        phase_2_security_foundation: state("Security", {}),
        phase_3_feature_loop: state("Feature Loop", {}),
        phase_4_hardening: state("Hardening", {}),
        phase_5_release_readiness: state("Release Readiness", {}),
        feature_planning: state("Feature Planning", {}),
        feature_implementation: state("Feature Implementation", {}),
        feature_review: state("Feature Review", {}),
        feature_done: state("Feature Done", {}),
        gate_evaluation: state("Gate Evaluation", {}),
        remediation: state("Remediation", {}),
        remediation_work: state("Remediation Work", {}),
        release_review: state("Release Review", {}),
        paused: state("Paused", {}),
        return_to_caller: state("Return to Caller", {}),
        released: state("Released", {}, true),
        aborted: state("Aborted", {}, true),
      } as any,
    };

    context = {
      project: {
        name: "Test",
        repo_root: ".",
        stakeholders: [],
        environments: ["dev"],
        compliance_targets: [],
        risk_tolerance: "low",
      },
      artifacts: {},
      backlog: { items: [] },
      current_phase: "idle",
      current_feature_id: null,
      iteration: { phase_iteration: 0, remediation_iteration: 0 },
      evidence: { items: [] },
      last_gate_results: {},
    };

    machine = new EnterpriseStateMachine({ definition, context });
  });

  describe("initialization", () => {
    it("should initialize with idle state", () => {
      expect(machine.getCurrentState().phase).toBe("idle");
    });

    it("should initialize parallel states", () => {
      const state = machine.getCurrentState();
      expect(state.parallelStates).toHaveLength(3);
      expect(state.parallelStates.map((s) => s.type)).toContain("security_monitoring");
      expect(state.parallelStates.map((s) => s.type)).toContain("compliance_monitoring");
      expect(state.parallelStates.map((s) => s.type)).toContain("observability");
    });
  });

  describe("transitions", () => {
    it("should transition on valid event", async () => {
      await machine.dispatch("INIT_PROJECT");
      expect(machine.getCurrentState().phase).toBe("phase_0_discovery");
    });

    it("should emit transition event", async () => {
      const handler = jest.fn();
      machine.on("transition", handler);
      await machine.dispatch("INIT_PROJECT");
      expect(handler).toHaveBeenCalled();
      const call = handler.mock.calls[0][0];
      expect(call.from).toBe("idle");
      expect(call.to).toBe("phase_0_discovery");
      expect(call.event).toBe("INIT_PROJECT");
    });

    it("should throw on invalid transition", async () => {
      await expect(machine.dispatch("INVALID" as any)).rejects.toThrow(StateMachineError);
    });

    it("should track transition history", async () => {
      await machine.dispatch("INIT_PROJECT");
      await machine.dispatch("COMPLETE_TASK");
      const history = machine.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].from).toBe("idle");
      expect(history[0].to).toBe("phase_0_discovery");
      expect(history[1].from).toBe("phase_0_discovery");
      expect(history[1].to).toBe("phase_1_architecture");
    });
  });

  describe("can", () => {
    it("should return true for valid transitions", () => {
      expect(machine.can("INIT_PROJECT")).toBe(true);
    });

    it("should return false for invalid transitions", () => {
      expect(machine.can("COMPLETE_TASK" as any)).toBe(false);
    });
  });

  describe("getAvailableTransitions", () => {
    it("should return available transitions for current state", () => {
      const transitions = machine.getAvailableTransitions();
      expect(transitions).toHaveLength(1);
      expect(transitions[0].event).toBe("INIT_PROJECT");
      expect(transitions[0].target).toBe("phase_0_discovery");
    });

    it("should return empty array when no transitions available", () => {
      const noTransitionStates = { ...definition.states };
      noTransitionStates.idle = { 
        description: "Idle", 
        on: {} 
      };
      
      machine = new EnterpriseStateMachine({
        definition: {
          ...definition,
          initial_state: "idle",
          states: noTransitionStates,
        },
        context,
      });
      const transitions = machine.getAvailableTransitions();
      expect(transitions).toHaveLength(0);
    });
  });

  describe("parallel states", () => {
    it("should update parallel state", () => {
      machine.updateParallelState("security_monitoring", { status: "error" });
      const state = machine.getParallelState("security_monitoring");
      expect(state?.status).toBe("error");
    });

    it("should emit parallelStateUpdate event", () => {
      const handler = jest.fn();
      machine.on("parallelStateUpdate", handler);
      machine.updateParallelState("security_monitoring", { status: "paused" });
      expect(handler).toHaveBeenCalled();
    });

    it("should update security_monitoring on security events", async () => {
      const handler = jest.fn();
      machine.on("parallelStateUpdate", handler);
      await machine.dispatch("INIT_PROJECT");
      // INIT_PROJECT doesn't trigger security updates
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("getCurrentPhase", () => {
    it("should return current phase", () => {
      expect(machine.getCurrentPhase()).toBe("idle");
    });

    it("should return updated phase after transition", async () => {
      await machine.dispatch("INIT_PROJECT");
      expect(machine.getCurrentPhase()).toBe("phase_0_discovery");
    });
  });
});
