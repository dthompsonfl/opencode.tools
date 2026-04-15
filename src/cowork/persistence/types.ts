export type FilterPrimitive = string | number | boolean | null;
export type FilterValue = FilterPrimitive | FilterPrimitive[];

export interface FilterOptions {
  where?: Record<string, FilterValue>;
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface PersistedEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export type CreateEntityInput<T extends PersistedEntity> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateEntityInput<T extends PersistedEntity> = Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>;

export interface Repository<T extends PersistedEntity> {
  findById(id: string): Promise<T | null>;
  findAll(filter?: FilterOptions): Promise<T[]>;
  create(entity: CreateEntityInput<T>): Promise<T>;
  update(id: string, updates: UpdateEntityInput<T>): Promise<T>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}

export interface HealthStatus {
  healthy: boolean;
  latencyMs: number;
  checkedAt: string;
  error?: string;
  details?: Record<string, unknown>;
}

export interface Transaction {
  query<T = Record<string, unknown>>(sql: string, values?: unknown[]): Promise<T[]>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export type EntityType = 'workspace' | 'artifact' | 'feedback' | 'evidence';

export interface PersistenceManager {
  getRepository<T extends PersistedEntity>(entityType: EntityType | string): Repository<T>;
  beginTransaction(): Promise<Transaction>;
  healthCheck(): Promise<HealthStatus>;
  migrate(): Promise<void>;
  close(): Promise<void>;
}
