# Prompt: Implement Markdown Frontmatter Parser

## Task
Create a markdown parser that extracts YAML frontmatter and body content in `src/cowork/markdown-parser.ts`.

## Requirements

### Functionality

1. **Parse Frontmatter and Body**
   - Extract YAML frontmatter (between `---` delimiters) from markdown
   - Return parsed frontmatter as object
   - Return body content as string (without frontmatter)

2. **Parse Command Markdown**
   - Input: Markdown file content
   - Output: `CommandDefinition` object with parsed frontmatter fields
   - Required frontmatter fields:
     - `description`: string
   - Optional frontmatter fields:
     - `allowed-tools`: string[]
     - `model`: string
     - `argument-hint`: string

3. **Parse Agent Markdown**
   - Input: Markdown file content
   - Output: `AgentDefinition` object with parsed frontmatter fields
   - Required frontmatter fields:
     - `name`: string
     - `description`: string
   - Optional frontmatter fields:
     - `tools`: string[]
     - `model`: string
     - `color`: string

4. **Parse Skill Markdown**
   - Input: Markdown file content
   - Output: `SkillDefinition` object
   - No required frontmatter, entire content is skill body

5. **Error Handling**
   - Throw descriptive errors for invalid YAML
   - Handle missing frontmatter gracefully
   - Handle malformed frontmatter

### Code Structure

```typescript
import * as yaml from 'js-yaml';
import { CommandDefinition, AgentDefinition, SkillDefinition } from './types';

/**
 * Parse markdown content with YAML frontmatter
 */
export function parseMarkdownWithFrontmatter(content: string): {
  frontmatter: Record<string, unknown>;
  body: string;
}

/**
 * Parse a command markdown file
 */
export function parseCommandMarkdown(content: string, id: string): CommandDefinition;

/**
 * Parse an agent markdown file
 */
export function parseAgentMarkdown(content: string, id: string): AgentDefinition;

/**
 * Parse a skill markdown file
 */
export function parseSkillMarkdown(content: string, id: string): SkillDefinition;
```

## Implementation Guidelines

- Use `js-yaml` for YAML parsing
- Follow TypeScript best practices
- Add comprehensive error messages
- Use the types from `src/cowork/types.ts`
- Place in `src/cowork/markdown-parser.ts`

## Validation

- Create test file: `tests/unit/cowork/markdown-parser.test.ts`
- Test cases:
  - Valid frontmatter + body
  - Missing frontmatter
  - Invalid YAML
  - Empty body
  - Command with all fields
  - Agent with all fields

## Dependencies
- `js-yaml` (already in package.json)
