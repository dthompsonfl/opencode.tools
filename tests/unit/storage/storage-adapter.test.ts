import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Database, resetDatabaseForTests } from '../../../src/storage/db';

describe('storage adapter', () => {
  let dbPath: string;

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `foundry-storage-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
    process.env.FOUNDRY_DB_FORCE_JSON = '1';
    process.env.FOUNDRY_DB_PATH = dbPath;
    resetDatabaseForTests();
  });

  afterEach(() => {
    resetDatabaseForTests();
    delete process.env.FOUNDRY_DB_FORCE_JSON;
    delete process.env.FOUNDRY_DB_PATH;
    if (fs.existsSync(dbPath)) {
      fs.rmSync(dbPath, { force: true });
    }
  });

  it('supports execute/query/insert and typed findMany helpers', async () => {
    const db = Database.Client();

    await db.$client.execute({
      sql: 'INSERT INTO foundry_context (project_id, context, updated_at) VALUES (?, ?, ?) ON CONFLICT (project_id) DO UPDATE SET context = excluded.context, updated_at = excluded.updated_at',
      args: ['project-1', '{"phase":"a"}', 100],
    });
    await db.$client.execute({
      sql: 'INSERT INTO foundry_context (project_id, context, updated_at) VALUES (?, ?, ?) ON CONFLICT (project_id) DO UPDATE SET context = excluded.context, updated_at = excluded.updated_at',
      args: ['project-1', '{"phase":"b"}', 101],
    });

    const selectResult = await db.$client.execute({
      sql: 'SELECT context FROM foundry_context WHERE project_id = ?',
      args: ['project-1'],
    });
    expect(selectResult.rows).toHaveLength(1);
    expect((selectResult.rows[0] as Record<string, unknown>).context).toBe('{"phase":"b"}');

    await db.insert('evidence', {
      id: 'ev-1',
      project_id: 'project-1',
      phase: 'phase-a',
      gate: 'gate-1',
      created_at: 1,
      type: 'file',
      name: 'evidence-1',
    });
    await db.insert('evidence', {
      id: 'ev-2',
      project_id: 'project-1',
      phase: 'phase-a',
      gate: 'gate-1',
      created_at: 2,
      type: 'file',
      name: 'evidence-2',
    });

    await db.insert('gate_evaluation', {
      id: 'gate-1',
      project_id: 'project-1',
      phase: 'phase-a',
      gate: 'lint',
      result: 'passed',
      evaluated_at: 10,
      evidence_ids: '["ev-1"]',
    });

    const queryRows = await db.query('SELECT * FROM evidence WHERE project_id = ? ORDER BY created_at DESC', [
      'project-1',
    ]);
    expect(queryRows).toHaveLength(2);
    expect((queryRows[0] as Record<string, unknown>).id).toBe('ev-2');

    const evidenceRows = await db.query.evidence.findMany({
      where: { project_id: 'project-1', gate: 'gate-1' },
      orderBy: { created_at: 'desc' },
    });
    expect(evidenceRows).toHaveLength(2);
    expect((evidenceRows[0] as Record<string, unknown>).id).toBe('ev-2');

    const gateRows = await db.query.gateEvaluation.findMany({
      where: { project_id: 'project-1', phase: 'phase-a' },
      orderBy: { evaluated_at: 'desc' },
    });
    expect(gateRows).toHaveLength(1);
    expect((gateRows[0] as Record<string, unknown>).gate).toBe('lint');
  });
});
