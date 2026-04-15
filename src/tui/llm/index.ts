/**
 * Multi-Provider LLM System - Main Entry Point
 *
 * Provides unified access to multiple LLM providers with automatic
 * fallback, runtime switching, and comprehensive provider management.
 *
 * @example
 * ```typescript
 * import { createProvider, getAvailableProviders, ProviderManager } from './llm';
 *
 * // Create a provider
 * const openai = createProvider('openai');
 *
 * // Chat completion
 * const response = await openai.chatCompletion({
 *   messages: [{ role: 'user', content: 'Hello!' }]
 * });
 *
 * // Streaming
 * for await (const chunk of openai.streamCompletion({ messages })) {
 *   console.log(chunk.content);
 * }
 * ```
 */

// Type exports
export type {
  MessageRole,
  ToolCall,
  LLMMessage,
  ToolDefinition,
  TokenUsage,
  LLMResponse,
  StreamChunk,
  ProviderCapabilities,
  ProviderType,
  BaseProviderConfig,
  OpenAIConfig,
  CodexConfig,
  GeminiConfig,
  OpenRouterConfig,
  OllamaConfig,
  LMStudioConfig,
  GitHubCopilotConfig,
  KimiConfig,
  ProviderConfig,
  UnifiedProviderConfig,
  LLMRequestOptions,
  LLMErrorType,
  FallbackConfig,
  LLMProvider,
} from './types';

// Error class export
export { LLMError } from './types';

// Config exports
export {
  LLMConfigManager,
  configManager,
  initializeConfig,
  getProviderCapabilities,
  supportsCapability,
  createErrorFromResponse,
  DEFAULT_CONFIG,
  PROVIDER_CAPABILITIES,
  ENV_VARS,
} from './config';

// Provider implementations export
export {
  OpenAIProvider,
  CodexProvider,
  GeminiProvider,
  OpenRouterProvider,
  OllamaProvider,
  LMStudioProvider,
  GitHubCopilotProvider,
  KimiProvider,
  PROVIDER_IMPLEMENTATIONS,
} from './providers';

import {
  ProviderType,
  BaseProviderConfig,
  LLMProvider,
  LLMResponse,
  LLMRequestOptions,
  StreamChunk,
  FallbackConfig,
  LLMError,
  LLMErrorType,
} from './types';

import {
  configManager,
  initializeConfig,
  getProviderCapabilities,
  DEFAULT_CONFIG,
  createErrorFromResponse,
} from './config';

import {
  OpenAIProvider,
  CodexProvider,
  GeminiProvider,
  OpenRouterProvider,
  OllamaProvider,
  LMStudioProvider,
  GitHubCopilotProvider,
  KimiProvider,
} from './providers';

/**
 * Provider factory map for creating provider instances
 */
const PROVIDER_FACTORIES: Record<
  ProviderType,
  new (config?: Partial<BaseProviderConfig>) => LLMProvider
> = {
  openai: OpenAIProvider,
  codex: CodexProvider,
  gemini: GeminiProvider,
  openrouter: OpenRouterProvider,
  ollama: OllamaProvider,
  lmstudio: LMStudioProvider,
  'github-copilot': GitHubCopilotProvider,
  kimi: KimiProvider,
};

/**
 * Create a provider instance
 *
 * @param type - Provider type identifier
 * @param config - Optional provider configuration
 * @returns Provider instance implementing LLMProvider interface
 * @throws LLMError if provider type is invalid or not configured
 *
 * @example
 * ```typescript
 * // Create with environment configuration
 * const openai = createProvider('openai');
 *
 * // Create with explicit configuration
 * const gemini = createProvider('gemini', {
 *   apiKey: 'your-api-key',
 *   model: 'gemini-1.5-pro-latest'
 * });
 * ```
 */
export function createProvider(
  type: ProviderType,
  config?: Partial<BaseProviderConfig>
): LLMProvider {
  const Factory = PROVIDER_FACTORIES[type];

  if (!Factory) {
    throw new LLMError(
      `Unknown provider type: ${type}`,
      'invalid_request',
      type
    );
  }

  // Load from environment if no config provided
  if (!config) {
    configManager.loadFromEnvironment();
    const envConfig = configManager.getProviderConfig(type);
    if (envConfig) {
      config = envConfig;
    }
  }

  // Validate configuration
  const validation = configManager.validateConfig(type);
  if (!validation.valid) {
    throw new LLMError(
      `Invalid configuration for ${type}: ${validation.errors.join(', ')}`,
      'invalid_request',
      type
    );
  }

  return new Factory(config);
}

/**
 * Get list of available providers based on environment configuration
 *
 * Checks for API keys and valid configurations to determine
 * which providers are ready to use.
 *
 * @returns Array of available provider type identifiers
 *
 * @example
 * ```typescript
 * const available = getAvailableProviders();
 * // ['openai', 'gemini', 'ollama'] etc.
 * ```
 */
export function getAvailableProviders(): ProviderType[] {
  configManager.loadFromEnvironment();
  return configManager.detectAvailableProviders();
}

/**
 * Check if a specific provider is available
 *
 * @param type - Provider type to check
 * @returns Boolean indicating if provider is configured and ready
 */
export function isProviderAvailable(type: ProviderType): boolean {
  configManager.loadFromEnvironment();
  return configManager.isProviderConfigured(type);
}

/**
 * Provider Manager class for advanced provider management
 *
 * Provides utilities for managing multiple providers, automatic
 * fallback, and runtime switching capabilities.
 */
export class ProviderManager {
  private providers: Map<ProviderType, LLMProvider> = new Map();
  private currentProvider: ProviderType | null = null;
  private fallbackConfig: FallbackConfig | null = null;

  /**
   * Initialize the provider manager
   *
   * Loads configuration from environment and pre-warms
   * available providers.
   */
  initialize(): void {
    initializeConfig();
    const available = getAvailableProviders();

    for (const type of available) {
      try {
        const provider = createProvider(type);
        this.providers.set(type, provider);
      } catch (error) {
        console.warn(`Failed to initialize provider ${type}:`, error);
      }
    }
  }

  /**
   * Get a provider instance
   *
   * @param type - Provider type (uses current if not specified)
   * @returns Provider instance
   */
  getProvider(type?: ProviderType): LLMProvider {
    const providerType = type || this.currentProvider;

    if (!providerType) {
      throw new LLMError(
        'No provider specified and no current provider set',
        'invalid_request',
        'unknown'
      );
    }

    const provider = this.providers.get(providerType);
    if (!provider) {
      // Try to create on demand
      const newProvider = createProvider(providerType);
      this.providers.set(providerType, newProvider);
      return newProvider;
    }

    return provider;
  }

  /**
   * Set the current active provider
   *
   * @param type - Provider type to set as current
   */
  setCurrentProvider(type: ProviderType): void {
    if (!this.providers.has(type)) {
      const provider = createProvider(type);
      this.providers.set(type, provider);
    }
    this.currentProvider = type;
  }

  /**
   * Get the current active provider type
   */
  getCurrentProvider(): ProviderType | null {
    return this.currentProvider;
  }

  /**
   * List all initialized providers
   */
  listProviders(): ProviderType[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Set up automatic fallback configuration
   *
   * @param config - Fallback configuration
   */
  setFallbackConfig(config: FallbackConfig): void {
    this.fallbackConfig = config;
  }

  /**
   * Execute with automatic fallback
   *
   * Tries providers in order until one succeeds
   *
   * @param operation - Async operation to execute
   * @param options - Request options
   * @returns Result from first successful provider
   */
  async executeWithFallback<T>(
    operation: (provider: LLMProvider) => Promise<T>,
    options?: { preferredProvider?: ProviderType }
  ): Promise<T> {
    const providers = this.fallbackConfig?.providers || this.listProviders();

    if (providers.length === 0) {
      throw new LLMError(
        'No providers available for fallback',
        'invalid_request',
        'unknown'
      );
    }

    // Use preferred provider first if specified
    const orderedProviders = options?.preferredProvider
      ? [
          options.preferredProvider,
          ...providers.filter((p) => p !== options.preferredProvider),
        ]
      : providers;

    const errors: LLMError[] = [];

    for (const providerType of orderedProviders) {
      try {
        const provider = this.getProvider(providerType);
        return await operation(provider);
      } catch (error) {
        if (error instanceof LLMError) {
          errors.push(error);

          // Don't retry non-retryable errors if configured
          if (
            !error.retryable &&
            !this.fallbackConfig?.continueOnError
          ) {
            throw error;
          }
        } else {
          throw error;
        }
      }
    }

    // All providers failed
    throw new LLMError(
      `All providers failed. Errors: ${errors
        .map((e) => `${e.provider}: ${e.message}`)
        .join('; ')}`,
      'unknown',
      'fallback'
    );
  }

  /**
   * Chat completion with automatic fallback
   */
  async chatCompletion(
    options: LLMRequestOptions,
    preferredProvider?: ProviderType
  ): Promise<LLMResponse> {
    return this.executeWithFallback(
      (provider) => provider.chatCompletion(options),
      { preferredProvider }
    );
  }

  /**
   * Stream completion with automatic fallback
   */
  async *streamCompletion(
    options: LLMRequestOptions,
    preferredProvider?: ProviderType
  ): AsyncGenerator<StreamChunk> {
    const providers = this.fallbackConfig?.providers || this.listProviders();

    const orderedProviders = preferredProvider
      ? [
          preferredProvider,
          ...providers.filter((p) => p !== preferredProvider),
        ]
      : providers;

    for (const providerType of orderedProviders) {
      try {
        const provider = this.getProvider(providerType);
        yield* provider.streamCompletion(options);
        return;
      } catch (error) {
        if (
          error instanceof LLMError &&
          !error.retryable &&
          !this.fallbackConfig?.continueOnError
        ) {
          throw error;
        }
        // Continue to next provider
      }
    }

    throw new LLMError(
      'All providers failed for streaming',
      'unknown',
      'fallback'
    );
  }

  /**
   * Health check all providers
   */
  async healthCheck(): Promise<Record<ProviderType, boolean>> {
    const results: Partial<Record<ProviderType, boolean>> = {};

    for (const [type, provider] of this.providers) {
      try {
        results[type] = await provider.isAvailable();
      } catch {
        results[type] = false;
      }
    }

    return results as Record<ProviderType, boolean>;
  }

  /**
   * Update provider configuration at runtime
   */
  updateProviderConfig(
    type: ProviderType,
    config: Partial<BaseProviderConfig>
  ): void {
    const provider = this.providers.get(type);
    if (provider) {
      provider.updateConfig(config);
    }
  }
}

/**
 * Global provider manager instance
 */
export const providerManager = new ProviderManager();

/**
 * Quick chat completion helper
 *
 * @param messages - Array of messages
 * @param providerType - Optional provider type (uses first available)
 * @returns LLM response
 */
export async function chat(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  providerType?: ProviderType
): Promise<string> {
  providerManager.initialize();

  const response = await providerManager.chatCompletion(
    { messages },
    providerType || undefined
  );

  return response.content || '';
}

/**
 * Quick streaming chat helper
 *
 * @param messages - Array of messages
 * @param providerType - Optional provider type
 * @returns Async generator of content chunks
 */
export async function *streamChat(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  providerType?: ProviderType
): AsyncGenerator<string> {
  providerManager.initialize();

  for await (const chunk of providerManager.streamCompletion(
    { messages },
    providerType || undefined
  )) {
    if (chunk.content) {
      yield chunk.content;
    }
  }
}

/**
 * Utility to check all provider health
 */
export async function checkProviderHealth(): Promise<
  Array<{ provider: ProviderType; available: boolean; healthy: boolean }>
> {
  const manager = new ProviderManager();
  manager.initialize();

  const results = [];
  for (const type of manager.listProviders()) {
    const provider = manager.getProvider(type);
    const available = await provider.isAvailable();
    results.push({
      provider: type,
      available,
      healthy: available,
    });
  }

  return results;
}

// Re-export all types for convenience
export * from './types';
