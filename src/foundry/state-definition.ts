import type {
  StateDefinition,
  StateMachineDefinition,
  StatePhase,
  StateEvent,
} from '@foundry/types';

function createState(
  description: string,
  on: Partial<Record<StateEvent, { target: StatePhase }>> = {},
  terminal = false,
): StateDefinition {
  return {
    description,
    on,
    terminal,
  };
}

export function createFoundryStateMachineDefinition(): StateMachineDefinition {
  return {
    version: '2.0.0',
    id: 'foundry-enterprise-workflow',
    title: 'Aegis Foundry Enterprise Workflow',
    initial_state: 'idle',
    states: {
      idle: createState('Ready for project initialization', {
        INIT_PROJECT: { target: 'phase_0_discovery' },
        ABORT: { target: 'aborted' },
      }),

      phase_0_discovery: createState('Discovery and intake', {
        START_PHASE: { target: 'phase_1_architecture' },
        PAUSE: { target: 'paused' },
        ABORT: { target: 'aborted' },
      }),

      phase_1_architecture: createState('Architecture definition', {
        START_PHASE: { target: 'phase_2_security_foundation' },
        PAUSE: { target: 'paused' },
        ABORT: { target: 'aborted' },
      }),

      phase_2_security_foundation: createState('Security baseline and scanning', {
        START_FEATURE_LOOP: { target: 'phase_3_feature_loop' },
        RUN_GATES: { target: 'gate_evaluation' },
        PAUSE: { target: 'paused' },
        ABORT: { target: 'aborted' },
      }),

      phase_3_feature_loop: createState('Feature implementation loop', {
        START_FEATURE_LOOP: { target: 'feature_planning' },
        COMPLETE_FEATURE: { target: 'phase_4_hardening' },
        RUN_GATES: { target: 'gate_evaluation' },
        PAUSE: { target: 'paused' },
        ABORT: { target: 'aborted' },
      }),

      phase_4_hardening: createState('Quality hardening and validation', {
        START_PROMPT_ENGINEERING: { target: 'phase_4a_prompt_engineering' },
        RUN_GATES: { target: 'gate_evaluation' },
        PAUSE: { target: 'paused' },
        ABORT: { target: 'aborted' },
      }),

      // New: Prompt Engineering phase for clean, production-ready code
      phase_4a_prompt_engineering: createState('Prompt engineering and code cleanup', {
        COMPLETE_PROMPT_ENGINEERING: { target: 'phase_5_release_readiness' },
        REQUEST_CHANGES: { target: 'feature_implementation' },
        RUN_GATES: { target: 'gate_evaluation' },
        PAUSE: { target: 'paused' },
        ABORT: { target: 'aborted' },
      }),

      phase_5_release_readiness: createState('Release readiness checks', {
        REQUEST_RELEASE: { target: 'cto_review' },
        RUN_GATES: { target: 'gate_evaluation' },
        PAUSE: { target: 'paused' },
        ABORT: { target: 'aborted' },
      }),

      feature_planning: createState('Feature planning and decomposition', {
        ASSIGN_TASK: { target: 'feature_implementation' },
        PAUSE: { target: 'paused' },
        ABORT: { target: 'aborted' },
      }),

      feature_implementation: createState('Feature implementation', {
        COMPLETE_TASK: { target: 'feature_review' },
        REQUEST_REVIEW: { target: 'feature_review' },
        PAUSE: { target: 'paused' },
        ABORT: { target: 'aborted' },
      }),

      feature_review: createState('Peer review and remediation', {
        APPROVE_PHASE: { target: 'feature_done' },
        REJECT_RELEASE: { target: 'feature_implementation' },
        PAUSE: { target: 'paused' },
        ABORT: { target: 'aborted' },
      }),

      feature_done: createState('Feature complete', {
        COMPLETE_FEATURE: { target: 'phase_3_feature_loop' },
        APPROVE_PHASE: { target: 'phase_4_hardening' },
        PAUSE: { target: 'paused' },
        ABORT: { target: 'aborted' },
      }),

      gate_evaluation: createState('Quality gate evaluation', {
        GATES_PASSED: { target: 'phase_4_hardening' },
        GATES_FAILED: { target: 'remediation' },
        ABORT: { target: 'aborted' },
      }),

      remediation: createState('Remediation planning', {
        START_REMEDIATION: { target: 'remediation_work' },
        COMPLETE_REMEDIATION: { target: 'gate_evaluation' },
        ABORT: { target: 'aborted' },
      }),

      remediation_work: createState('Remediation in progress', {
        COMPLETE_REMEDIATION: { target: 'gate_evaluation' },
        ABORT: { target: 'aborted' },
      }),

      // New: CTO Review - the final approval authority
      cto_review: createState('CTO final review and approval', {
        CTO_APPROVE: { target: 'released' },
        CTO_REJECT: { target: 'cto_rejection_loop' },
        REQUEST_CHANGES: { target: 'remediation' },
        ABORT: { target: 'aborted' },
      }),

      // New: CTO rejection loop - back to implementation with feedback
      cto_rejection_loop: createState('CTO requested changes - back to implementation', {
        RESUME_IMPLEMENTATION: { target: 'feature_implementation' },
        ESCALATE: { target: 'escalation' },
        ABORT: { target: 'aborted' },
      }),

      // New: Escalation for blocked situations
      escalation: createState('Escalation and resolution', {
        RESOLVE: { target: 'feature_implementation' },
        ABORT: { target: 'aborted' },
      }),

      release_review: createState('Final release review', {
        APPROVE_RELEASE: { target: 'cto_review' },
        REJECT_RELEASE: { target: 'remediation' },
        ABORT: { target: 'aborted' },
      }),

      paused: createState('Execution paused', {
        RESUME: { target: 'return_to_caller' },
        ABORT: { target: 'aborted' },
      }),

      return_to_caller: createState('Return to orchestration flow', {
        START_PHASE: { target: 'phase_3_feature_loop' },
        RUN_GATES: { target: 'gate_evaluation' },
        ABORT: { target: 'aborted' },
      }),

      released: createState('Workflow released', {}, true),
      aborted: createState('Workflow aborted', {}, true),
    },
  };
}
