/**
 * Type declarations for modules without types
 */

declare module '@modelcontextprotocol/sdk' {
  export class Server {
    constructor(options: { name: string; version: string }, capabilities: Record<string, unknown>);
    setRequestHandler(type: string, handler: (request: Record<string, unknown>) => Promise<Record<string, unknown>>): void;
    run(): Promise<void>;
  }
}

declare module '@modelcontextprotocol/sdk/dist/esm/index.js' {
  export class Server {
    constructor(options: { name: string; version: string }, capabilities: Record<string, unknown>);
    setRequestHandler(type: string, handler: (request: Record<string, unknown>) => Promise<Record<string, unknown>>): void;
    run(): Promise<void>;
  }
}
