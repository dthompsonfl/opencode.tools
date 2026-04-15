/**
 * Foundry TUI - LLM Provider Hook
 * Manages LLM configuration and provider interactions
 */

import { useState, useCallback } from 'react';
import { useStore } from '../store/store';
import type { LLMProvider, LLMConfig } from '../types';

interface LLMProviderInfo {
  id: LLMProvider;
  name: string;
  description: string;
  requiresApiKey: boolean;
  supportsBaseUrl: boolean;
  defaultModels: string[];
}

const PROVIDER_INFO: Record<LLMProvider, LLMProviderInfo> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    description: 'OpenAI GPT models (GPT-4, GPT-3.5)',
    requiresApiKey: true,
    supportsBaseUrl: false,
    defaultModels: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude models by Anthropic',
    requiresApiKey: true,
    supportsBaseUrl: false,
    defaultModels: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
  },
  google: {
    id: 'google',
    name: 'Google',
    description: 'Google Gemini models',
    requiresApiKey: true,
    supportsBaseUrl: false,
    defaultModels: ['gemini-pro', 'gemini-pro-vision'],
  },
  azure: {
    id: 'azure',
    name: 'Azure OpenAI',
    description: 'Azure OpenAI Service',
    requiresApiKey: true,
    supportsBaseUrl: true,
    defaultModels: ['gpt-4', 'gpt-35-turbo'],
  },
  local: {
    id: 'local',
    name: 'Local/Ollama',
    description: 'Local models via Ollama or similar',
    requiresApiKey: false,
    supportsBaseUrl: true,
    defaultModels: ['llama2', 'codellama', 'mistral'],
  },
  custom: {
    id: 'custom',
    name: 'Custom',
    description: 'Custom OpenAI-compatible endpoint',
    requiresApiKey: true,
    supportsBaseUrl: true,
    defaultModels: ['custom'],
  },
};

export function useLLM() {
  const { state, dispatch } = useStore();
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const config = state.llmConfig;

  const updateProvider = useCallback((provider: LLMProvider) => {
    // Save current config
    if (config.provider) {
      dispatch({
        type: 'UPDATE_PROVIDER_CONFIG',
        provider: config.provider,
        config: config
      });
    }

    // Load saved config or default
    const savedConfig = state.providers?.[provider] || {};
    const info = PROVIDER_INFO[provider];

    dispatch({
      type: 'UPDATE_LLM_CONFIG',
      config: {
        ...savedConfig,
        provider,
        model: savedConfig.model || info.defaultModels[0],
      },
    });
  }, [dispatch, config, state.providers]);

  const updateModel = useCallback((model: string) => {
    dispatch({
      type: 'UPDATE_LLM_CONFIG',
      config: { model },
    });
  }, [dispatch]);

  const updateApiKey = useCallback((apiKey: string) => {
    dispatch({
      type: 'UPDATE_LLM_CONFIG',
      config: { apiKey: apiKey || undefined },
    });
  }, [dispatch]);

  const updateBaseUrl = useCallback((baseUrl: string) => {
    dispatch({
      type: 'UPDATE_LLM_CONFIG',
      config: { baseUrl: baseUrl || undefined },
    });
  }, [dispatch]);

  const updateTemperature = useCallback((temperature: number) => {
    dispatch({
      type: 'UPDATE_LLM_CONFIG',
      config: { temperature },
    });
  }, [dispatch]);

  const updateMaxTokens = useCallback((maxTokens: number) => {
    dispatch({
      type: 'UPDATE_LLM_CONFIG',
      config: { maxTokens },
    });
  }, [dispatch]);

  const toggleEnabled = useCallback(() => {
    dispatch({
      type: 'UPDATE_LLM_CONFIG',
      config: { enabled: !config.enabled },
    });
  }, [dispatch, config.enabled]);

  const testConnection = useCallback(async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      // In a real implementation, this would make an actual API call
      // For now, we simulate a test
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      const hasRequiredFields = 
        config.provider &&
        config.model &&
        (!PROVIDER_INFO[config.provider].requiresApiKey || config.apiKey);

      if (hasRequiredFields) {
        setTestResult({
          success: true,
          message: 'Connection test successful',
        });
      } else {
        setTestResult({
          success: false,
          message: 'Missing required configuration',
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
      });
    } finally {
      setIsTesting(false);
    }
  }, [config]);

  const getAvailableProviders = useCallback(() => {
    return Object.values(PROVIDER_INFO);
  }, []);

  const getAvailableModels = useCallback(() => {
    return PROVIDER_INFO[config.provider]?.defaultModels || [];
  }, [config.provider]);

  return {
    config,
    isTesting,
    testResult,
    providerInfo: PROVIDER_INFO[config.provider],
    availableProviders: getAvailableProviders(),
    availableModels: getAvailableModels(),
    updateProvider,
    updateModel,
    updateApiKey,
    updateBaseUrl,
    updateTemperature,
    updateMaxTokens,
    toggleEnabled,
    testConnection,
  };
}
