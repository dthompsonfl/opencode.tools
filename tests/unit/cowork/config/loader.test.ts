import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  buildCoworkConfigFromEnvironment,
  CoworkConfigManager,
  CoworkConfigValidationError,
} from '../../../../src/cowork/config';

describe('cowork/config/loader', () => {
  beforeEach(() => {
    CoworkConfigManager.resetForTests();
  });

  afterAll(() => {
    CoworkConfigManager.resetForTests();
  });

  it('builds cowork config from environment variables', () => {
    const config = buildCoworkConfigFromEnvironment({
      NODE_ENV: 'test',
      COWORK_TENANT_ID: 'tenant-acme',
      COWORK_TENANT_NAME: 'Acme Engineering',
      COWORK_TENANT_OWNER_ID: 'owner-enterprise',
      COWORK_PERSISTENCE_CONNECTION_STRING: 'postgres://db/acme',
      COWORK_PERSISTENCE_MAX_CONNECTIONS: '42',
      COWORK_PERSISTENCE_SSL: 'true',
      COWORK_PERSISTENCE_REQUIRED: 'true',
      COWORK_COLLABORATION_MAX_EDITORS: '12',
      COWORK_WORKFLOW_MAX_STEPS: '250',
      COWORK_SECURITY_AUDIT_RETENTION_DAYS: '3650',
    });

    expect(config.environment).toBe('test');
    expect(config.tenant?.id).toBe('tenant-acme');
    expect(config.tenant?.name).toBe('Acme Engineering');
    expect(config.tenant?.ownerId).toBe('owner-enterprise');
    expect(config.persistence?.postgres?.connectionString).toBe('postgres://db/acme');
    expect(config.persistence?.postgres?.maxConnections).toBe(42);
    expect(config.persistence?.postgres?.ssl).toBe(true);

    expect(config.persistence?.required).toBe(true);
    expect(config.collaboration?.maxConcurrentEditors).toBe(12);
    expect(config.workflow?.maxSteps).toBe(250);
    expect(config.security?.auditRetentionDays).toBe(3650);
  });

  it('loads schema defaults when no explicit values are provided', async () => {
    const manager = CoworkConfigManager.getInstance();

    const config = await manager.load({
      environment: {},
    });

    expect(config.environment).toBe('development');
    expect(config.tenant.id).toBe('default');
    expect(config.persistence.postgres.connectionString).toBe('postgres://localhost:5432/opencode');
    expect(config.persistence.postgres.maxConnections).toBe(20);
    expect(config.persistence.required).toBe(false);
    expect(config.collaboration.enabled).toBe(true);
    expect(config.workflow.maxSteps).toBe(100);
    expect(config.security.enforceRbac).toBe(true);
  });

  it('resolves secret placeholders through SecretProvider', async () => {
    const manager = CoworkConfigManager.getInstance();

    const config = await manager.load({
      environment: {
        NODE_ENV: 'production',
      },
      overrides: {
        persistence: {
          postgres: {
            connectionString: '${secret:PRIMARY_DB_URL}',
          },
        },
      },
      secretProvider: {
        getSecret: async (secretName: string) => {
          if (secretName === 'PRIMARY_DB_URL') {
            return 'postgres://secure-db/acme-prod';
          }

          return undefined;
        },
      },
    });

    expect(config.persistence.postgres.connectionString).toBe('postgres://secure-db/acme-prod');
  });

  it('loads and validates config file payloads', async () => {
    const manager = CoworkConfigManager.getInstance();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cowork-config-'));
    const configPath = path.join(tempDir, 'cowork.config.json');

    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          tenant: {
            id: 'tenant-file',
            name: 'File Tenant',
          },
          persistence: {
            provider: 'postgres',
            postgres: {
              connectionString: 'postgres://file-db/tenant',
              maxConnections: 7,
              idleTimeoutMs: 20000,
              connectionTimeoutMs: 5000,
              ssl: false,
              autoMigrate: true,
            },
          },
        },
        null,
        2
      ),
      'utf8'
    );

    const config = await manager.load({
      environment: {},
      configFilePath: configPath,
    });

    expect(config.tenant.id).toBe('tenant-file');
    expect(config.persistence.postgres.connectionString).toBe('postgres://file-db/tenant');
    expect(config.persistence.postgres.maxConnections).toBe(7);
  });

  it('throws validation error for malformed numeric env values', () => {
    expect(() =>
      buildCoworkConfigFromEnvironment({
        COWORK_PERSISTENCE_MAX_CONNECTIONS: 'not-a-number',
      })
    ).toThrow(CoworkConfigValidationError);
  });
});
