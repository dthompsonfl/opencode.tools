/**
 * Collaborative Workspace Module
 * 
 * Provides project-scoped workspaces, artifact versioning, feedback threads,
 * conflict resolution, and compliance package generation.
 */

export { ArtifactVersioning } from './artifact-versioning';
export type {
  ArtifactVersion,
  VersionDiff,
  VersionLineage
} from './artifact-versioning';

export { FeedbackThreads } from './feedback-threads';
export type {
  FeedbackSeverity,
  FeedbackStatus,
  FeedbackComment,
  FeedbackThread,
  ThreadFilter
} from './feedback-threads';

export { CollaborativeWorkspace } from './collaborative-workspace';
export type {
  WorkspaceStatus,
  ConflictResolutionStrategy,
  ProjectWorkspace,
  Conflict,
  CompliancePackage,
  WorkspaceMetrics
} from './collaborative-workspace';
