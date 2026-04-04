# Prompt: Implement Result Merger

## Task
Create a result merger for deterministic merging of agent outputs in `src/cowork/orchestrator/result-merger.ts`.

## Requirements

### Merge Strategy

1. **Deterministic Ordering**
   - Sort results by agent name alphabetically
   - Same inputs always produce same output order

2. **Merge Content**
   - Concatenate string outputs
   - Merge object outputs deeply
   - Combine arrays with deduplication

3. **Merge Metadata**
   - Collect all run IDs
   - Use latest timestamp
   - Combine tool usage stats

### Code Structure

```typescript
interface AgentResult {
  agentId: string;
  agentName: string;
  output: unknown;
  metadata: {
    runId: string;
    timestamp: string;
    toolsUsed?: string[];
    success: boolean;
    error?: string;
  };
}

interface MergedResult {
  output: unknown;
  metadata: {
    agentIds: string[];
    runIds: string[];
    timestamp: string;
    totalToolsUsed: string[];
    allSucceeded: boolean;
  };
}

/**
 * Result Merger
 * Deterministic merging of agent outputs
 */
export class ResultMerger {
  /**
   * Merge multiple agent results deterministically
   */
  merge(results: AgentResult[]): MergedResult;

  /**
   * Merge two results
   */
  mergeTwo(a: AgentResult, b: AgentResult): AgentResult;

  /**
   * Sort results by agent name
   */
  sortResults(results: AgentResult[]): AgentResult[];

  /**
   * Deep merge objects
   */
  deepMerge(a: unknown, b: unknown): unknown;
}
```

## Implementation Guidelines

- Implement stable sort (alphabetical by agent name)
- Handle all data types (string, object, array)
- Use JSON.stringify for comparison
- Add comprehensive JSDoc comments
- Place in `src/cowork/orchestrator/result-merger.ts`

## Validation

- Create test file: `tests/unit/cowork/orchestrator/result-merger.test.ts`
- Test cases:
  - Deterministic ordering (same input = same output)
  - Merge strings
  - Merge objects
  - Merge arrays with dedup
  - Merge metadata

## Dependencies
- No external dependencies
