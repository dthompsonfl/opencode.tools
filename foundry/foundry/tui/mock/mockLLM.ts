import { LLMClient, LLMResponse, CTOIntent } from '../types/index.js';

interface MockLLMConfig {
  delayMs?: number;
  shouldFail?: boolean;
  deterministicResponses?: Map<string, LLMResponse>;
}

export class MockLLMClient implements LLMClient {
  private config: MockLLMConfig;

  constructor(config: MockLLMConfig = {}) {
    this.config = {
      delayMs: 500,
      shouldFail: false,
      ...config,
    };
  }

  public async complete(
    prompt: string,
    context?: Record<string, unknown>
  ): Promise<LLMResponse> {
    // Simulate network delay
    if (this.config.delayMs) {
      await this.delay(this.config.delayMs);
    }

    // Simulate errors
    if (this.config.shouldFail) {
      throw new Error('Mock LLM service unavailable');
    }

    // Check for deterministic responses
    if (this.config.deterministicResponses) {
      for (const [key, response] of this.config.deterministicResponses) {
        if (prompt.includes(key)) {
          return response;
        }
      }
    }

    // Generate contextual response
    return this.generateResponse(prompt, context);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private generateResponse(
    prompt: string,
    _context?: Record<string, unknown>
  ): LLMResponse {
    // Intent analysis response
    if (prompt.includes('Analyze the following user message')) {
      return this.generateIntentResponse(prompt);
    }

    // Execution response
    return this.generateExecutionResponse(prompt);
  }

  private generateIntentResponse(prompt: string): LLMResponse {
    const message = prompt.match(/Message: "([^"]+)"/)?.[1] ?? '';

    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return {
        content: JSON.stringify({
          intent: 'greeting',
          confidence: 0.95,
          contextNeeded: [],
          suggestedCommands: ['/status', '/help'],
        }),
        intent: 'greeting',
        confidence: 0.95,
        suggestedCommands: ['/status', '/help'],
      };
    }

    if (lowerMessage.includes('status') || lowerMessage.includes('how are')) {
      return {
        content: JSON.stringify({
          intent: 'status',
          confidence: 0.9,
          contextNeeded: ['agents', 'gates'],
          suggestedCommands: ['/agents', '/gates'],
        }),
        intent: 'status',
        confidence: 0.9,
        suggestedCommands: ['/agents', '/gates'],
      };
    }

    if (lowerMessage.startsWith('/')) {
      return {
        content: JSON.stringify({
          intent: 'command',
          confidence: 0.95,
          contextNeeded: [],
          suggestedCommands: [],
        }),
        intent: 'command',
        confidence: 0.95,
      };
    }

    if (
      lowerMessage.includes('create') ||
      lowerMessage.includes('spawn') ||
      lowerMessage.includes('start')
    ) {
      return {
        content: JSON.stringify({
          intent: 'delegate',
          confidence: 0.85,
          contextNeeded: ['agents', 'team'],
          suggestedCommands: ['/agents', '/team'],
        }),
        intent: 'delegate',
        confidence: 0.85,
        suggestedCommands: ['/agents', '/team'],
      };
    }

    if (lowerMessage.includes('review') || lowerMessage.includes('check')) {
      return {
        content: JSON.stringify({
          intent: 'review',
          confidence: 0.8,
          contextNeeded: ['artifacts', 'gates'],
          suggestedCommands: ['/artifacts', '/gates'],
        }),
        intent: 'review',
        confidence: 0.8,
        suggestedCommands: ['/artifacts', '/gates'],
      };
    }

    if (lowerMessage.includes('?')) {
      return {
        content: JSON.stringify({
          intent: 'question',
          confidence: 0.75,
          contextNeeded: ['project'],
          suggestedCommands: ['/help'],
        }),
        intent: 'question',
        confidence: 0.75,
        suggestedCommands: ['/help'],
      };
    }

    return {
      content: JSON.stringify({
        intent: 'unknown',
        confidence: 0.5,
        contextNeeded: ['project'],
        suggestedCommands: ['/help'],
      }),
      intent: 'unknown',
      confidence: 0.5,
      suggestedCommands: ['/help'],
    };
  }

  private generateExecutionResponse(prompt: string): LLMResponse {
    const intentMatch = prompt.match(/User Intent: (\w+)/);
    const intent = intentMatch?.[1] as CTOIntent | undefined;

    const responses: Record<CTOIntent, string> = {
      greeting:
        "Hello! I'm your CTO orchestrator. How can I help you today? Try asking about project status or use /help for available commands.",
      command:
        "I've processed your command. The system is executing the requested operation.",
      question:
        "That's a great question. Based on the current project context, I can provide you with the following information...",
      delegate:
        "I'll delegate this task to the appropriate agent. You should see updates in the agents panel.",
      review:
        "I'll initiate a review process. This will check all quality gates and artifacts for compliance.",
      status:
        "Here's the current project status: All systems operational. Active agents: 2. Pending gates: 1.",
      escalate:
        "I've escalated this issue to the team. Someone will address it shortly.",
      unknown:
        "I'm not sure I understand. Could you rephrase or try one of these commands: /status, /agents, /help",
    };

    return {
      content: responses[intent ?? 'unknown'],
      intent: intent ?? 'unknown',
      confidence: 0.8,
    };
  }
}
