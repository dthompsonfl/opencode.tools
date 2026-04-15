/**
 * Multi-Provider LLM System - Configuration Management
 * 
 * Handles environment-based configuration, provider auto-detection,
 * and runtime configuration updates for all LLM providers.
 */

import {
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
  UnifiedProviderConfig,
  ProviderCapabilities,
  LLMError,
  LLMErrorType
} from './types';

/**
 * Environment variable names for each provider
 */
export const ENV_VARS: Record<ProviderType, { apiKey: string; model?: string; baseUrl?: string; additional?: string[] }> = {
  openai: {
    apiKey: 'OPENAI_API_KEY',
    model: 'OPENAI_MODEL',
    baseUrl: 'OPENAI_BASE_URL'
  },
  codex: {
    apiKey: 'OPENAI_API_KEY',
    model: 'CODEX_MODEL',
    baseUrl: 'OPENAI_BASE_URL'
  },
  gemini: {
    apiKey: 'GEMINI_API_KEY',
    model: 'GEMINI_MODEL',
    baseUrl: 'GEMINI_BASE_URL'
  },
  openrouter: {
    apiKey: 'OPENROUTER_API_KEY',
    model: 'OPENROUTER_MODEL',
    baseUrl: 'OPENROUTER_BASE_URL'
  },
  ollama: {
    apiKey: '',
    model: 'OLLAMA_MODEL',
    baseUrl: 'OLLAMA_HOST',
    additional: ['OLLAMA_KEEP_ALIVE']
  },
  lmstudio: {
    apiKey: '',
    model: 'LMSTUDIO_MODEL',
    baseUrl: 'LMSTUDIO_HOST'
  },
  'github-copilot': {
    apiKey: 'GITHUB_COPILOT_TOKEN',
    model: 'COPILOT_MODEL'
  },
  kimi: {
    apiKey: 'KIMI_API_KEY',
    model: 'KIMI_MODEL',
    baseUrl: 'KIMI_BASE_URL'
  }
};

/**
 * Default configuration values for each provider
 */
export const DEFAULT_CONFIG: Record<ProviderType, Required<BaseProviderConfig>> = {
  openai: {
    apiKey: '',
    model: 'gpt-4o-mini',
    baseUrl: 'https://api.openai.com/v1',
    temperature: 0.7,
    maxTokens: 4096,
    timeout: 60000
  },
  codex: {
    apiKey: '',
    model: 'gpt-4o-codex',
    baseUrl: 'https://api.openai.com/v1',
    temperature: 0.2,
    maxTokens: 8192,
    timeout: 120000
  },
  gemini: {
    apiKey: '',
    model: 'gemini-1.5-flash-latest',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    temperature: 0.7,
    maxTokens: 8192,
    timeout: 60000
  },
  openrouter: {
    apiKey: '',
    model: 'openai/gpt-4o-mini',
    baseUrl: 'https://openrouter.ai/api/v1',
    temperature: 0.7,
    maxTokens: 4096,
    timeout: 60000
  },
  ollama: {
    apiKey: '',
    model: 'llama3.2',
    baseUrl: 'http://localhost:11434',
    temperature: 0.7,
    maxTokens: 4096,
    timeout: 120000
  },
  lmstudio: {
    apiKey: 'lm-studio',
    model: 'local-model',
    baseUrl: 'http://localhost:1234/v1',
    temperature: 0.7,
    maxTokens: 4096,
    timeout: 120000
  },
  'github-copilot': {
    apiKey: '',
    model: 'copilot-chat',
    baseUrl: 'https://api.githubcopilot.com',
    temperature: 0.3,
    maxTokens: 4096,
    timeout: 60000
  },
  kimi: {
    apiKey: '',
    model: 'moonshot-v1-8k',
    baseUrl: 'https://api.moonshot.cn/v1',
    temperature: 0.7,
    maxTokens: 8192,
    timeout: 60000
  }
};

/**
 * Provider capabilities metadata
 */
export const PROVIDER_CAPABILITIES: Record<ProviderType, ProviderCapabilities> = {
  openai: {
    provider: 'openai',
    streaming: true,
    tools: true,
    vision: true,
    jsonMode: true,
    systemMessages: true,
    maxContextLength: 128000,
    availableModels: [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo'
    ],
    defaultModel: 'gpt-4o-mini'
  },
  codex: {
    provider: 'codex',
    streaming: true,
    tools: true,
    vision: true,
    jsonMode: true,
    systemMessages: true,
    maxContextLength: 128000,
    availableModels: [
      'gpt-4o-codex',
      'gpt-4-codex'
    ],
    defaultModel: 'gpt-4o-codex'
  },
  gemini: {
    provider: 'gemini',
    streaming: true,
    tools: true,
    vision: true,
    jsonMode: true,
    systemMessages: true,
    maxContextLength: 1000000,
    availableModels: [
      'gemini-1.5-pro-latest',
      'gemini-1.5-flash-latest',
      'gemini-1.0-pro',
      'gemini-1.0-pro-vision'
    ],
    defaultModel: 'gemini-1.5-flash-latest'
  },
  openrouter: {
    provider: 'openrouter',
    streaming: true,
    tools: true,
    vision: true,
    jsonMode: true,
    systemMessages: true,
    maxContextLength: 200000,
    availableModels: [
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'anthropic/claude-3.5-sonnet',
      'anthropic/claude-3-opus',
      'google/gemini-1.5-pro',
      'meta-llama/llama-3.1-405b'
    ],
    defaultModel: 'openai/gpt-4o-mini'
  },
  ollama: {
    provider: 'ollama',
    streaming: true,
    tools: false,
    vision: false,
    jsonMode: false,
    systemMessages: true,
    maxContextLength: 128000,
    availableModels: [
      'llama3.2',
      'llama3.1',
      'llama3',
      'mistral',
      'codellama',
      'phi4',
      'qwen2.5'
    ],
    defaultModel: 'llama3.2'
  },
  lmstudio: {
    provider: 'lmstudio',
    streaming: true,
    tools: false,
    vision: false,
    jsonMode: false,
    systemMessages: true,
    maxContextLength: 128000,
    availableModels: [
      'local-model'
    ],
    defaultModel: 'local-model'
  },
  'github-copilot': {
    provider: 'github-copilot',
    streaming: true,
    tools: true,
    vision: false,
    jsonMode: false,
    systemMessages: true,
    maxContextLength: 128000,
    availableModels: [
      'copilot-chat',
      'copilot-inline'
    ],
    defaultModel: 'copilot-chat'
  },
  kimi: {
    provider: 'kimi',
    streaming: true,
    tools: true,
    vision: false,
    jsonMode: true,
    systemMessages: true,
    maxContextLength: 200000,
    availableModels: [
      'moonshot-v1-8k',
      'moonshot-v1-32k',
      'moonshot-v1-128k'
    ],
    defaultModel: 'moonshot-v1-8k'
  }
};

/**
 * Configuration manager for LLM providers
 */
export class LLMConfigManager {
  private config: UnifiedProviderConfig = {};

  /**
   * Load configuration from environment variables
   */
  loadFromEnvironment(): UnifiedProviderConfig {
    const config: UnifiedProviderConfig = {};

    for (const provider of Object.keys(ENV_VARS) as ProviderType[]) {
      const envVars = ENV_VARS[provider];
      const defaults = DEFAULT_CONFIG[provider];

      const apiKey = process.env[envVars.apiKey] || defaults.apiKey;
      const model = (envVars.model ? process.env[envVars.model] : null) || defaults.model;
      const baseUrl = (envVars.baseUrl ? process.env[envVars.baseUrl] : null) || defaults.baseUrl;

      if (apiKey || provider === 'ollama' || provider === 'lmstudio') {
        config[provider] = {
          apiKey,
          model,
          baseUrl,
          temperature: defaults.temperature,
          maxTokens: defaults.maxTokens,
          timeout: defaults.timeout
        };
      }
    }

    this.config = config;
    return config;
  }

  /**
   * Get configuration for a specific provider
   */
  getProviderConfig(provider: ProviderType): BaseProviderConfig | undefined {
    return this.config[provider];
  }

  /**
   * Set configuration for a specific provider
   */
  setProviderConfig(provider: ProviderType, config: Partial<BaseProviderConfig>): void {
    const defaults = DEFAULT_CONFIG[provider];
    this.config[provider] = {
      ...defaults,
      ...this.config[provider],
      ...config
    };
  }

  /**
   * Get all loaded configurations
   */
  getAllConfigs(): UnifiedProviderConfig {
    return { ...this.config };
  }

  /**
   * Detect available providers based on environment variables
   */
  detectAvailableProviders(): ProviderType[] {
    const available: ProviderType[] = [];

    for (const provider of Object.keys(ENV_VARS) as ProviderType[]) {
      const envVars = ENV_VARS[provider];
      
      // Ollama and LM Studio don't require API keys
      if (provider === 'ollama' || provider === 'lmstudio') {
        available.push(provider);
        continue;
      }

      // Check if API key is present
      if (process.env[envVars.apiKey]) {
        available.push(provider);
      }
    }

    return available;
  }

  /**
   * Check if a provider is configured
   */
  isProviderConfigured(provider: ProviderType): boolean {
    const config = this.config[provider];
    if (!config) return false;

    // Local providers don't need API keys
    if (provider === 'ollama' || provider === 'lmstudio') {
      return true;
    }

    return !!config.apiKey;
  }

  /**
   * Validate provider configuration
   */
  validateConfig(provider: ProviderType): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = this.config[provider];

    if (!config) {
      errors.push(`No configuration found for provider: ${provider}`);
      return { valid: false, errors };
    }

    // Check API key (not needed for local providers)
    if (provider !== 'ollama' && provider !== 'lmstudio') {
      if (!config.apiKey) {
        errors.push(`API key is required for ${provider}. Set ${ENV_VARS[provider].apiKey} environment variable.`);
      }
    }

    // Validate temperature
    if (config.temperature !== undefined) {
      if (config.temperature < 0 || config.temperature > 2) {
        errors.push(`Temperature must be between 0 and 2, got ${config.temperature}`);
      }
    }

    // Validate timeout
    if (config.timeout !== undefined) {
      if (config.timeout < 1000) {
        errors.push(`Timeout should be at least 1000ms, got ${config.timeout}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Reset all configurations
   */
  reset(): void {
    this.config = {};
  }
}

/**
 * Global config manager instance
 */
export const configManager = new LLMConfigManager();

/**
 * Initialize configuration from environment
 */
export function initializeConfig(): UnifiedProviderConfig {
  return configManager.loadFromEnvironment();
}

/**
 * Get provider capabilities
 */
export function getProviderCapabilities(provider: ProviderType): ProviderCapabilities {
  return PROVIDER_CAPABILITIES[provider];
}

/**
 * Check if a provider supports a specific capability
 */
export function supportsCapability(
  provider: ProviderType,
  capability: keyof ProviderCapabilities
): boolean {
  const caps = PROVIDER_CAPABILITIES[provider];
  return caps[capability] as boolean;
}

/**
 * Create error from HTTP response
 */
export function createErrorFromResponse(
  provider: ProviderType,
  statusCode: number,
  message: string
): LLMError {
  let type: LLMErrorType = 'unknown';
  let retryable = false;

  switch (statusCode) {
    case 401:
      type = 'authentication';
      break;
    case 429:
      type = 'rate_limit';
      retryable = true;
      break;
    case 403:
      type = 'quota_exceeded';
      break;
    case 400:
      type = 'invalid_request';
      break;
    case 404:
      type = 'model_not_found';
      break;
    case 504:
    case 408:
    case 502:
    case 503:
      type = 'timeout';
      retryable = true;
      break;
    default:
      if (statusCode >= 500) {
        retryable = true;
      }
  }

  return new LLMError(message, type, provider, statusCode, retryable);
}
