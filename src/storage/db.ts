import * as fs from 'fs';
import * as path from 'path';

type Row = Record<string, unknown>;

type FindManyArgs = {
  where?: Record<string, unknown>;
  orderBy?: Record<string, 'asc' | 'desc'>;
};

export interface DatabaseClient {
  execute: (args: { sql: string; args?: unknown[] }) => Promise<{ rows: unknown[] }>;
  query: (sql: string, args?: unknown[]) => Promise<unknown[]>;
}

type DatabaseQuery = ((sql: string, args?: unknown[]) => Promise<unknown[]>) & {
  evidence: {
    findMany: (args: FindManyArgs) => Promise<unknown[]>;
  };
  gateEvaluation: {
    findMany: (args: FindManyArgs) => Promise<unknown[]>;
  };
};

export interface Database {
  $client: DatabaseClient;
  insert: (table: string, data: Record<string, unknown>) => Promise<unknown[]>;
  query: DatabaseQuery;
}

interface StorageAdapter {
  execute: (sql: string, args?: unknown[]) => Promise<{ rows: Row[] }>;
  insert: (table: string, data: Row) => Promise<Row[]>;
  findMany: (table: string, args: FindManyArgs) => Promise<Row[]>;
}

interface BetterSqlite3Statement {
  run: (...args: unknown[]) => unknown;
  all: (...args: unknown[]) => unknown[];
}

interface BetterSqlite3Database {
  pragma: (sql: string) => void;
  exec: (sql: string) => void;
  prepare: (sql: string) => BetterSqlite3Statement;
}

const DB_JSON_EXT = '.json';
const DB_SQLITE_EXT = '.sqlite';
const DEFAULT_DB_BASENAME = 'foundry-storage';

let dbInstance: Database | null = null;

export function createDatabase(): Database {
  const adapter = createStorageAdapter();

  const client: DatabaseClient = {
    execute: async ({ sql, args }) => adapter.execute(sql, args),
    query: async (sql, args) => {
      const result = await adapter.execute(sql, args);
      return result.rows;
    },
  };

  const query = (async (sql: string, args?: unknown[]) => {
    const result = await adapter.execute(sql, args);
    return result.rows;
  }) as DatabaseQuery;

  query.evidence = {
    findMany: async (args) => adapter.findMany('evidence', args),
  };

  query.gateEvaluation = {
    findMany: async (args) => adapter.findMany('gate_evaluation', args),
  };

  return {
    $client: client,
    insert: async (table, data) => adapter.insert(table, data),
    query,
  };
}

export function resetDatabaseForTests(): void {
  dbInstance = null;
}

export const Database = {
  Client: (): Database => {
    if (!dbInstance) {
      dbInstance = createDatabase();
    }
    return dbInstance;
  },
};

function createStorageAdapter(): StorageAdapter {
  if (!shouldForceJsonAdapter()) {
    const sqlite = tryCreateSqliteAdapter();
    if (sqlite) {
      return sqlite;
    }
  }

  return createJsonFileAdapter();
}

function shouldForceJsonAdapter(): boolean {
  return process.env.FOUNDRY_DB_FORCE_JSON === '1';
}

function resolveDbPath(extension: string): string {
  const configured = process.env.FOUNDRY_DB_PATH;
  if (configured && configured.trim().length > 0) {
    return configured;
  }

  return path.join(process.cwd(), 'data', `${DEFAULT_DB_BASENAME}${extension}`);
}

function ensureParentDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function createJsonFileAdapter(): StorageAdapter {
  const dbPath = resolveDbPath(DB_JSON_EXT);
  ensureParentDir(dbPath);

  let data = loadJsonData(dbPath);

  const persist = (): void => {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
  };

  const execute = async (sql: string, args: unknown[] = []): Promise<{ rows: Row[] }> => {
    const normalizedSql = sql.replace(/\s+/g, ' ').trim();
    const upperSql = normalizedSql.toUpperCase();

    if (upperSql.startsWith('SELECT')) {
      return { rows: runJsonSelect(data, normalizedSql, args) };
    }

    if (upperSql.startsWith('INSERT')) {
      data = runJsonInsert(data, normalizedSql, args);
      persist();
      return { rows: [] };
    }

    throw new Error(`Unsupported SQL for JSON adapter: ${normalizedSql}`);
  };

  const insert = async (table: string, row: Row): Promise<Row[]> => {
    const nextRow = { ...row };
    const tableRows = getTableRows(data, table);
    tableRows.push(nextRow);
    persist();
    return [nextRow];
  };

  const findMany = async (table: string, args: FindManyArgs): Promise<Row[]> => {
    return runFindMany(getTableRows(data, table), args);
  };

  return {
    execute,
    insert,
    findMany,
  };
}

function loadJsonData(dbPath: string): Record<string, Row[]> {
  if (!fs.existsSync(dbPath)) {
    const initial: Record<string, Row[]> = {};
    fs.writeFileSync(dbPath, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }

  const raw = fs.readFileSync(dbPath, 'utf8').trim();
  if (!raw) {
    return {};
  }

  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== 'object') {
    return {};
  }

  const normalized: Record<string, Row[]> = {};
  for (const [table, tableRows] of Object.entries(parsed as Record<string, unknown>)) {
    normalized[table] = Array.isArray(tableRows) ? (tableRows as Row[]) : [];
  }
  return normalized;
}

function getTableRows(data: Record<string, Row[]>, table: string): Row[] {
  if (!data[table]) {
    data[table] = [];
  }

  return data[table];
}

function runFindMany(rows: Row[], args: FindManyArgs): Row[] {
  const where = args.where ?? {};
  let filtered = rows.filter((row) => matchRow(row, where));

  const orderEntries = Object.entries(args.orderBy ?? {});
  if (orderEntries.length > 0) {
    const [orderField, direction] = orderEntries[0];
    const multiplier = direction === 'desc' ? -1 : 1;
    filtered = [...filtered].sort((a, b) => {
      const left = a[orderField];
      const right = b[orderField];
      if (left === right) {
        return 0;
      }

      if (left === undefined) {
        return -1 * multiplier;
      }

      if (right === undefined) {
        return 1 * multiplier;
      }

      return compareUnknown(left, right) > 0 ? multiplier : -1 * multiplier;
    });
  }

  return filtered.map((row) => ({ ...row }));
}

function matchRow(row: Row, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (value === undefined) {
      return true;
    }

    return row[key] === value;
  });
}

function runJsonSelect(data: Record<string, Row[]>, sql: string, args: unknown[]): Row[] {
  const selectMatch = /^SELECT\s+(.+?)\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER BY\s+([a-zA-Z0-9_]+)\s+(ASC|DESC))?(?:\s+LIMIT\s+(\d+))?$/i.exec(
    sql,
  );
  if (!selectMatch) {
    throw new Error(`Unsupported SELECT SQL: ${sql}`);
  }

  const [, columnExpr, table, whereClause, orderByColumn, orderByDirection, limitExpr] = selectMatch;
  const columns = columnExpr.trim() === '*' ? null : columnExpr.split(',').map((column) => column.trim());
  const rows = getTableRows(data, table);

  let filtered = rows.filter((row) => {
    if (!whereClause) {
      return true;
    }

    const predicates = whereClause.split(/\s+AND\s+/i).map((item) => item.trim());
    return predicates.every((predicate, index) => {
      const eqMatch = /^([a-zA-Z0-9_]+)\s*=\s*\?$/i.exec(predicate);
      if (!eqMatch) {
        throw new Error(`Unsupported WHERE predicate: ${predicate}`);
      }

      const [, column] = eqMatch;
      const expected = args[index];
      return row[column] === expected;
    });
  });

  if (orderByColumn) {
    const multiplier = orderByDirection?.toUpperCase() === 'DESC' ? -1 : 1;
    filtered = [...filtered].sort((a, b) => {
      const left = a[orderByColumn];
      const right = b[orderByColumn];
      if (left === right) {
        return 0;
      }
      return compareUnknown(left, right) > 0 ? multiplier : -1 * multiplier;
    });
  }

  if (limitExpr) {
    filtered = filtered.slice(0, Number(limitExpr));
  }

  return filtered.map((row) => {
    if (!columns) {
      return { ...row };
    }

    const projected: Row = {};
    for (const column of columns) {
      projected[column] = row[column];
    }
    return projected;
  });
}

function runJsonInsert(data: Record<string, Row[]>, sql: string, args: unknown[]): Record<string, Row[]> {
  const insertMatch = /^INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*\((.+?)\)\s*VALUES\s*\((.+?)\)(?:\s+ON\s+CONFLICT\s*\((.+?)\)\s*DO\s*(NOTHING|UPDATE\s+SET\s+(.+)))?$/i.exec(
    sql,
  );
  if (!insertMatch) {
    throw new Error(`Unsupported INSERT SQL: ${sql}`);
  }

  const [, table, columnsExpr, valuesExpr, conflictColumnExpr, conflictAction, updateExpr] = insertMatch;
  const columns = columnsExpr.split(',').map((column) => column.trim());
  const placeholders = valuesExpr.split(',').map((value) => value.trim());

  if (columns.length !== placeholders.length) {
    throw new Error(`Column/value mismatch in SQL: ${sql}`);
  }

  const row: Row = {};
  let cursor = 0;
  for (let index = 0; index < columns.length; index += 1) {
    if (placeholders[index] !== '?') {
      throw new Error(`Only positional placeholders are supported: ${sql}`);
    }

    row[columns[index]] = args[cursor];
    cursor += 1;
  }

  const tableRows = getTableRows(data, table);

  if (!conflictColumnExpr || !conflictAction) {
    tableRows.push(row);
    return data;
  }

  const conflictColumn = conflictColumnExpr.trim();
  const existingIndex = tableRows.findIndex((tableRow) => tableRow[conflictColumn] === row[conflictColumn]);
  if (existingIndex < 0) {
    tableRows.push(row);
    return data;
  }

  if (conflictAction.toUpperCase() === 'NOTHING') {
    return data;
  }

  const updates = updateExpr ? updateExpr.split(',').map((item) => item.trim()) : [];
  const merged = { ...tableRows[existingIndex], ...row };
  for (const update of updates) {
    const match = /^([a-zA-Z0-9_]+)\s*=\s*excluded\.([a-zA-Z0-9_]+)$/i.exec(update);
    if (!match) {
      throw new Error(`Unsupported ON CONFLICT UPDATE expression: ${update}`);
    }

    const [, targetColumn, sourceColumn] = match;
    merged[targetColumn] = row[sourceColumn];
  }

  tableRows[existingIndex] = merged;
  return data;
}

function compareUnknown(left: unknown, right: unknown): number {
  const leftValue = left === null ? '' : String(left);
  const rightValue = right === null ? '' : String(right);
  if (leftValue === rightValue) {
    return 0;
  }

  return leftValue > rightValue ? 1 : -1;
}

function tryCreateSqliteAdapter(): StorageAdapter | null {
  let sqliteFactory: ((filePath: string) => BetterSqlite3Database) | null = null;
  try {
    const loaded = require('better-sqlite3') as unknown;
    if (typeof loaded === 'function') {
      sqliteFactory = loaded as (filePath: string) => BetterSqlite3Database;
    } else if (loaded && typeof (loaded as { default?: unknown }).default === 'function') {
      sqliteFactory = (loaded as { default: (filePath: string) => BetterSqlite3Database }).default;
    }
  } catch {
    sqliteFactory = null;
  }

  if (!sqliteFactory) {
    return null;
  }

  const dbPath = resolveDbPath(DB_SQLITE_EXT);
  ensureParentDir(dbPath);
  const sqlite = sqliteFactory(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.exec(buildSchemaSql());

  return {
    execute: async (sql: string, args: unknown[] = []) => {
      const statement = sqlite.prepare(sql);
      const upperSql = sql.trim().toUpperCase();
      if (upperSql.startsWith('SELECT')) {
        return { rows: statement.all(...args) as Row[] };
      }

      statement.run(...args);
      return { rows: [] };
    },
    insert: async (table: string, row: Row) => {
      const keys = Object.keys(row);
      if (keys.length === 0) {
        return [];
      }

      const sql = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`;
      sqlite.prepare(sql).run(...keys.map((key) => row[key]));
      return [{ ...row }];
    },
    findMany: async (table: string, args: FindManyArgs) => {
      const whereEntries = Object.entries(args.where ?? {}).filter(([, value]) => value !== undefined);
      const whereSql = whereEntries.length
        ? ` WHERE ${whereEntries.map(([key]) => `${key} = ?`).join(' AND ')}`
        : '';

      const orderEntries = Object.entries(args.orderBy ?? {});
      const orderSql = orderEntries.length
        ? ` ORDER BY ${orderEntries[0][0]} ${orderEntries[0][1].toUpperCase()}`
        : '';

      const sql = `SELECT * FROM ${table}${whereSql}${orderSql}`;
      const statement = sqlite.prepare(sql);
      const rows = statement.all(...whereEntries.map(([, value]) => value));
      return rows as Row[];
    },
  };
}

function buildSchemaSql(): string {
  return `
    CREATE TABLE IF NOT EXISTS foundry_context (
      project_id TEXT PRIMARY KEY,
      context TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS evidence (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      phase TEXT NOT NULL,
      gate TEXT,
      task_id TEXT,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      file_path TEXT,
      file_hash TEXT,
      ci_run_id TEXT,
      ci_url TEXT,
      content_json TEXT,
      content_summary TEXT,
      created_at INTEGER NOT NULL,
      created_by TEXT,
      signature TEXT
    );

    CREATE TABLE IF NOT EXISTS gate_evaluation (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      phase TEXT NOT NULL,
      gate TEXT NOT NULL,
      result TEXT NOT NULL,
      evaluated_at INTEGER NOT NULL,
      evidence_ids TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orchestrator_checkpoint (
      resume_key TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      phase_index INTEGER NOT NULL,
      completed_step_signatures TEXT NOT NULL,
      completed_task_signatures TEXT NOT NULL,
      gate_status TEXT NOT NULL,
      tasks TEXT NOT NULL,
      messages TEXT NOT NULL,
      gate_results TEXT NOT NULL,
      step_outcomes TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_trail (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      project_id TEXT NOT NULL,
      phase TEXT NOT NULL,
      metadata TEXT NOT NULL,
      evidence_hash TEXT NOT NULL,
      previous_hash TEXT NOT NULL,
      chain_index INTEGER NOT NULL,
      signature TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );
  `;
}
