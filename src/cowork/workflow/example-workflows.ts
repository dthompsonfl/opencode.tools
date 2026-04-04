import { WorkflowDefinition, WorkflowEngine } from './workflow-engine';

export const workspaceProvisioningWorkflow: WorkflowDefinition = {
  id: 'workspace-provisioning',
  name: 'Workspace Provisioning',
  version: 1,
  triggerEvent: 'workspace:created',
  initialStepId: 'workspace-created',
  steps: [
    {
      id: 'workspace-created',
      onEvent: 'workspace:created',
      nextStepId: 'member-added',
      reducer: (state, payload, envelope) => ({
        ...state,
        workspaceCreatedEventId: envelope.eventId,
        workspaceCreatedAt: envelope.occurredAt,
        workspacePayload: payload,
      }),
    },
    {
      id: 'member-added',
      onEvent: 'workspace:member:added',
      nextStepId: 'artifact-seeded',
      reducer: (state, payload, envelope) => ({
        ...state,
        memberAddedEventId: envelope.eventId,
        memberAddedAt: envelope.occurredAt,
        memberPayload: payload,
      }),
    },
    {
      id: 'artifact-seeded',
      onEvent: 'workspace:artifact:updated',
      terminal: true,
      reducer: (state, payload, envelope) => ({
        ...state,
        seededArtifactEventId: envelope.eventId,
        seededArtifactAt: envelope.occurredAt,
        seededArtifactPayload: payload,
      }),
    },
  ],
  metadata: {
    phase: 'phase-1',
    description: 'Provision workspace and mark completion after first artifact seed.',
  },
};

export const blackboardEntryReviewPublishWorkflow: WorkflowDefinition = {
  id: 'blackboard-entry-review-publish',
  name: 'Blackboard Entry Review/Publish',
  version: 1,
  triggerEvent: 'blackboard:entry:created',
  initialStepId: 'entry-created',
  steps: [
    {
      id: 'entry-created',
      onEvent: 'blackboard:entry:created',
      nextStepId: 'feedback-added',
      reducer: (state, payload, envelope) => ({
        ...state,
        entryCreatedEventId: envelope.eventId,
        entryCreatedAt: envelope.occurredAt,
        entryPayload: payload,
      }),
    },
    {
      id: 'feedback-added',
      onEvent: 'feedback:added',
      nextStepId: 'entry-updated',
      reducer: (state, payload, envelope) => ({
        ...state,
        feedbackEventId: envelope.eventId,
        feedbackAddedAt: envelope.occurredAt,
        feedbackPayload: payload,
      }),
    },
    {
      id: 'entry-updated',
      onEvent: 'blackboard:entry:updated',
      terminal: true,
      reducer: (state, payload, envelope) => ({
        ...state,
        publishedEventId: envelope.eventId,
        publishedAt: envelope.occurredAt,
        publishedPayload: payload,
      }),
    },
  ],
  metadata: {
    phase: 'phase-1',
    description: 'Track review and publication lifecycle for blackboard entries.',
  },
};

export const phaseOneWorkflowDefinitions: WorkflowDefinition[] = [
  workspaceProvisioningWorkflow,
  blackboardEntryReviewPublishWorkflow,
];

export async function registerPhaseOneWorkflows(engine: WorkflowEngine = WorkflowEngine.getInstance()): Promise<void> {
  for (const definition of phaseOneWorkflowDefinitions) {
    await engine.registerDefinition(definition, true);
  }
}
