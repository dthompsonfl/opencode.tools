import { Client } from 'pg';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';

export interface StartedPostgresHarness {
  container: StartedTestContainer;
  host: string;
  port: number;
  username: string;
  password: string;
}

export interface IsolatedDatabaseHandle {
  connectionString: string;
  databaseName: string;
  drop: () => Promise<void>;
}

const POSTGRES_IMAGE = process.env.COWORK_TEST_POSTGRES_IMAGE ?? 'postgres:16-alpine';

export async function startPostgresHarness(): Promise<StartedPostgresHarness> {
  const username = 'test_user';
  const password = 'test_password';
  const database = 'postgres';

  const container = await new GenericContainer(POSTGRES_IMAGE)
    .withEnvironment({POSTGRES_USER: username})
    .withEnvironment({POSTGRES_PASSWORD: password})
    .withEnvironment({POSTGRES_DB: database})




    .withExposedPorts(5432)
    .withWaitStrategy(Wait.forLogMessage(/database system is ready to accept connections/i))
    .start();

  return {
    container,
    host: container.getHost(),
    port: container.getMappedPort(5432),
    username,
    password,
  };
}

export async function createIsolatedDatabase(
  harness: StartedPostgresHarness,
  prefix = 'cowork_it',
): Promise<IsolatedDatabaseHandle> {
  const databaseName = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .toLowerCase();

  const adminClient = new Client({
    host: harness.host,
    port: harness.port,
    user: harness.username,
    password: harness.password,
    database: 'postgres',
  });

  await adminClient.connect();
  try {
    await adminClient.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
  } finally {
    await adminClient.end();
  }

  const connectionString = `postgresql://${harness.username}:${harness.password}@${harness.host}:${harness.port}/${databaseName}`;

  return {
    connectionString,
    databaseName,
    drop: async () => {
      const cleanupClient = new Client({
        host: harness.host,
        port: harness.port,
        user: harness.username,
        password: harness.password,
        database: 'postgres',
      });

      await cleanupClient.connect();
      try {
        await cleanupClient.query(
          `SELECT pg_terminate_backend(pid)
           FROM pg_stat_activity
           WHERE datname = $1 AND pid <> pg_backend_pid()`,
          [databaseName],
        );
        await cleanupClient.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)}`);
      } finally {
        await cleanupClient.end();
      }
    },
  };
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}
