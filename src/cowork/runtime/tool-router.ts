import { ToolPermissionGate } from '../permissions/tool-gate';
import { logger } from '../../runtime/logger';
import * as path from 'path';
import * as fs from 'fs';
import { createFsTools, type FsTools } from './tools/fs';
import { createEditTools, type EditTools } from './tools/edit';
import { createBashTools, type BashTools } from './tools/bash';
import { createGlobTool, type GlobTool } from './tools/glob';
import { createGrepTool, type GrepTool } from './tools/grep';

export interface ToolRouterOptions {
  fsBasePath?: string;
  allowedBashCommands?: string[];
  defaultTimeout?: number;
}

// Expose ability to configure base path at runtime for per-task/workspace initialization
export interface RuntimeToolRouter extends ToolRouter {
  configureBasePath: (basePath: string, allowedBashCommands?: string[]) => void;
}

/**
 * Tool Definition
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: any; // JSON schema
  handler: (args: any) => Promise<any>;
}

/**
 * Tool Router
 * Executes tools and checks permissions
 * 
 * Implements security-first approach:
 * - Base-path jail for filesystem operations
 * - Deny-by-default for bash commands
 * - Timeouts and output truncation
 * - Permission gates per agent/command
 */
export class ToolRouter {
  private tools: Map<string, ToolDefinition>;
  private permissionGate: ToolPermissionGate;
  private fsBasePath?: string;
  private fsTools: FsTools | null = null;
  private editTools: EditTools | null = null;
  private bashTools: BashTools | null = null;
  private globTool: GlobTool | null = null;
  private grepTool: GrepTool | null = null;
  private defaultTimeout: number;

  constructor(options?: ToolRouterOptions) {
    this.tools = new Map<string, ToolDefinition>();
    this.permissionGate = new ToolPermissionGate();
    this.defaultTimeout = options?.defaultTimeout ?? 60000;
    
    const configuredBasePath = options?.fsBasePath ?? process.env.COWORK_FS_BASE_PATH;
    this.fsBasePath = configuredBasePath ? path.resolve(configuredBasePath) : undefined;

    // Register legacy filesystem tools (backward compatibility)
    this.registerLegacyFsTools();

    // Initialize tools if base path is set (this will overwrite legacy tools if they share names)
    if (this.fsBasePath) {
      this.initializeProductionTools(options?.allowedBashCommands);
    }
  }

  /**
   * Configure the filesystem base path dynamically at runtime.
   * This will initialize production tools if not already initialized.
   */
  public configureBasePath(basePath: string, allowedBashCommands?: string[]) {
    if (!basePath || typeof basePath !== 'string') {
      throw new Error('Invalid basePath provided to ToolRouter.configureBasePath');
    }

    const resolved = path.resolve(basePath);
    this.fsBasePath = resolved;
    // Initialize tools with provided allowlist
    this.initializeProductionTools(allowedBashCommands);
  }

  /**
   * Initialize production-grade tools with security controls
   */
  private initializeProductionTools(allowedBashCommands?: string[]): void {
    if (!this.fsBasePath) {
      return;
    }

    // Initialize FsTools
    this.fsTools = createFsTools({
      basePath: this.fsBasePath,
    });

    // Initialize EditTools
    this.editTools = createEditTools({
      basePath: this.fsBasePath,
      createBackup: true,
    });

    // Initialize BashTools with allowed commands
    const defaultAllowedCommands = [
      'npm', 'yarn', 'pnpm', 'node', 'npx',
      'git', 'gh',
      'ls', 'cat', 'head', 'tail', 'grep', 'find', 'wc',
      'mkdir', 'touch', 'cp', 'mv',
      'echo', 'pwd', 'which', 'env',
      'tsc', 'eslint', 'prettier', 'jest', 'vitest',
    ];

    this.bashTools = createBashTools({
      basePath: this.fsBasePath,
      allowedCommands: allowedBashCommands ?? defaultAllowedCommands,
      allowedPatterns: [
        /^npm\s+(run|test|install|build|lint)/,
        /^yarn\s+(run|test|install|build|lint)/,
        /^pnpm\s+(run|test|install|build|lint)/,
        /^npx\s+/,
        /^node\s+/,
        /^git\s+/,
        /^gh\s+/,
      ],
    });

    // Register production tools
    this.registerProductionTools();
    // Register additional runtime utilities
    this.register({
      name: 'glob',
      description: 'Glob files within base path',
      parameters: { type: 'object', properties: { pattern: { type: 'array' } } },
      handler: async (args) => {
        if (!this.globTool) {
          this.globTool = createGlobTool({ basePath: this.fsBasePath!, include: ['**/*'] });
        }
        return this.globTool.glob(args?.patterns || args?.pattern || []);
      }
    });

    this.register({
      name: 'grep',
      description: 'Grep within files',
      parameters: { type: 'object', properties: { pattern: { type: 'string' }, files: { type: 'array' } } },
      handler: async (args) => {
        if (!this.grepTool) {
          this.grepTool = createGrepTool({ basePath: this.fsBasePath! });
        }
        return this.grepTool.grep(args.pattern, args.files || []);
      }
    });
  }

  /**
   * Register production-grade tools
   */
  private registerProductionTools(): void {
    // FsTools
    this.register({
      name: 'fs.read',
      description: 'Read file contents with truncation and base-path jail',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path to file' },
        },
        required: ['path'],
      },
      handler: async (args) => {
        this.ensureFsTools();
        return this.fsTools!.read(args.path);
      },
    });

    this.register({
      name: 'fs.write',
      description: 'Write file with atomic write (temp file + rename)',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path to file' },
          content: { type: 'string', description: 'Content to write' },
        },
        required: ['path', 'content'],
      },
      handler: async (args) => {
        this.ensureFsTools();
        return this.fsTools!.write(args.path, args.content);
      },
    });

    this.register({
      name: 'fs.list',
      description: 'List directory contents',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path to directory' },
        },
        required: ['path'],
      },
      handler: async (args) => {
        this.ensureFsTools();
        return this.fsTools!.list(args.path);
      },
    });

    this.register({
      name: 'fs.delete',
      description: 'Delete file or directory',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path to delete' },
        },
        required: ['path'],
      },
      handler: async (args) => {
        this.ensureFsTools();
        return this.fsTools!.delete(args.path);
      },
    });

    this.register({
      name: 'fs.exists',
      description: 'Check if path exists',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path to check' },
        },
        required: ['path'],
      },
      handler: async (args) => {
        this.ensureFsTools();
        return this.fsTools!.exists(args.path);
      },
    });

    this.register({
      name: 'fs.stat',
      description: 'Get file/directory stats',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative path' },
        },
        required: ['path'],
      },
      handler: async (args) => {
        this.ensureFsTools();
        return this.fsTools!.stat(args.path);
      },
    });

    // EditTools
    this.register({
      name: 'edit.apply',
      description: 'Apply a single edit operation (string_replace, line_edit, append)',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['string_replace', 'line_edit', 'append'] },
          path: { type: 'string' },
          oldString: { type: 'string' },
          newString: { type: 'string' },
          replaceAll: { type: 'boolean' },
          startLine: { type: 'number' },
          endLine: { type: 'number' },
          content: { type: 'string' },
        },
        required: ['type', 'path'],
      },
      handler: async (args) => {
        this.ensureEditTools();
        return this.editTools!.applyEdit(args);
      },
    });

    this.register({
      name: 'edit.diff',
      description: 'Apply a unified diff patch to a file',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File to patch' },
          diff: { type: 'string', description: 'Unified diff content' },
        },
        required: ['path', 'diff'],
      },
      handler: async (args) => {
        this.ensureEditTools();
        return this.editTools!.applyDiff(args.path, args.diff);
      },
    });

    // BashTools
    this.register({
      name: 'bash.execute',
      description: 'Execute a shell command with security controls',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Command to execute' },
          args: { type: 'array', items: { type: 'string' } },
          cwd: { type: 'string', description: 'Working directory (relative to base)' },
          timeout: { type: 'number', description: 'Timeout in ms' },
        },
        required: ['command'],
      },
      handler: async (args) => {
        this.ensureBashTools();
        return this.bashTools!.execute(args.command, args.args ?? [], {
          cwd: args.cwd,
          timeout: args.timeout ?? this.defaultTimeout,
        });
      },
    });

    // Aliases for OpenCode-style tool names
    this.register({
      name: 'read',
      description: 'Read file (alias for fs.read)',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string' } },
        required: ['path'],
      },
      handler: async (args) => {
        this.ensureFsTools();
        return this.fsTools!.read(args.path);
      },
    });

    this.register({
      name: 'write',
      description: 'Write file (alias for fs.write)',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string' }, content: { type: 'string' } },
        required: ['path', 'content'],
      },
      handler: async (args) => {
        this.ensureFsTools();
        return this.fsTools!.write(args.path, args.content);
      },
    });

    this.register({
      name: 'edit',
      description: 'Edit file (alias for edit.apply with string_replace)',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          oldString: { type: 'string' },
          newString: { type: 'string' },
          replaceAll: { type: 'boolean' },
        },
        required: ['path', 'oldString', 'newString'],
      },
      handler: async (args) => {
        this.ensureEditTools();
        return this.editTools!.applyEdit({
          type: 'string_replace',
          path: args.path,
          oldString: args.oldString,
          newString: args.newString,
          replaceAll: args.replaceAll,
        });
      },
    });

    this.register({
      name: 'bash',
      description: 'Execute shell command (alias for bash.execute)',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string' },
          args: { type: 'array', items: { type: 'string' } },
          cwd: { type: 'string' },
          timeout: { type: 'number' },
        },
        required: ['command'],
      },
      handler: async (args) => {
        this.ensureBashTools();
        return this.bashTools!.execute(args.command, args.args ?? [], {
          cwd: args.cwd,
          timeout: args.timeout ?? this.defaultTimeout,
        });
      },
    });
  }

  /**
   * Register legacy filesystem tools for backward compatibility
   */
  private registerLegacyFsTools(): void {
    // If we're operating without a base path, ensure we still have stubs that fail gracefully
    // to match expected test behavior, but these will be overwritten by initializeProductionTools
    this.register({
      name: 'fs.list',
      description: 'List directory contents',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', description: 'Relative path to directory' } },
        required: ['path'],
      },
      handler: async (args) => {
        this.ensureFsTools();
        return this.fsTools!.list(args.path);
      },
    });

    this.register({
      name: 'fs.read',
      description: 'Read file contents',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', description: 'Relative path to file' } },
        required: ['path'],
      },
      handler: async (args) => {
        this.ensureFsTools();
        return this.fsTools!.read(args.path);
      },
    });

    this.register({
        name: 'fs.list.legacy',
        description: 'List files in a directory (legacy)',
        parameters: { type: 'object', properties: { path: { type: 'string' } } },
        handler: async ({ path: inputPath }) => {
            const normPath = this.resolveFsPath(inputPath, '.');
            return fs.readdirSync(normPath);
        }
    });

     this.register({
        name: 'fs.read.legacy',
        description: 'Read a file (legacy)',
        parameters: { type: 'object', properties: { path: { type: 'string' } } },
        handler: async ({ path: inputPath }) => {
            const fullPath = this.resolveFsPath(inputPath);
            return fs.readFileSync(fullPath, 'utf8');
        }
    });
  }

  private ensureFsTools(): void {
    if (!this.fsTools) {
      throw new Error('Filesystem tools are disabled: COWORK_FS_BASE_PATH is not configured.');
    }
  }

  private ensureEditTools(): void {
    if (!this.editTools) {
      throw new Error('Edit tools are disabled: COWORK_FS_BASE_PATH is not configured.');
    }
  }

  private ensureBashTools(): void {
    if (!this.bashTools) {
      throw new Error('Bash tools are disabled: COWORK_FS_BASE_PATH is not configured.');
    }
  }

  private resolveFsPath(inputPath: unknown, defaultPath?: string): string {
    if (!this.fsBasePath) {
      throw new Error('Filesystem tools are disabled: COWORK_FS_BASE_PATH is not configured.');
    }

    const rawPath = (inputPath === undefined || inputPath === null || inputPath === '')
      ? defaultPath
      : inputPath;

    if (typeof rawPath !== 'string' || rawPath.trim() === '') {
      throw new Error('Invalid path: expected a non-empty string path.');
    }

    if (rawPath.includes('\0')) {
      throw new Error('Invalid path: null-byte is not allowed.');
    }

    const resolvedPath = path.resolve(this.fsBasePath, rawPath);
    const relative = path.relative(this.fsBasePath, resolvedPath);
    const escapesBase = relative.startsWith('..') || path.isAbsolute(relative);

    if (escapesBase) {
      throw new Error(`Invalid path: "${rawPath}" escapes configured filesystem boundary.`);
    }

    return resolvedPath;
  }

  /**
   * Register a tool
   */
  public register(tool: ToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  /**
   * Execute a tool
   */
  public async execute(agentId: string, toolName: string, args: any): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool "${toolName}" not found`);
    }

    // Check permissions
    if (!this.permissionGate.checkToolAccess('agent', agentId, toolName)) {
      throw new Error(`Agent "${agentId}" does not have permission to execute "${toolName}"`);
    }

    logger.info(`Agent ${agentId} executing ${toolName}`, args);
    try {
      const result = await tool.handler(args);
      return result;
    } catch (error: any) {
      logger.error(`Tool execution failed: ${error.message}`, { toolName, args });
      throw error;
    }
  }

  /**
   * Get tool definitions for LLM
   */
  public getDefinitions(): any[] {
    return Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }));
  }

  /**
   * Set allowlist for an agent
   */
  public setAllowlist(agentId: string, allowedTools: string[]) {
      this.permissionGate.setAgentAllowlist(agentId, allowedTools);
  }

  /**
   * Get base path for filesystem operations
   */
  public getBasePath(): string | undefined {
    return this.fsBasePath;
  }

  /**
   * Check if production tools are initialized
   */
  public isInitialized(): boolean {
    return this.fsTools !== null && this.editTools !== null && this.bashTools !== null;
  }
}
