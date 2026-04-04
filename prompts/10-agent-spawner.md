# Prompt: Implement Agent Spawner

## Task
Create an agent spawner for launching subagents in `src/cowork/orchestrator/agent-spawner.ts`.

## Requirements

### Agent Spawning

1. **Spawn Agent**
   - Accept agent ID and task context
   - Execute agent with given context
   - Return AgentResult

2. **Task Context**
   - task: string (prompt for agent)
   - context: Record<string, unknown> (additional data)
   - tools: string[] (allowed tools)

3. **Spawn Options**
   - timeout: number (max execution time)
   - retries: number (on failure)

### Code Structure

```typescript
import { AgentResult } from './result-merger';

interface SpawnOptions {
  timeout?: number;
  retries?: number;
}

interface TaskContext {
  task: string;
  context?: Record<string, unknown>;
  tools?: string[];
}

/**
 * Agent Spawner
 * Launches subagents with task context
 */
export class AgentSpawner {
  /**
   * Create agent spawner
   */
  constructor();

  /**
   * Spawn an agent with context
   */
  spawn(
    agentId: string,
    context: TaskContext,
    options?: SpawnOptions
  ): Promise<AgentResult>;

  /**
   * Spawn multiple agents concurrently
   */
  spawnMany(
    tasks: Array<{ agentId: string; context: TaskContext }>,
    options?: SpawnOptions
  ): Promise<AgentResult[]>;

  /**
   * Check if agent exists
   */
  hasAgent(agentId: string): boolean;

  /**
   * Register a custom agent handler
   */
  registerAgentHandler(
    agentId: string,
    handler: (context: TaskContext) => Promise<unknown>
  ): void;
}
```

## Implementation Guidelines

- Use AgentRegistry to get agent definitions
- Use ToolPermissionGate to enforce tool restrictions
- Implement timeout handling
- Implement retry logic
- Place in `src/cowork/orchestrator/agent-spawner.ts`

## Validation

- Create test file: `tests/unit/cowork/orchestrator/agent-spawner.test.ts`
- Test cases:
  - Spawn agent
  - Spawn with timeout
  - Spawn multiple concurrently

## Dependencies
- `../registries/agent-registry`
- `../permissions/tool-gate`
- `./result-merger`
