import { CoworkAdapter } from '../../cowork/adapter';
import type { Conflict, ProjectWorkspace } from '../../../cowork/collaboration/collaborative-workspace';
import type { CollaborationResponse } from '../../../cowork/team/collaboration-protocol';
import type { AgentResult } from '../../../cowork/orchestrator/result-merger';
import type { WorkspaceSnapshotRecord } from '../../../cowork/persistence';

export class CoworkController {
  constructor(private readonly adapter: CoworkAdapter) {}

  public listWorkspaces(): ProjectWorkspace[] {
    return this.adapter.listWorkspaces();
  }

  public setActiveWorkspace(workspaceId: string): void {
    this.adapter.setActiveWorkspace(workspaceId);
  }

  public createWorkspace(projectId: string, name: string, members: string[]): ProjectWorkspace {
    return this.adapter.createWorkspace(projectId, name, members[0] ?? 'cto', members);
  }

  public createCheckpoint(workspaceId: string, createdBy: string): Promise<WorkspaceSnapshotRecord | null> {
    return this.adapter.createCheckpoint(workspaceId, createdBy);
  }

  public listCheckpoints(workspaceId: string): Promise<WorkspaceSnapshotRecord[]> {
    return this.adapter.listCheckpoints(workspaceId);
  }

  public getConflicts(workspaceId: string): Conflict[] {
    return this.adapter.getWorkspaceConflicts(workspaceId);
  }

  public resolveConflict(conflictId: string, resolution: Parameters<CoworkAdapter['resolveConflict']>[1]): boolean {
    return this.adapter.resolveConflict(conflictId, resolution);
  }

  public spawnAgent(agentId: string, task: string, workspaceId: string): Promise<AgentResult> {
    return this.adapter.spawnAgent(agentId, task, {}, workspaceId);
  }

  public requestReview(fromAgentId: string, toAgentId: string, artifactKey: string): Promise<CollaborationResponse> {
    return this.adapter.requestCollaboration(
      fromAgentId,
      toAgentId,
      `Please review artifact ${artifactKey}`,
      'high',
    );
  }
}
