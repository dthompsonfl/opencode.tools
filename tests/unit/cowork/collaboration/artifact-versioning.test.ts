import { ArtifactVersioning, ArtifactVersion, VersionDiff } from '../../../../src/cowork/collaboration/artifact-versioning';
import { EventBus } from '../../../../src/cowork/orchestrator/event-bus';

describe('ArtifactVersioning', () => {
  let versioning: ArtifactVersioning;
  let eventBus: EventBus;

  beforeEach(() => {
    versioning = ArtifactVersioning.getInstance();
    versioning.clear();
    eventBus = EventBus.getInstance();
    jest.clearAllMocks();
  });

  describe('createVersion', () => {
    it('should create initial version of an artifact', () => {
      const version = versioning.createVersion(
        'test-artifact',
        { content: 'initial data' },
        'test-source',
        'author-1'
      );

      expect(version).toBeDefined();
      expect(version.version).toBe(1);
      expect(version.artifactId).toBe('test-artifact');
      expect(version.data).toEqual({ content: 'initial data' });
      expect(version.changeType).toBe('create');
    });

    it('should emit artifact:version:created event', () => {
      const publishSpy = jest.spyOn(eventBus, 'publish');

      versioning.createVersion('test-artifact', { data: 'test' }, 'source', 'author');

      expect(publishSpy).toHaveBeenCalledWith(
        'artifact:version:created',
        expect.objectContaining({
          artifactId: 'test-artifact',
          version: 1
        })
      );
    });
  });

  describe('updateVersion', () => {
    it('should create new version from existing artifact', () => {
      versioning.createVersion('test-artifact', { content: 'v1' }, 'source', 'author-1');
      
      const version2 = versioning.updateVersion(
        'test-artifact',
        { content: 'v2' },
        'source',
        'author-2',
        'Updated content'
      );

      expect(version2).toBeDefined();
      expect(version2?.version).toBe(2);
      expect(version2?.changeType).toBe('update');
      expect(version2?.changeDescription).toBe('Updated content');
    });

    it('should return null for non-existent artifact', () => {
      const result = versioning.updateVersion('non-existent', { data: 'test' }, 'source', 'author');
      expect(result).toBeNull();
    });

    it('should maintain lineage across versions', () => {
      const v1 = versioning.createVersion('test-artifact', { data: 1 }, 'source', 'author');
      const v2 = versioning.updateVersion('test-artifact', { data: 2 }, 'source', 'author');
      const v3 = versioning.updateVersion('test-artifact', { data: 3 }, 'source', 'author');

      expect(v2?.lineage).toContain(v1.id);
      expect(v3?.lineage).toContain(v1.id);
      expect(v3?.lineage).toContain(v2?.id);
    });
  });

  describe('getVersion and getCurrentVersion', () => {
    it('should retrieve specific version', () => {
      versioning.createVersion('test-artifact', { v: 1 }, 'source', 'author');
      versioning.updateVersion('test-artifact', { v: 2 }, 'source', 'author');
      versioning.updateVersion('test-artifact', { v: 3 }, 'source', 'author');

      const v2 = versioning.getVersion('test-artifact', 2);
      expect(v2?.data).toEqual({ v: 2 });
    });

    it('should retrieve current version', () => {
      versioning.createVersion('test-artifact', { v: 1 }, 'source', 'author');
      versioning.updateVersion('test-artifact', { v: 2 }, 'source', 'author');

      const current = versioning.getCurrentVersion('test-artifact');
      expect(current?.data).toEqual({ v: 2 });
    });

    it('should return undefined for non-existent version', () => {
      versioning.createVersion('test-artifact', { v: 1 }, 'source', 'author');
      const result = versioning.getVersion('test-artifact', 999);
      expect(result).toBeUndefined();
    });
  });

  describe('getVersionHistory', () => {
    it('should return all versions in order', () => {
      versioning.createVersion('test-artifact', { v: 1 }, 'source', 'author');
      versioning.updateVersion('test-artifact', { v: 2 }, 'source', 'author');
      versioning.updateVersion('test-artifact', { v: 3 }, 'source', 'author');

      const history = versioning.getVersionHistory('test-artifact');
      expect(history).toHaveLength(3);
      expect(history[0].version).toBe(1);
      expect(history[1].version).toBe(2);
      expect(history[2].version).toBe(3);
    });
  });

  describe('rollbackToVersion', () => {
    it('should create rollback version pointing to target', () => {
      versioning.createVersion('test-artifact', { content: 'v1' }, 'source', 'author');
      versioning.updateVersion('test-artifact', { content: 'v2' }, 'source', 'author');
      versioning.updateVersion('test-artifact', { content: 'v3' }, 'source', 'author');

      const rollback = versioning.rollbackToVersion('test-artifact', 1, 'admin', 'Rolling back to stable version');

      expect(rollback).toBeDefined();
      expect(rollback?.version).toBe(4);
      expect(rollback?.changeType).toBe('rollback');
      expect(rollback?.data).toEqual({ content: 'v1' });
      expect(rollback?.metadata).toMatchObject({
        rollbackFrom: 3,
        rollbackTo: 1
      });
    });

    it('should return null for non-existent artifact', () => {
      const result = versioning.rollbackToVersion('non-existent', 1, 'admin');
      expect(result).toBeNull();
    });

    it('should return null for non-existent version', () => {
      versioning.createVersion('test-artifact', { data: 'test' }, 'source', 'author');
      const result = versioning.rollbackToVersion('test-artifact', 999, 'admin');
      expect(result).toBeNull();
    });
  });

  describe('calculateDiff', () => {
    it('should calculate diff between versions', () => {
      versioning.createVersion('test-artifact', { a: 1, b: 2 }, 'source', 'author');
      versioning.updateVersion('test-artifact', { a: 1, b: 3, c: 4 }, 'source', 'author');

      const diff = versioning.calculateDiff('test-artifact', 1, 2);

      expect(diff).toBeDefined();
      expect(diff?.versionFrom).toBe(1);
      expect(diff?.versionTo).toBe(2);
      expect(diff?.changes).toContainEqual(
        expect.objectContaining({ path: 'b', operation: 'modified' })
      );
      expect(diff?.changes).toContainEqual(
        expect.objectContaining({ path: 'c', operation: 'added' })
      );
    });

    it('should handle nested object diff', () => {
      versioning.createVersion('test-artifact', { nested: { x: 1 } }, 'source', 'author');
      versioning.updateVersion('test-artifact', { nested: { x: 2, y: 3 } }, 'source', 'author');

      const diff = versioning.calculateDiff('test-artifact', 1, 2);
      expect(diff?.changes).toContainEqual(
        expect.objectContaining({ path: 'nested.x', operation: 'modified' })
      );
      expect(diff?.changes).toContainEqual(
        expect.objectContaining({ path: 'nested.y', operation: 'added' })
      );
    });
  });

  describe('getLineage', () => {
    it('should return complete lineage', () => {
      versioning.createVersion('test-artifact', { v: 1 }, 'source', 'author');
      versioning.updateVersion('test-artifact', { v: 2 }, 'source', 'author');

      const lineage = versioning.getLineage('test-artifact');
      expect(lineage).toBeDefined();
      expect(lineage?.artifactId).toBe('test-artifact');
      expect(lineage?.versions).toHaveLength(2);
      expect(lineage?.currentVersion).toBe(2);
    });
  });

  describe('hasVersions', () => {
    it('should return true for artifacts with versions', () => {
      versioning.createVersion('test-artifact', { data: 'test' }, 'source', 'author');
      expect(versioning.hasVersions('test-artifact')).toBe(true);
    });

    it('should return false for artifacts without versions', () => {
      expect(versioning.hasVersions('non-existent')).toBe(false);
    });
  });

  describe('deleteArtifact', () => {
    it('should mark artifact as deleted', () => {
      versioning.createVersion('test-artifact', { data: 'test' }, 'source', 'author');
      versioning.updateVersion('test-artifact', { data: 'updated' }, 'source', 'author');

      const result = versioning.deleteArtifact('test-artifact', 'admin', 'Cleanup');

      expect(result).toBe(true);
      const history = versioning.getVersionHistory('test-artifact');
      expect(history[history.length - 1].changeType).toBe('delete');
    });

    it('should return false for non-existent artifact', () => {
      const result = versioning.deleteArtifact('non-existent', 'admin');
      expect(result).toBe(false);
    });
  });

  describe('getAllArtifactIds', () => {
    it('should return all artifact IDs', () => {
      versioning.createVersion('artifact-1', { data: 1 }, 'source', 'author');
      versioning.createVersion('artifact-2', { data: 2 }, 'source', 'author');

      const ids = versioning.getAllArtifactIds();
      expect(ids).toContain('artifact-1');
      expect(ids).toContain('artifact-2');
      expect(ids).toHaveLength(2);
    });
  });
});
