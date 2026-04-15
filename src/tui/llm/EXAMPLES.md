# Multi-Provider LLM System - Usage Examples

## Quick Start

### Basic Chat Completion

```typescript
import { createProvider, chat } from './llm';

// Create a provider using environment configuration
const openai = createProvider('openai');

// Simple chat
const response = await openai.chatCompletion({
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'What is TypeScript?' }
  ]
});

console.log(response.content);
```

### Streaming Responses

```typescript
import { createProvider } from './llm';

const provider = createProvider('gemini');

// Stream responses
for await (const chunk of provider.streamCompletion({
  messages: [{ role: 'user', content: 'Tell me a story' }]
})) {
  process.stdout.write(chunk.content || '');
}
```

### With Tool/Function Calling

```typescript
import { createProvider } from './llm';

const openai = createProvider('openai');

const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'get_weather',
      description: 'Get the current weather',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'City name'
          }
        },
        required: ['location']
      }
    }
  }
];

const response = await openai.chatCompletion({
  messages: [{ role: 'user', content: 'What\'s the weather in London?' }],
  tools
});

if (response.tool_calls) {
  console.log('Tool call:', response.tool_calls[0].function);
}
```

## Provider Management

### Get Available Providers

```typescript
import { getAvailableProviders, isProviderAvailable } from './llm';

// List all configured providers
const available = getAvailableProviders();
console.log('Available:', available); // ['openai', 'gemini', 'ollama']

// Check specific provider
if (isProviderAvailable('openai')) {
  console.log('OpenAI is ready');
}
```

### Provider Manager with Fallback

```typescript
import { ProviderManager } from './llm';

const manager = new ProviderManager();
manager.initialize();

// Set up fallback chain
manager.setFallbackConfig({
  providers: ['openai', 'gemini', 'openrouter'],
  continueOnError: true
});

// Execute with automatic fallback
const response = await manager.chatCompletion({
  messages: [{ role: 'user', content: 'Hello!' }]
});

// Or use a specific provider
const geminiResponse = await manager.chatCompletion(
  { messages: [{ role: 'user', content: 'Hi!' }] },
  'gemini'
);
```

### Runtime Provider Switching

```typescript
import { ProviderManager } from './llm';

const manager = new ProviderManager();
manager.initialize();

// Switch between providers
manager.setCurrentProvider('openai');
const response1 = await manager.chatCompletion({ messages });

manager.setCurrentProvider('gemini');
const response2 = await manager.chatCompletion({ messages });
```

## Configuration

### Environment Variables

```bash
# OpenAI
export OPENAI_API_KEY="sk-..."
export OPENAI_MODEL="gpt-4o-mini"

# Gemini
export GEMINI_API_KEY="..."
export GEMINI_MODEL="gemini-1.5-flash-latest"

# OpenRouter
export OPENROUTER_API_KEY="..."

# Local providers
export OLLAMA_HOST="http://localhost:11434"
export LMSTUDIO_HOST="http://localhost:1234"
```

### Explicit Configuration

```typescript
import { createProvider } from './llm';

// Override environment with explicit config
const gemini = createProvider('gemini', {
  apiKey: 'your-api-key',
  model: 'gemini-1.5-pro-latest',
  temperature: 0.5,
  maxTokens: 2048
});

// Update config at runtime
gemini.updateConfig({
  temperature: 0.8,
  model: 'gemini-1.5-flash-latest'
});
```

## Error Handling

```typescript
import { createProvider, LLMError } from './llm';

const provider = createProvider('openai');

try {
  const response = await provider.chatCompletion({ messages });
} catch (error) {
  if (error instanceof LLMError) {
    console.error(`Provider: ${error.provider}`);
    console.error(`Type: ${error.type}`); // 'authentication', 'rate_limit', etc.
    console.error(`Retryable: ${error.retryable}`);
    
    if (error.retryable) {
      // Retry with backoff
    }
  }
}
```

## Health Checks

```typescript
import { checkProviderHealth, ProviderManager } from './llm';

// Check all providers
const health = await checkProviderHealth();
for (const { provider, available, healthy } of health) {
  console.log(`${provider}: ${healthy ? '✓' : '✗'}`);
}

// Check specific provider
const openai = createProvider('openai');
const isHealthy = await openai.isAvailable();
```

## Available Models

```typescript
const provider = createProvider('openai');

// Get available models
const models = await provider.getAvailableModels();
console.log('Available models:', models);

// Get capabilities
const caps = provider.getCapabilities();
console.log('Supports streaming:', caps.streaming);
console.log('Supports tools:', caps.tools);
console.log('Max context:', caps.maxContextLength);
```

## Provider-Specific Features

### Codex (Code Optimization)

```typescript
import { createProvider } from './llm';

const codex = createProvider('codex');
// Optimized for code with lower temperature by default

const response = await codex.chatCompletion({
  messages: [
    { role: 'user', content: 'Review this code: function add(a,b) { return a + b; }' }
  ]
});
```

### Local Models (Ollama/LM Studio)

```typescript
import { createProvider } from './llm';

// Ollama (no API key needed)
const ollama = createProvider('ollama', {
  model: 'llama3.2',
  baseUrl: 'http://localhost:11434'
});

// LM Studio (local API)
const lmstudio = createProvider('lmstudio', {
  baseUrl: 'http://localhost:1234'
});
```

## Quick Helpers

```typescript
import { chat, streamChat } from './llm';

// One-liner chat
const response = await chat([
  { role: 'user', content: 'What is AI?' }
], 'openai');

// One-liner streaming
for await (const chunk of streamChat([
  { role: 'user', content: 'Write a poem' }
], 'gemini')) {
  process.stdout.write(chunk);
}
```

## All Supported Providers

- `openai` - OpenAI GPT models (GPT-4, GPT-3.5)
- `codex` - OpenAI Codex for coding tasks
- `gemini` - Google Gemini models
- `openrouter` - OpenRouter aggregator
- `ollama` - Local models via Ollama
- `lmstudio` - Local models via LM Studio
- `github-copilot` - GitHub Copilot Chat
- `kimi` - Moonshot AI Kimi models
