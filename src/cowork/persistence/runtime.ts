import * as path from 'path';
import { CoworkConfig, CoworkConfigManager } from '../config';
import { logger } from '../../runtime/logger';
import { CoworkDomainStore } from './cowork-domain-store';
import { PostgresPersistenceManager } from './postgres';

export interface CoworkPersistenceRuntimeOptions {
  config?: CoworkConfig;
  configManager?: CoworkConfigManager;
  manager?: PostgresPersistenceManager;
  autoMigrate?: boolean;
}

export class CoworkPersistenceRuntime {
  private static instance: CoworkPersistenceRuntime | null = null;

  private manager: PostgresPersistenceManager | null = null;
  private store: CoworkDomainStore | null = null;
  private config: CoworkConfig | null = null;
  private initPromise: Promise<CoworkDomainStore> | null = null;

  public static getInstance(): CoworkPersistenceRuntime {
    if (!CoworkPersistenceRuntime.instance) {
      CoworkPersistenceRuntime.instance = new CoworkPersistenceRuntime();
    }

    return CoworkPersistenceRuntime.instance;
  }

  public static resetForTests(): void {
    if (!CoworkPersistenceRuntime.instance) {
      return;
    }

    CoworkPersistenceRuntime.instance.manager = null;
    CoworkPersistenceRuntime.instance.store = null;
    CoworkPersistenceRuntime.instance.config = null;
    CoworkPersistenceRuntime.instance.initPromise = null;
    CoworkPersistenceRuntime.instance = null;
  }

  public async initialize(options: CoworkPersistenceRuntimeOptions = {}): Promise<CoworkDomainStore> {
    if (this.store) {
      return this.store;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.initializeInternal(options)
      .then((store) => {
        this.store = store;
        return store;
      })
      .finally(() => {
        this.initPromise = null;
      });

    return this.initPromise;
  }

  public getStore(): CoworkDomainStore | null {
    return this.store;
  }

  public getManager(): PostgresPersistenceManager | null {
    return this.manager;
  }

  public getConfig(): CoworkConfig | null {
    return this.config;
  }

  public async close(): Promise<void> {
    if (!this.manager) {
      return;
    }

    await this.manager.close();
    this.manager = null;
    this.store = null;
    this.config = null;
  }

  private async initializeInternal(options: CoworkPersistenceRuntimeOptions): Promise<CoworkDomainStore> {
    const configManager = options.configManager ?? CoworkConfigManager.getInstance();
    const config = await this.resolveConfig(configManager, options.config);
    this.config = config;

    const manager = options.manager ?? this.buildManagerFromConfig(config);
    this.manager = manager;

    const autoMigrate = options.autoMigrate ?? config.persistence.postgres.autoMigrate;
    if (autoMigrate) {
      await manager.migrate();
    }

    logger.info('[CoworkPersistenceRuntime] Cowork persistence initialized', {
      tenantId: config.tenant.id,
      ownerId: config.tenant.ownerId,
      provider: config.persistence.provider,
      autoMigrate,
    });

    return CoworkDomainStore.fromConfig(manager, config);
  }

  private async resolveConfig(
    configManager: CoworkConfigManager,
    override?: CoworkConfig,
  ): Promise<CoworkConfig> {
    if (override) {
      return override;
    }

    const loaded = configManager.getCurrentConfig();
    if (loaded) {
      return loaded;
    }

    return configManager.load({
      environment: process.env,
    });
  }

  private buildManagerFromConfig(config: CoworkConfig): PostgresPersistenceManager {
    const postgres = config.persistence.postgres;
    const migrationsDir = postgres.migrationsDir ?? path.resolve(process.cwd(), 'src', 'cowork', 'persistence', 'migrations');

    return new PostgresPersistenceManager({
      connectionString: postgres.connectionString,
      maxConnections: postgres.maxConnections,
      idleTimeoutMs: postgres.idleTimeoutMs,
      connectionTimeoutMs: postgres.connectionTimeoutMs,
      ssl: postgres.ssl,
      applicationName: 'opencode-cowork',
      migrationsDir,
    });
  }
}

export async function initializeCoworkPersistence(
  options: CoworkPersistenceRuntimeOptions = {},
): Promise<CoworkDomainStore> {
  return CoworkPersistenceRuntime.getInstance().initialize(options);
}

export function getCoworkPersistenceStore(): CoworkDomainStore | null {
  return CoworkPersistenceRuntime.getInstance().getStore();
}
