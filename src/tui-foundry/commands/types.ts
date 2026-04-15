export interface Command {
  id: string;
  description: string;
  usage?: string;
  handler: (args: string[], context?: any) => Promise<string | void> | string | void;
}

export interface CommandRouterOptions {
  prefix?: string; // e.g. '/'
}
