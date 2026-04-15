import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { ZodIssue } from 'zod';
import { logger } from '../../runtime/logger';
import { CoworkConfig, CoworkConfigInput, CoworkConfigSchema } from './schema';

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? Array<U>
    : T[K] extends Record<string, unknown>
      ? DeepPartial<T[K]>
      : T[K];
};

export interface SecretProvider {
  getSecret(secretName: string): Promise<string | undefined>;
}

export interface CoworkConfigLoadOptions {
  configFilePath?: string;
  environment?: NodeJS.ProcessEnv;
  overrides?: DeepPartial<CoworkConfigInput>;
  secretProvider?: SecretProvider;
}

export type ConfigReloadListener = (config: CoworkConfig) => void;

export class CoworkConfigValidationError extends Error {
  public readonly issues: ZodIssue[];

  constructor(message: string, issues: ZodIssue[]) {
    super(message);
    this.name = 'CoworkConfigValidationError';
    this.issues = issues;
  }
}

export class CoworkConfigSecretError extends Error {
  constructor(secretName: string) {
    super(
      `Unable to resolve cowork configuration secret "${secretName}". Provide it via SecretProvider, ${secretName}, or SECRET_${secretName}.`
    );
    this.name = 'CoworkConfigSecretError';
  }
}

export class CoworkConfigManager {
  private static instance: CoworkConfigManager | null = null;

  private currentConfig: CoworkConfig | null = null;
  private listeners = new Set<ConfigReloadListener>();
  private fileWatcher: fs.FSWatcher | null = null;

  public static getInstance(): CoworkConfigManager {
    if (!CoworkConfigManager.instance) {
      CoworkConfigManager.instance = new CoworkConfigManager();
    }

    return CoworkConfigManager.instance;
  }

  public static resetForTests(): void {
    if (!CoworkConfigManager.instance) {
      return;
    }

    CoworkConfigManager.instance.clearForTests();
    CoworkConfigManager.instance = null;
  }

  public async load(options: CoworkConfigLoadOptions = {}): Promise<CoworkConfig> {
    const environment = options.environment ?? process.env;
    const environmentConfig = buildCoworkConfigFromEnvironment(environment);
    const fileConfig = options.configFilePath
      ? await readConfigFromFile(options.configFilePath)
      : ({} as DeepPartial<CoworkConfigInput>);
    const overrideConfig = options.overrides ?? {};

    const merged = deepMerge<CoworkConfigInput>(
      environmentConfig,
      fileConfig,
      overrideConfig
    );
    const resolvedSecrets = await resolveSecrets(merged, options.secretProvider, environment) as DeepPartial<CoworkConfigInput>;

    const parsed = CoworkConfigSchema.safeParse(resolvedSecrets);
    if (!parsed.success) {
      throw new CoworkConfigValidationError('Invalid cowork configuration payload.', parsed.error.issues);
    }

    this.currentConfig = parsed.data;
    this.notifyListeners(parsed.data);
    return parsed.data;
  }

  public getCurrentConfig(): CoworkConfig | null {
    return this.currentConfig;
  }

  public requireConfig(): CoworkConfig {
    if (!this.currentConfig) {
      throw new Error('Cowork configuration has not been loaded. Call loadCoworkConfig() first.');
    }

    return this.currentConfig;
  }

  public subscribe(listener: ConfigReloadListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public async startHotReload(
    configFilePath: string,
    options: Omit<CoworkConfigLoadOptions, 'configFilePath'> = {}
  ): Promise<void> {
    this.stopHotReload();

    await this.load({
      ...options,
      configFilePath,
    });

    const absolutePath = path.resolve(configFilePath);
    this.fileWatcher = fs.watch(absolutePath, async (eventType) => {
      if (eventType !== 'change' && eventType !== 'rename') {
        return;
      }

      try {
        await this.load({
          ...options,
          configFilePath: absolutePath,
        });
        logger.info('[CoworkConfigManager] Reloaded cowork configuration', {
          configFilePath: absolutePath,
          eventType,
        });
      } catch (error) {
        logger.error('[CoworkConfigManager] Failed to hot-reload cowork configuration', {
          configFilePath: absolutePath,
          eventType,
          error,
        });
      }
    });
  }

  public stopHotReload(): void {
    if (!this.fileWatcher) {
      return;
    }

    this.fileWatcher.close();
    this.fileWatcher = null;
  }

  public clearForTests(): void {
    this.stopHotReload();
    this.currentConfig = null;
    this.listeners.clear();
  }

  private notifyListeners(config: CoworkConfig): void {
    for (const listener of this.listeners) {
      listener(config);
    }
  }
}

export async function loadCoworkConfig(options: CoworkConfigLoadOptions = {}): Promise<CoworkConfig> {
  return CoworkConfigManager.getInstance().load(options);
}

export function getCoworkConfigManager(): CoworkConfigManager {
  return CoworkConfigManager.getInstance();
}

export function getCoworkConfig(): CoworkConfig {
  return CoworkConfigManager.getInstance().requireConfig();
}

export function buildCoworkConfigFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env
): DeepPartial<CoworkConfigInput> {
  const config: DeepPartial<CoworkConfigInput> = {
    tenant: {},
    persistence: {
      postgres: {},
    },
    collaboration: {},
    workflow: {},
    security: {},
  };

  if (environment.NODE_ENV) {
    config.environment = parseEnvironment(environment.NODE_ENV);
  }

  if (environment.COWORK_TENANT_ID) {
    config.tenant = {
      ...(config.tenant ?? {}),
      id: environment.COWORK_TENANT_ID,
    };
  }

  if (environment.COWORK_TENANT_NAME) {
    config.tenant = {
      ...(config.tenant ?? {}),
      name: environment.COWORK_TENANT_NAME,
    };
  }

  if (environment.COWORK_TENANT_OWNER_ID) {
    config.tenant = {
      ...(config.tenant ?? {}),
      ownerId: environment.COWORK_TENANT_OWNER_ID,
    };
  }

  const postgresConfig = {
    ...(config.persistence?.postgres ?? {}),
  };

  if (environment.COWORK_PERSISTENCE_CONNECTION_STRING) {
    postgresConfig.connectionString = environment.COWORK_PERSISTENCE_CONNECTION_STRING;
  }

  maybeAssignInteger(postgresConfig, 'maxConnections', environment.COWORK_PERSISTENCE_MAX_CONNECTIONS, 'COWORK_PERSISTENCE_MAX_CONNECTIONS');
  maybeAssignInteger(postgresConfig, 'idleTimeoutMs', environment.COWORK_PERSISTENCE_IDLE_TIMEOUT_MS, 'COWORK_PERSISTENCE_IDLE_TIMEOUT_MS');
  maybeAssignInteger(postgresConfig, 'connectionTimeoutMs', environment.COWORK_PERSISTENCE_CONNECTION_TIMEOUT_MS, 'COWORK_PERSISTENCE_CONNECTION_TIMEOUT_MS');

  if (environment.COWORK_PERSISTENCE_MIGRATIONS_DIR) {
    postgresConfig.migrationsDir = environment.COWORK_PERSISTENCE_MIGRATIONS_DIR;
  }

  maybeAssignBoolean(postgresConfig, 'ssl', environment.COWORK_PERSISTENCE_SSL, 'COWORK_PERSISTENCE_SSL');
  maybeAssignBoolean(postgresConfig, 'autoMigrate', environment.COWORK_PERSISTENCE_AUTO_MIGRATE, 'COWORK_PERSISTENCE_AUTO_MIGRATE');

  config.persistence = {
    provider: 'postgres',
    postgres: postgresConfig,
  };


  maybeAssignBoolean(
    config.persistence,
    'required',
    environment.COWORK_PERSISTENCE_REQUIRED,
    'COWORK_PERSISTENCE_REQUIRED',
  );

  const collaboration = {
    ...(config.collaboration ?? {}),
  };
  maybeAssignBoolean(collaboration, 'enabled', environment.COWORK_COLLABORATION_ENABLED, 'COWORK_COLLABORATION_ENABLED');
  maybeAssignInteger(collaboration, 'maxConcurrentEditors', environment.COWORK_COLLABORATION_MAX_EDITORS, 'COWORK_COLLABORATION_MAX_EDITORS');
  maybeAssignInteger(
    collaboration,
    'conflictDetectionWindowMs',
    environment.COWORK_COLLABORATION_CONFLICT_WINDOW_MS,
    'COWORK_COLLABORATION_CONFLICT_WINDOW_MS'
  );
  maybeAssignBoolean(
    collaboration,
    'autoResolveConflicts',
    environment.COWORK_COLLABORATION_AUTO_RESOLVE,
    'COWORK_COLLABORATION_AUTO_RESOLVE'
  );
  config.collaboration = collaboration;

  const workflow = {
    ...(config.workflow ?? {}),
  };
  maybeAssignInteger(workflow, 'defaultTimeoutMs', environment.COWORK_WORKFLOW_DEFAULT_TIMEOUT_MS, 'COWORK_WORKFLOW_DEFAULT_TIMEOUT_MS');
  maybeAssignInteger(workflow, 'maxSteps', environment.COWORK_WORKFLOW_MAX_STEPS, 'COWORK_WORKFLOW_MAX_STEPS');
  maybeAssignInteger(
    workflow,
    'checkpointIntervalMs',
    environment.COWORK_WORKFLOW_CHECKPOINT_INTERVAL_MS,
    'COWORK_WORKFLOW_CHECKPOINT_INTERVAL_MS'
  );
  config.workflow = workflow;

  const security = {
    ...(config.security ?? {}),
  };
  maybeAssignBoolean(security, 'enforceRbac', environment.COWORK_SECURITY_ENFORCE_RBAC, 'COWORK_SECURITY_ENFORCE_RBAC');
  maybeAssignBoolean(
    security,
    'redactSecretsInLogs',
    environment.COWORK_SECURITY_REDACT_SECRETS,
    'COWORK_SECURITY_REDACT_SECRETS'
  );
  maybeAssignInteger(
    security,
    'auditRetentionDays',
    environment.COWORK_SECURITY_AUDIT_RETENTION_DAYS,
    'COWORK_SECURITY_AUDIT_RETENTION_DAYS'
  );
  config.security = security;

  return config;
}

async function readConfigFromFile(configFilePath: string): Promise<DeepPartial<CoworkConfigInput>> {
  const absolutePath = path.resolve(configFilePath);
  const fileContents = await fsPromises.readFile(absolutePath, 'utf8');
  const extension = path.extname(absolutePath).toLowerCase();

  let parsed: unknown;
  if (extension === '.yaml' || extension === '.yml') {
    parsed = yaml.load(fileContents);
  } else {
    parsed = JSON.parse(fileContents) as unknown;
  }

  if (!isPlainObject(parsed)) {
    throw new CoworkConfigValidationError('Cowork config file must resolve to an object payload.', []);
  }

  return parsed as DeepPartial<CoworkConfigInput>;
}

async function resolveSecrets(
  value: unknown,
  secretProvider: SecretProvider | undefined,
  environment: NodeJS.ProcessEnv
): Promise<unknown> {
  if (typeof value === 'string') {
    return resolveSecretsInString(value, secretProvider, environment);
  }

  if (Array.isArray(value)) {
    const resolvedItems = await Promise.all(value.map((item) => resolveSecrets(item, secretProvider, environment)));
    return resolvedItems;
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const result: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    result[key] = await resolveSecrets(nestedValue, secretProvider, environment);
  }
  return result;
}

async function resolveSecretsInString(
  value: string,
  secretProvider: SecretProvider | undefined,
  environment: NodeJS.ProcessEnv
): Promise<string> {
  const matches = [...value.matchAll(/\$\{secret:([A-Za-z0-9_-]+)\}/g)];
  if (matches.length === 0) {
    return value;
  }

  let output = value;
  for (const match of matches) {
    const placeholder = match[0];
    const secretName = match[1];
    const secret = await loadSecret(secretName, secretProvider, environment);
    output = output.split(placeholder).join(secret);
  }

  return output;
}

async function loadSecret(
  secretName: string,
  secretProvider: SecretProvider | undefined,
  environment: NodeJS.ProcessEnv
): Promise<string> {
  if (secretProvider) {
    const providedSecret = await secretProvider.getSecret(secretName);
    if (providedSecret && providedSecret.length > 0) {
      return providedSecret;
    }
  }

  const directEnvSecret = environment[secretName];
  if (directEnvSecret && directEnvSecret.length > 0) {
    return directEnvSecret;
  }

  const prefixedEnvSecret = environment[`SECRET_${secretName}`];
  if (prefixedEnvSecret && prefixedEnvSecret.length > 0) {
    return prefixedEnvSecret;
  }

  throw new CoworkConfigSecretError(secretName);
}

function deepMerge<T>(...inputs: Array<DeepPartial<T>>): DeepPartial<T> {
  const merged: Record<string, unknown> = {};

  for (const input of inputs) {
    mergeInto(merged, input as Record<string, unknown>);
  }

  return merged as DeepPartial<T>;
}

function mergeInto(target: Record<string, unknown>, source: Record<string, unknown> | undefined): void {
  if (!source) {
    return;
  }

  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) {
      continue;
    }

    const targetValue = target[key];
    if (isPlainObject(value) && isPlainObject(targetValue)) {
      mergeInto(targetValue, value);
      continue;
    }

    if (isPlainObject(value)) {
      const nestedTarget: Record<string, unknown> = {};
      mergeInto(nestedTarget, value);
      target[key] = nestedTarget;
      continue;
    }

    target[key] = value;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseEnvironment(nodeEnv: string): CoworkConfigInput['environment'] {
  if (nodeEnv === 'development' || nodeEnv === 'test' || nodeEnv === 'production') {
    return nodeEnv;
  }

  throw new CoworkConfigValidationError(`NODE_ENV must be one of development, test, or production. Received: ${nodeEnv}`, []);
}

function maybeAssignBoolean(
  target: Record<string, unknown>,
  key: string,
  rawValue: string | undefined,
  variableName: string
): void {
  if (rawValue === undefined || rawValue.trim() === '') {
    return;
  }

  const normalized = rawValue.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') {
    target[key] = true;
    return;
  }

  if (normalized === 'false' || normalized === '0') {
    target[key] = false;
    return;
  }

  throw new CoworkConfigValidationError(`${variableName} must be a boolean (true/false/1/0).`, []);
}

function maybeAssignInteger(
  target: Record<string, unknown>,
  key: string,
  rawValue: string | undefined,
  variableName: string
): void {
  if (rawValue === undefined || rawValue.trim() === '') {
    return;
  }

  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed)) {
    throw new CoworkConfigValidationError(`${variableName} must be an integer value.`, []);
  }

  target[key] = parsed;
}
