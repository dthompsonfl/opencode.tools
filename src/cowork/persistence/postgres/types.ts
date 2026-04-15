export type QueryResultRow = Record<string, unknown>;

export interface QueryResultLike<R extends QueryResultRow = QueryResultRow> {
  rows: R[];
  rowCount?: number | null;
}

export interface PostgresClientLike {
  query<R extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]): Promise<QueryResultLike<R>>;
  release(): void;
}

export interface PostgresPoolLike {
  query<R extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]): Promise<QueryResultLike<R>>;
  connect(): Promise<PostgresClientLike>;
  end(): Promise<void>;
}

export type PostgresPoolConfig = Record<string, unknown>;

export interface PostgresPoolFactory {
  createPool(config: PostgresPoolConfig): PostgresPoolLike;
}
