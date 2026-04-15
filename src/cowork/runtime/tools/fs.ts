/**
 * Filesystem Tools for Cowork Runtime
 *
 * Safe read/write/list helpers with:
 * - Atomic writes with temp file + rename
 * - Base path boundary enforcement
 * - Path traversal prevention
 * - Output size limits and truncation
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../../runtime/logger';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_OUTPUT_SIZE = 500 * 1024; // 500KB truncated output
const TEMP_FILE_PREFIX = '.tmp-cowork-';

export interface FsToolOptions {
  basePath: string;
  maxFileSize?: number;
  maxOutputSize?: number;
}

export interface FsReadResult {
  content: string;
  path: string;
  size: number;
  truncated: boolean;
}

export interface FsWriteResult {
  success: boolean;
  path: string;
  bytesWritten: number;
  created: boolean;
}

export interface FsListResult {
  entries: Array<{
    name: string;
    isDirectory: boolean;
    isFile: boolean;
    size?: number;
    modified?: Date;
  }>;
  path: string;
}

export interface FsDeleteResult {
  success: boolean;
  path: string;
  wasDirectory: boolean;
}

/**
 * Validate and resolve a path within the base path boundary
 */
function resolveAndValidate(userPath: unknown, basePath: string, mustExist = false): string {
  if (typeof userPath !== 'string' || userPath.trim() === '') {
    throw new Error('Path must be a non-empty string');
  }

  // Null byte check
  if (userPath.includes('\0')) {
    throw new Error('Invalid path: null-byte is not allowed');
  }

  // Resolve to absolute path
  const resolvedPath = path.resolve(basePath, userPath);

  // Check if path escapes base directory
  const relative = path.relative(basePath, resolvedPath);
  const escapesBase = relative.startsWith('..') || path.isAbsolute(relative);

  if (escapesBase) {
    throw new Error(`Path "${userPath}" escapes configured filesystem boundary`);
  }

  // Check existence if required
  if (mustExist) {
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Path does not exist: ${userPath}`);
    }
  }

  return resolvedPath;
}

/**
 * Create FsTool instance
 */
export function createFsTools(options: FsToolOptions) {
  const { basePath, maxFileSize = MAX_FILE_SIZE, maxOutputSize = MAX_OUTPUT_SIZE } = options;

  // Ensure base path exists
  if (!fs.existsSync(basePath)) {
    throw new Error(`Base path does not exist: ${basePath}`);
  }

  return {
    /**
     * Read file contents with truncation
     */
    async read(filePath: unknown): Promise<FsReadResult> {
      const resolvedPath = resolveAndValidate(filePath, basePath, true);

      const stat = fs.statSync(resolvedPath);
      if (!stat.isFile()) {
        throw new Error(`Path is not a file: ${filePath}`);
      }

      if (stat.size > maxFileSize) {
        throw new Error(`File too large (${stat.size} bytes, max ${maxFileSize})`);
      }

      const content = fs.readFileSync(resolvedPath, 'utf-8');
      const truncated = content.length > maxOutputSize;
      const truncatedContent = truncated
        ? content.slice(0, maxOutputSize) + '\n...[TRUNCATED]'
        : content;

      if (truncated) {
        logger.warn(`[FsTools] File content truncated: ${filePath}`);
      }

      return {
        content: truncatedContent,
        path: resolvedPath,
        size: stat.size,
        truncated,
      };
    },

    /**
     * Write file with atomic write (temp file + rename)
     */
    async write(filePath: unknown, content: unknown): Promise<FsWriteResult> {
      const resolvedPath = resolveAndValidate(filePath, basePath, false);

      if (typeof content !== 'string') {
        throw new Error('Content must be a string');
      }

      if (content.length > maxFileSize) {
        throw new Error(`Content too large (${content.length} bytes, max ${maxFileSize})`);
      }

      // Ensure parent directory exists
      const parentDir = path.dirname(resolvedPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      const existed = fs.existsSync(resolvedPath);

      // Atomic write: write to temp file, then rename
      const tempPath = path.join(parentDir, `${TEMP_FILE_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`);

      try {
        fs.writeFileSync(tempPath, content, 'utf-8');
        fs.renameSync(tempPath, resolvedPath);
      } catch (error) {
        // Cleanup temp file on failure
        try {
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
          }
        } catch {
          // Ignore cleanup errors
        }
        throw error;
      }

      logger.info(`[FsTools] Wrote ${content.length} bytes to ${filePath}`);

      return {
        success: true,
        path: resolvedPath,
        bytesWritten: Buffer.byteLength(content, 'utf-8'),
        created: !existed,
      };
    },

    /**
     * List directory contents
     */
    async list(dirPath: unknown): Promise<FsListResult> {
      const resolvedPath = resolveAndValidate(dirPath, basePath, true);

      const stat = fs.statSync(resolvedPath);
      if (!stat.isDirectory()) {
        throw new Error(`Path is not a directory: ${dirPath}`);
      }

      const entries = fs.readdirSync(resolvedPath, { withFileTypes: true });

      const result = entries.map((entry) => {
        const entryStat = fs.statSync(path.join(resolvedPath, entry.name));
        return {
          name: entry.name,
          isDirectory: entry.isDirectory(),
          isFile: entry.isFile(),
          size: entry.isFile() ? entryStat.size : undefined,
          modified: entryStat.mtime,
        };
      });

      return {
        entries: result,
        path: resolvedPath,
      };
    },

    /**
     * Delete file or directory
     */
    async delete(targetPath: unknown): Promise<FsDeleteResult> {
      const resolvedPath = resolveAndValidate(targetPath, basePath, true);

      const stat = fs.statSync(resolvedPath);
      const isDirectory = stat.isDirectory();

      if (isDirectory) {
        fs.rmSync(resolvedPath, { recursive: true });
      } else {
        fs.unlinkSync(resolvedPath);
      }

      logger.info(`[FsTools] Deleted ${isDirectory ? 'directory' : 'file'}: ${targetPath}`);

      return {
        success: true,
        path: resolvedPath,
        wasDirectory: isDirectory,
      };
    },

    /**
     * Check if path exists
     */
    async exists(targetPath: unknown): Promise<boolean> {
      try {
        const resolvedPath = resolveAndValidate(targetPath, basePath, false);
        return fs.existsSync(resolvedPath);
      } catch {
        return false;
      }
    },

    /**
     * Get file/directory stats
     */
    async stat(targetPath: unknown): Promise<{
      exists: boolean;
      isFile: boolean;
      isDirectory: boolean;
      size: number;
      created: Date;
      modified: Date;
    }> {
      const resolvedPath = resolveAndValidate(targetPath, basePath, false);

      if (!fs.existsSync(resolvedPath)) {
        return {
          exists: false,
          isFile: false,
          isDirectory: false,
          size: 0,
          created: new Date(0),
          modified: new Date(0),
        };
      }

      const stat = fs.statSync(resolvedPath);
      return {
        exists: true,
        isFile: stat.isFile(),
        isDirectory: stat.isDirectory(),
        size: stat.size,
        created: stat.birthtime,
        modified: stat.mtime,
      };
    },
  };
}

export type FsTools = ReturnType<typeof createFsTools>;
