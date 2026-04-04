/**
 * Cowork Plugin System - Type Definitions
 * 
 * Core type definitions for the plugin system that enables extensible
 * command and agent registration.
 */

export interface CoworkPluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  entryPoint?: string;
  capabilities?: string[];
}

export interface CoworkCommand {
  id: string;
  name: string;
  description: string;
  handler: (args: string[]) => Promise<CoworkCommandResult>;
  argumentHint?: string;
  body?: string;
  allowedTools?: string[];
}

export interface CoworkCommandResult {
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;
}

export interface CoworkAgent {
  id: string;
  name: string;
  description: string;
  tools?: string[];
  model?: string;
  body?: string;
  execute: (task: string, context?: unknown) => Promise<CoworkAgentResult>;
}

export interface CoworkAgentResult {
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;
}

export interface CoworkSkill {
  id: string;
  name: string;
  description: string;
  execute: (input: unknown) => Promise<unknown>;
}

export interface CoworkHook {
  event: string;
  handler: (context: unknown) => Promise<void>;
}

export interface CoworkPlugin {
  manifest: CoworkPluginManifest;
  commands: CoworkCommand[];
  agents: CoworkAgent[];
  skills: CoworkSkill[];
  hooks: CoworkHook[];
  rootPath?: string;
}

export interface RegistryEntry<T> {
  id: string;
  item: T;
  registeredAt: Date;
  source?: string;
}

export type HookEvent = 'command:start' | 'command:complete' | 'command:error' | 'agent:start' | 'agent:complete' | 'agent:error' | string;

export interface HookDefinition {
    id?: string;
    name: string;
    events: HookEvent[];
    type?: 'command' | 'script' | string;
    command: string;
    timeoutMs?: number;
}

export interface HookContext {
    event?: HookEvent;
    eventName?: HookEvent;
    [key: string]: unknown;
}

export interface HookDecision {
    decision: 'allow' | 'deny' | 'block';
    message?: string;
}

export interface CommandDefinition {
    id: string;
    name: string;
    description: string;
    body?: string;
    allowedTools?: string[];
    model?: string;
    argumentHint?: string;
    handler?: (args: string[]) => Promise<CoworkCommandResult>;
}

export interface AgentDefinition {
    id: string;
    name: string;
    description: string;
    body?: string;
    tools?: string[];
    model?: string;
    color?: string;
    steps?: any[];
    interactive?: boolean;
    repl?: boolean;
    execute?: (answers: any, log: any) => Promise<any>;
    onInput?: (input: string, log: any) => Promise<void>;
}

export interface SkillDefinition {
    id: string;
    name: string;
    body?: string;
    description?: string;
}
