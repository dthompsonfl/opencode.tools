import { createHash, randomUUID } from 'crypto';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import { logger } from '../../../runtime/logger';
import {
  CoworkPersistenceError,
  MigrationIntegrityError,
  PostgresDriverUnavailableError,
  UnknownEntityTypeError,
} from '../errors';
import type {
  EntityType,
  HealthStatus,
  PersistedEntity,
  PersistenceManager,
  Repository,
  Transaction,
} from '../types';
import { PostgresJsonRepository } from './postgres-json-repository';
import { PostgresTransaction } from './postgres-transaction';
import type {
  PostgresPoolConfig,
  PostgresPoolFactory,
  PostgresPoolLike,
  QueryResultLike,
  QueryResultRow,
} from './types';

interface MigrationRow extends QueryResultRow {
  name: string;
  checksum: string;
}

interface MigrationFile {
  name: string;
  fullPath: string;
  sql: string;
  checksum: string;
}

export interface PostgresPersistenceConnectionConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
  maxConnections?: number;
  idleTimeoutMs?: number;
  connectionTimeoutMs?: number;
  applicationName?: string;
}

export interface PostgresPersistenceManagerOptions extends PostgresPersistenceConnectionConfig {
  pool?: PostgresPoolLike;
  poolFactory?: PostgresPoolFactory;
  migrationsDir?: string;
  entityTables?: Partial<Record<EntityType, string>>;
}

const DEFAULT_ENTITY_TABLES: Record<EntityType, string> = {
  workspace: 'cowork_workspace',
  artifact: 'cowork_artifact',
  feedback: 'cowork_feedback',
  evidence: 'cowork_evidence',
};

const SAFE_IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const MIGRATIONS_TABLE = 'cowork_migrations';
const ENTITY_TYPES: EntityType[] = ['workspace', 'artifact', 'feedback', 'evidence'];

export class PostgresPersistenceManager implements PersistenceManager {
  private readonly pool: PostgresPoolLike;
  private readonly repositories = new Map<EntityType, Repository<PersistedEntity>>();
  private readonly entityTables: Record<EntityType, string>;
  private readonly migrationsDir: string;
  private migrationPromise: Promise<void> | null = null;

  constructor(options: PostgresPersistenceManagerOptions = {}) {
    this.pool = options.pool ?? this.createPool(options, options.poolFactory);
    this.entityTables = {
      ...DEFAULT_ENTITY_TABLES,
      ...(options.entityTables ?? {}),
    };
    this.migrationsDir = options.migrationsDir ?? resolveDefaultMigrationsDir();

    assertSafeIdentifier(MIGRATIONS_TABLE, 'migrations table name');
    for (const table of Object.values(this.entityTables)) {
      assertSafeIdentifier(table, 'entity table name');
    }
  }

  public static async create(options: PostgresPersistenceManagerOptions = {}): Promise<PostgresPersistenceManager> {
    const manager = new PostgresPersistenceManager(options);
    await manager.migrate();
    return manager;
  }

  public getRepository<T extends PersistedEntity>(entityType: EntityType | string): Repository<T> {
    if (!isEntityType(entityType)) {
      throw new UnknownEntityTypeError(entityType);
    }

    const existing = this.repositories.get(entityType);
    if (existing) {
      return existing as Repository<T>;
    }

    const repository = new PostgresJsonRepository<PersistedEntity>(this.pool, this.entityTables[entityType]);
    this.repositories.set(entityType, repository);
    return repository as unknown as Repository<T>;
  }

  public async beginTransaction(): Promise<Transaction> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      return new PostgresTransaction(client);
    } catch (error) {
      client.release();
      throw new CoworkPersistenceError('Failed to start postgres transaction.', 'TRANSACTION_BEGIN_FAILED', {
        error: formatError(error),
      });
    }
  }

  public async healthCheck(): Promise<HealthStatus> {
    const startedAt = Date.now();

    try {
      await this.pool.query('SELECT 1 AS health');
      return {
        healthy: true,
        latencyMs: Date.now() - startedAt,
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        healthy: false,
        latencyMs: Date.now() - startedAt,
        checkedAt: new Date().toISOString(),
        error: formatError(error),
      };
    }
  }

  public async query<R extends QueryResultRow = QueryResultRow>(
    sql: string,
    values: unknown[] = []
  ): Promise<QueryResultLike<R>> {
    return this.pool.query<R>(sql, values);
  }

  public async migrate(): Promise<void> {
    if (this.migrationPromise) {
      return this.migrationPromise;
    }

    this.migrationPromise = this.runMigrations().finally(() => {
      this.migrationPromise = null;
    });

    return this.migrationPromise;
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }

  private async runMigrations(): Promise<void> {
    await this.ensureMigrationsTable();

    const migrationFiles = await this.listMigrationFiles();
    if (migrationFiles.length === 0) {
      logger.warn('[PostgresPersistenceManager] No migration files found', {
        migrationsDir: this.migrationsDir,
      });
      return;
    }

    const applied = await this.getAppliedMigrations();
    for (const migrationFile of migrationFiles) {
      const appliedChecksum = applied.get(migrationFile.name);
      if (appliedChecksum && appliedChecksum !== migrationFile.checksum) {
        throw new MigrationIntegrityError(migrationFile.name);
      }

      if (appliedChecksum) {
        continue;
      }

      await this.executeMigration(migrationFile);
    }
  }

  private async ensureMigrationsTable(): Promise<void> {
    await this.pool.query(
      `CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        checksum TEXT NOT NULL,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`
    );
  }

  private async listMigrationFiles(): Promise<MigrationFile[]> {
    if (!fs.existsSync(this.migrationsDir)) {
      throw new CoworkPersistenceError(
        `Cowork migrations directory does not exist: ${this.migrationsDir}`,
        'MIGRATIONS_DIR_NOT_FOUND',
        { migrationsDir: this.migrationsDir }
      );
    }

    const entries = await fsPromises.readdir(this.migrationsDir, { withFileTypes: true });
    const sqlEntries = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
      .sort((left, right) => left.name.localeCompare(right.name));

    const migrationFiles: MigrationFile[] = [];
    for (const entry of sqlEntries) {
      const fullPath = path.join(this.migrationsDir, entry.name);
      const sql = await fsPromises.readFile(fullPath, 'utf8');
      migrationFiles.push({
        name: entry.name,
        fullPath,
        sql,
        checksum: createHash('sha256').update(sql).digest('hex'),
      });
    }

    return migrationFiles;
  }

  private async getAppliedMigrations(): Promise<Map<string, string>> {
    const rows = await this.pool.query<MigrationRow>(`SELECT name, checksum FROM ${MIGRATIONS_TABLE} ORDER BY executed_at ASC`);
    return new Map(rows.rows.map((row) => [row.name, row.checksum]));
  }

  private async executeMigration(migration: MigrationFile): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      await client.query(migration.sql);
      await client.query(
        `INSERT INTO ${MIGRATIONS_TABLE} (id, name, checksum, executed_at) VALUES ($1, $2, $3, NOW())`,
        [randomUUID(), migration.name, migration.checksum]
      );
      await client.query('COMMIT');

      logger.info('[PostgresPersistenceManager] Applied cowork migration', {
        migrationName: migration.name,
        migrationPath: migration.fullPath,
      });
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        logger.error('[PostgresPersistenceManager] Migration rollback failed', {
          migrationName: migration.name,
          rollbackError: formatError(rollbackError),
        });
      }

      throw new CoworkPersistenceError(`Failed to apply migration ${migration.name}.`, 'MIGRATION_EXECUTION_FAILED', {
        migrationName: migration.name,
        migrationPath: migration.fullPath,
        error: formatError(error),
      });
    } finally {
      client.release();
    }
  }

  private createPool(
    options: PostgresPersistenceConnectionConfig,
    poolFactory?: PostgresPoolFactory
  ): PostgresPoolLike {
    const poolConfig = this.buildPoolConfig(options);

    if (poolFactory) {
      return poolFactory.createPool(poolConfig);
    }

    const PoolCtor = resolvePgPoolCtor();
    return new PoolCtor(poolConfig);
  }

  private buildPoolConfig(options: PostgresPersistenceConnectionConfig): PostgresPoolConfig {
    const config: PostgresPoolConfig = {};

    if (options.connectionString) {
      config.connectionString = options.connectionString;
    }
    if (options.host) {
      config.host = options.host;
    }
    if (options.port !== undefined) {
      config.port = options.port;
    }
    if (options.database) {
      config.database = options.database;
    }
    if (options.user) {
      config.user = options.user;
    }
    if (options.password) {
      config.password = options.password;
    }
    if (options.maxConnections !== undefined) {
      config.max = options.maxConnections;
    }
    if (options.idleTimeoutMs !== undefined) {
      config.idleTimeoutMillis = options.idleTimeoutMs;
    }
    if (options.connectionTimeoutMs !== undefined) {
      config.connectionTimeoutMillis = options.connectionTimeoutMs;
    }
    if (options.applicationName) {
      config.application_name = options.applicationName;
    }
    if (options.ssl) {
      config.ssl = { rejectUnauthorized: false };
    }

    return config;
  }
}

interface PgModuleLike {
  Pool?: new (config: PostgresPoolConfig) => PostgresPoolLike;
  default?: {
    Pool?: new (config: PostgresPoolConfig) => PostgresPoolLike;
  };
}

function resolvePgPoolCtor(): new (config: PostgresPoolConfig) => PostgresPoolLike {
  let pgModule: PgModuleLike | null = null;

  try {
    pgModule = require('pg') as PgModuleLike;
  } catch {
    throw new PostgresDriverUnavailableError();
  }

  if (pgModule?.Pool) {
    return pgModule.Pool;
  }

  if (pgModule?.default?.Pool) {
    return pgModule.default.Pool;
  }

  throw new PostgresDriverUnavailableError();
}

function resolveDefaultMigrationsDir(): string {
  const sourceDir = path.resolve(process.cwd(), 'src', 'cowork', 'persistence', 'migrations');
  if (fs.existsSync(sourceDir)) {
    return sourceDir;
  }

  return path.resolve(__dirname, '..', 'migrations');
}

function isEntityType(entityType: string): entityType is EntityType {
  return ENTITY_TYPES.includes(entityType as EntityType);
}

function assertSafeIdentifier(identifier: string, field: string): void {
  if (!SAFE_IDENTIFIER_REGEX.test(identifier)) {
    throw new CoworkPersistenceError(`Invalid SQL identifier for ${field}: ${identifier}`, 'INVALID_IDENTIFIER', {
      field,
      identifier,
    });
  }
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
