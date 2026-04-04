import { randomUUID } from 'crypto';
import { CoworkPersistenceError, EntityNotFoundError } from '../errors';
import type {
  CreateEntityInput,
  FilterOptions,
  FilterValue,
  PersistedEntity,
  Repository,
  UpdateEntityInput,
} from '../types';
import type { PostgresPoolLike, QueryResultRow } from './types';

interface RepositoryRow extends QueryResultRow {
  id: string;
  payload: Record<string, unknown> | null;
  created_at: string | Date;
  updated_at: string | Date;
}

interface ExistsRow extends QueryResultRow {
  exists: boolean | 't' | 'f' | 1 | 0 | '1' | '0';
}

const SAFE_IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

const METADATA_KEY_TO_COLUMN = {
  id: 'id',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
} as const;

type MetadataKey = keyof typeof METADATA_KEY_TO_COLUMN;

export class PostgresJsonRepository<T extends PersistedEntity> implements Repository<T> {
  constructor(
    private readonly pool: PostgresPoolLike,
    private readonly tableName: string
  ) {
    assertSafeIdentifier(tableName, 'table name');
  }

  public async findById(id: string): Promise<T | null> {
    const result = await this.pool.query<RepositoryRow>(
      `SELECT id, payload, created_at, updated_at FROM ${this.tableName} WHERE id = $1 LIMIT 1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  public async findAll(filter?: FilterOptions): Promise<T[]> {
    const whereBuilder = buildWhereClause(filter?.where);
    const orderByClause = buildOrderByClause(filter?.orderBy, filter?.orderDirection);
    const limitClause = buildLimitClause(filter?.limit);
    const offsetClause = buildOffsetClause(filter?.offset);

    const result = await this.pool.query<RepositoryRow>(
      `SELECT id, payload, created_at, updated_at FROM ${this.tableName}${whereBuilder.clause}${orderByClause}${limitClause}${offsetClause}`,
      whereBuilder.values
    );

    return result.rows.map((row) => this.mapRow(row));
  }

  public async create(entity: CreateEntityInput<T>): Promise<T> {
    const now = new Date().toISOString();
    const id = randomUUID();
    const payload = stripMetadataFields(entity as Record<string, unknown>);

    await this.pool.query(
      `INSERT INTO ${this.tableName} (id, payload, created_at, updated_at) VALUES ($1, $2::jsonb, $3::timestamptz, $4::timestamptz)`,
      [id, payload, now, now]
    );

    return {
      ...payload,
      id,
      createdAt: now,
      updatedAt: now,
    } as T;
  }

  public async update(id: string, updates: UpdateEntityInput<T>): Promise<T> {
    const current = await this.findById(id);
    if (!current) {
      throw new EntityNotFoundError(this.tableName, id);
    }

    const { id: _id, createdAt, updatedAt: _updatedAt, ...currentPayload } = current;
    const nextPayload = {
      ...currentPayload,
      ...stripMetadataFields(updates as Record<string, unknown>),
    };
    const now = new Date().toISOString();

    await this.pool.query(
      `UPDATE ${this.tableName} SET payload = $2::jsonb, updated_at = $3::timestamptz WHERE id = $1`,
      [id, nextPayload, now]
    );

    return {
      ...nextPayload,
      id,
      createdAt,
      updatedAt: now,
    } as T;
  }

  public async delete(id: string): Promise<void> {
    await this.pool.query(`DELETE FROM ${this.tableName} WHERE id = $1`, [id]);
  }

  public async exists(id: string): Promise<boolean> {
    const result = await this.pool.query<ExistsRow>(
      `SELECT EXISTS(SELECT 1 FROM ${this.tableName} WHERE id = $1) AS exists`,
      [id]
    );
    const existsValue = result.rows[0]?.exists;
    return existsValue === true || existsValue === 't' || existsValue === 1 || existsValue === '1';
  }

  private mapRow(row: RepositoryRow): T {
    return {
      ...(row.payload ?? {}),
      id: row.id,
      createdAt: normalizeTimestamp(row.created_at),
      updatedAt: normalizeTimestamp(row.updated_at),
    } as T;
  }
}

function buildWhereClause(where: Record<string, FilterValue> | undefined): { clause: string; values: unknown[] } {
  if (!where || Object.keys(where).length === 0) {
    return { clause: '', values: [] };
  }

  const clauses: string[] = [];
  const values: unknown[] = [];

  for (const [key, rawValue] of Object.entries(where)) {
    if (isMetadataKey(key)) {
      clauses.push(buildMetadataClause(key, rawValue, values));
      continue;
    }

    assertSafeIdentifier(key, 'filter key');
    clauses.push(buildPayloadClause(key, rawValue, values));
  }

  if (clauses.length === 0) {
    return { clause: '', values };
  }

  return {
    clause: ` WHERE ${clauses.join(' AND ')}`,
    values,
  };
}

function buildMetadataClause(key: MetadataKey, rawValue: FilterValue, values: unknown[]): string {
  const column = METADATA_KEY_TO_COLUMN[key];
  if (Array.isArray(rawValue)) {
    if (rawValue.length === 0) {
      return 'FALSE';
    }

    const placeholders = rawValue.map((value) => {
      values.push(castMetadataValue(key, value));
      return `$${values.length}`;
    });

    return `${column} IN (${placeholders.join(', ')})`;
  }

  values.push(castMetadataValue(key, rawValue));
  return `${column} = $${values.length}`;
}

function buildPayloadClause(key: string, rawValue: FilterValue, values: unknown[]): string {
  if (Array.isArray(rawValue)) {
    if (rawValue.length === 0) {
      return 'FALSE';
    }

    const payloadClauses = rawValue.map((value) => {
      values.push({ [key]: value });
      return `payload @> $${values.length}::jsonb`;
    });

    return `(${payloadClauses.join(' OR ')})`;
  }

  values.push({ [key]: rawValue });
  return `payload @> $${values.length}::jsonb`;
}

function castMetadataValue(key: MetadataKey, value: string | number | boolean | null): string | null {
  if (value === null) {
    return null;
  }

  if (key === 'id') {
    if (typeof value !== 'string') {
      throw new CoworkPersistenceError('Metadata filter "id" must be a string.', 'INVALID_FILTER_VALUE', {
        key,
        value,
      });
    }
    return value;
  }

  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    throw new CoworkPersistenceError('Metadata filter must be a valid date/time for createdAt or updatedAt.', 'INVALID_FILTER_VALUE', {
      key,
      value,
    });
  }

  return parsed.toISOString();
}

function buildOrderByClause(orderBy?: string, orderDirection?: 'asc' | 'desc'): string {
  const direction = orderDirection === 'asc' ? 'ASC' : 'DESC';

  if (!orderBy) {
    return ` ORDER BY updated_at ${direction}`;
  }

  if (isMetadataKey(orderBy)) {
    return ` ORDER BY ${METADATA_KEY_TO_COLUMN[orderBy]} ${direction}`;
  }

  assertSafeIdentifier(orderBy, 'orderBy');
  return ` ORDER BY payload->>'${orderBy}' ${direction}`;
}

function buildLimitClause(limit?: number): string {
  if (limit === undefined) {
    return '';
  }

  const safeLimit = normalizePositiveInteger(limit, 'limit');
  return ` LIMIT ${safeLimit}`;
}

function buildOffsetClause(offset?: number): string {
  if (offset === undefined) {
    return '';
  }

  const safeOffset = normalizeNonNegativeInteger(offset, 'offset');
  return ` OFFSET ${safeOffset}`;
}

function normalizePositiveInteger(value: number, key: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new CoworkPersistenceError(`${key} must be a positive integer.`, 'INVALID_PAGINATION_VALUE', {
      key,
      value,
    });
  }

  return value;
}

function normalizeNonNegativeInteger(value: number, key: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new CoworkPersistenceError(`${key} must be a non-negative integer.`, 'INVALID_PAGINATION_VALUE', {
      key,
      value,
    });
  }

  return value;
}

function normalizeTimestamp(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toISOString();
}

function isMetadataKey(key: string): key is MetadataKey {
  return Object.prototype.hasOwnProperty.call(METADATA_KEY_TO_COLUMN, key);
}

function assertSafeIdentifier(identifier: string, field: string): void {
  if (!SAFE_IDENTIFIER_REGEX.test(identifier)) {
    throw new CoworkPersistenceError(`Invalid ${field} provided: ${identifier}`, 'INVALID_IDENTIFIER', {
      field,
      identifier,
    });
  }
}

function stripMetadataFields(source: Record<string, unknown>): Record<string, unknown> {
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...payload } = source;
  return payload;
}
