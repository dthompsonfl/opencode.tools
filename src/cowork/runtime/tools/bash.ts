/**
 * Bash Tools for Cowork Runtime
 *
 * Shell execution wrapper with:
 * - Allowed commands/patterns (deny-by-default)
 * - Working directory jail
 * - Timeouts and output truncation
 * - Streaming capture
 * - Sensitive data redaction
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { logger } from '../../../runtime/logger';

export interface BashToolOptions {
  basePath: string;
  allowedCommands?: string[];
  allowedPatterns?: RegExp[];
  deniedCommands?: string[];
  timeout?: number;
  maxOutputSize?: number;
  redactPatterns?: RegExp[];
}

export interface BashResult {
  success: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  truncated: boolean;
  duration: number;
  command: string;
  timedOut: boolean;
}

// Default dangerous commands that should never be allowed
const DEFAULT_DENIED_COMMANDS = [
  'rm -rf /',
  'rm -rf /*',
  'mkfs',
  'dd if=',
  ':(){ :|:& };:',  // Fork bomb
  'chmod -R 777 /',
  'chown -R',
  'wget',
  'curl -X POST',
  'nc -l',
  'ncat',
  'telnet',
  'ftp',
  'ssh-keygen',
  'gpg --export',
  'openssl',
];

// Patterns to redact from output
const DEFAULT_REDACT_PATTERNS = [
  /password[=:]\s*\S+/gi,
  /api[_-]?key[=:]\s*\S+/gi,
  /secret[=:]\s*\S+/gi,
  /token[=:]\s*\S+/gi,
  /bearer\s+\S+/gi,
  /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/g,
  /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g, // JWTs
];

const DEFAULT_TIMEOUT = 60000; // 60 seconds
const DEFAULT_MAX_OUTPUT = 500 * 1024; // 500KB

/**
 * Check if a command is allowed
 */
function isCommandAllowed(
  command: string,
  allowedCommands: Set<string>,
  allowedPatterns: RegExp[],
  deniedCommands: string[]
): { allowed: boolean; reason?: string } {
  // First check deny list
  const baseCommand = command.trim().split(/\s+/)[0];
  
  for (const denied of deniedCommands) {
    if (command.toLowerCase().includes(denied.toLowerCase())) {
      return { allowed: false, reason: `Command matches denied pattern: ${denied}` };
    }
  }

  // If allowedCommands is empty, we need allowedPatterns to permit
  if (allowedCommands.size === 0 && allowedPatterns.length === 0) {
    return { allowed: false, reason: 'No commands are allowed (deny-by-default)' };
  }

  // Check if base command is in allowlist
  if (allowedCommands.has(baseCommand) || allowedCommands.has('*')) {
    return { allowed: true };
  }

  // Check patterns
  for (const pattern of allowedPatterns) {
    if (pattern.test(command)) {
      return { allowed: true };
    }
  }

  return { allowed: false, reason: `Command not in allowlist: ${baseCommand}` };
}

/**
 * Redact sensitive data from output
 */
function redactOutput(output: string, patterns: RegExp[]): string {
  let redacted = output;
  for (const pattern of patterns) {
    redacted = redacted.replace(pattern, '[REDACTED]');
  }
  return redacted;
}

/**
 * Create BashTool instance
 */
export function createBashTools(options: BashToolOptions) {
  const {
    basePath,
    allowedCommands = [],
    allowedPatterns = [],
    deniedCommands = DEFAULT_DENIED_COMMANDS,
    timeout = DEFAULT_TIMEOUT,
    maxOutputSize = DEFAULT_MAX_OUTPUT,
    redactPatterns = DEFAULT_REDACT_PATTERNS,
  } = options;

  const allowedCommandsSet = new Set(allowedCommands);

  return {
    /**
     * Execute a shell command
     */
    async execute(
      command: string,
      args: string[] = [],
      execOptions?: {
        cwd?: string;
        env?: Record<string, string>;
        timeout?: number;
      }
    ): Promise<BashResult> {
      const startTime = Date.now();

      // Validate command is allowed
      const fullCommand = args.length > 0 ? `${command} ${args.join(' ')}` : command;
      const check = isCommandAllowed(fullCommand, allowedCommandsSet, allowedPatterns, deniedCommands);

      if (!check.allowed) {
        logger.warn(`[BashTools] Command denied: ${fullCommand} - ${check.reason}`);
        return {
          success: false,
          exitCode: 1,
          stdout: '',
          stderr: `Command denied: ${check.reason}`,
          truncated: false,
          duration: 0,
          command: fullCommand,
          timedOut: false,
        };
      }

      // Validate and resolve cwd
      let cwd = basePath;
      if (execOptions?.cwd) {
        const resolvedCwd = path.resolve(basePath, execOptions.cwd);
        const relative = path.relative(basePath, resolvedCwd);
        const escapesBase = relative.startsWith('..') || path.isAbsolute(relative);

        if (escapesBase) {
          return {
            success: false,
            exitCode: 1,
            stdout: '',
            stderr: `Working directory escapes base path: ${execOptions.cwd}`,
            truncated: false,
            duration: 0,
            command: fullCommand,
            timedOut: false,
          };
        }
        cwd = resolvedCwd;
      }

      const effectiveTimeout = execOptions?.timeout ?? timeout;

      logger.info(`[BashTools] Executing: ${fullCommand} in ${cwd}`);

      return new Promise<BashResult>((resolve) => {
        let stdout = '';
        let stderr = '';
        let truncated = false;
        let timedOut = false;

        // nosemgrep: javascript.lang.security.audit.spawn-shell-true.spawn-shell-true, javascript.lang.security.detect-child-process.detect-child-process
        const proc: ChildProcess = spawn(command, args, {
          cwd,
          env: {
            ...process.env,
            ...execOptions?.env,
            // Force non-interactive mode
            TERM: 'dumb',
            CI: 'true',
          },
          shell: true,
          windowsHide: true,
        });

        const timeoutId = setTimeout(() => {
          timedOut = true;
          proc.kill('SIGTERM');
          
          // Force kill after 5 seconds
          setTimeout(() => {
            if (!proc.killed) {
              proc.kill('SIGKILL');
            }
          }, 5000);
        }, effectiveTimeout);

        proc.stdout?.on('data', (data: Buffer) => {
          const chunk = data.toString('utf-8');
          if (stdout.length + chunk.length > maxOutputSize) {
            truncated = true;
            stdout += chunk.slice(0, maxOutputSize - stdout.length);
          } else {
            stdout += chunk;
          }
        });

        proc.stderr?.on('data', (data: Buffer) => {
          const chunk = data.toString('utf-8');
          if (stderr.length + chunk.length > maxOutputSize) {
            truncated = true;
            stderr += chunk.slice(0, maxOutputSize - stderr.length);
          } else {
            stderr += chunk;
          }
        });

        proc.on('error', (error: Error) => {
          clearTimeout(timeoutId);
          resolve({
            success: false,
            exitCode: 1,
            stdout: redactOutput(stdout, redactPatterns),
            stderr: redactOutput(error.message, redactPatterns),
            truncated,
            duration: Date.now() - startTime,
            command: fullCommand,
            timedOut: false,
          });
        });

        proc.on('close', (exitCode: number | null) => {
          clearTimeout(timeoutId);

          const duration = Date.now() - startTime;
          const success = exitCode === 0 && !timedOut;

          if (truncated) {
            logger.warn(`[BashTools] Output truncated for: ${fullCommand}`);
          }

          if (timedOut) {
            stderr += `\n[TIMEOUT after ${effectiveTimeout}ms]`;
          }

          resolve({
            success,
            exitCode,
            stdout: redactOutput(stdout, redactPatterns),
            stderr: redactOutput(stderr, redactPatterns),
            truncated,
            duration,
            command: fullCommand,
            timedOut,
          });
        });
      });
    },

    /**
     * Execute a command and stream output
     */
    executeStreaming(
      command: string,
      args: string[] = [],
      callbacks: {
        onStdout?: (data: string) => void;
        onStderr?: (data: string) => void;
        onComplete?: (result: BashResult) => void;
      },
      execOptions?: {
        cwd?: string;
        env?: Record<string, string>;
        timeout?: number;
      }
    ): ChildProcess {
      const fullCommand = args.length > 0 ? `${command} ${args.join(' ')}` : command;
      const check = isCommandAllowed(fullCommand, allowedCommandsSet, allowedPatterns, deniedCommands);

      if (!check.allowed) {
        const result: BashResult = {
          success: false,
          exitCode: 1,
          stdout: '',
          stderr: `Command denied: ${check.reason}`,
          truncated: false,
          duration: 0,
          command: fullCommand,
          timedOut: false,
        };
        callbacks.onComplete?.(result);
        throw new Error(`Command denied: ${check.reason}`);
      }

      let cwd = basePath;
      if (execOptions?.cwd) {
        const resolvedCwd = path.resolve(basePath, execOptions.cwd);
        cwd = resolvedCwd;
      }

      const startTime = Date.now();
      const effectiveTimeout = execOptions?.timeout ?? timeout;

      // nosemgrep: javascript.lang.security.audit.spawn-shell-true.spawn-shell-true, javascript.lang.security.detect-child-process.detect-child-process
      const proc: ChildProcess = spawn(command, args, {
        cwd,
        env: {
          ...process.env,
          ...execOptions?.env,
          TERM: 'dumb',
          CI: 'true',
        },
        shell: true,
        windowsHide: true,
      });

      let stdout = '';
      let stderr = '';
      const truncated = false;

      const timeoutId = setTimeout(() => {
        proc.kill('SIGTERM');
      }, effectiveTimeout);

      proc.stdout?.on('data', (data: Buffer) => {
        const chunk = data.toString('utf-8');
        const redacted = redactOutput(chunk, redactPatterns);
        stdout += redacted;
        callbacks.onStdout?.(redacted);
      });

      proc.stderr?.on('data', (data: Buffer) => {
        const chunk = data.toString('utf-8');
        const redacted = redactOutput(chunk, redactPatterns);
        stderr += redacted;
        callbacks.onStderr?.(redacted);
      });

      proc.on('close', (exitCode: number | null) => {
        clearTimeout(timeoutId);
        const result: BashResult = {
          success: exitCode === 0,
          exitCode,
          stdout,
          stderr,
          truncated,
          duration: Date.now() - startTime,
          command: fullCommand,
          timedOut: false,
        };
        callbacks.onComplete?.(result);
      });

      return proc;
    },

    /**
     * Add a command to the allowlist
     */
    allowCommand(command: string): void {
      allowedCommandsSet.add(command);
      logger.info(`[BashTools] Added command to allowlist: ${command}`);
    },

    /**
     * Add a pattern to the allowlist
     */
    allowPattern(pattern: RegExp): void {
      allowedPatterns.push(pattern);
      logger.info(`[BashTools] Added pattern to allowlist: ${pattern.source}`);
    },

    /**
     * Check if a command would be allowed
     */
    wouldAllow(command: string): { allowed: boolean; reason?: string } {
      return isCommandAllowed(command, allowedCommandsSet, allowedPatterns, deniedCommands);
    },
  };
}

export type BashTools = ReturnType<typeof createBashTools>;
