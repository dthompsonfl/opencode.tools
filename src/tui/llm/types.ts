/**
 * Multi-Provider LLM System - Types and Interfaces
 * 
 * Provides unified types for working with multiple LLM providers including
 * OpenAI, Codex, Gemini, OpenRouter, Ollama, LM Studio, GitHub Copilot, and Kimi.
 */

/**
 * Message role types supported across all providers
 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'function' | 'tool';

/**
 * Tool/function call structure
 */
export interface ToolCall {
  id?: string;
  type?: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Unified message format across all providers
 */
export interface LLMMessage {
  role: MessageRole;
  content: string;
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

/**
 * Tool/function definition for tool calling
 */
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

/**
 * Usage statistics from LLM providers
 */
export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

/**
 * Standard LLM response structure
 */
export interface LLMResponse {
  content: string | null;
  tool_calls?: ToolCall[];
  usage?: TokenUsage;
  model?: string;
  provider?: string;
  finish_reason?: string;
}

/**
 * Streaming chunk for SSE/streaming responses
 */
export interface StreamChunk {
  content?: string;
  tool_calls?: ToolCall[];
  finish_reason?: string;
  usage?: TokenUsage;
  done?: boolean;
}

/**
 * Provider capabilities indicating supported features
 */
export interface ProviderCapabilities {
  /** Provider identifier */
  provider: string;
  
  /** Whether streaming is supported */
  streaming: boolean;
  
  /** Whether function/tool calling is supported */
  tools: boolean;
  
  /** Whether vision/multimodal is supported */
  vision: boolean;
  
  /** Whether JSON mode is supported */
  jsonMode: boolean;
  
  /** Whether system messages are supported */
  systemMessages: boolean;
  
  /** Maximum context length in tokens */
  maxContextLength: number;
  
  /** Available models */
  availableModels: string[];
  
  /** Default model for this provider */
  defaultModel: string;
}

/**
 * Supported provider types
 */
export type ProviderType = 
  | 'openai'
  | 'codex'
  | 'gemini'
  | 'openrouter'
  | 'ollama'
  | 'lmstudio'
  | 'github-copilot'
  | 'kimi';

/**
 * Base configuration interface for all providers
 */
export interface BaseProviderConfig {
  /** API key or authentication token */
  apiKey?: string;
  
  /** Model to use (provider-specific) */
  model?: string;
  
  /** Base URL for API requests */
  baseUrl?: string;
  
  /** Temperature (0-2, default varies by provider) */
  temperature?: number;
  
  /** Maximum tokens to generate */
  maxTokens?: number;
  
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * OpenAI-specific configuration
 */
export interface OpenAIConfig extends BaseProviderConfig {
  /** Organization ID for OpenAI */
  organization?: string;
  
  /** Whether to use JSON mode */
  responseFormat?: { type: 'json_object' };
}

/**
 * Codex-specific configuration (OpenAI's coding model)
 */
export interface CodexConfig extends BaseProviderConfig {
  /** Codex-specific: intent (coding task type) */
  intent?: 'code-completion' | 'code-review' | 'code-explanation';
}

/**
 * Gemini-specific configuration
 */
export interface GeminiConfig extends BaseProviderConfig {
  /** Safety settings for content filtering */
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
  
  /** Generation configuration */
  generationConfig?: {
    topP?: number;
    topK?: number;
  };
}

/**
 * OpenRouter-specific configuration
 */
export interface OpenRouterConfig extends BaseProviderConfig {
  /** Site URL for rankings */
  siteUrl?: string;
  
  /** Site name for rankings */
  siteName?: string;
  
  /** Whether to fall back to other models on failure */
  allowFallbacks?: boolean;
}

/**
 * Ollama-specific configuration
 */
export interface OllamaConfig extends BaseProviderConfig {
  /** Keep model loaded in memory */
  keepAlive?: string;
  
  /** Additional options for Ollama */
  options?: {
    seed?: number;
    num_ctx?: number;
    num_predict?: number;
  };
}

/**
 * LM Studio-specific configuration
 */
export interface LMStudioConfig extends BaseProviderConfig {
  /** Local server port (default: 1234) */
  port?: number;
}

/**
 * GitHub Copilot-specific configuration
 */
export interface GitHubCopilotConfig extends BaseProviderConfig {
  /** Copilot subscription tier */
  tier?: 'individual' | 'business' | 'enterprise';
  
  /** IDE context for better suggestions */
  ideContext?: {
    editor?: string;
    language?: string;
    filepath?: string;
  };
}

/**
 * Kimi (Moonshot AI)-specific configuration
 */
export interface KimiConfig extends BaseProviderConfig {
  /** Moonshot API version */
  apiVersion?: 'v1';
}

/**
 * Union type of all provider configurations
 */
export type ProviderConfig = 
  | OpenAIConfig 
  | CodexConfig 
  | GeminiConfig 
  | OpenRouterConfig 
  | OllamaConfig 
  | LMStudioConfig 
  | GitHubCopilotConfig 
  | KimiConfig;

/**
 * Unified provider configuration map
 */
export interface UnifiedProviderConfig {
  openai?: OpenAIConfig;
  codex?: CodexConfig;
  gemini?: GeminiConfig;
  openrouter?: OpenRouterConfig;
  ollama?: OllamaConfig;
  lmstudio?: LMStudioConfig;
  'github-copilot'?: GitHubCopilotConfig;
  kimi?: KimiConfig;
}

/**
 * LLM request options
 */
export interface LLMRequestOptions {
  /** Messages to send to the model */
  messages: LLMMessage[];
  
  /** Tools/functions to make available */
  tools?: ToolDefinition[];
  
  /** Whether to use streaming */
  stream?: boolean;
  
  /** Signal for aborting requests */
  signal?: AbortSignal;
}

/**
 * Error types for LLM operations
 */
export type LLMErrorType = 
  | 'authentication'
  | 'rate_limit'
  | 'quota_exceeded'
  | 'invalid_request'
  | 'model_not_found'
  | 'timeout'
  | 'network'
  | 'unknown';

/**
 * Structured error for LLM operations
 */
export class LLMError extends Error {
  public readonly type: LLMErrorType;
  public readonly provider: string;
  public readonly statusCode?: number;
  public readonly retryable: boolean;

  constructor(
    message: string,
    type: LLMErrorType,
    provider: string,
    statusCode?: number,
    retryable: boolean = false
  ) {
    super(message);
    this.name = 'LLMError';
    this.type = type;
    this.provider = provider;
    this.statusCode = statusCode;
    this.retryable = retryable;
  }
}

/**
 * Fallback configuration for automatic provider switching
 */
export interface FallbackConfig {
  /** Ordered list of providers to try */
  providers: ProviderType[];
  
  /** Maximum retries per provider */
  maxRetriesPerProvider?: number;
  
  /** Whether to continue on non-retryable errors */
  continueOnError?: boolean;
}

/**
 * Unified LLM Provider interface
 * 
 * All provider implementations must implement this interface to ensure
 * consistent behavior across different LLM services.
 */
export interface LLMProvider {
  /** Provider type identifier */
  readonly providerType: ProviderType;
  
  /** Provider display name */
  readonly providerName: string;
  
  /** Current configuration */
  readonly config: BaseProviderConfig;
  
  /**
   * Generate a completion from the LLM
   * @param options Request options including messages and tools
   * @returns Promise resolving to LLM response
   * @throws LLMError on failure
   */
  chatCompletion(options: LLMRequestOptions): Promise<LLMResponse>;
  
  /**
   * Stream a completion from the LLM
   * @param options Request options
   * @returns Async generator yielding stream chunks
   * @throws LLMError on failure
   */
  streamCompletion(options: LLMRequestOptions): AsyncGenerator<StreamChunk>;
  
  /**
   * Check if the provider is properly configured and available
   * @returns Promise resolving to boolean indicating availability
   */
  isAvailable(): Promise<boolean>;
  
  /**
   * Get provider capabilities
   * @returns ProviderCapabilities object
   */
  getCapabilities(): ProviderCapabilities;
  
  /**
   * Update provider configuration at runtime
   * @param config New configuration (partial)
   */
  updateConfig(config: Partial<BaseProviderConfig>): void;
  
  /**
   * Get available models for this provider
   * @returns Array of available model names
   */
  getAvailableModels(): Promise<string[]>;
}
