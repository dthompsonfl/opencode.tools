import { builtinCommands } from './commands';
import { parseCommandLine } from './format';
import type { Command } from './types';

export class CommandRouter {
  private commands: Map<string, Command> = new Map();

  constructor() {
    for (const cmd of builtinCommands) {
      this.commands.set(cmd.id, cmd);
    }
  }

  public register(cmd: Command): void {
    this.commands.set(cmd.id, cmd);
  }

  public async handle(input: string, context: any): Promise<string> {
    const parsed = parseCommandLine(input);
    if (!parsed) return 'Not a command';

    const { command, args } = parsed;

    // direct match
    let cmd = this.commands.get(command);
    // support space-separated subcommands like 'agent focus'
    if (!cmd && args.length > 0) {
      const compound = `${command}:${args[0]}`;
      cmd = this.commands.get(compound);
      if (cmd) args.shift();
    }

    if (!cmd) return `Unknown command: /${command}`;

    try {
      const result = await Promise.resolve(cmd.handler(args, context));
      return result ?? '';
    } catch (err) {
      return `Command failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }
}

export default new CommandRouter();
