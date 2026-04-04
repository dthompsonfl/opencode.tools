/**
 * Multi-Provider LLM System - Provider Implementations
 * 
 * Implements LLM providers for:
 * - OpenAI
 * - Codex (OpenAI coding model)
 * - Gemini (Google)
 * - OpenRouter
 * - Ollama (local models)
 * - LM Studio (local API)
 * - GitHub Copilot
 * - Kimi (Moonshot AI)
 */

import axios, { AxiosError, AxiosResponse } from 'axios';
import {
  LLMProvider,
  ProviderType,
  BaseProviderConfig,
  LLMRequestOptions,
  LLMResponse,
  StreamChunk,
  LLMMessage,
  ToolDefinition,
  ProviderCapabilities,
  LLMError,
  LLMErrorType
} from './types';
import {
  DEFAULT_CONFIG,
  PROVIDER_CAPABILITIES,
  createErrorFromResponse,
  configManager
} from './config';

/**
 * Base provider class with common functionality
 */
abstract class BaseLLMProvider implements LLMProvider {
  abstract readonly providerType: ProviderType;
  abstract readonly providerName: string;
  config: BaseProviderConfig;
  private readonly defaultProviderType: ProviderType;

  constructor(providerType: ProviderType, config?: Partial<BaseProviderConfig>) {
    this.defaultProviderType = providerType;
    const defaults = DEFAULT_CONFIG[providerType];
    this.config = {
      ...defaults,
      ...config
    };
  }

  abstract chatCompletion(options: LLMRequestOptions): Promise<LLMResponse>;
  abstract streamCompletion(options: LLMRequestOptions): AsyncGenerator<StreamChunk>;
  abstract isAvailable(): Promise<boolean>;
  abstract getAvailableModels(): Promise<string[]>;

  getCapabilities(): ProviderCapabilities {
    return PROVIDER_CAPABILITIES[this.providerType];
  }

  updateConfig(config: Partial<BaseProviderConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
    // Also update global config
    configManager.setProviderConfig(this.providerType, this.config);
  }

  protected createRequestHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
    
    return headers;
  }

  protected handleError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const statusCode = axiosError.response?.status || 0;
      const responseData = axiosError.response?.data as { error?: { message?: string } } | undefined;
      const message = responseData?.error?.message 
        || axiosError.message 
        || 'Unknown error';
      throw createErrorFromResponse(this.providerType, statusCode, message);
    }
    
    throw new LLMError(
      error instanceof Error ? error.message : 'Unknown error',
      'unknown',
      this.providerType
    );
  }

  protected normalizeMessages(messages: LLMMessage[]): any[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      ...(msg.name && { name: msg.name }),
      ...(msg.tool_calls && { tool_calls: msg.tool_calls }),
      ...(msg.tool_call_id && { tool_call_id: msg.tool_call_id })
    }));
  }

  protected async *handleStreamResponse(response: AxiosResponse): AsyncGenerator<StreamChunk> {
    const reader = response.data;
    
    try {
      for await (const chunk of reader) {
        const lines = chunk.toString().split('\n').filter((line: string) => line.trim() !== '');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              yield { done: true };
              return;
            }
            
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;
              
              if (delta) {
                yield {
                  content: delta.content,
                  tool_calls: delta.tool_calls,
                  finish_reason: parsed.choices?.[0]?.finish_reason
                };
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      this.handleError(error);
    }
  }
}

/**
 * OpenAI Provider Implementation
 */
export class OpenAIProvider extends BaseLLMProvider {
  readonly providerType: ProviderType = 'openai';
  readonly providerName = 'OpenAI';

  constructor(config?: Partial<BaseProviderConfig>) {
    super('openai', config);
  }

  async chatCompletion(options: LLMRequestOptions): Promise<LLMResponse> {
    const { messages, tools } = options;
    
    try {
      const payload: Record<string, unknown> = {
        model: this.config.model,
        messages: this.normalizeMessages(messages),
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      };

      if (tools && tools.length > 0) {
        payload.tools = tools;
        payload.tool_choice = 'auto';
      }

      const response = await axios.post(
        `${this.config.baseUrl}/chat/completions`,
        payload,
        {
          headers: this.createRequestHeaders(),
          timeout: this.config.timeout
        }
      );

      const choice = response.data.choices?.[0];
      const message = choice?.message;

      return {
        content: message?.content || null,
        tool_calls: message?.tool_calls,
        usage: response.data.usage,
        model: response.data.model,
        provider: this.providerType,
        finish_reason: choice?.finish_reason
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  async *streamCompletion(options: LLMRequestOptions): AsyncGenerator<StreamChunk> {
    const { messages, tools } = options;
    
    try {
      const payload: Record<string, unknown> = {
        model: this.config.model,
        messages: this.normalizeMessages(messages),
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        stream: true
      };

      if (tools && tools.length > 0) {
        payload.tools = tools;
        payload.tool_choice = 'auto';
      }

      const response = await axios.post(
        `${this.config.baseUrl}/chat/completions`,
        payload,
        {
          headers: this.createRequestHeaders(),
          timeout: this.config.timeout,
          responseType: 'stream'
        }
      );

      yield* this.handleStreamResponse(response);
    } catch (error) {
      this.handleError(error);
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.config.apiKey) return false;
    
    try {
      const response = await axios.get(`${this.config.baseUrl}/models`, {
        headers: this.createRequestHeaders(),
        timeout: 5000
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.config.baseUrl}/models`, {
        headers: this.createRequestHeaders(),
        timeout: 10000
      });
      
      return response.data.data
        ?.filter((m: any) => m.id.startsWith('gpt-'))
        ?.map((m: any) => m.id) || [];
    } catch {
      return this.getCapabilities().availableModels;
    }
  }
}

/**
 * Codex Provider Implementation (OpenAI coding model)
 */
export class CodexProvider extends BaseLLMProvider {
  readonly providerType: ProviderType = 'codex';
  readonly providerName = 'OpenAI Codex';

  constructor(config?: Partial<BaseProviderConfig>) {
    super('codex', config);
  }

  async chatCompletion(options: LLMRequestOptions): Promise<LLMResponse> {
    // Codex uses the same API as OpenAI but with coding-optimized defaults
    const openAIProvider = new OpenAIProvider({
      ...this.config,
      model: this.config.model || 'gpt-4o',
      temperature: this.config.temperature ?? 0.2
    });

    return openAIProvider.chatCompletion(options);
  }

  async *streamCompletion(options: LLMRequestOptions): AsyncGenerator<StreamChunk> {
    const openAIProvider = new OpenAIProvider({
      ...this.config,
      model: this.config.model || 'gpt-4o',
      temperature: this.config.temperature ?? 0.2
    });

    yield* openAIProvider.streamCompletion(options);
  }

  async isAvailable(): Promise<boolean> {
    if (!this.config.apiKey) return false;
    
    const openAIProvider = new OpenAIProvider(this.config);
    return openAIProvider.isAvailable();
  }

  async getAvailableModels(): Promise<string[]> {
    return this.getCapabilities().availableModels;
  }
}

/**
 * Gemini Provider Implementation (Google)
 */
export class GeminiProvider extends BaseLLMProvider {
  readonly providerType: ProviderType = 'gemini';
  readonly providerName = 'Google Gemini';

  constructor(config?: Partial<BaseProviderConfig>) {
    super('gemini', config);
  }

  private convertMessages(messages: LLMMessage[]): any {
    const systemMessage = messages.find(m => m.role === 'system');
    const otherMessages = messages.filter(m => m.role !== 'system');
    
    return {
      systemInstruction: systemMessage?.content,
      contents: otherMessages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }))
    };
  }

  async chatCompletion(options: LLMRequestOptions): Promise<LLMResponse> {
    const { messages, tools } = options;
    const model = this.config.model || 'gemini-1.5-flash-latest';
    
    try {
      const converted = this.convertMessages(messages);
      
      const payload: Record<string, unknown> = {
        ...converted,
        generationConfig: {
          temperature: this.config.temperature,
          maxOutputTokens: this.config.maxTokens
        }
      };

      if (tools && tools.length > 0) {
        payload.tools = tools.map(t => ({
          functionDeclarations: [{
            name: t.function.name,
            description: t.function.description,
            parameters: t.function.parameters
          }]
        }));
      }

      const response = await axios.post(
        `${this.config.baseUrl}/models/${model}:generateContent?key=${this.config.apiKey}`,
        payload,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: this.config.timeout
        }
      );

      const candidate = response.data.candidates?.[0];
      const content = candidate?.content?.parts?.[0];

      return {
        content: content?.text || null,
        tool_calls: content?.functionCall ? [{
          function: {
            name: content.functionCall.name,
            arguments: JSON.stringify(content.functionCall.args)
          }
        }] : undefined,
        model: model,
        provider: this.providerType,
        finish_reason: candidate?.finishReason
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  async *streamCompletion(options: LLMRequestOptions): AsyncGenerator<StreamChunk> {
    const { messages } = options;
    const model = this.config.model || 'gemini-1.5-flash-latest';
    
    try {
      const converted = this.convertMessages(messages);
      
      const payload = {
        ...converted,
        generationConfig: {
          temperature: this.config.temperature,
          maxOutputTokens: this.config.maxTokens
        }
      };

      const response = await axios.post(
        `${this.config.baseUrl}/models/${model}:streamGenerateContent?key=${this.config.apiKey}`,
        payload,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: this.config.timeout,
          responseType: 'stream'
        }
      );

      let buffer = '';
      
      for await (const chunk of response.data) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                yield { content: text };
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
      
      yield { done: true };
    } catch (error) {
      this.handleError(error);
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.config.apiKey) return false;
    
    try {
      const response = await axios.get(
        `${this.config.baseUrl}/models?key=${this.config.apiKey}`,
        { timeout: 5000 }
      );
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await axios.get(
        `${this.config.baseUrl}/models?key=${this.config.apiKey}`,
        { timeout: 10000 }
      );
      
      return response.data.models
        ?.filter((m: any) => m.name.includes('gemini'))
        ?.map((m: any) => m.name.split('/').pop()) || [];
    } catch {
      return this.getCapabilities().availableModels;
    }
  }
}

/**
 * OpenRouter Provider Implementation
 */
export class OpenRouterProvider extends BaseLLMProvider {
  readonly providerType: ProviderType = 'openrouter';
  readonly providerName = 'OpenRouter';

  constructor(config?: Partial<BaseProviderConfig>) {
    super('openrouter', config);
  }

  async chatCompletion(options: LLMRequestOptions): Promise<LLMResponse> {
    const { messages, tools } = options;
    
    try {
      const payload: Record<string, unknown> = {
        model: this.config.model,
        messages: this.normalizeMessages(messages),
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      };

      if (tools && tools.length > 0) {
        payload.tools = tools;
        payload.tool_choice = 'auto';
      }

      const response = await axios.post(
        `${this.config.baseUrl}/chat/completions`,
        payload,
        {
          headers: {
            ...this.createRequestHeaders(),
            'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://opencode.tools',
            'X-Title': 'OpenCode Tools'
          },
          timeout: this.config.timeout
        }
      );

      const choice = response.data.choices?.[0];
      const message = choice?.message;

      return {
        content: message?.content || null,
        tool_calls: message?.tool_calls,
        usage: response.data.usage,
        model: response.data.model,
        provider: this.providerType,
        finish_reason: choice?.finish_reason
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  async *streamCompletion(options: LLMRequestOptions): AsyncGenerator<StreamChunk> {
    const { messages, tools } = options;
    
    try {
      const payload: Record<string, unknown> = {
        model: this.config.model,
        messages: this.normalizeMessages(messages),
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        stream: true
      };

      if (tools && tools.length > 0) {
        payload.tools = tools;
        payload.tool_choice = 'auto';
      }

      const response = await axios.post(
        `${this.config.baseUrl}/chat/completions`,
        payload,
        {
          headers: {
            ...this.createRequestHeaders(),
            'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://opencode.tools',
            'X-Title': 'OpenCode Tools'
          },
          timeout: this.config.timeout,
          responseType: 'stream'
        }
      );

      yield* this.handleStreamResponse(response);
    } catch (error) {
      this.handleError(error);
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.config.apiKey) return false;
    
    try {
      const response = await axios.get(`${this.config.baseUrl}/models`, {
        headers: this.createRequestHeaders(),
        timeout: 5000
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.config.baseUrl}/models`, {
        headers: this.createRequestHeaders(),
        timeout: 10000
      });
      
      return response.data.data?.map((m: any) => m.id) || [];
    } catch {
      return this.getCapabilities().availableModels;
    }
  }
}

/**
 * Ollama Provider Implementation (local models)
 */
export class OllamaProvider extends BaseLLMProvider {
  readonly providerType: ProviderType = 'ollama';
  readonly providerName = 'Ollama';

  constructor(config?: Partial<BaseProviderConfig>) {
    super('ollama', config);
  }

  private convertMessages(messages: LLMMessage[]): any {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  async chatCompletion(options: LLMRequestOptions): Promise<LLMResponse> {
    const { messages } = options;
    
    try {
      const payload = {
        model: this.config.model,
        messages: this.convertMessages(messages),
        options: {
          temperature: this.config.temperature,
          num_predict: this.config.maxTokens
        },
        stream: false
      };

      const response = await axios.post(
        `${this.config.baseUrl}/api/chat`,
        payload,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: this.config.timeout
        }
      );

      return {
        content: response.data.message?.content || null,
        model: this.config.model,
        provider: this.providerType,
        finish_reason: response.data.done ? 'stop' : undefined
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  async *streamCompletion(options: LLMRequestOptions): AsyncGenerator<StreamChunk> {
    const { messages } = options;
    
    try {
      const payload = {
        model: this.config.model,
        messages: this.convertMessages(messages),
        options: {
          temperature: this.config.temperature,
          num_predict: this.config.maxTokens
        },
        stream: true
      };

      const response = await axios.post(
        `${this.config.baseUrl}/api/chat`,
        payload,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: this.config.timeout,
          responseType: 'stream'
        }
      );

      for await (const chunk of response.data) {
        try {
          const data = JSON.parse(chunk.toString());
          if (data.message?.content) {
            yield {
              content: data.message.content,
              done: data.done
            };
          }
          if (data.done) {
            yield { done: true };
            return;
          }
        } catch {
          // Skip invalid JSON
        }
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.config.baseUrl}/api/tags`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.config.baseUrl}/api/tags`, {
        timeout: 10000
      });
      
      return response.data.models?.map((m: any) => m.name) || [];
    } catch {
      return this.getCapabilities().availableModels;
    }
  }
}

/**
 * LM Studio Provider Implementation (local API)
 */
export class LMStudioProvider extends BaseLLMProvider {
  readonly providerType: ProviderType = 'lmstudio';
  readonly providerName = 'LM Studio';

  constructor(config?: Partial<BaseProviderConfig>) {
    super('lmstudio', config);
  }

  async chatCompletion(options: LLMRequestOptions): Promise<LLMResponse> {
    const { messages, tools } = options;
    
    try {
      const payload: Record<string, unknown> = {
        model: this.config.model,
        messages: this.normalizeMessages(messages),
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      };

      if (tools && tools.length > 0) {
        payload.tools = tools;
        payload.tool_choice = 'auto';
      }

      const response = await axios.post(
        `${this.config.baseUrl}/chat/completions`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey || 'lm-studio'}`
          },
          timeout: this.config.timeout
        }
      );

      const choice = response.data.choices?.[0];
      const message = choice?.message;

      return {
        content: message?.content || null,
        tool_calls: message?.tool_calls,
        model: this.config.model,
        provider: this.providerType,
        finish_reason: choice?.finish_reason
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  async *streamCompletion(options: LLMRequestOptions): AsyncGenerator<StreamChunk> {
    const { messages, tools } = options;
    
    try {
      const payload: Record<string, unknown> = {
        model: this.config.model,
        messages: this.normalizeMessages(messages),
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        stream: true
      };

      if (tools && tools.length > 0) {
        payload.tools = tools;
        payload.tool_choice = 'auto';
      }

      const response = await axios.post(
        `${this.config.baseUrl}/chat/completions`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey || 'lm-studio'}`
          },
          timeout: this.config.timeout,
          responseType: 'stream'
        }
      );

      yield* this.handleStreamResponse(response);
    } catch (error) {
      this.handleError(error);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.config.baseUrl}/models`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.config.baseUrl}/models`, {
        timeout: 10000
      });
      
      return response.data.data?.map((m: any) => m.id) || [];
    } catch {
      return this.getCapabilities().availableModels;
    }
  }
}

/**
 * GitHub Copilot Provider Implementation
 */
export class GitHubCopilotProvider extends BaseLLMProvider {
  readonly providerType: ProviderType = 'github-copilot';
  readonly providerName = 'GitHub Copilot';

  constructor(config?: Partial<BaseProviderConfig>) {
    super('github-copilot', config);
  }

  async chatCompletion(options: LLMRequestOptions): Promise<LLMResponse> {
    const { messages } = options;
    
    try {
      const payload = {
        messages: this.normalizeMessages(messages),
        model: this.config.model,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        top_p: 1,
        n: 1,
        stream: false
      };

      const response = await axios.post(
        `${this.config.baseUrl}/chat/completions`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
            'Editor-Version': 'vscode/1.85.0',
            'OpenAI-Organization': 'github-copilot'
          },
          timeout: this.config.timeout
        }
      );

      const choice = response.data.choices?.[0];
      
      return {
        content: choice?.message?.content || null,
        model: response.data.model,
        provider: this.providerType,
        finish_reason: choice?.finish_reason
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  async *streamCompletion(options: LLMRequestOptions): AsyncGenerator<StreamChunk> {
    const { messages } = options;
    
    try {
      const payload = {
        messages: this.normalizeMessages(messages),
        model: this.config.model,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        stream: true
      };

      const response = await axios.post(
        `${this.config.baseUrl}/chat/completions`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
            'Editor-Version': 'vscode/1.85.0',
            'OpenAI-Organization': 'github-copilot'
          },
          timeout: this.config.timeout,
          responseType: 'stream'
        }
      );

      yield* this.handleStreamResponse(response);
    } catch (error) {
      this.handleError(error);
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.config.apiKey) return false;
    
    try {
      // Copilot doesn't have a simple health check, so we try a minimal request
      const response = await axios.get(`${this.config.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'OpenAI-Organization': 'github-copilot'
        },
        timeout: 5000
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    return this.getCapabilities().availableModels;
  }
}

/**
 * Kimi (Moonshot AI) Provider Implementation
 */
export class KimiProvider extends BaseLLMProvider {
  readonly providerType: ProviderType = 'kimi';
  readonly providerName = 'Moonshot AI (Kimi)';

  constructor(config?: Partial<BaseProviderConfig>) {
    super('kimi', config);
  }

  async chatCompletion(options: LLMRequestOptions): Promise<LLMResponse> {
    const { messages, tools } = options;
    
    try {
      const payload: Record<string, unknown> = {
        model: this.config.model,
        messages: this.normalizeMessages(messages),
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      };

      if (tools && tools.length > 0) {
        payload.tools = tools;
        payload.tool_choice = 'auto';
      }

      const response = await axios.post(
        `${this.config.baseUrl}/chat/completions`,
        payload,
        {
          headers: this.createRequestHeaders(),
          timeout: this.config.timeout
        }
      );

      const choice = response.data.choices?.[0];
      const message = choice?.message;

      return {
        content: message?.content || null,
        tool_calls: message?.tool_calls,
        usage: response.data.usage,
        model: response.data.model,
        provider: this.providerType,
        finish_reason: choice?.finish_reason
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  async *streamCompletion(options: LLMRequestOptions): AsyncGenerator<StreamChunk> {
    const { messages, tools } = options;
    
    try {
      const payload: Record<string, unknown> = {
        model: this.config.model,
        messages: this.normalizeMessages(messages),
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        stream: true
      };

      if (tools && tools.length > 0) {
        payload.tools = tools;
        payload.tool_choice = 'auto';
      }

      const response = await axios.post(
        `${this.config.baseUrl}/chat/completions`,
        payload,
        {
          headers: this.createRequestHeaders(),
          timeout: this.config.timeout,
          responseType: 'stream'
        }
      );

      yield* this.handleStreamResponse(response);
    } catch (error) {
      this.handleError(error);
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.config.apiKey) return false;
    
    try {
      const response = await axios.get(`${this.config.baseUrl}/models`, {
        headers: this.createRequestHeaders(),
        timeout: 5000
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.config.baseUrl}/models`, {
        headers: this.createRequestHeaders(),
        timeout: 10000
      });
      
      return response.data.data?.map((m: any) => m.id) || [];
    } catch {
      return this.getCapabilities().availableModels;
    }
  }
}

/**
 * Export all provider classes
 */
export const PROVIDER_IMPLEMENTATIONS = {
  openai: OpenAIProvider,
  codex: CodexProvider,
  gemini: GeminiProvider,
  openrouter: OpenRouterProvider,
  ollama: OllamaProvider,
  lmstudio: LMStudioProvider,
  'github-copilot': GitHubCopilotProvider,
  kimi: KimiProvider
} as const;

export type ProviderImplementation = typeof PROVIDER_IMPLEMENTATIONS[ProviderType];
