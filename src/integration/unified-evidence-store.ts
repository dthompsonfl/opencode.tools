import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const GENESIS_PREVIOUS_HASH = 'GENESIS';

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

export interface EvidenceRecord {
  id: string;
  projectId: string;
  runId: string;
  source: string;
  type: string;
  data: JsonValue;
  timestamp: string;
  hash: string;
  previousHash: string;
}

export interface EvidenceRecordInput {
  id?: string;
  projectId: string;
  runId: string;
  source: string;
  type: string;
  data: JsonValue;
  timestamp?: string;
}

export interface EvidenceListFilters {
  runId?: string;
  source?: string;
  type?: string;
  fromTimestamp?: string;
  toTimestamp?: string;
}

export interface ChainVerificationResult {
  valid: boolean;
  checked: number;
  error?: {
    index: number;
    recordId: string;
    reason: 'INVALID_PREVIOUS_HASH' | 'INVALID_RECORD_HASH';
    expected: string;
    actual: string;
  };
}

export interface EvidenceExport {
  projectId: string;
  exportedAt: string;
  recordCount: number;
  chainValid: boolean;
  records: EvidenceRecord[];
}

export interface UnifiedEvidenceStoreOptions {
  persistenceFilePath?: string;
}

interface PersistedStoreShape {
  version: 1;
  records: EvidenceRecord[];
}

export class UnifiedEvidenceStore {
  private readonly recordsByProject = new Map<string, EvidenceRecord[]>();
  private readonly persistenceFilePath?: string;
  private appendCounter = 0;

  constructor(options: UnifiedEvidenceStoreOptions = {}) {
    this.persistenceFilePath = options.persistenceFilePath;
    this.loadFromDisk();
  }

  append(recordInput: EvidenceRecordInput): EvidenceRecord {
    this.assertProjectChainHealthy(recordInput.projectId);

    const projectRecords = this.recordsByProject.get(recordInput.projectId) ?? [];
    const previousHash = projectRecords.length > 0
      ? projectRecords[projectRecords.length - 1].hash
      : GENESIS_PREVIOUS_HASH;

    const timestamp = recordInput.timestamp ?? new Date().toISOString();
    const id = recordInput.id ?? this.generateId(recordInput.projectId);

    const recordWithoutHash: Omit<EvidenceRecord, 'hash'> = {
      id,
      projectId: recordInput.projectId,
      runId: recordInput.runId,
      source: recordInput.source,
      type: recordInput.type,
      data: cloneJson(recordInput.data),
      timestamp,
      previousHash,
    };

    const record: EvidenceRecord = {
      ...recordWithoutHash,
      hash: this.computeRecordHash(recordWithoutHash),
    };

    projectRecords.push(record);
    this.recordsByProject.set(record.projectId, projectRecords);
    this.persistToDisk();
    return cloneRecord(record);
  }

  list(projectId: string, filters: EvidenceListFilters = {}): EvidenceRecord[] {
    const records = this.recordsByProject.get(projectId) ?? [];

    return records
      .filter((record) => this.matchesFilters(record, filters))
      .map((record) => cloneRecord(record));
  }

  verifyChain(projectId: string): ChainVerificationResult {
    const records = this.recordsByProject.get(projectId) ?? [];

    for (let index = 0; index < records.length; index += 1) {
      const record = records[index];
      const expectedPreviousHash = index === 0 ? GENESIS_PREVIOUS_HASH : records[index - 1].hash;

      if (record.previousHash !== expectedPreviousHash) {
        return {
          valid: false,
          checked: index + 1,
          error: {
            index,
            recordId: record.id,
            reason: 'INVALID_PREVIOUS_HASH',
            expected: expectedPreviousHash,
            actual: record.previousHash,
          },
        };
      }

      const recalculatedHash = this.computeRecordHash({
        id: record.id,
        projectId: record.projectId,
        runId: record.runId,
        source: record.source,
        type: record.type,
        data: record.data,
        timestamp: record.timestamp,
        previousHash: record.previousHash,
      });

      if (record.hash !== recalculatedHash) {
        return {
          valid: false,
          checked: index + 1,
          error: {
            index,
            recordId: record.id,
            reason: 'INVALID_RECORD_HASH',
            expected: recalculatedHash,
            actual: record.hash,
          },
        };
      }
    }

    return {
      valid: true,
      checked: records.length,
    };
  }

  findByRun(runId: string): EvidenceRecord[] {
    const matches: EvidenceRecord[] = [];

    for (const records of this.recordsByProject.values()) {
      for (const record of records) {
        if (record.runId === runId) {
          matches.push(cloneRecord(record));
        }
      }
    }

    return matches.sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id));
  }

  export(projectId: string): EvidenceExport {
    const records = this.list(projectId);
    const chainResult = this.verifyChain(projectId);

    return {
      projectId,
      exportedAt: new Date().toISOString(),
      recordCount: records.length,
      chainValid: chainResult.valid,
      records,
    };
  }

  private matchesFilters(record: EvidenceRecord, filters: EvidenceListFilters): boolean {
    if (filters.runId && record.runId !== filters.runId) {
      return false;
    }

    if (filters.source && record.source !== filters.source) {
      return false;
    }

    if (filters.type && record.type !== filters.type) {
      return false;
    }

    if (filters.fromTimestamp && record.timestamp < filters.fromTimestamp) {
      return false;
    }

    if (filters.toTimestamp && record.timestamp > filters.toTimestamp) {
      return false;
    }

    return true;
  }

  private computeRecordHash(record: Omit<EvidenceRecord, 'hash'>): string {
    const payload = stableStringify(record);
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  private loadFromDisk(): void {
    if (!this.persistenceFilePath || !fs.existsSync(this.persistenceFilePath)) {
      return;
    }

    const rawContent = fs.readFileSync(this.persistenceFilePath, 'utf-8');
    const parsed = JSON.parse(rawContent) as Partial<PersistedStoreShape>;
    if (parsed.version !== 1) {
      throw new Error(`Unsupported evidence store version: ${String(parsed.version)}`);
    }
    const persistedRecords = Array.isArray(parsed.records) ? parsed.records : [];

    this.recordsByProject.clear();

    for (const persisted of persistedRecords) {
      const record = this.parsePersistedRecord(persisted);
      const projectRecords = this.recordsByProject.get(record.projectId) ?? [];
      projectRecords.push(cloneRecord(record));
      this.recordsByProject.set(record.projectId, projectRecords);
    }

    for (const projectId of this.recordsByProject.keys()) {
      this.assertProjectChainHealthy(projectId);
    }

    this.appendCounter = persistedRecords.length;
  }

  private assertProjectChainHealthy(projectId: string): void {
    const chain = this.verifyChain(projectId);
    if (!chain.valid) {
      const recordId = chain.error?.recordId ?? 'unknown';
      const reason = chain.error?.reason ?? 'UNKNOWN';
      throw new Error(`Evidence chain integrity check failed for project "${projectId}" at record "${recordId}": ${reason}`);
    }
  }

  private parsePersistedRecord(value: unknown): EvidenceRecord {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('Invalid evidence record: expected object');
    }

    const raw = value as Partial<EvidenceRecord>;
    if (
      typeof raw.id !== 'string' ||
      typeof raw.projectId !== 'string' ||
      typeof raw.runId !== 'string' ||
      typeof raw.source !== 'string' ||
      typeof raw.type !== 'string' ||
      typeof raw.timestamp !== 'string' ||
      typeof raw.hash !== 'string' ||
      typeof raw.previousHash !== 'string'
    ) {
      throw new Error('Invalid evidence record: missing required fields');
    }

    return {
      id: raw.id,
      projectId: raw.projectId,
      runId: raw.runId,
      source: raw.source,
      type: raw.type,
      data: cloneJson((raw.data ?? null) as JsonValue),
      timestamp: raw.timestamp,
      hash: raw.hash,
      previousHash: raw.previousHash,
    };
  }

  private persistToDisk(): void {
    if (!this.persistenceFilePath) {
      return;
    }

    const directory = path.dirname(this.persistenceFilePath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    const records: EvidenceRecord[] = [];
    for (const projectRecords of this.recordsByProject.values()) {
      records.push(...projectRecords.map((record) => cloneRecord(record)));
    }

    const payload: PersistedStoreShape = {
      version: 1,
      records,
    };

    fs.writeFileSync(this.persistenceFilePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
  }

  private generateId(projectId: string): string {
    this.appendCounter += 1;
    const digest = crypto
      .createHash('sha256')
      .update(`${projectId}:${Date.now().toString(36)}:${this.appendCounter.toString(36)}`)
      .digest('hex')
      .slice(0, 12);

    return `ev-${digest}`;
  }
}

function cloneJson(value: JsonValue): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

function cloneRecord(record: EvidenceRecord): EvidenceRecord {
  return {
    ...record,
    data: cloneJson(record.data),
  };
}

function stableStringify(value: JsonValue | Omit<EvidenceRecord, 'hash'>): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: JsonValue | Omit<EvidenceRecord, 'hash'>): JsonValue {
  if (Array.isArray(value)) {
    return value.map((item) => sortValue(item as JsonValue));
  }

  if (value !== null && typeof value === 'object') {
    const sortedObject: { [key: string]: JsonValue } = {};
    const keys = Object.keys(value).sort();

    for (const key of keys) {
      const nestedValue = (value as Record<string, JsonValue>)[key];
      sortedObject[key] = sortValue(nestedValue);
    }

    return sortedObject;
  }

  return value;
}
