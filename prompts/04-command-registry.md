# Prompt: Implement Command Registry

## Task
Create a command registry for registering and looking up commands in `src/cowork/registries/command-registry.ts`.

## Requirements

### Registry Operations

1. **Register Command**
   - Add CommandDefinition to registry
   - Handle duplicate names (later overrides earlier)

2. **Get Command**
   - Find command by ID or name
   - Return CommandDefinition or undefined

3. **List Commands**
   - Return all registered commands
   - Optionally filter by category

4. **Has Command**
   - Check if command exists

5. **Clear Registry**
   - Remove all commands (for testing)

### Resolution Rules

1. Bundled plugins load first (alphabetically)
2. System plugins load second (alphabetically)
3. User plugins load last (alphabetically)
4. Duplicate names: later plugins override earlier ones

### Code Structure

```typescript
import { CommandDefinition } from '../types';

/**
 * Command Registry
 * Singleton for registering and looking up commands
 */
export class CommandRegistry {
  /**
   * Register a command
   */
  register(command: CommandDefinition): void;

  /**
   * Register multiple commands at once
   */
  registerMany(commands: CommandDefinition[]): void;

  /**
   * Get command by ID
   */
  get(id: string): CommandDefinition | undefined;

  /**
   * Get command by name (case-insensitive)
   */
  getByName(name: string): CommandDefinition | undefined;

  /**
   * List all registered commands
   */
  list(): CommandDefinition[];

  /**
   * Check if command exists
   */
  has(id: string): boolean;

  /**
   * Clear all registered commands
   */
  clear(): void;

  /**
   * Get singleton instance
   */
  static getInstance(): CommandRegistry;
}
```

## Implementation Guidelines

- Use Map for O(1) lookup by ID
- Implement singleton pattern
- Use case-insensitive name lookup
- Add comprehensive JSDoc comments
- Place in `src/cowork/registries/command-registry.ts`

## Validation

- Create test file: `tests/unit/cowork/registries/command-registry.test.ts`
- Test cases:
  - Register single command
  - Register duplicate (override)
  - Get existing command
  - Get non-existing command
  - List all commands
  - Clear registry

## Dependencies
- `../types` - CommandDefinition
