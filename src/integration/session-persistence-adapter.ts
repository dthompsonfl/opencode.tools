import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { randomUUID } from 'crypto';
import {
  migrateUnifiedState,
  type SnapshotDescriptor,
  type SnapshotMetadata,
  type UnifiedState,
  type UnifiedStatePersistenceAdapter,
  type UnifiedStateSnapshot,
} from './types';

export interface SessionPersistenceAdapterOptions {
  basePath?: string;
  now?: () => number;
  snapshotIdFactory?: () => string;
}

interface ParsedSnapshot {
  snapshotId: string;
  metadata: SnapshotMetadata;
  state: UnifiedState;
}

const SAFE_SNAPSHOT_ID = /^[a-zA-Z0-9_-]+$/;

function sanitizeProjectId(projectId: string): string {
  const normalized = projectId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return normalized.length > 0 ? normalized : 'default';
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export class SessionPersistenceAdapter implements UnifiedStatePersistenceAdapter {
  private readonly basePath: string;
  private readonly now: () => number;
  private readonly snapshotIdFactory: () => string;

  constructor(options: SessionPersistenceAdapterOptions = {}) {
    this.basePath = options.basePath ?? path.join(os.tmpdir(), 'opencode-tools', 'session-snapshots');
    this.now = options.now ?? (() => Date.now());
    this.snapshotIdFactory = options.snapshotIdFactory ?? (() => randomUUID());
  }

  public async saveSnapshot(state: UnifiedState, metadata: SnapshotMetadata): Promise<UnifiedStateSnapshot> {
    const savedAt = metadata.savedAt || this.now();
    const normalizedState = migrateUnifiedState(state, metadata, savedAt);
    const snapshotId = `${savedAt}-${this.snapshotIdFactory()}`;
    if (!SAFE_SNAPSHOT_ID.test(snapshotId)) {
      throw new Error('Generated snapshot ID contains unsupported characters');
    }
    const snapshot: UnifiedStateSnapshot = {
      snapshotId,
      metadata: {
        ...metadata,
        savedAt,
      },
      state: normalizedState,
    };

    const projectDir = this.getProjectDir(metadata.projectId);
    await fs.mkdir(projectDir, { recursive: true });
    const snapshotPath = this.getSnapshotPath(projectDir, snapshotId);
    await fs.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf8');

    return snapshot;
  }

  public async loadLatestSnapshot(projectId: string): Promise<UnifiedStateSnapshot | null> {
    const snapshots = await this.listSnapshots(projectId);
    if (snapshots.length === 0) {
      return null;
    }

    const latest = snapshots[0];
    const snapshotPath = this.getSnapshotPath(this.getProjectDir(projectId), latest.snapshotId);
    const raw = await fs.readFile(snapshotPath, 'utf8');
    const parsed = this.parseSnapshot(raw, projectId);

    return {
      snapshotId: parsed.snapshotId,
      metadata: parsed.metadata,
      state: parsed.state,
    };
  }

  public async listSnapshots(projectId: string): Promise<SnapshotDescriptor[]> {
    const projectDir = this.getProjectDir(projectId);
    try {
      const fileNames = await fs.readdir(projectDir);
      const snapshotFiles = fileNames.filter((fileName) => fileName.endsWith('.json'));
      const descriptors: SnapshotDescriptor[] = [];

      for (const fileName of snapshotFiles) {
        const snapshotIdFromFile = path.basename(fileName, '.json');
        if (!SAFE_SNAPSHOT_ID.test(snapshotIdFromFile)) {
          continue;
        }

        const fullPath = path.join(projectDir, fileName);
        const raw = await fs.readFile(fullPath, 'utf8');
        try {
          const parsed = this.parseSnapshot(raw, projectId);
          descriptors.push({
            snapshotId: snapshotIdFromFile,
            projectId: parsed.metadata.projectId,
            runId: parsed.metadata.runId,
            sessionId: parsed.metadata.sessionId,
            savedAt: parsed.metadata.savedAt,
            version: parsed.state.version,
          });
        } catch {
          continue;
        }
      }

      return descriptors.sort((left, right) => right.savedAt - left.savedAt);
    } catch {
      return [];
    }
  }

  private parseSnapshot(raw: string, fallbackProjectId: string): ParsedSnapshot {
    const parsedRoot = JSON.parse(raw) as unknown;
    const root = asRecord(parsedRoot);

    const metadataRecord = asRecord(root.metadata);
    const metadata: SnapshotMetadata = {
      projectId: asString(metadataRecord.projectId, fallbackProjectId),
      runId: asString(metadataRecord.runId, 'unknown-run'),
      sessionId: asString(metadataRecord.sessionId, 'unknown-session'),
      savedAt: asNumber(metadataRecord.savedAt, this.now()),
      source: asOptionalString(metadataRecord.source),
      label: asOptionalString(metadataRecord.label),
    };

    const state = migrateUnifiedState(root.state, {
      projectId: metadata.projectId,
      runId: metadata.runId,
      sessionId: metadata.sessionId,
    }, metadata.savedAt);

    return {
      snapshotId: asString(root.snapshotId, `${metadata.savedAt}-${this.snapshotIdFactory()}`),
      metadata,
      state,
    };
  }

  private getProjectDir(projectId: string): string {
    return this.resolveWithinBase(this.basePath, sanitizeProjectId(projectId));
  }

  private getSnapshotPath(projectDir: string, snapshotId: string): string {
    if (!SAFE_SNAPSHOT_ID.test(snapshotId)) {
      throw new Error(`Invalid snapshot ID: ${snapshotId}`);
    }

    return this.resolveWithinBase(projectDir, `${snapshotId}.json`);
  }

  private resolveWithinBase(baseDir: string, childName: string): string {
    const resolvedBase = path.resolve(baseDir);
    const resolvedChild = path.resolve(resolvedBase, childName);
    const withSeparator = `${resolvedBase}${path.sep}`;
    if (resolvedChild !== resolvedBase && !resolvedChild.startsWith(withSeparator)) {
      throw new Error('Resolved path escaped persistence base directory');
    }

    return resolvedChild;
  }
}
