# Prompt: Implement Hook Manager

## Task
Create a hook manager for loading and dispatching hooks in `src/cowork/hooks/hook-manager.ts`.

## Requirements

### Hook Loading

1. **Load Hooks from Plugin**
   - Accept array of HookDefinition
   - Group hooks by event type

2. **Register Hook**
   - Add hook to appropriate event type

### Event Dispatch

1. **Dispatch Event**
   - Execute all hooks for an event
   - Pass HookContext to each hook
   - Collect decisions from all hooks

2. **Decision Processing**
   - If any hook returns "deny" with exit code 2, block action
   - If any hook returns "block", block action with message
   - Otherwise, allow action
   - Collect all messages for audit

### Hook Execution

1. **Execute Hook Script**
   - Spawn child process with hook command
   - Pass context as JSON on stdin
   - Read JSON from stdout
   - Check exit code
   - Handle timeout

2. **Timeout Handling**
   - Default timeout: 5000ms
   - Configurable per hook
   - Kill process on timeout

### Code Structure

```typescript
import { 
  HookDefinition, 
  HookEvent, 
  HookContext, 
  HookDecision 
} from '../types';
import { spawn } from 'child_process';

/**
 * Hook Manager
 * Loads and dispatches hooks for events
 */
export class HookManager {
  /**
   * Create hook manager
   */
  constructor();

  /**
   * Load hooks from definitions
   */
  loadHooks(hooks: HookDefinition[]): void;

  /**
   * Register a single hook
   */
  registerHook(hook: HookDefinition): void;

  /**
   * Dispatch event to all registered hooks
   */
  dispatch(event: HookEvent, context: HookContext): Promise<HookDecision>;

  /**
   * Clear all hooks
   */
  clear(): void;

  /**
   * Check if any hooks are registered for event
   */
  hasHooksFor(event: HookEvent): boolean;
}
```

## Implementation Guidelines

- Use Map<HookEvent, HookDefinition[]> for O(1) lookup
- Use Promise-based async/await
- Handle child process spawning safely
- Add timeout handling
- Log hook decisions for audit
- Place in `src/cowork/hooks/hook-manager.ts`

## Validation

- Create test file: `tests/unit/cowork/hooks/hook-manager.test.ts`
- Test cases:
  - Load hooks
  - Dispatch event
  - Allow decision
  - Deny decision
  - Block decision
  - Timeout handling

## Dependencies
- `../types` - HookDefinition, HookEvent, HookContext, HookDecision
- Node.js built-in: child_process, events
