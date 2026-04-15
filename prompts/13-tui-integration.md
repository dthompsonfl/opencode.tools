# Prompt: TUI Integration for Cowork

## Task
Integrate Cowork commands into the TUI in `src/tui-integration.ts` and `src/tui-commands.ts`.

## Requirements

### TUI Registration

1. **Register Cowork Tools**
   - Add Cowork commands to TUI tool registry
   - Display commands in TUI menu

2. **Execute from TUI**
   - Allow running commands from TUI interface
   - Show progress/status

3. **Agent Listing**
   - Show available agents in TUI
   - Allow agent selection

### Implementation

In `src/tui-integration.ts`:

```typescript
import { CoworkOrchestrator } from './cowork/orchestrator/cowork-orchestrator';
import { CommandRegistry } from './cowork/registries/command-registry';
import { AgentRegistry } from './cowork/registries/agent-registry';
import { loadAllPlugins } from './cowork/plugin-loader';

// In registerTUITools() function, add:
export function registerTUITools(): TUITool[] {
  const tools: TUITool[] = [];
  
  // ... existing tools ...
  
  // Load plugins first
  const plugins = loadAllPlugins();
  
  // Register each plugin command
  for (const plugin of plugins) {
    for (const command of plugin.commands) {
      tools.push({
        id: `cowork:${command.id}`,
        name: command.name,
        description: command.description,
        category: 'cowork',
        handler: async (args: any) => {
          const orchestrator = new CoworkOrchestrator();
          return orchestrator.execute(command.id, args._ ?? []);
        },
        parameters: [
          {
            name: 'args',
            type: 'array',
            required: false,
            description: command.argumentHint || 'Command arguments'
          }
        ]
      });
    }
  }
  
  return tools;
}
```

In `src/tui-commands.ts`:

```typescript
// Add Cowork section
export const coworkCommand = {
  id: 'cowork',
  name: 'Cowork Commands',
  description: 'Execute plugin commands',
  category: 'Cowork',
  menu: {
    title: 'Cowork Commands',
    description: 'Execute plugin commands and workflows',
    options: [
      // Dynamically populated from registry
    ]
  }
};
```

## Implementation Guidelines

- Load Cowork plugins when TUI starts
- Dynamically generate menu options
- Use existing TUI infrastructure
- Place changes in `src/tui-integration.ts` and `src/tui-commands.ts`

## Validation

- Launch TUI with `npm run tui`
- Verify Cowork commands appear
- Test executing a command

## Dependencies
- `./cowork/orchestrator/cowork-orchestrator`
- `./cowork/registries`
- `./cowork/plugin-loader`
