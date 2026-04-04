import type { Transaction } from '../types';
import type { PostgresClientLike } from './types';

export class PostgresTransaction implements Transaction {
  private closed = false;

  constructor(private readonly client: PostgresClientLike) {}

  public async query<T = Record<string, unknown>>(sql: string, values: unknown[] = []): Promise<T[]> {
    const result = await this.client.query(sql, values);
    return result.rows as T[];
  }

  public async commit(): Promise<void> {
    await this.finalize('COMMIT');
  }

  public async rollback(): Promise<void> {
    await this.finalize('ROLLBACK');
  }

  private async finalize(statement: 'COMMIT' | 'ROLLBACK'): Promise<void> {
    if (this.closed) {
      return;
    }

    try {
      await this.client.query(statement);
    } finally {
      this.closed = true;
      this.client.release();
    }
  }
}
