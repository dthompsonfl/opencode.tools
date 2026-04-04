/**
 * Collaborative Workspace System
 * 
 * Enhanced workspace management with project scoping, artifact versioning,
 * threaded feedback, conflict resolution, and compliance package export.
 */

import { logger } from '../../runtime/logger';
import { randomUUID } from 'crypto';
import { EventBus } from '../orchestrator/event-bus';
import { ArtifactVersioning, ArtifactVersion } from './artifact-versioning';
import { FeedbackThreads, FeedbackThread } from './feedback-threads';
import {
  CoworkDomainStore,
  CoworkPersistenceRuntime,
  WorkspaceSnapshotRecord,
  initializeCoworkPersistence,
} from '../persistence';
import { WorkflowEngine, registerPhaseOneWorkflows } from '../workflow';

export type WorkspaceStatus = 'active' | 'archived' | 'frozen' | 'merging';
export type ConflictResolutionStrategy = 'last-write-wins' | 'merge' | 'reject' | 'manual';

export interface ProjectWorkspace {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  status: WorkspaceStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  members: string[];
  artifacts: Map<string, string>; // artifactKey -> artifactId
  metadata?: Record<string, unknown>;
}

export interface Conflict {
  id: string;
  workspaceId: string;
  artifactKey: string;
  agent1: string;
  agent2: string;
  version1: ArtifactVersion;
  version2: ArtifactVersion;
  detectedAt: string;
  status: 'detected' | 'resolving' | 'resolved' | 'rejected';
  resolution?: {
    strategy: ConflictResolutionStrategy;
    resolvedBy: string;
    resolvedAt: string;
    winningVersion?: number;
    mergedData?: unknown;
    reason?: string;
  };
}

export interface CompliancePackage {
  packageId: string;
  projectId: string;
  workspaceId: string;
  generatedAt: string;
  generatedBy: string;
  artifacts: Array<{
    key: string;
    currentVersion: number;
    versionHistory: ArtifactVersion[];
    feedbackThreads: FeedbackThread[];
  }>;
  summary: {
    totalArtifacts: number;
    totalVersions: number;
    totalFeedback: number;
    criticalFeedback: number;
    blockingFeedback: number;
  };
  signatures: string[];
  metadata?: Record<string, unknown>;
}

export interface WorkspaceMetrics {
  workspaceId: string;
  artifactCount: number;
  versionCount: number;
  feedbackCount: number;
  pendingFeedback: number;
  activeConflicts: number;
  memberCount: number;
  lastActivity: string;
}

export class CollaborativeWorkspace {
  private static instance: CollaborativeWorkspace | null = null;
  private workspaces: Map<string, ProjectWorkspace> = new Map();
  private projectWorkspaces: Map<string, Set<string>> = new Map(); // projectId -> workspaceIds
  private conflicts: Map<string, Conflict> = new Map();
  private workspaceConflicts: Map<string, Set<string>> = new Map(); // workspaceId -> conflictIds
  private versioning: ArtifactVersioning;
  private feedback: FeedbackThreads;
  private eventBus: EventBus;
  private workflowEngine: WorkflowEngine;
  private persistenceStore: CoworkDomainStore | null = null;
  private pendingPersistenceWrites: Set<Promise<void>> = new Set();
  private monotonicTimestampMs = 0;

  private constructor() {
    this.versioning = ArtifactVersioning.getInstance();
    this.feedback = FeedbackThreads.getInstance();
    this.eventBus = EventBus.getInstance();
    this.workflowEngine = WorkflowEngine.getInstance();
    this.setupEventListeners();

    const runtimeStore = CoworkPersistenceRuntime.getInstance().getStore();
    if (runtimeStore) {
      this.persistenceStore = runtimeStore;
      this.eventBus.configurePersistence(runtimeStore);
    }
  }

  public static getInstance(): CollaborativeWorkspace {
    if (!CollaborativeWorkspace.instance) {
      CollaborativeWorkspace.instance = new CollaborativeWorkspace();
    }
    return CollaborativeWorkspace.instance;
  }

  public static resetForTests(): void {
    if (!CollaborativeWorkspace.instance) {
      return;
    }

    CollaborativeWorkspace.instance.versioning.clear();
    CollaborativeWorkspace.instance.feedback.clear();
    CollaborativeWorkspace.instance.workspaces.clear();
    CollaborativeWorkspace.instance.projectWorkspaces.clear();
    CollaborativeWorkspace.instance.conflicts.clear();
    CollaborativeWorkspace.instance.workspaceConflicts.clear();
    CollaborativeWorkspace.instance.pendingPersistenceWrites.clear();
    CollaborativeWorkspace.instance.workflowEngine.clearForTests();
    CollaborativeWorkspace.instance.eventBus.resetForTests();
    CollaborativeWorkspace.instance.persistenceStore = null;
    CollaborativeWorkspace.instance = null;
  }

  public async configurePersistence(
    store?: CoworkDomainStore,
    options: {
      hydrateFromStore?: boolean;
      initializeRuntime?: boolean;
      startDispatcher?: boolean;
    } = {},
  ): Promise<void> {
    if (store) {
      this.persistenceStore = store;
    } else if (options.initializeRuntime !== false) {
      this.persistenceStore = await initializeCoworkPersistence();
    }

    if (!this.persistenceStore) {
      return;
    }

    this.eventBus.configurePersistence(this.persistenceStore);
    if (options.startDispatcher !== false) {
      this.eventBus.startDispatcher();
    }

    await this.workflowEngine.configurePersistence(this.persistenceStore);
    await registerPhaseOneWorkflows(this.workflowEngine);
    this.workflowEngine.start();

    if (options.hydrateFromStore !== false) {
      await this.hydrateFromPersistence();
    }
  }

  public async flushPersistence(): Promise<void> {
    if (this.pendingPersistenceWrites.size === 0) {
      return;
    }

    await Promise.all([...this.pendingPersistenceWrites]);
  }

  private setupEventListeners(): void {
    // Listen for artifact updates to detect conflicts
    this.eventBus.subscribe('artifact:version:updated', (payload) => {
      const version = payload as ArtifactVersion;
      this.checkForConflicts(version);
    });

    // Listen for critical feedback
    this.eventBus.subscribe('feedback:critical', (payload) => {
      const thread = payload as FeedbackThread;
      this.eventBus.publish('workspace:critical_feedback', {
        workspaceId: this.getWorkspaceIdForArtifact(thread.artifactId),
        thread
      });
    });
  }

  /**
   * Create a new project workspace
   */
  public createWorkspace(
    projectId: string,
    name: string,
    createdBy: string,
    options?: {
      description?: string;
      metadata?: Record<string, unknown>;
      initialMembers?: string[];
    }
  ): ProjectWorkspace {
    const workspaceId = `workspace-${projectId}-${randomUUID()}`;
    const now = this.nextTimestamp();

    const workspace: ProjectWorkspace = {
      id: workspaceId,
      projectId,
      name,
      description: options?.description,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      createdBy,
      members: options?.initialMembers || [createdBy],
      artifacts: new Map(),
      metadata: options?.metadata
    };

    this.workspaces.set(workspaceId, workspace);

    if (!this.projectWorkspaces.has(projectId)) {
      this.projectWorkspaces.set(projectId, new Set());
    }
    this.projectWorkspaces.get(projectId)!.add(workspaceId);

    this.eventBus.publish('workspace:created', workspace, {
      aggregateType: 'workspace',
      aggregateId: workspaceId,
    });
    this.persistWorkspaceState(workspace);
    logger.info(`[CollaborativeWorkspace] Created workspace ${workspaceId} for project ${projectId}`);

    return workspace;
  }

  /**
   * Get workspace by ID
   */
  public getWorkspace(workspaceId: string): ProjectWorkspace | undefined {
    return this.workspaces.get(workspaceId);
  }

  /**
   * Get all workspaces for a project
   */
  public getWorkspacesForProject(projectId: string): ProjectWorkspace[] {
    const workspaceIds = this.projectWorkspaces.get(projectId);
    if (!workspaceIds) return [];

    return Array.from(workspaceIds)
      .map(id => this.workspaces.get(id))
      .filter((w): w is ProjectWorkspace => w !== undefined);
  }

  /**
   * Get active workspace for project (most recently updated)
   */
  public getActiveWorkspace(projectId: string): ProjectWorkspace | undefined {
    const workspaces = this.getWorkspacesForProject(projectId);
    if (workspaces.length === 0) return undefined;

    return workspaces
      .filter(w => w.status === 'active')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
  }

  /**
   * Update workspace status
   */
  public updateWorkspaceStatus(
    workspaceId: string,
    newStatus: WorkspaceStatus,
    updatedBy: string
  ): ProjectWorkspace | null {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      logger.warn(`[CollaborativeWorkspace] Cannot update non-existent workspace: ${workspaceId}`);
      return null;
    }

    const oldStatus = workspace.status;
    workspace.status = newStatus;
    workspace.updatedAt = this.nextTimestamp();

    this.eventBus.publish('workspace:status:changed', {
      workspaceId,
      oldStatus,
      newStatus,
      updatedBy
    }, {
      aggregateType: 'workspace',
      aggregateId: workspaceId,
    });

    this.persistWorkspaceState(workspace);

    logger.info(`[CollaborativeWorkspace] Workspace ${workspaceId} status changed from ${oldStatus} to ${newStatus}`);

    return workspace;
  }

  public openWorkspace(workspaceId: string, openedBy: string): ProjectWorkspace | null {
    const workspace = this.updateWorkspaceStatus(workspaceId, 'active', openedBy);
    if (!workspace) {
      return null;
    }

    this.eventBus.publish(
      'workspace:opened',
      {
        workspaceId,
        openedBy,
        timestamp: workspace.updatedAt,
      },
      {
        aggregateType: 'workspace',
        aggregateId: workspaceId,
      },
    );

    return workspace;
  }

  public closeWorkspace(workspaceId: string, closedBy: string, reason?: string): ProjectWorkspace | null {
    const workspace = this.updateWorkspaceStatus(workspaceId, 'frozen', closedBy);
    if (!workspace) {
      return null;
    }

    workspace.metadata = {
      ...(workspace.metadata ?? {}),
      closedAt: workspace.updatedAt,
      closedBy,
      closeReason: reason,
    };

    this.persistWorkspaceState(workspace, workspace.updatedAt);
    this.eventBus.publish(
      'workspace:closed',
      {
        workspaceId,
        closedBy,
        reason,
        timestamp: workspace.updatedAt,
      },
      {
        aggregateType: 'workspace',
        aggregateId: workspaceId,
      },
    );

    return workspace;
  }

  /**
   * Add member to workspace
   */
  public addMember(workspaceId: string, member: string, addedBy: string): ProjectWorkspace | null {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return null;

    if (!workspace.members.includes(member)) {
      workspace.members.push(member);
      workspace.updatedAt = this.nextTimestamp();

      this.eventBus.publish('workspace:member:added', {
        workspaceId,
        member,
        addedBy,
        timestamp: workspace.updatedAt
      }, {
        aggregateType: 'workspace',
        aggregateId: workspaceId,
      });

      this.persistWorkspaceState(workspace);

      logger.debug(`[CollaborativeWorkspace] Added member ${member} to workspace ${workspaceId}`);
    }

    return workspace;
  }

  /**
   * Remove member from workspace
   */
  public removeMember(workspaceId: string, member: string, removedBy: string): ProjectWorkspace | null {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return null;

    const index = workspace.members.indexOf(member);
    if (index > -1) {
      workspace.members.splice(index, 1);
      workspace.updatedAt = this.nextTimestamp();

      this.eventBus.publish('workspace:member:removed', {
        workspaceId,
        member,
        removedBy,
        timestamp: workspace.updatedAt
      }, {
        aggregateType: 'workspace',
        aggregateId: workspaceId,
      });

      this.persistWorkspaceState(workspace);

      logger.debug(`[CollaborativeWorkspace] Removed member ${member} from workspace ${workspaceId}`);
    }

    return workspace;
  }

  /**
   * Create or update artifact in workspace with versioning
   */
  public updateArtifact<T>(
    workspaceId: string,
    artifactKey: string,
    data: T,
    source: string,
    author: string,
    options?: {
      changeDescription?: string;
      metadata?: Record<string, unknown>;
    }
  ): ArtifactVersion<T> | null {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      logger.warn(`[CollaborativeWorkspace] Cannot update artifact in non-existent workspace: ${workspaceId}`);
      return null;
    }

    if (workspace.status !== 'active') {
      logger.warn(`[CollaborativeWorkspace] Cannot update artifact in ${workspace.status} workspace: ${workspaceId}`);
      return null;
    }

    const artifactId = workspace.artifacts.get(artifactKey);
    let version: ArtifactVersion<T>;

    if (artifactId) {
      // Update existing
      const result = this.versioning.updateVersion(
        artifactId,
        data,
        source,
        author,
        options?.changeDescription,
        options?.metadata
      );
      if (!result) return null;
      version = result as ArtifactVersion<T>;
    } else {
      // Create new
      const newArtifactId = `${workspaceId}-${artifactKey}`;
      version = this.versioning.createVersion(
        newArtifactId,
        data,
        source,
        author,
        options?.changeDescription,
        options?.metadata
      );
      workspace.artifacts.set(artifactKey, newArtifactId);
    }

    workspace.updatedAt = this.nextTimestamp();

    this.eventBus.publish('workspace:artifact:updated', {
      workspaceId,
      artifactKey,
      version: version.version,
      author
    }, {
      aggregateType: 'workspace',
      aggregateId: workspaceId,
    });

    this.persistWorkspaceState(workspace);
    this.persistWorkspaceArtifact(workspace, artifactKey, version, source);

    return version;
  }

  /**
   * Get artifact from workspace
   */
  public getArtifact<T>(workspaceId: string, artifactKey: string): T | undefined {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return undefined;

    const artifactId = workspace.artifacts.get(artifactKey);
    if (!artifactId) return undefined;

    const version = this.versioning.getCurrentVersion<T>(artifactId);
    return version?.data;
  }

  /**
   * Get artifact version history
   */
  public getArtifactHistory(workspaceId: string, artifactKey: string): ArtifactVersion[] {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return [];

    const artifactId = workspace.artifacts.get(artifactKey);
    if (!artifactId) return [];

    return this.versioning.getVersionHistory(artifactId);
  }

  /**
   * Rollback artifact to specific version
   */
  public rollbackArtifact<T>(
    workspaceId: string,
    artifactKey: string,
    targetVersion: number,
    author: string,
    reason?: string
  ): ArtifactVersion<T> | null {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return null;

    const artifactId = workspace.artifacts.get(artifactKey);
    if (!artifactId) return null;

    const result = this.versioning.rollbackToVersion<T>(artifactId, targetVersion, author, reason);
    if (result) {
      workspace.updatedAt = this.nextTimestamp();
      this.eventBus.publish('workspace:artifact:rollback', {
        workspaceId,
        artifactKey,
        targetVersion,
        author,
        reason
      }, {
        aggregateType: 'workspace',
        aggregateId: workspaceId,
      });

      this.persistWorkspaceState(workspace);
      this.persistWorkspaceArtifact(workspace, artifactKey, result, result.source);
    }

    return result;
  }

  /**
   * Add feedback to artifact
   */
  public addFeedback(
    workspaceId: string,
    artifactKey: string,
    author: string,
    title: string,
    content: string,
    severity: 'nit' | 'blocking' | 'critical',
    options?: {
      location?: { file?: string; line?: number; column?: number };
      tags?: string[];
      metadata?: Record<string, unknown>;
    }
  ): FeedbackThread | null {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return null;

    const artifactId = workspace.artifacts.get(artifactKey);
    if (!artifactId) {
      logger.warn(`[CollaborativeWorkspace] Cannot add feedback to non-existent artifact: ${artifactKey}`);
      return null;
    }

    const thread = this.feedback.createThread(
      artifactId,
      author,
      title,
      content,
      severity,
      options
    );

    workspace.updatedAt = this.nextTimestamp();

    this.eventBus.publish('workspace:feedback:added', {
      workspaceId,
      artifactKey,
      threadId: thread.id,
      severity
    }, {
      aggregateType: 'workspace',
      aggregateId: workspaceId,
    });

    this.persistWorkspaceState(workspace);
    this.persistFeedbackThread(workspaceId, thread);
    this.eventBus.publish(
      'feedback:added',
      {
        id: thread.id,
        workspaceId,
        artifactId,
        severity: thread.severity,
        status: thread.status,
        createdAt: thread.createdAt,
      },
      {
        aggregateType: 'workspace',
        aggregateId: workspaceId,
      },
    );

    return thread;
  }

  /**
   * Get all feedback for artifact
   */
  public getFeedbackForArtifact(workspaceId: string, artifactKey: string): FeedbackThread[] {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return [];

    const artifactId = workspace.artifacts.get(artifactKey);
    if (!artifactId) return [];

    return this.feedback.getThreadsForArtifact(artifactId);
  }

  /**
   * Check if artifact has blocking feedback
   */
  public hasBlockingFeedback(workspaceId: string, artifactKey: string): boolean {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return false;

    const artifactId = workspace.artifacts.get(artifactKey);
    if (!artifactId) return false;

    return this.feedback.hasBlockingFeedback(artifactId);
  }

  /**
   * Check for concurrent edit conflicts
   */
  private checkForConflicts(version: ArtifactVersion): void {
    // Get recent versions of the same artifact (within last 5 minutes)
    const artifactId = version.artifactId;
    const history = this.versioning.getVersionHistory(artifactId);
    const recentVersions = history.filter(v => {
      if (v.id === version.id) return false;
      const timeDiff = new Date(version.timestamp).getTime() - new Date(v.timestamp).getTime();
      return timeDiff < 5 * 60 * 1000 && timeDiff > 0; // Within 5 minutes and earlier
    });

    if (recentVersions.length > 0) {
      // Found potential conflict
      const conflictingVersion = recentVersions[recentVersions.length - 1];
      
      // Get workspace for this artifact
      const workspace = this.findWorkspaceByArtifactId(artifactId);
      if (!workspace) return;

      const conflict: Conflict = {
        id: `conflict-${randomUUID()}`,
        workspaceId: workspace.id,
        artifactKey: this.getArtifactKeyById(workspace, artifactId),
        agent1: conflictingVersion.author,
        agent2: version.author,
        version1: conflictingVersion,
        version2: version,
        detectedAt: this.nextTimestamp(),
        status: 'detected'
      };

      this.conflicts.set(conflict.id, conflict);

      if (!this.workspaceConflicts.has(workspace.id)) {
        this.workspaceConflicts.set(workspace.id, new Set());
      }
      this.workspaceConflicts.get(workspace.id)!.add(conflict.id);

      this.eventBus.publish('workspace:conflict:detected', conflict, {
        aggregateType: 'workspace',
        aggregateId: workspace.id,
      });
      logger.warn(`[CollaborativeWorkspace] Conflict detected on artifact ${artifactId} between ${conflictingVersion.author} and ${version.author}`);
    }
  }

  /**
   * Resolve a conflict
   */
  public resolveConflict(
    conflictId: string,
    strategy: ConflictResolutionStrategy,
    resolvedBy: string,
    options?: {
      winningVersion?: number;
      mergedData?: unknown;
      reason?: string;
    }
  ): Conflict | null {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) return null;

    conflict.status = 'resolved';
    conflict.resolution = {
      strategy,
      resolvedBy,
      resolvedAt: this.nextTimestamp(),
      winningVersion: options?.winningVersion,
      mergedData: options?.mergedData,
      reason: options?.reason
    };

    this.eventBus.publish('workspace:conflict:resolved', conflict, {
      aggregateType: 'workspace',
      aggregateId: conflict.workspaceId,
    });
    logger.info(`[CollaborativeWorkspace] Conflict ${conflictId} resolved with strategy: ${strategy}`);

    return conflict;
  }

  /**
   * Get conflicts for workspace
   */
  public getConflictsForWorkspace(workspaceId: string): Conflict[] {
    const conflictIds = this.workspaceConflicts.get(workspaceId);
    if (!conflictIds) return [];

    return Array.from(conflictIds)
      .map(id => this.conflicts.get(id))
      .filter((c): c is Conflict => c !== undefined);
  }

  /**
   * Get active conflicts
   */
  public getActiveConflicts(): Conflict[] {
    return Array.from(this.conflicts.values())
      .filter(c => c.status === 'detected' || c.status === 'resolving');
  }

  /**
   * Generate compliance package
   */
  public generateCompliancePackage(
    workspaceId: string,
    generatedBy: string
  ): CompliancePackage | null {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return null;

    const artifacts: CompliancePackage['artifacts'] = [];
    let totalVersions = 0;
    let totalFeedback = 0;
    let criticalFeedback = 0;
    let blockingFeedback = 0;

    for (const [key, artifactId] of workspace.artifacts) {
      const versionHistory = this.versioning.getVersionHistory(artifactId);
      const feedbackThreads = this.feedback.getThreadsForArtifact(artifactId);

      const currentVersion = this.versioning.getCurrentVersionNumber(artifactId);

      artifacts.push({
        key,
        currentVersion,
        versionHistory,
        feedbackThreads
      });

      totalVersions += versionHistory.length;
      totalFeedback += feedbackThreads.length;
      criticalFeedback += feedbackThreads.filter(t => t.severity === 'critical').length;
      blockingFeedback += feedbackThreads.filter(t => t.severity === 'blocking').length;
    }

    const packageId = `compliance-${workspaceId}-${Date.now()}`;

    const pkg: CompliancePackage = {
      packageId,
      projectId: workspace.projectId,
      workspaceId,
      generatedAt: this.nextTimestamp(),
      generatedBy,
      artifacts,
      summary: {
        totalArtifacts: artifacts.length,
        totalVersions,
        totalFeedback,
        criticalFeedback,
        blockingFeedback
      },
      signatures: []
    };

    this.eventBus.publish('workspace:compliance:package_generated', pkg, {
      aggregateType: 'workspace',
      aggregateId: workspaceId,
    });
    logger.info(`[CollaborativeWorkspace] Generated compliance package ${packageId} with ${artifacts.length} artifacts`);

    return pkg;
  }

  /**
   * Sign compliance package
   */
  public signCompliancePackage(packageId: string, signer: string, signature: string): boolean {
    // In a real implementation, this would verify the signature cryptographically
    this.eventBus.publish('workspace:compliance:package_signed', {
      packageId,
      signer,
      signature,
      timestamp: this.nextTimestamp()
    });

    logger.info(`[CollaborativeWorkspace] Compliance package ${packageId} signed by ${signer}`);
    return true;
  }

  /**
   * Get workspace metrics
   */
  public getMetrics(workspaceId: string): WorkspaceMetrics | null {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return null;

    let versionCount = 0;
    let feedbackCount = 0;

    for (const [, artifactId] of workspace.artifacts) {
      versionCount += this.versioning.getVersionHistory(artifactId).length;
      feedbackCount += this.feedback.getThreadsForArtifact(artifactId).length;
    }

    const activeConflicts = this.getConflictsForWorkspace(workspaceId)
      .filter(c => c.status === 'detected' || c.status === 'resolving').length;

    const pendingFeedback = this.feedback.filterThreads({ status: 'pending' })
      .filter(t => {
        const artifactWorkspace = this.findWorkspaceByArtifactId(t.artifactId);
        return artifactWorkspace?.id === workspaceId;
      }).length;

    return {
      workspaceId,
      artifactCount: workspace.artifacts.size,
      versionCount,
      feedbackCount,
      pendingFeedback,
      activeConflicts,
      memberCount: workspace.members.length,
      lastActivity: workspace.updatedAt
    };
  }

  /**
   * Export workspace data
   */
  public exportWorkspace(workspaceId: string): string {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return '{}';

    const exportData = {
      workspace,
      artifacts: {} as Record<string, ArtifactVersion[]>,
      feedback: {} as Record<string, FeedbackThread[]>,
      conflicts: this.getConflictsForWorkspace(workspaceId),
      metrics: this.getMetrics(workspaceId),
      exportedAt: this.nextTimestamp()
    };

    for (const [key, artifactId] of workspace.artifacts) {
      exportData.artifacts[key] = this.versioning.getVersionHistory(artifactId);
      exportData.feedback[key] = this.feedback.getThreadsForArtifact(artifactId);
    }

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Archive workspace
   */
  public archiveWorkspace(workspaceId: string, archivedBy: string, reason?: string): ProjectWorkspace | null {
    const workspace = this.updateWorkspaceStatus(workspaceId, 'archived', archivedBy);
    if (workspace) {
      this.eventBus.publish('workspace:archived', {
        workspaceId,
        archivedBy,
        reason,
        timestamp: this.nextTimestamp()
      }, {
        aggregateType: 'workspace',
        aggregateId: workspaceId,
      });
      logger.info(`[CollaborativeWorkspace] Workspace ${workspaceId} archived by ${archivedBy}`);
    }
    return workspace;
  }

  /**
   * Delete workspace
   */
  public deleteWorkspace(workspaceId: string, deletedBy: string, reason?: string): boolean {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return false;

    // Remove from project index
    const projectWorkspaces = this.projectWorkspaces.get(workspace.projectId);
    if (projectWorkspaces) {
      projectWorkspaces.delete(workspaceId);
    }

    // Clean up conflicts
    const conflicts = this.workspaceConflicts.get(workspaceId);
    if (conflicts) {
      for (const conflictId of conflicts) {
        this.conflicts.delete(conflictId);
      }
      this.workspaceConflicts.delete(workspaceId);
    }

    this.workspaces.delete(workspaceId);

    this.persistWorkspaceDeletion(workspace);

    this.eventBus.publish('workspace:deleted', {
      workspaceId,
      projectId: workspace.projectId,
      deletedBy,
      reason,
      timestamp: this.nextTimestamp()
    }, {
      aggregateType: 'workspace',
      aggregateId: workspaceId,
    });

    logger.info(`[CollaborativeWorkspace] Workspace ${workspaceId} deleted by ${deletedBy}`);
    return true;
  }

  /**
   * Get all workspaces
   */
  public getAllWorkspaces(): ProjectWorkspace[] {
    return Array.from(this.workspaces.values());
  }

  public async createCheckpoint(
    workspaceId: string,
    createdBy: string,
    snapshotType = 'checkpoint',
    metadata: Record<string, unknown> = {},
  ): Promise<WorkspaceSnapshotRecord | null> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace || !this.persistenceStore) {
      return null;
    }

    const payload: Record<string, unknown> = {
      workspace: this.serializeWorkspace(workspace),
      artifacts: Object.fromEntries(
        [...workspace.artifacts.entries()].map(([key, artifactId]) => {
          const currentVersion = this.versioning.getCurrentVersion(artifactId);
          return [key, currentVersion ?? null];
        }),
      ),
      feedback: Object.fromEntries(
        [...workspace.artifacts.entries()].map(([key, artifactId]) => {
          return [key, this.feedback.getThreadsForArtifact(artifactId)];
        }),
      ),
    };

    return this.persistenceStore.saveWorkspaceSnapshot({
      workspaceId,
      snapshotType,
      payload,
      metadata,
      createdBy,
    });
  }

  public async listCheckpoints(workspaceId: string, limit = 25): Promise<WorkspaceSnapshotRecord[]> {
    if (!this.persistenceStore) {
      return [];
    }

    return this.persistenceStore.listWorkspaceSnapshots(workspaceId, limit);
  }

  private nextTimestamp(): string {
    const now = Date.now();
    this.monotonicTimestampMs = now > this.monotonicTimestampMs ? now : this.monotonicTimestampMs + 1;
    return new Date(this.monotonicTimestampMs).toISOString();
  }

  private serializeWorkspace(workspace: ProjectWorkspace): Record<string, unknown> {
    return {
      id: workspace.id,
      projectId: workspace.projectId,
      name: workspace.name,
      description: workspace.description,
      status: workspace.status,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
      createdBy: workspace.createdBy,
      members: workspace.members,
      artifacts: Object.fromEntries(workspace.artifacts.entries()),
      metadata: workspace.metadata ?? {},
    };
  }

  private persistWorkspaceState(workspace: ProjectWorkspace, closedAt?: string): void {
    if (!this.persistenceStore) {
      return;
    }

    this.schedulePersistence('workspace:upsert', async () => {
      await this.persistenceStore?.upsertWorkspace({
        workspaceId: workspace.id,
        projectId: workspace.projectId,
        name: workspace.name,
        description: workspace.description,
        status: workspace.status,
        createdBy: workspace.createdBy,
        members: [...workspace.members],
        artifactMap: Object.fromEntries(workspace.artifacts.entries()),
        metadata: workspace.metadata ?? {},
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
        closedAt,
      });
    });
  }

  private persistWorkspaceArtifact(
    workspace: ProjectWorkspace,
    artifactKey: string,
    version: ArtifactVersion,
    source: string,
  ): void {
    if (!this.persistenceStore) {
      return;
    }

    const artifactId = workspace.artifacts.get(artifactKey);
    if (!artifactId) {
      return;
    }

    const expectedVersion = Math.max(0, version.version - 1);

    this.schedulePersistence('workspace:artifact:upsert', async () => {
      const persistedEntry = await this.persistenceStore?.upsertBlackboardEntry({
        workspaceId: workspace.id,
        artifactKey,
        artifactId,
        artifactType: 'workspace_artifact',
        source,
        payload: {
          workspaceId: workspace.id,
          artifactKey,
          data: version.data as unknown,
          version: version.version,
          author: version.author,
          timestamp: version.timestamp,
          changeType: version.changeType,
          metadata: version.metadata ?? {},
        },
        expectedVersion,
        timestamp: version.timestamp,
      });

      if (!persistedEntry) {
        return;
      }

      this.eventBus.publish(
        expectedVersion === 0 ? 'blackboard:entry:created' : 'blackboard:entry:updated',
        {
          workspaceId: workspace.id,
          artifactKey,
          artifactId,
          source,
          version: persistedEntry.version,
          updatedAt: persistedEntry.updatedAt,
        },
        {
          aggregateType: 'blackboard',
          aggregateId: artifactId,
        },
      );
    });
  }

  private persistFeedbackThread(workspaceId: string, thread: FeedbackThread): void {
    if (!this.persistenceStore) {
      return;
    }

    this.schedulePersistence('workspace:feedback:upsert', async () => {
      await this.persistenceStore?.saveBlackboardFeedback({
        workspaceId,
        feedbackId: thread.id,
        targetId: thread.artifactId,
        sourceActor: thread.author,
        content: thread.initialComment,
        severity: thread.severity,
        status: thread.status,
        metadata: {
          comments: thread.comments,
          tags: thread.tags ?? [],
          location: thread.location,
          metadata: thread.metadata ?? {},
        },
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
      });
    });
  }

  private persistWorkspaceDeletion(workspace: ProjectWorkspace): void {
    if (!this.persistenceStore) {
      return;
    }

    const deletedAt = this.nextTimestamp();
    this.schedulePersistence('workspace:delete', async () => {
      await this.persistenceStore?.upsertWorkspace({
        workspaceId: workspace.id,
        projectId: workspace.projectId,
        name: workspace.name,
        description: workspace.description,
        status: workspace.status,
        createdBy: workspace.createdBy,
        members: [...workspace.members],
        artifactMap: Object.fromEntries(workspace.artifacts.entries()),
        metadata: workspace.metadata ?? {},
        createdAt: workspace.createdAt,
        updatedAt: deletedAt,
        deletedAt,
      });
    });
  }

  private schedulePersistence(operation: string, task: () => Promise<void>): void {
    const promise = task()
      .catch((error) => {
        logger.error('[CollaborativeWorkspace] Persistence operation failed', {
          operation,
          error: error instanceof Error ? error.message : String(error),
        });
      })
      .finally(() => {
        this.pendingPersistenceWrites.delete(promise);
      });

    this.pendingPersistenceWrites.add(promise);
  }

  private async hydrateFromPersistence(): Promise<void> {
    if (!this.persistenceStore) {
      return;
    }

    const persistedWorkspaces = await this.persistenceStore.listWorkspaces(undefined, false);

    this.workspaces.clear();
    this.projectWorkspaces.clear();

    for (const record of persistedWorkspaces) {
      const workspace: ProjectWorkspace = {
        id: record.workspaceId,
        projectId: record.projectId,
        name: record.name,
        description: record.description,
        status: record.status as WorkspaceStatus,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        createdBy: record.createdBy,
        members: record.members,
        artifacts: new Map(Object.entries(record.artifactMap)),
        metadata: record.metadata,
      };

      this.workspaces.set(workspace.id, workspace);
      if (!this.projectWorkspaces.has(workspace.projectId)) {
        this.projectWorkspaces.set(workspace.projectId, new Set());
      }
      this.projectWorkspaces.get(workspace.projectId)?.add(workspace.id);

      const persistedEntries = await this.persistenceStore.listBlackboardEntries(workspace.id);
      for (const entry of persistedEntries) {
        workspace.artifacts.set(entry.artifactKey, entry.artifactId);

        const payloadRecord = entry.payload;
        const lineage = Array.from({ length: Math.max(entry.version, 1) }, (_, index) => `${entry.artifactId}-v${index + 1}`);
        this.versioning.restoreArtifactVersions(entry.artifactId, [
          {
            id: `${entry.artifactId}-v${entry.version}`,
            artifactId: entry.artifactId,
            version: entry.version,
            data: payloadRecord.data,
            source: entry.source,
            author: typeof payloadRecord.author === 'string' ? payloadRecord.author : 'system',
            timestamp: typeof payloadRecord.timestamp === 'string' ? payloadRecord.timestamp : entry.updatedAt,
            changeType: entry.version <= 1 ? 'create' : 'update',
            changeDescription: 'Hydrated from persistent blackboard state',
            lineage,
            metadata: {
              ...(isRecord(payloadRecord.metadata) ? payloadRecord.metadata : {}),
              restoredFromPersistence: true,
            },
          },
        ]);
      }

      const persistedFeedback = await this.persistenceStore.listBlackboardFeedback(workspace.id);
      for (const feedbackRecord of persistedFeedback) {
        this.feedback.restoreThread({
          id: feedbackRecord.feedbackId,
          artifactId: feedbackRecord.targetId,
          author: feedbackRecord.sourceActor,
          title: `Recovered feedback ${feedbackRecord.feedbackId}`,
          initialComment: feedbackRecord.content,
          severity: feedbackRecord.severity as 'nit' | 'blocking' | 'critical',
          status: feedbackRecord.status as 'pending' | 'addressed' | 'wontfix' | 'in_progress',
          comments: [
            {
              id: `${feedbackRecord.feedbackId}-comment-1`,
              threadId: feedbackRecord.feedbackId,
              author: feedbackRecord.sourceActor,
              content: feedbackRecord.content,
              timestamp: feedbackRecord.createdAt,
            },
          ],
          createdAt: feedbackRecord.createdAt,
          updatedAt: feedbackRecord.updatedAt,
          tags: [],
          metadata: feedbackRecord.metadata,
        });
      }
    }
  }

  /**
   * Get workspace ID for artifact (helper)
   */
  private getWorkspaceIdForArtifact(artifactId: string): string | undefined {
    const workspace = this.findWorkspaceByArtifactId(artifactId);
    return workspace?.id;
  }

  /**
   * Find workspace by artifact ID
   */
  private findWorkspaceByArtifactId(artifactId: string): ProjectWorkspace | undefined {
    for (const workspace of this.workspaces.values()) {
      for (const [, id] of workspace.artifacts) {
        if (id === artifactId) {
          return workspace;
        }
      }
    }
    return undefined;
  }

  /**
   * Get artifact key from artifact ID
   */
  private getArtifactKeyById(workspace: ProjectWorkspace, artifactId: string): string {
    for (const [key, id] of workspace.artifacts) {
      if (id === artifactId) return key;
    }
    return artifactId;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export default CollaborativeWorkspace;
