# Prompt: Implement Cowork Types

## Task
Create the core type definitions for the Cowork plugin system in `src/cowork/types.ts`.

## Requirements

### Type Definitions

1. **PluginManifest**
   ```typescript
   interface PluginManifest {
     id: string;
     name: string;
     version: string;
     description?: string;
     author?: string;
     license?: string;
     entryPoint?: {
       type: 'command' | 'agent' | 'hook';
       path: string;
     };
     capabilities?: string[];
   }
   ```

2. **CommandDefinition**
   ```typescript
   interface CommandDefinition {
     id: string;
     name: string;
     description: string;
     body: string;
     allowedTools?: string[];
     model?: string;
     argumentHint?: string;
   }
   ```

3. **AgentDefinition**
   ```typescript
   interface AgentDefinition {
     id: string;
     name: string;
     description: string;
     body: string;
     tools?: string[];
     model?: string;
     color?: string;
   }
   ```

4. **SkillDefinition**
   ```typescript
   interface SkillDefinition {
     id: string;
     name: string;
     body: string;
   }
   ```

5. **HookDefinition**
   ```typescript
   interface HookDefinition {
     name: string;
     events: HookEvent[];
     type: 'command';
     command: string;
     timeoutMs?: number;
   }
   ```

6. **HookEvent**
   ```typescript
   type HookEvent = 
     | 'SessionStart'
     | 'UserPromptSubmit'
     | 'PreToolUse'
     | 'PostToolUse'
     | 'Stop'
     | 'SessionEnd';
   ```

7. **HookContext**
   ```typescript
   interface HookContext {
     eventName: HookEvent;
     toolName?: string;
     toolInput?: Record<string, unknown>;
     projectDir: string;
     pluginRoot: string;
     transcriptPath?: string;
     timestamp: string;
   }
   ```

8. **HookDecision**
   ```typescript
   interface HookDecision {
     decision: 'allow' | 'deny' | 'block';
     message?: string;
   }
   ```

9. **PluginLoadResult**
   ```typescript
   interface PluginLoadResult {
     manifest: PluginManifest;
     commands: CommandDefinition[];
     agents: AgentDefinition[];
     skills: SkillDefinition[];
     hooks: HookDefinition[];
     rootPath: string;
   }
   ```

10. **ToolPermission**
    ```typescript
    interface ToolPermission {
      toolName: string;
      allowed: boolean;
    }
    ```

## Implementation Guidelines

- Use TypeScript strict mode
- Export all types
- Add JSDoc comments
- Follow AGENTS.md naming conventions (PascalCase interfaces, prefix with I where appropriate)
- Place in `src/cowork/types.ts`

## Validation
- Run `npm run build` to verify compilation
- Run `npm run lint` on new file

## Dependencies
- No external dependencies required
- Uses built-in TypeScript types
