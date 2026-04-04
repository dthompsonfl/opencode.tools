export class CoworkPersistenceError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'CoworkPersistenceError';
    this.code = code;
    this.details = details;
  }
}

export class UnknownEntityTypeError extends CoworkPersistenceError {
  constructor(entityType: string) {
    super(`Unknown cowork persistence entity type: ${entityType}`, 'UNKNOWN_ENTITY_TYPE', { entityType });
    this.name = 'UnknownEntityTypeError';
  }
}

export class EntityNotFoundError extends CoworkPersistenceError {
  constructor(entityType: string, id: string) {
    super(`${entityType} entity not found: ${id}`, 'ENTITY_NOT_FOUND', { entityType, id });
    this.name = 'EntityNotFoundError';
  }
}

export class MigrationIntegrityError extends CoworkPersistenceError {
  constructor(migrationName: string) {
    super(
      `Migration checksum mismatch detected for ${migrationName}. Refusing to continue to preserve audit integrity.`,
      'MIGRATION_INTEGRITY_ERROR',
      { migrationName }
    );
    this.name = 'MigrationIntegrityError';
  }
}

export class PostgresDriverUnavailableError extends CoworkPersistenceError {
  constructor() {
    super(
      'PostgreSQL driver is unavailable. Install the "pg" package or provide a custom pool factory.',
      'POSTGRES_DRIVER_UNAVAILABLE'
    );
    this.name = 'PostgresDriverUnavailableError';
  }
}
