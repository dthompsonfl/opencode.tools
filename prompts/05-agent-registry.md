# Prompt: Implement Agent Registry

## Task
Create an agent registry for registering and looking up agents in `src/cowork/registries/agent-registry.ts`.

## Requirements

### Registry Operations

1. **Register Agent**
   - Add AgentDefinition to registry
   - Handle duplicate names (later overrides earlier)

2. **Get Agent**
   - Find agent by ID
   - Return AgentDefinition or undefined

3. **List Agents**
   - Return all registered agents

4. **Has Agent**
   - Check if agent exists

5. **Clear Registry**
   - Remove all agents (for testing)

### Code Structure

```typescript
import { AgentDefinition } from '../types';

/**
 * Agent Registry
 * Singleton for registering and looking up agents
 */
export class AgentRegistry {
  /**
   * Register an agent
   */
  register(agent: AgentDefinition): void;

  /**
   * Register multiple agents at once
   */
  registerMany(agents: AgentDefinition[]): void;

  /**
   * Get agent by ID
   */
  get(id: string): AgentDefinition | undefined;

  /**
   * List all registered agents
   */
  list(): AgentDefinition[];

  /**
   * Check if agent exists
   */
  has(id: string): boolean;

  /**
   * Clear all registered agents
   */
  clear(): void;

  /**
   * Get singleton instance
   */
  static getInstance(): AgentRegistry;
}
```

## Implementation Guidelines

- Use Map for O(1) lookup by ID
- Implement singleton pattern
- Add comprehensive JSDoc comments
- Place in `src/cowork/registries/agent-registry.ts`

## Validation

- Create test file: `tests/unit/cowork/registries/agent-registry.test.ts`
- Test cases:
  - Register single agent
  - Register duplicate (override)
  - Get existing agent
  - List all agents

## Dependencies
- `../types` - AgentDefinition
