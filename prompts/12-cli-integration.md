# Prompt: CLI Integration for Cowork

## Task
Add Cowork subcommands to the CLI in `src/cli.ts`.

## Requirements

### New CLI Commands

1. **cowork list**
   - List all commands
   - List all agents
   - List all plugins
   - Example: `opencode-tools cowork list`

2. **cowork run**
   - Run a command by name
   - Pass arguments to command
   - Example: `opencode-tools cowork run code-review ./src`

3. **cowork agents**
   - List available agents
   - Example: `opencode-tools cowork agents`

4. **cowork plugins**
   - List loaded plugins
   - Example: `opencode-tools cowork plugins`

5. **integrate**
   - Manually trigger integration with OpenCode
   - Example: `opencode-tools integrate`

### Implementation

Add to existing CLI using commander:

```typescript
// Cowork commands
const coworkCmd = program
  .command('cowork')
  .description('Cowork plugin system');

// cowork list
coworkCmd
  .command('list')
  .description('List commands, agents, and plugins')
  .option('-c, --commands', 'List commands only')
  .option('-a, --agents', 'List agents only')
  .option('-p, --plugins', 'List plugins only')
  .action(async (options) => {
    // Implementation
  });

// cowork run
coworkCmd
  .command('run <command> [args...]')
  .description('Run a cowork command')
  .action(async (command, args) => {
    // Implementation
  });

// cowork agents
coworkCmd
  .command('agents')
  .description('List available agents')
  .action(async () => {
    // Implementation
  });

// cowork plugins
coworkCmd
  .command('plugins')
  .description('List loaded plugins')
  .action(async () => {
    // Implementation
  });

// integrate command (separate from cowork)
program
  .command('integrate')
  .description('Integrate with OpenCode installation')
  .action(async () => {
    // Implementation
  });
```

## Implementation Guidelines

- Import CoworkOrchestrator from `./cowork/orchestrator/cowork-orchestrator`
- Import registries from `./cowork/registries`
- Use console.log for output
- Handle errors gracefully
- Add to existing `src/cli.ts`

## Validation

- Run CLI commands manually
- Test each subcommand

## Dependencies
- `./cowork/orchestrator/cowork-orchestrator`
- `./cowork/registries`
- `./cowork/plugin-loader`
