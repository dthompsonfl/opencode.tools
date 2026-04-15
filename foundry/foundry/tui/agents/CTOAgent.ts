import { LLMClient, LLMResponse, CTOIntent, FoundryTUIState } from '../types/index.js';
import { EventBus } from '../services/eventBus.js';
import { v4 as uuidv4 } from 'uuid';

interface IntentAnalysis {
  intent: CTOIntent;
  confidence: number;
  suggestedCommands?: string[];
  contextNeeded?: string[];
}

interface CTOContext {
  state: FoundryTUIState;
  eventBus: EventBus;
}

export class CTOAgent {
  private id: string;
  private name: string;
  private llmClient: LLMClient;
  private context: CTOContext;
  private isProcessing = false;

  constructor(
    name: string,
    llmClient: LLMClient,
    context: CTOContext
  ) {
    this.id = uuidv4();
    this.name = name;
    this.llmClient = llmClient;
    this.context = context;
  }

  public getId(): string {
    return this.id;
  }

  public getName(): string {
    return this.name;
  }

  public async handleMessage(message: string): Promise<void> {
    if (this.isProcessing) {
      this.emitMessage(
        'system',
        'I\'m still processing your previous request. Please wait a moment.'
      );
      return;
    }

    this.isProcessing = true;

    try {
      // Emit typing indicator
      this.context.eventBus.publish('chat:typing:start', {
        agentId: this.id,
        agentName: this.name,
      });

      // Analyze intent
      const analysis = await this.analyzeIntent(message);

      // Gather context
      const context = await this.gatherContext(analysis);

      // Execute based on intent
      const response = await this.executeIntent(analysis, context, message);

      // Send response
      this.emitMessage('cto', response.content);

      // Handle any follow-up actions
      await this.handleFollowUpActions(analysis, response);
    } catch (error) {
      console.error('[CTOAgent] Error handling message:', error);
      this.emitMessage(
        'system',
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      this.isProcessing = false;
      this.context.eventBus.publish('chat:typing:stop', {
        agentId: this.id,
      });
    }
  }

  private async analyzeIntent(message: string): Promise<IntentAnalysis> {
    const prompt = this.buildIntentPrompt(message);
    const response = await this.llmClient.complete(prompt, {
      state: this.context.state,
    });

    return {
      intent: response.intent ?? 'unknown',
      confidence: response.confidence ?? 0.5,
      suggestedCommands: response.suggestedCommands,
      contextNeeded: response.contextNeeded,
    };
  }

  private async gatherContext(analysis: IntentAnalysis): Promise<Record<string, unknown>> {
    const context: Record<string, unknown> = {
      project: this.context.state.project,
      runtime: this.context.state.runtime,
    };

    if (analysis.contextNeeded?.includes('agents')) {
      context.agents = this.context.state.agents;
    }

    if (analysis.contextNeeded?.includes('gates')) {
      context.gates = this.context.state.gates;
    }

    if (analysis.contextNeeded?.includes('artifacts')) {
      context.artifacts = this.context.state.artifacts;
    }

    if (analysis.contextNeeded?.includes('team')) {
      context.team = this.context.state.team;
    }

    return context;
  }

  private async executeIntent(
    analysis: IntentAnalysis,
    context: Record<string, unknown>,
    originalMessage: string
  ): Promise<LLMResponse> {
    const prompt = this.buildExecutionPrompt(analysis, context, originalMessage);
    return await this.llmClient.complete(prompt, { context });
  }

  private async handleFollowUpActions(
    analysis: IntentAnalysis,
    response: LLMResponse
  ): Promise<void> {
    // Publish suggestions
    if (response.suggestedCommands) {
      response.suggestedCommands.forEach((cmd) => {
        this.context.eventBus.publish('chat:suggestion:add', { suggestion: cmd });
      });
    }

    // Handle specific intents
    switch (analysis.intent) {
      case 'delegate':
        this.context.eventBus.publish('cto:delegate', {
          agentId: this.id,
          task: response.content,
        });
        break;

      case 'command':
        this.context.eventBus.publish('cto:command', {
          agentId: this.id,
          command: response.content,
        });
        break;

      case 'review':
        this.context.eventBus.publish('cto:review:requested', {
          agentId: this.id,
          context: response.content,
        });
        break;

      case 'escalate':
        this.context.eventBus.publish('cto:escalate', {
          agentId: this.id,
          reason: response.content,
        });
        break;
    }
  }

  private emitMessage(role: 'cto' | 'system', content: string): void {
    this.context.eventBus.publish('chat:message:received', {
      id: uuidv4(),
      role,
      content,
      timestamp: new Date().toISOString(),
      agentId: this.id,
      agentName: this.name,
    });
  }

  private buildIntentPrompt(message: string): string {
    return `Analyze the following user message and determine the intent:

Message: "${message}"

Available intents:
- command: User wants to execute a command
- question: User is asking a question
- delegate: User wants to delegate a task
- review: User wants a review or audit
- status: User is asking for status update
- escalate: User wants to escalate an issue
- greeting: User is greeting
- unknown: Intent is unclear

Respond with JSON in this format:
{
  "intent": "<intent_name>",
  "confidence": 0.0-1.0,
  "contextNeeded": ["agents", "gates", "artifacts", "team"],
  "suggestedCommands": ["/command1", "/command2"]
}`;
  }

  private buildExecutionPrompt(
    analysis: IntentAnalysis,
    context: Record<string, unknown>,
    originalMessage: string
  ): string {
    return `You are ${this.name}, a CTO orchestrator agent.

User Intent: ${analysis.intent} (confidence: ${analysis.confidence})
Original Message: "${originalMessage}"

Current Context:
${JSON.stringify(context, null, 2)}

Respond appropriately based on the intent. Be helpful, professional, and actionable.`;
  }
}
