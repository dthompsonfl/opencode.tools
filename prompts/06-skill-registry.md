# Prompt: Implement Skill Registry

## Task
Create a skill registry for registering and looking up skills in `src/cowork/registries/skill-registry.ts`.

## Requirements

### Registry Operations

1. **Register Skill**
   - Add SkillDefinition to registry
   - Handle duplicate names (later overrides earlier)

2. **Get Skill**
   - Find skill by ID
   - Return SkillDefinition or undefined

3. **List Skills**
   - Return all registered skills

4. **Has Skill**
   - Check if skill exists

5. **Clear Registry**
   - Remove all skills (for testing)

### Code Structure

```typescript
import { SkillDefinition } from '../types';

/**
 * Skill Registry
 * Singleton for registering and looking up skills
 */
export class SkillRegistry {
  /**
   * Register a skill
   */
  register(skill: SkillDefinition): void;

  /**
   * Register multiple skills at once
   */
  registerMany(skills: SkillDefinition[]): void;

  /**
   * Get skill by ID
   */
  get(id: string): SkillDefinition | undefined;

  /**
   * List all registered skills
   */
  list(): SkillDefinition[];

  /**
   * Check if skill exists
   */
  has(id: string): boolean;

  /**
   * Clear all registered skills
   */
  clear(): void;

  /**
   * Get singleton instance
   */
  static getInstance(): SkillRegistry;
}
```

## Implementation Guidelines

- Use Map for O(1) lookup by ID
- Implement singleton pattern
- Add comprehensive JSDoc comments
- Place in `src/cowork/registries/skill-registry.ts`

## Validation

- Create test file: `tests/unit/cowork/registries/skill-registry.test.ts`
- Test cases:
  - Register single skill
  - Get existing skill
  - List all skills

## Dependencies
- `../types` - SkillDefinition
