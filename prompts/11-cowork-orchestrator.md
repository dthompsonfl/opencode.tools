# Prompt: Implement Cowork Orchestrator

## Task
Create the main cowork orchestrator in `src/cowork/orchestrator/cowork-orchestrator.ts`.

## Requirements

### Orchestration

1. **Execute Command as Manager**
   - Load command definition
   - Set up context
   - Execute workflow

2. **Spawn Subagents**
   - Parse command body for agent references
   - Spawn agents with task and context
   - Run concurrently when safe

3. **Merge Results**
   - Collect agent outputs
   - Merge deterministically
   - Return synthesized result

4. **Transcript/Logging**
   - Log all actions
   - Record agent interactions
   - Save transcript for debugging

### Code Structure

```typescript
import { CommandDefinition, AgentDefinition } from '../types';
import { AgentResult, MergedResult } from './result-merger';

interface OrchestratorOptions {
  projectDir?: string;
  transcriptDir?: string;
  maxConcurrent?: number;
  defaultTimeout?: number;
}

interface OrchestratorContext {
  command: CommandDefinition;
  args: string[];
  projectDir: string;
  pluginRoot: string;
}

/**
 * Cowork Orchestrator
 * Multi-agent coordination with deterministic result merging
 */
export class CoworkOrchestrator {
  /**
   * Create orchestrator
   */
  constructor(options?: OrchestratorOptions);

  /**
   * Execute a command
   */
  execute(
    commandId: string,
    args?: string[]
  ): Promise<MergedResult>;

  /**
   * Execute command with custom context
   */
  executeWithContext(
    commandId: string,
    context: OrchestratorContext
  ): Promise<MergedResult>;

  /**
   * Spawn a subagent
   */
  spawnAgent(
    agentId: string,
    task: string,
    context?: Record<string, unknown>
  ): Promise<AgentResult>;

  /**
   * Spawn multiple agents concurrently
   */
  spawnAgents(
    tasks: Array<{
      agentId: string;
      task: string;
      context?: Record<string, unknown>;
    }>
  ): Promise<MergedResult>;

  /**
   * Get execution transcript
   */
  getTranscript(): TranscriptEntry[];

  /**
   * Clear transcript
   */
  clearTranscript(): void;
}

interface TranscriptEntry {
  timestamp: string;
  type: 'spawn' | 'complete' | 'error' | 'merge';
  agentId?: string;
  commandId?: string;
  message: string;
  data?: unknown;
}
```

## Implementation Guidelines

- Use AgentSpawner for agent execution
- Use ResultMerger for combining results
- Use HookManager for lifecycle events
- Log all actions for debugging
- Place in `src/cowork/orchestrator/cowork-orchestrator.ts`

## Validation

- Create test file: `tests/unit/cowork/orchestrator/cowork-orchestrator.test.ts`
- Test cases:
  - Execute command
  - Spawn single agent
  - Spawn multiple agents
  - Merge results
  - Transcript recording

## Dependencies
- `../types`
- `../registries/command-registry`
- `../registries/agent-registry`
- `../hooks/hook-manager`
- `../permissions/tool-gate`
- `./result-merger`
- `./agent-spawner`
