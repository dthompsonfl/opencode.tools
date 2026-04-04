# Prompt: Implement Tool Permission Gate

## Task
Create a tool permission gate for enforcing tool allowlists in `src/cowork/permissions/tool-gate.ts`.

## Requirements

### Permission Checking

1. **Check Tool Access**
   - Given a tool name and actor (command/agent)
   - Return whether tool is allowed

2. **Actor Types**
   - `command`: A command is requesting tool access
   - `agent`: An agent is requesting tool access
   - `manager`: The orchestrator manager (full access by default)

3. **Allowlist Logic**
   - If no allowlist specified, deny by default (secure default)
   - If allowlist contains tool name, allow
   - If allowlist empty, deny by default

### Default Permissions

- Manager: All tools allowed (orchestrator has full access)
- Commands: Empty allowlist = deny all
- Agents: Empty allowlist = deny all

### Code Structure

```typescript
import { ToolPermission } from '../types';

type ActorType = 'command' | 'agent' | 'manager';

/**
 * Tool Permission Gate
 * Enforces tool allowlists per command and agent
 */
export class ToolPermissionGate {
  /**
   * Check if tool is allowed for actor
   */
  checkToolAccess(
    actorType: ActorType,
    actorId: string,
    toolName: string
  ): boolean;

  /**
   * Set allowlist for a command
   */
  setCommandAllowlist(commandId: string, tools: string[]): void;

  /**
   * Set allowlist for an agent
   */
  setAgentAllowlist(agentId: string, tools: string[]): void;

  /**
   * Get allowlist for command
   */
  getCommandAllowlist(commandId: string): string[];

  /**
   * Get allowlist for agent
   */
  getAgentAllowlist(agentId: string): string[];

  /**
   * Check if actor has any restrictions
   */
  hasRestrictions(actorType: ActorType, actorId: string): boolean;

  /**
   * Clear all allowlists
   */
  clearAllowlists(): void;
}
```

## Implementation Guidelines

- Use Map<string, string[]> for storing allowlists
- Implement secure defaults (deny by default)
- Manager always has full access
- Add comprehensive JSDoc comments
- Place in `src/cowork/permissions/tool-gate.ts`

## Validation

- Create test file: `tests/unit/cowork/permissions/tool-gate.test.ts`
- Test cases:
  - Check tool access with allowlist
  - Check tool access without allowlist (deny)
  - Manager has full access
  - Set command allowlist
  - Set agent allowlist

## Dependencies
- `../types` - ToolPermission
