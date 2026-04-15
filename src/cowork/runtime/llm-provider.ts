/**
 * LLM Provider Interface for Cowork
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
}

export interface LLMResponse {
  content: string | null;
  function_call?: {
    name: string;
    arguments: string;
  };
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface LLMProvider {
  /**
   * Generate a completion based on messages
   */
  chatCompletion(messages: LLMMessage[], functions?: any[]): Promise<LLMResponse>;
}

export type LLMProviderType = 'mock' | 'openai';

export interface OpenAIProviderConfig {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  temperature?: number;
}

export interface LLMProviderConfig {
  type?: LLMProviderType;
  allowMockInDev?: boolean;
  openai?: OpenAIProviderConfig;
}

export type ResolvedLLMProviderConfig =
  | {
    type: 'mock';
  }
  | {
    type: 'openai';
    openai: {
      apiKey: string;
      model: string;
      baseUrl: string;
      temperature: number;
    };
  };

/**
 * Mock LLM Provider for development/testing without keys
 */
export class MockLLMProvider implements LLMProvider {
  async chatCompletion(messages: LLMMessage[], functions?: any[]): Promise<LLMResponse> {
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';

    // Simple heuristic for demo purposes
    if (lastUserMessage.includes('list files')) {
      return {
        content: null,
        function_call: {
          name: 'fs.list',
          arguments: JSON.stringify({ path: '.' })
        }
      };
    }

    if (lastUserMessage.includes('read file')) {
        return {
            content: null,
            function_call: {
                name: 'fs.read',
                arguments: JSON.stringify({ path: 'README.md' })
            }
        };
    }

    return {
      content: `I am a mock LLM. I received your message: "${lastUserMessage}". I can simulate tool calls if you ask me to 'list files' or 'read file'.`
    };
  }
}

/**
 * OpenAI provider for production workloads.
 */
export class OpenAILLMProvider implements LLMProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly temperature: number;

  constructor(config: { apiKey: string; model: string; baseUrl: string; temperature?: number }) {
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.baseUrl = config.baseUrl;
    this.temperature = config.temperature ?? 0;
  }

  public async chatCompletion(messages: LLMMessage[], functions?: any[]): Promise<LLMResponse> {
    const payload: Record<string, unknown> = {
      model: this.model,
      messages,
      temperature: this.temperature
    };

    if (functions && functions.length > 0) {
      payload.functions = functions;
      payload.function_call = 'auto';
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenAI chat completion failed (${response.status}): ${body}`);
    }

    const data = await response.json() as {
      choices?: Array<{
        message?: {
          content?: string | null;
          function_call?: {
            name: string;
            arguments: string;
          };
          tool_calls?: Array<{
            function?: {
              name: string;
              arguments: string;
            };
          }>;
        };
      }>;
      usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
    };

    const message = data.choices?.[0]?.message;
    const functionCall = message?.function_call ?? message?.tool_calls?.[0]?.function;

    return {
      content: message?.content ?? null,
      function_call: functionCall,
      usage: data.usage
    };
  }
}

export type SupportedLLMProvider = MockLLMProvider | OpenAILLMProvider;

function parseBoolean(value: string | undefined): boolean {
  return value === 'true' || value === '1';
}

function isDevEnvironment(nodeEnv: string): boolean {
  return nodeEnv === 'development' || nodeEnv === '';
}

export function resolveLLMProviderConfig(config?: LLMProviderConfig): ResolvedLLMProviderConfig {
  const nodeEnv = process.env.NODE_ENV ?? '';
  const configuredProvider = config?.type ?? (process.env.COWORK_LLM_PROVIDER as LLMProviderType | undefined);
  const allowMockInDev = config?.allowMockInDev ?? parseBoolean(process.env.COWORK_ALLOW_MOCK_LLM);
  const apiKey = config?.openai?.apiKey ?? process.env.OPENAI_API_KEY;

  const providerType = configuredProvider
    ?? (nodeEnv === 'test'
      ? 'mock'
      : apiKey
        ? 'openai'
        : undefined);

  if (!providerType) {
    throw new Error(
      'Invalid cowork LLM provider configuration: set COWORK_LLM_PROVIDER=openai and OPENAI_API_KEY, or opt into mock with COWORK_ALLOW_MOCK_LLM=true in development/test.'
    );
  }

  if (providerType === 'mock') {
    if (nodeEnv === 'test' || (isDevEnvironment(nodeEnv) && allowMockInDev)) {
      return { type: 'mock' };
    }

    throw new Error(
      'Invalid cowork LLM provider configuration: mock provider is restricted to test and explicit development opt-in.'
    );
  }

  if (providerType !== 'openai') {
    throw new Error(`Invalid cowork LLM provider type: "${providerType}". Supported values: mock, openai.`);
  }

  const resolvedApiKey = config?.openai?.apiKey ?? process.env.OPENAI_API_KEY;
  if (!resolvedApiKey) {
    throw new Error('Invalid cowork LLM provider configuration: OPENAI_API_KEY is required for openai provider.');
  }

  const model = config?.openai?.model ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  const baseUrl = config?.openai?.baseUrl ?? process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
  const temperature = config?.openai?.temperature ?? Number(process.env.OPENAI_TEMPERATURE ?? 0);

  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
    throw new Error('Invalid cowork LLM provider configuration: OPENAI_TEMPERATURE must be a number between 0 and 2.');
  }

  return {
    type: 'openai',
    openai: {
      apiKey: resolvedApiKey,
      model,
      baseUrl: baseUrl.replace(/\/+$/, ''),
      temperature
    }
  };
}

/**
 * Factory to get the appropriate provider
 */
export function getLLMProvider(config?: LLMProviderConfig): SupportedLLMProvider {
  const resolved = resolveLLMProviderConfig(config);

  if (resolved.type === 'mock') {
    return new MockLLMProvider();
  }

  return new OpenAILLMProvider(resolved.openai);
}
