import { z } from 'zod';

export const CoworkConfigSchema = z.object({
  environment: z.enum(['development', 'test', 'production']).default('development'),

  tenant: z
    .object({
      id: z.string().min(1).default('default'),
      name: z.string().min(1).default('Default Tenant'),
      ownerId: z.string().min(1).default('default-owner'),
    })
    .default({
      id: 'default',
      name: 'Default Tenant',
      ownerId: 'default-owner',
    }),

  persistence: z
    .object({
      provider: z.literal('postgres').default('postgres'),
      required: z.boolean().default(false),
      postgres: z
        .object({
          connectionString: z.string().min(1).default('postgres://localhost:5432/opencode'),
          maxConnections: z.number().int().positive().default(20),
          idleTimeoutMs: z.number().int().positive().default(30000),
          connectionTimeoutMs: z.number().int().positive().default(5000),
          ssl: z.boolean().default(false),
          autoMigrate: z.boolean().default(true),
          migrationsDir: z.string().min(1).optional(),
        })
        .default({
          connectionString: 'postgres://localhost:5432/opencode',
          maxConnections: 20,
          idleTimeoutMs: 30000,
          connectionTimeoutMs: 5000,
          ssl: false,
          autoMigrate: true,
        }),
    })
    .default({
      provider: 'postgres',
      required: false,
      postgres: {
        connectionString: 'postgres://localhost:5432/opencode',
        maxConnections: 20,
        idleTimeoutMs: 30000,
        connectionTimeoutMs: 5000,
        ssl: false,
        autoMigrate: true,
      },
    }),

  collaboration: z
    .object({
      enabled: z.boolean().default(true),
      maxConcurrentEditors: z.number().int().positive().default(10),
      conflictDetectionWindowMs: z.number().int().positive().default(300000),
      autoResolveConflicts: z.boolean().default(false),
    })
    .default({
      enabled: true,
      maxConcurrentEditors: 10,
      conflictDetectionWindowMs: 300000,
      autoResolveConflicts: false,
    }),

  workflow: z
    .object({
      defaultTimeoutMs: z.number().int().positive().default(3600000),
      maxSteps: z.number().int().positive().default(100),
      checkpointIntervalMs: z.number().int().positive().default(10000),
    })
    .default({
      defaultTimeoutMs: 3600000,
      maxSteps: 100,
      checkpointIntervalMs: 10000,
    }),

  security: z
    .object({
      enforceRbac: z.boolean().default(true),
      redactSecretsInLogs: z.boolean().default(true),
      auditRetentionDays: z.number().int().positive().default(2555),
    })
    .default({
      enforceRbac: true,
      redactSecretsInLogs: true,
      auditRetentionDays: 2555,
    }),
});

export type CoworkConfig = z.infer<typeof CoworkConfigSchema>;
export type CoworkConfigInput = z.input<typeof CoworkConfigSchema>;
