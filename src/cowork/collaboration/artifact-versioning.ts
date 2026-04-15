/**
 * Artifact Versioning System
 * 
 * Provides version history, diff capabilities, rollback support, and lineage tracking
 * for artifacts in the collaborative workspace.
 */

import { logger } from '../../runtime/logger';
import { EventBus } from '../orchestrator/event-bus';

export interface ArtifactVersion<T = any> {
  id: string;
  artifactId: string;
  version: number;
  data: T;
  source: string;
  author: string;
  timestamp: string;
  changeType: 'create' | 'update' | 'delete' | 'rollback';
  changeDescription?: string;
  parentVersionId?: string;
  lineage: string[];
  metadata?: Record<string, unknown>;
}

export interface VersionDiff {
  versionFrom: number;
  versionTo: number;
  timestamp: string;
  changes: Array<{
    path: string;
    operation: 'added' | 'removed' | 'modified';
    oldValue?: unknown;
    newValue?: unknown;
  }>;
  summary: string;
}

export interface VersionLineage {
  artifactId: string;
  versions: ArtifactVersion[];
  branches: string[][];
  currentVersion: number;
}

export class ArtifactVersioning {
  private static instance: ArtifactVersioning;
  private versions: Map<string, ArtifactVersion[]> = new Map();
  private currentVersion: Map<string, number> = new Map();
  private eventBus: EventBus;

  private constructor() {
    this.eventBus = EventBus.getInstance();
  }

  public static getInstance(): ArtifactVersioning {
    if (!ArtifactVersioning.instance) {
      ArtifactVersioning.instance = new ArtifactVersioning();
    }
    return ArtifactVersioning.instance;
  }

  /**
   * Create initial version of an artifact
   */
  public createVersion<T>(
    artifactId: string,
    data: T,
    source: string,
    author: string,
    changeDescription?: string,
    metadata?: Record<string, unknown>
  ): ArtifactVersion<T> {
    const versionNumber = 1;
    const versionId = `${artifactId}-v${versionNumber}`;
    
    const version: ArtifactVersion<T> = {
      id: versionId,
      artifactId,
      version: versionNumber,
      data,
      source,
      author,
      timestamp: new Date().toISOString(),
      changeType: 'create',
      changeDescription,
      lineage: [versionId],
      metadata
    };

    this.versions.set(artifactId, [version]);
    this.currentVersion.set(artifactId, versionNumber);

    this.eventBus.publish('artifact:version:created', version);
    logger.debug(`[ArtifactVersioning] Created version ${versionNumber} for artifact ${artifactId}`);

    return version;
  }

  /**
   * Create new version from current
   */
  public updateVersion<T>(
    artifactId: string,
    data: T,
    source: string,
    author: string,
    changeDescription?: string,
    metadata?: Record<string, unknown>
  ): ArtifactVersion<T> | null {
    const existingVersions = this.versions.get(artifactId);
    if (!existingVersions || existingVersions.length === 0) {
      logger.warn(`[ArtifactVersioning] Cannot update non-existent artifact: ${artifactId}`);
      return null;
    }

    const currentVersionNum = this.currentVersion.get(artifactId) || 0;
    const newVersionNum = currentVersionNum + 1;
    const versionId = `${artifactId}-v${newVersionNum}`;
    const parentVersion = existingVersions[existingVersions.length - 1];

    const version: ArtifactVersion<T> = {
      id: versionId,
      artifactId,
      version: newVersionNum,
      data,
      source,
      author,
      timestamp: new Date().toISOString(),
      changeType: 'update',
      changeDescription,
      parentVersionId: parentVersion.id,
      lineage: [...parentVersion.lineage, versionId],
      metadata
    };

    existingVersions.push(version);
    this.currentVersion.set(artifactId, newVersionNum);

    this.eventBus.publish('artifact:version:updated', version);
    logger.debug(`[ArtifactVersioning] Created version ${newVersionNum} for artifact ${artifactId}`);

    return version;
  }

  /**
   * Get specific version of an artifact
   */
  public getVersion<T>(artifactId: string, version: number): ArtifactVersion<T> | undefined {
    const versions = this.versions.get(artifactId);
    if (!versions) return undefined;
    return versions.find(v => v.version === version) as ArtifactVersion<T> | undefined;
  }

  /**
   * Get current version of an artifact
   */
  public getCurrentVersion<T>(artifactId: string): ArtifactVersion<T> | undefined {
    const currentVersionNum = this.currentVersion.get(artifactId);
    if (!currentVersionNum) return undefined;
    return this.getVersion<T>(artifactId, currentVersionNum);
  }

  /**
   * Get all versions of an artifact
   */
  public getVersionHistory(artifactId: string): ArtifactVersion[] {
    return this.versions.get(artifactId) || [];
  }

  /**
   * Get current version number
   */
  public getCurrentVersionNumber(artifactId: string): number {
    return this.currentVersion.get(artifactId) || 0;
  }

  /**
   * Rollback to a specific version
   */
  public rollbackToVersion<T>(
    artifactId: string,
    targetVersion: number,
    author: string,
    reason?: string
  ): ArtifactVersion<T> | null {
    const versions = this.versions.get(artifactId);
    if (!versions) {
      logger.warn(`[ArtifactVersioning] Cannot rollback non-existent artifact: ${artifactId}`);
      return null;
    }

    const target = versions.find(v => v.version === targetVersion);
    if (!target) {
      logger.warn(`[ArtifactVersioning] Target version ${targetVersion} not found for artifact ${artifactId}`);
      return null;
    }

    const currentVersionNum = this.currentVersion.get(artifactId) || 0;
    const newVersionNum = currentVersionNum + 1;
    const versionId = `${artifactId}-v${newVersionNum}`;

    const rollbackVersion: ArtifactVersion<T> = {
      id: versionId,
      artifactId,
      version: newVersionNum,
      data: target.data as T,
      source: target.source,
      author,
      timestamp: new Date().toISOString(),
      changeType: 'rollback',
      changeDescription: reason || `Rolled back to version ${targetVersion}`,
      parentVersionId: versions[versions.length - 1].id,
      lineage: [...versions[versions.length - 1].lineage, versionId],
      metadata: {
        ...target.metadata,
        rollbackFrom: currentVersionNum,
        rollbackTo: targetVersion
      }
    };

    versions.push(rollbackVersion);
    this.currentVersion.set(artifactId, newVersionNum);

    this.eventBus.publish('artifact:version:rollback', rollbackVersion);
    logger.info(`[ArtifactVersioning] Rolled back artifact ${artifactId} to version ${targetVersion} (new version: ${newVersionNum})`);

    return rollbackVersion;
  }

  /**
   * Calculate diff between two versions
   */
  public calculateDiff(artifactId: string, versionFrom: number, versionTo: number): VersionDiff | null {
    const v1 = this.getVersion(artifactId, versionFrom);
    const v2 = this.getVersion(artifactId, versionTo);

    if (!v1 || !v2) {
      logger.warn(`[ArtifactVersioning] Cannot calculate diff: one or both versions not found`);
      return null;
    }

    const changes = this.deepDiff(v1.data, v2.data);

    return {
      versionFrom,
      versionTo,
      timestamp: new Date().toISOString(),
      changes,
      summary: `Changed ${changes.length} field(s) between v${versionFrom} and v${versionTo}`
    };
  }

  /**
   * Get lineage for an artifact
   */
  public getLineage(artifactId: string): VersionLineage | null {
    const versions = this.versions.get(artifactId);
    if (!versions) return null;

    const currentVersionNum = this.currentVersion.get(artifactId) || 0;

    return {
      artifactId,
      versions,
      branches: versions.map(v => v.lineage),
      currentVersion: currentVersionNum
    };
  }

  /**
   * Check if artifact has versions
   */
  public hasVersions(artifactId: string): boolean {
    const versions = this.versions.get(artifactId);
    return !!versions && versions.length > 0;
  }

  /**
   * Delete all versions of an artifact
   */
  public deleteArtifact(artifactId: string, author: string, reason?: string): boolean {
    const versions = this.versions.get(artifactId);
    if (!versions) return false;

    const currentVersionNum = this.currentVersion.get(artifactId) || 0;
    const versionId = `${artifactId}-v${currentVersionNum + 1}`;
    const parentVersion = versions[versions.length - 1];

    const deleteVersion: ArtifactVersion = {
      id: versionId,
      artifactId,
      version: currentVersionNum + 1,
      data: null,
      source: 'system',
      author,
      timestamp: new Date().toISOString(),
      changeType: 'delete',
      changeDescription: reason || 'Artifact deleted',
      parentVersionId: parentVersion.id,
      lineage: [...parentVersion.lineage, versionId]
    };

    versions.push(deleteVersion);
    this.currentVersion.set(artifactId, currentVersionNum + 1);

    this.eventBus.publish('artifact:version:deleted', deleteVersion);
    logger.info(`[ArtifactVersioning] Deleted artifact ${artifactId}`);

    return true;
  }

  /**
   * Get all artifact IDs with versions
   */
  public getAllArtifactIds(): string[] {
    return Array.from(this.versions.keys());
  }

  /**
   * Restore persisted artifact versions without emitting events.
   */
  public restoreArtifactVersions<T>(artifactId: string, versions: ArtifactVersion<T>[]): void {
    if (versions.length === 0) {
      return;
    }

    const sorted = [...versions].sort((left, right) => left.version - right.version);
    this.versions.set(artifactId, sorted as ArtifactVersion[]);
    this.currentVersion.set(artifactId, sorted[sorted.length - 1].version);
  }

  /**
   * Clear all versions (use with caution - mainly for testing)
   */
  public clear(): void {
    this.versions.clear();
    this.currentVersion.clear();
    logger.warn('[ArtifactVersioning] All versions cleared');
  }

  /**
   * Deep diff two objects
   */
  private deepDiff(obj1: unknown, obj2: unknown, path = ''): VersionDiff['changes'] {
    const changes: VersionDiff['changes'] = [];

    if (typeof obj1 !== typeof obj2) {
      changes.push({
        path: path || 'root',
        operation: 'modified',
        oldValue: obj1,
        newValue: obj2
      });
      return changes;
    }

    if (typeof obj1 !== 'object' || obj1 === null || obj2 === null) {
      if (obj1 !== obj2) {
        changes.push({
          path: path || 'root',
          operation: 'modified',
          oldValue: obj1,
          newValue: obj2
        });
      }
      return changes;
    }

    const keys1 = Object.keys(obj1 as object);
    const keys2 = Object.keys(obj2 as object);
    const allKeys = new Set([...keys1, ...keys2]);

    for (const key of allKeys) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (!(key in (obj1 as object))) {
        changes.push({
          path: currentPath,
          operation: 'added',
          newValue: (obj2 as Record<string, unknown>)[key]
        });
      } else if (!(key in (obj2 as object))) {
        changes.push({
          path: currentPath,
          operation: 'removed',
          oldValue: (obj1 as Record<string, unknown>)[key]
        });
      } else {
        const nestedChanges = this.deepDiff(
          (obj1 as Record<string, unknown>)[key],
          (obj2 as Record<string, unknown>)[key],
          currentPath
        );
        changes.push(...nestedChanges);
      }
    }

    return changes;
  }
}

export default ArtifactVersioning;
