import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  MigrationIntegrityError,
  PostgresClientLike,
  PostgresPersistenceManager,
  PostgresPoolLike,
  QueryResultLike,
  QueryResultRow,
  UnknownEntityTypeError,
} from '../../../../src/cowork/persistence';

interface SqlCall {
  text: string;
  values?: unknown[];
  source: 'pool' | 'client';
}

class MockPostgresClient implements PostgresClientLike {
  constructor(private readonly pool: MockPostgresPool) {}

  public async query<R extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
  ): Promise<QueryResultLike<R>> {
    return this.pool.handleQuery<R>(text, values, 'client');
  }

  public release(): void {
    this.pool.releaseCount += 1;
  }
}

class MockPostgresPool implements PostgresPoolLike {
  public readonly calls: SqlCall[] = [];
  public readonly appliedMigrations = new Map<string, string>();
  public releaseCount = 0;
  public failHealthCheck = false;
  public ended = false;

  public async query<R extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
  ): Promise<QueryResultLike<R>> {
    return this.handleQuery<R>(text, values, 'pool');
  }

  public async connect(): Promise<PostgresClientLike> {
    return new MockPostgresClient(this);
  }

  public async end(): Promise<void> {
    this.ended = true;
  }

  public async handleQuery<R extends QueryResultRow = QueryResultRow>(
    text: string,
    values: unknown[] | undefined,
    source: 'pool' | 'client'
  ): Promise<QueryResultLike<R>> {
    this.calls.push({ text, values, source });

    if (this.failHealthCheck && text.includes('SELECT 1 AS health')) {
      throw new Error('db offline');
    }

    if (text.includes('SELECT name, checksum FROM cowork_migrations')) {
      return {
        rows: [...this.appliedMigrations.entries()].map(([name, checksum]) => ({
          name,
          checksum,
        })) as unknown as R[],
      };
    }

    if (text.includes('INSERT INTO cowork_migrations')) {
      const migrationName = values?.[1];
      const migrationChecksum = values?.[2];
      if (typeof migrationName === 'string' && typeof migrationChecksum === 'string') {
        this.appliedMigrations.set(migrationName, migrationChecksum);
      }
    }

    if (text.includes('SELECT EXISTS')) {
      return { rows: [{ exists: false }] as unknown as R[] };
    }

    return { rows: [] };
  }
}

describe('cowork/persistence/postgres-manager', () => {
  it('returns cached repositories for known entity types', () => {
    const pool = new MockPostgresPool();
    const manager = new PostgresPersistenceManager({
      pool,
    });

    const first = manager.getRepository('workspace');
    const second = manager.getRepository('workspace');

    expect(first).toBe(second);
  });

  it('rejects unknown entity types', () => {
    const manager = new PostgresPersistenceManager({
      pool: new MockPostgresPool(),
    });

    expect(() => manager.getRepository('not-supported')).toThrow(UnknownEntityTypeError);
  });

  it('reports healthy postgres checks', async () => {
    const pool = new MockPostgresPool();
    const manager = new PostgresPersistenceManager({ pool });

    const health = await manager.healthCheck();

    expect(health.healthy).toBe(true);
    expect(health.latencyMs).toBeGreaterThanOrEqual(0);
    expect(pool.calls.some((call) => call.text.includes('SELECT 1 AS health'))).toBe(true);
  });

  it('reports unhealthy postgres checks when query fails', async () => {
    const pool = new MockPostgresPool();
    pool.failHealthCheck = true;

    const manager = new PostgresPersistenceManager({ pool });
    const health = await manager.healthCheck();

    expect(health.healthy).toBe(false);
    expect(health.error).toContain('db offline');
  });

  it('applies pending migrations once and records checksums', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cowork-migrations-'));
    const migrationPath = path.join(tempDir, '0001_test.sql');
    fs.writeFileSync(migrationPath, 'CREATE TABLE IF NOT EXISTS temp_table (id TEXT PRIMARY KEY);', 'utf8');

    const pool = new MockPostgresPool();
    const manager = new PostgresPersistenceManager({
      pool,
      migrationsDir: tempDir,
    });

    await manager.migrate();
    await manager.migrate();

    const inserts = pool.calls.filter((call) =>
      call.source === 'client' && call.text.includes('INSERT INTO cowork_migrations')
    );

    expect(inserts).toHaveLength(1);
    expect(pool.appliedMigrations.has('0001_test.sql')).toBe(true);
  });

  it('fails fast when applied migration checksum changes', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cowork-migrations-'));
    const migrationPath = path.join(tempDir, '0001_test.sql');
    fs.writeFileSync(migrationPath, 'SELECT 1;', 'utf8');

    const pool = new MockPostgresPool();
    const manager = new PostgresPersistenceManager({
      pool,
      migrationsDir: tempDir,
    });

    await manager.migrate();
    fs.writeFileSync(migrationPath, 'SELECT 2;', 'utf8');

    await expect(manager.migrate()).rejects.toBeInstanceOf(MigrationIntegrityError);
  });

  it('closes underlying pool connections', async () => {
    const pool = new MockPostgresPool();
    const manager = new PostgresPersistenceManager({ pool });

    await manager.close();

    expect(pool.ended).toBe(true);
  });
});
