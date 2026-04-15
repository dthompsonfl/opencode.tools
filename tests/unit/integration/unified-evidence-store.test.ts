import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { UnifiedEvidenceStore } from '../../../src/integration/unified-evidence-store';

describe('UnifiedEvidenceStore', () => {
  describe('hash chaining', () => {
    it('verifies a valid chain for a project', () => {
      const store = new UnifiedEvidenceStore();

      store.append({
        id: 'ev-1',
        projectId: 'proj-a',
        runId: 'run-1',
        source: 'foundry',
        type: 'decision',
        data: { step: 1 },
        timestamp: '2026-01-01T00:00:00.000Z',
      });

      store.append({
        id: 'ev-2',
        projectId: 'proj-a',
        runId: 'run-1',
        source: 'cowork',
        type: 'artifact',
        data: { step: 2 },
        timestamp: '2026-01-01T00:00:01.000Z',
      });

      const chain = store.verifyChain('proj-a');
      expect(chain.valid).toBe(true);
      expect(chain.checked).toBe(2);
      expect(chain.error).toBeUndefined();
    });

    it('rejects tampered persisted evidence on load', () => {
      const filePath = createTempFilePath('evidence-chain-tamper');
      try {
        const store = new UnifiedEvidenceStore({ persistenceFilePath: filePath });
        store.append({
          id: 'ev-1',
          projectId: 'proj-b',
          runId: 'run-2',
          source: 'foundry',
          type: 'event',
          data: { ok: true },
          timestamp: '2026-01-01T00:00:00.000Z',
        });
        store.append({
          id: 'ev-2',
          projectId: 'proj-b',
          runId: 'run-2',
          source: 'tui',
          type: 'event',
          data: { ok: true },
          timestamp: '2026-01-01T00:00:01.000Z',
        });

        const persistedRaw = fs.readFileSync(filePath, 'utf-8');
        const persisted = JSON.parse(persistedRaw) as {
          version: number;
          records: Array<{ id: string; hash: string }>;
        };

        persisted.records[1].hash = 'deadbeef';
        fs.writeFileSync(filePath, JSON.stringify(persisted, null, 2), 'utf-8');

        expect(() => new UnifiedEvidenceStore({ persistenceFilePath: filePath })).toThrow(
          'Evidence chain integrity check failed',
        );
      } finally {
        cleanupFile(filePath);
      }
    });

    it('rejects append when in-memory chain was tampered', () => {
      const store = new UnifiedEvidenceStore();

      store.append({
        id: 'ev-1',
        projectId: 'proj-inmem',
        runId: 'run-1',
        source: 'foundry',
        type: 'event',
        data: { ok: true },
        timestamp: '2026-01-01T00:00:00.000Z',
      });

      const recordsByProject = (store as unknown as {
        recordsByProject: Map<string, Array<{ hash: string }>>;
      }).recordsByProject;
      const records = recordsByProject.get('proj-inmem');
      if (!records) {
        throw new Error('Expected records to exist for tamper test');
      }
      records[0].hash = 'tampered';

      expect(() => {
        store.append({
          id: 'ev-2',
          projectId: 'proj-inmem',
          runId: 'run-1',
          source: 'foundry',
          type: 'event',
          data: { ok: false },
          timestamp: '2026-01-01T00:00:01.000Z',
        });
      }).toThrow('Evidence chain integrity check failed');
    });
  });

  describe('ordering and queries', () => {
    it('preserves append ordering in list', () => {
      const store = new UnifiedEvidenceStore();

      store.append({
        id: 'ev-first',
        projectId: 'proj-order',
        runId: 'run-order',
        source: 'foundry',
        type: 'stage',
        data: { sequence: 1 },
        timestamp: '2026-01-01T00:00:10.000Z',
      });

      store.append({
        id: 'ev-second',
        projectId: 'proj-order',
        runId: 'run-order',
        source: 'foundry',
        type: 'stage',
        data: { sequence: 2 },
        timestamp: '2026-01-01T00:00:00.000Z',
      });

      const records = store.list('proj-order');
      expect(records.map((record) => record.id)).toEqual(['ev-first', 'ev-second']);
    });

    it('filters list and finds records by run across projects', () => {
      const store = new UnifiedEvidenceStore();

      store.append({
        id: 'ev-a1',
        projectId: 'proj-q-1',
        runId: 'run-shared',
        source: 'foundry',
        type: 'decision',
        data: { k: 'a1' },
        timestamp: '2026-01-01T00:00:00.000Z',
      });
      store.append({
        id: 'ev-a2',
        projectId: 'proj-q-1',
        runId: 'run-shared',
        source: 'cowork',
        type: 'artifact',
        data: { k: 'a2' },
        timestamp: '2026-01-01T00:00:01.000Z',
      });
      store.append({
        id: 'ev-b1',
        projectId: 'proj-q-2',
        runId: 'run-shared',
        source: 'tui',
        type: 'artifact',
        data: { k: 'b1' },
        timestamp: '2026-01-01T00:00:02.000Z',
      });
      store.append({
        id: 'ev-a3',
        projectId: 'proj-q-1',
        runId: 'run-other',
        source: 'foundry',
        type: 'decision',
        data: { k: 'a3' },
        timestamp: '2026-01-01T00:00:03.000Z',
      });

      const filtered = store.list('proj-q-1', {
        source: 'foundry',
        type: 'decision',
        fromTimestamp: '2026-01-01T00:00:00.000Z',
        toTimestamp: '2026-01-01T00:00:02.000Z',
      });
      expect(filtered.map((record) => record.id)).toEqual(['ev-a1']);

      const byRun = store.findByRun('run-shared');
      expect(byRun.map((record) => record.id)).toEqual(['ev-a1', 'ev-a2', 'ev-b1']);

      const exported = store.export('proj-q-1');
      expect(exported.projectId).toBe('proj-q-1');
      expect(exported.recordCount).toBe(3);
      expect(exported.chainValid).toBe(true);
      expect(exported.records.map((record) => record.id)).toEqual(['ev-a1', 'ev-a2', 'ev-a3']);
    });
  });
});

function createTempFilePath(prefix: string): string {
  return path.join(
    os.tmpdir(),
    `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}.json`,
  );
}

function cleanupFile(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath, { force: true });
  }
}
