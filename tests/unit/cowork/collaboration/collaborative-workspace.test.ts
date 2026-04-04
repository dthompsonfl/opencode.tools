/**
 * Collaborative Workspace Tests
 */

import { CollaborativeWorkspace, ProjectWorkspace, WorkspaceStatus } from '../../../../src/cowork/collaboration/collaborative-workspace';
import { ArtifactVersioning } from '../../../../src/cowork/collaboration/artifact-versioning';
import { FeedbackThreads } from '../../../../src/cowork/collaboration/feedback-threads';
import { EventBus } from '../../../../src/cowork/orchestrator/event-bus';

describe('CollaborativeWorkspace', () => {
  let workspace: CollaborativeWorkspace;
  let versioning: ArtifactVersioning;
  let feedback: FeedbackThreads;
  let eventBus: EventBus;

  beforeEach(() => {
    CollaborativeWorkspace.resetForTests();
    workspace = CollaborativeWorkspace.getInstance();
    versioning = ArtifactVersioning.getInstance();
    feedback = FeedbackThreads.getInstance();
    eventBus = EventBus.getInstance();
    
    // Clear all state
    versioning.clear();
    feedback.clear();
    eventBus.resetForTests();
    jest.clearAllMocks();
  });

  afterEach(() => {
    CollaborativeWorkspace.resetForTests();
  });

  describe('createWorkspace', () => {
    it('should create a new project workspace', () => {
      const ws = workspace.createWorkspace('project-1', 'Main Workspace', 'admin');

      expect(ws).toBeDefined();
      expect(ws.projectId).toBe('project-1');
      expect(ws.name).toBe('Main Workspace');
      expect(ws.status).toBe('active');
      expect(ws.createdBy).toBe('admin');
      expect(ws.members).toContain('admin');
    });

    it('should support optional description and metadata', () => {
      const ws = workspace.createWorkspace('project-1', 'Main', 'admin', {
        description: 'Primary workspace for development',
        metadata: { priority: 'high', team: 'platform' },
        initialMembers: ['admin', 'dev-1', 'dev-2']
      });

      expect(ws.description).toBe('Primary workspace for development');
      expect(ws.metadata).toEqual({ priority: 'high', team: 'platform' });
      expect(ws.members).toHaveLength(3);
    });

    it('should emit workspace:created event', () => {
      const publishSpy = jest.spyOn(eventBus, 'publish');

      workspace.createWorkspace('project-1', 'Main', 'admin');

      expect(publishSpy).toHaveBeenCalledWith(
        'workspace:created',
        expect.objectContaining({ projectId: 'project-1', name: 'Main' }),
        expect.objectContaining({ aggregateType: 'workspace' })
      );
    });
  });

  describe('getWorkspace and getWorkspacesForProject', () => {
    it('should retrieve workspace by ID', () => {
      const created = workspace.createWorkspace('project-1', 'Main', 'admin');
      
      const retrieved = workspace.getWorkspace(created.id);
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe('Main');
    });

    it('should return all workspaces for a project', () => {
      workspace.createWorkspace('project-1', 'Main', 'admin');
      workspace.createWorkspace('project-1', 'Experimental', 'admin');
      workspace.createWorkspace('project-2', 'Other', 'admin');

      const project1Workspaces = workspace.getWorkspacesForProject('project-1');
      expect(project1Workspaces).toHaveLength(2);
      expect(project1Workspaces.every(ws => ws.projectId === 'project-1')).toBe(true);
    });

    it('should get active workspace (most recently updated active)', () => {
      const ws1 = workspace.createWorkspace('project-1', 'First', 'admin');
      workspace.createWorkspace('project-1', 'Second', 'admin');
      
      // Make first one most recently updated
      workspace.addMember(ws1.id, 'new-member', 'admin');

      const active = workspace.getActiveWorkspace('project-1');
      expect(active?.name).toBe('First');
    });
  });

  describe('updateWorkspaceStatus', () => {
    it('should update workspace status', () => {
      const ws = workspace.createWorkspace('project-1', 'Main', 'admin');
      
      const updated = workspace.updateWorkspaceStatus(ws.id, 'frozen', 'admin');

      expect(updated?.status).toBe('frozen');
    });

    it('should emit status changed event', () => {
      const ws = workspace.createWorkspace('project-1', 'Main', 'admin');
      const publishSpy = jest.spyOn(eventBus, 'publish');

      workspace.updateWorkspaceStatus(ws.id, 'archived', 'admin');

      expect(publishSpy).toHaveBeenCalledWith(
        'workspace:status:changed',
        expect.objectContaining({
          workspaceId: ws.id,
          oldStatus: 'active',
          newStatus: 'archived'
        }),
        expect.objectContaining({ aggregateType: 'workspace' })
      );
    });

    it('should return null for non-existent workspace', () => {
      const result = workspace.updateWorkspaceStatus('non-existent', 'archived', 'admin');
      expect(result).toBeNull();
    });
  });

  describe('member management', () => {
    it('should add member to workspace', () => {
      const ws = workspace.createWorkspace('project-1', 'Main', 'admin');
      
      workspace.addMember(ws.id, 'developer-1', 'admin');

      const updated = workspace.getWorkspace(ws.id);
      expect(updated?.members).toContain('developer-1');
    });

    it('should not add duplicate members', () => {
      const ws = workspace.createWorkspace('project-1', 'Main', 'admin');
      
      workspace.addMember(ws.id, 'developer-1', 'admin');
      workspace.addMember(ws.id, 'developer-1', 'admin');

      const updated = workspace.getWorkspace(ws.id);
      expect(updated?.members.filter(m => m === 'developer-1')).toHaveLength(1);
    });

    it('should remove member from workspace', () => {
      const ws = workspace.createWorkspace('project-1', 'Main', 'admin', {
        initialMembers: ['admin', 'developer-1']
      });
      
      workspace.removeMember(ws.id, 'developer-1', 'admin');

      const updated = workspace.getWorkspace(ws.id);
      expect(updated?.members).not.toContain('developer-1');
      expect(updated?.members).toContain('admin');
    });
  });

  describe('updateArtifact', () => {
    it('should create artifact in workspace', () => {
      const ws = workspace.createWorkspace('project-1', 'Main', 'admin');
      
      const version = workspace.updateArtifact(
        ws.id,
        'architecture.md',
        { content: 'Initial architecture' },
        'agent-1',
        'staff-engineer'
      );

      expect(version).toBeDefined();
      expect(version?.version).toBe(1);
      expect(version?.source).toBe('agent-1');
    });

    it('should update existing artifact with new version', () => {
      const ws = workspace.createWorkspace('project-1', 'Main', 'admin');
      
      workspace.updateArtifact(ws.id, 'doc.md', { content: 'v1' }, 'source', 'author');
      const v2 = workspace.updateArtifact(ws.id, 'doc.md', { content: 'v2' }, 'source', 'author');

      expect(v2?.version).toBe(2);
    });

    it('should not update artifact in non-active workspace', () => {
      const ws = workspace.createWorkspace('project-1', 'Main', 'admin');
      workspace.updateWorkspaceStatus(ws.id, 'archived', 'admin');

      const result = workspace.updateArtifact(ws.id, 'doc.md', { content: 'test' }, 'source', 'author');
      expect(result).toBeNull();
    });

    it('should emit workspace:artifact:updated event', () => {
      const ws = workspace.createWorkspace('project-1', 'Main', 'admin');
      const publishSpy = jest.spyOn(eventBus, 'publish');

      workspace.updateArtifact(ws.id, 'doc.md', { content: 'test' }, 'source', 'author');

      expect(publishSpy).toHaveBeenCalledWith(
        'workspace:artifact:updated',
        expect.objectContaining({
          workspaceId: ws.id,
          artifactKey: 'doc.md'
        }),
        expect.objectContaining({ aggregateType: 'workspace' })
      );
    });
  });

  describe('getArtifact and getArtifactHistory', () => {
    it('should retrieve current artifact data', () => {
      const ws = workspace.createWorkspace('project-1', 'Main', 'admin');
      workspace.updateArtifact(ws.id, 'config.json', { version: '1.0.0' }, 'source', 'author');
      
      const data = workspace.getArtifact(ws.id, 'config.json');
      expect(data).toEqual({ version: '1.0.0' });
    });

    it('should return artifact version history', () => {
      const ws = workspace.createWorkspace('project-1', 'Main', 'admin');
      workspace.updateArtifact(ws.id, 'doc.md', { v: 1 }, 'source', 'author');
      workspace.updateArtifact(ws.id, 'doc.md', { v: 2 }, 'source', 'author');
      
      const history = workspace.getArtifactHistory(ws.id, 'doc.md');
      expect(history).toHaveLength(2);
    });

    it('should return undefined for non-existent artifact', () => {
      const ws = workspace.createWorkspace('project-1', 'Main', 'admin');
      const data = workspace.getArtifact(ws.id, 'non-existent');
      expect(data).toBeUndefined();
    });
  });

  describe('rollbackArtifact', () => {
    it('should rollback artifact to specific version', () => {
      const ws = workspace.createWorkspace('project-1', 'Main', 'admin');
      workspace.updateArtifact(ws.id, 'doc.md', { content: 'v1' }, 'source', 'author');
      workspace.updateArtifact(ws.id, 'doc.md', { content: 'v2' }, 'source', 'author');
      
      const rollback = workspace.rollbackArtifact(ws.id, 'doc.md', 1, 'admin', 'Rolling back');

      expect(rollback).toBeDefined();
      expect(rollback?.changeType).toBe('rollback');
      expect(rollback?.data).toEqual({ content: 'v1' });
    });
  });

  describe('addFeedback and getFeedbackForArtifact', () => {
    it('should add feedback to artifact', () => {
      const ws = workspace.createWorkspace('project-1', 'Main', 'admin');
      workspace.updateArtifact(ws.id, 'code.ts', { content: 'function test() {}' }, 'source', 'author');
      
      const thread = workspace.addFeedback(
        ws.id,
        'code.ts',
        'reviewer-1',
        'Function too long',
        'Consider breaking this into smaller functions',
        'nit'
      );

      expect(thread).toBeDefined();
      expect(thread?.title).toBe('Function too long');
      expect(thread?.severity).toBe('nit');
    });

    it('should get all feedback for artifact', () => {
      const ws = workspace.createWorkspace('project-1', 'Main', 'admin');
      workspace.updateArtifact(ws.id, 'code.ts', { content: 'code' }, 'source', 'author');
      
      workspace.addFeedback(ws.id, 'code.ts', 'r1', 'Issue 1', 'Details', 'nit');
      workspace.addFeedback(ws.id, 'code.ts', 'r2', 'Issue 2', 'Details', 'blocking');

      const feedback = workspace.getFeedbackForArtifact(ws.id, 'code.ts');
      expect(feedback).toHaveLength(2);
    });

    it('should check for blocking feedback', () => {
      const ws = workspace.createWorkspace('project-1', 'Main', 'admin');
      workspace.updateArtifact(ws.id, 'code.ts', { content: 'code' }, 'source', 'author');
      workspace.addFeedback(ws.id, 'code.ts', 'r1', 'Security issue', 'Details', 'blocking');

      expect(workspace.hasBlockingFeedback(ws.id, 'code.ts')).toBe(true);
    });
  });

  describe('generateCompliancePackage', () => {
    it('should generate compliance package', () => {
      const ws = workspace.createWorkspace('project-1', 'Main', 'admin');
      workspace.updateArtifact(ws.id, 'doc.md', { content: 'Documentation' }, 'source', 'author');
      workspace.addFeedback(ws.id, 'doc.md', 'reviewer', 'Title', 'Content', 'critical');
      
      const pkg = workspace.generateCompliancePackage(ws.id, 'admin');

      expect(pkg).toBeDefined();
      expect(pkg?.projectId).toBe('project-1');
      expect(pkg?.workspaceId).toBe(ws.id);
      expect(pkg?.artifacts).toHaveLength(1);
      expect(pkg?.summary.totalArtifacts).toBe(1);
      expect(pkg?.summary.criticalFeedback).toBe(1);
    });

    it('should return null for non-existent workspace', () => {
      const pkg = workspace.generateCompliancePackage('non-existent', 'admin');
      expect(pkg).toBeNull();
    });
  });

  describe('getMetrics', () => {
    it('should return workspace metrics', () => {
      const ws = workspace.createWorkspace('project-1', 'Main', 'admin');
      workspace.updateArtifact(ws.id, 'doc1.md', { content: 'v1' }, 'source', 'author');
      workspace.updateArtifact(ws.id, 'doc1.md', { content: 'v2' }, 'source', 'author');
      workspace.updateArtifact(ws.id, 'doc2.md', { content: 'test' }, 'source', 'author');
      
      const metrics = workspace.getMetrics(ws.id);

      expect(metrics).toBeDefined();
      expect(metrics?.artifactCount).toBe(2);
      expect(metrics?.versionCount).toBe(3);
      expect(metrics?.memberCount).toBe(1);
    });

    it('should return null for non-existent workspace', () => {
      const metrics = workspace.getMetrics('non-existent');
      expect(metrics).toBeNull();
    });
  });

  describe('archiveWorkspace', () => {
    it('should archive workspace', () => {
      const ws = workspace.createWorkspace('project-1', 'Main', 'admin');
      
      const archived = workspace.archiveWorkspace(ws.id, 'admin', 'Project completed');

      expect(archived?.status).toBe('archived');
    });
  });

  describe('exportWorkspace', () => {
    it('should export workspace data', () => {
      const ws = workspace.createWorkspace('project-1', 'Main', 'admin');
      workspace.updateArtifact(ws.id, 'doc.md', { content: 'test' }, 'source', 'author');
      
      const exported = workspace.exportWorkspace(ws.id);
      const parsed = JSON.parse(exported);

      expect(parsed.workspace.id).toBe(ws.id);
      expect(parsed.artifacts['doc.md']).toBeDefined();
      expect(parsed.metrics).toBeDefined();
    });

    it('should return empty object for non-existent workspace', () => {
      const exported = workspace.exportWorkspace('non-existent');
      expect(exported).toBe('{}');
    });
  });

  describe('getAllWorkspaces', () => {
    it('should return all workspaces', () => {
      workspace.createWorkspace('project-1', 'Main', 'admin');
      workspace.createWorkspace('project-2', 'Other', 'admin');

      const all = workspace.getAllWorkspaces();
      expect(all.length).toBeGreaterThanOrEqual(2);
    });
  });
});
