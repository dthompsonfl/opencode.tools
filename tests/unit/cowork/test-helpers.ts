import { ArtifactVersioning } from '../../../src/cowork/collaboration/artifact-versioning';
import { CollaborativeWorkspace } from '../../../src/cowork/collaboration/collaborative-workspace';
import { FeedbackThreads } from '../../../src/cowork/collaboration/feedback-threads';
import { EvidenceCollector } from '../../../src/cowork/evidence/collector';
import { EvidenceSigner } from '../../../src/cowork/evidence/signer';
import { EventBus } from '../../../src/cowork/orchestrator/event-bus';
import { Blackboard } from '../../../src/cowork/orchestrator/blackboard';
import { CapabilityMatcher } from '../../../src/cowork/routing/capability-matcher';
import { TaskRouter } from '../../../src/cowork/routing/task-router';
import { CollaborationProtocol } from '../../../src/cowork/team/collaboration-protocol';
import { TeamManager } from '../../../src/cowork/team/team-manager';

export function resetCoworkSingletonsForTests(): void {
  EvidenceCollector.resetForTests();
  TaskRouter.resetForTests();
  CollaborationProtocol.resetForTests();

  const eventBus = EventBus.getInstance();
  eventBus.resetForTests();

  TeamManager.getInstance().clear();
  CapabilityMatcher.getInstance().clear();

  CollaborativeWorkspace.resetForTests();
  Blackboard.resetForTests();

  ArtifactVersioning.getInstance().clear();
  FeedbackThreads.getInstance().clear();

  (EvidenceSigner as unknown as { instance?: EvidenceSigner }).instance = undefined;
}

export async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
}
