/**
 * Edit Tools for Cowork Runtime
 *
 * Patch application with:
 * - Targeted string replacement
 * - Unified diff support
 * - Validation + rollback on failure
 * - Backup creation
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../../../runtime/logger';

export interface EditToolOptions {
  basePath: string;
  createBackup?: boolean;
  maxFileSize?: number;
}

export interface StringReplaceEdit {
  type: 'string_replace';
  path: string;
  oldString: string;
  newString: string;
  replaceAll?: boolean;
}

export interface LineEdit {
  type: 'line_edit';
  path: string;
  startLine: number;
  endLine?: number;
  newContent: string;
}

export interface AppendEdit {
  type: 'append';
  path: string;
  content: string;
}

export type EditOperation = StringReplaceEdit | LineEdit | AppendEdit;

export interface EditResult {
  success: boolean;
  path: string;
  operationsApplied: number;
  backupPath?: string;
  error?: string;
}

export interface DiffResult {
  success: boolean;
  path: string;
  hunksApplied: number;
  hunksRejected: number;
  conflicts: string[];
  backupPath?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const BACKUP_SUFFIX = '.bak-cowork';

/**
 * Validate path within base boundary
 */
function validatePath(filePath: string, basePath: string): string {
  if (filePath.includes('\0')) {
    throw new Error('Invalid path: null-byte is not allowed');
  }

  const resolvedPath = path.resolve(basePath, filePath);
  const relative = path.relative(basePath, resolvedPath);
  const escapesBase = relative.startsWith('..') || path.isAbsolute(relative);

  if (escapesBase) {
    throw new Error(`Path "${filePath}" escapes configured filesystem boundary`);
  }

  return resolvedPath;
}

/**
 * Create backup of file
 */
function createBackup(filePath: string): string {
  const backupPath = `${filePath}${BACKUP_SUFFIX}-${Date.now()}`;
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

/**
 * Restore from backup
 */
function restoreBackup(backupPath: string, originalPath: string): void {
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, originalPath);
    fs.unlinkSync(backupPath);
  }
}

/**
 * Create EditTool instance
 */
export function createEditTools(options: EditToolOptions) {
  const { basePath, maxFileSize = MAX_FILE_SIZE } = options;
  const shouldCreateBackup = options.createBackup ?? true;

  return {
    /**
     * Apply a single edit operation to a file
     */
    async applyEdit(edit: EditOperation): Promise<EditResult> {
      let resolvedPath: string = '';
      let backupPath: string | undefined;

      try {
        resolvedPath = validatePath(edit.path, basePath);

        // Check file exists for non-append operations
        const exists = fs.existsSync(resolvedPath);
        if (!exists && edit.type !== 'append') {
          throw new Error(`File does not exist: ${edit.path}`);
        }

        // Check file size
        if (exists) {
          const stat = fs.statSync(resolvedPath);
          if (stat.size > maxFileSize) {
            throw new Error(`File too large (${stat.size} bytes, max ${maxFileSize})`);
          }
        }

        // Create backup
        if (shouldCreateBackup && exists) {
          backupPath = createBackup(resolvedPath);
        }

        let content = exists ? fs.readFileSync(resolvedPath, 'utf-8') : '';
        let operationsApplied = 0;

        switch (edit.type) {
          case 'string_replace':
            if (!edit.oldString) {
              throw new Error('oldString is required for string_replace');
            }

            if (edit.replaceAll) {
              const count = (content.match(new RegExp(escapeRegex(edit.oldString), 'g')) || []).length;
              content = content.split(edit.oldString).join(edit.newString);
              operationsApplied = count;
            } else {
              if (!content.includes(edit.oldString)) {
                throw new Error('oldString not found in file');
              }
              if (content.indexOf(edit.oldString) !== content.lastIndexOf(edit.oldString)) {
                throw new Error('oldString found multiple times; use replaceAll=true or be more specific');
              }
              content = content.replace(edit.oldString, edit.newString);
              operationsApplied = 1;
            }
            break;

          case 'line_edit': {
            const lines = content.split('\n');
            const startLine = edit.startLine - 1; // Convert to 0-indexed
            const endLine = edit.endLine ? edit.endLine - 1 : startLine;

            if (startLine < 0 || startLine >= lines.length) {
              throw new Error(`Invalid startLine: ${edit.startLine}`);
            }
            if (endLine < startLine || endLine >= lines.length) {
              throw new Error(`Invalid endLine: ${edit.endLine || edit.startLine}`);
            }

            const newLines = edit.newContent.split('\n');
            lines.splice(startLine, endLine - startLine + 1, ...newLines);
            content = lines.join('\n');
            operationsApplied = 1;
            break;
          }

          case 'append':
            if (!content.endsWith('\n') && content.length > 0) {
              content += '\n';
            }
            content += edit.content;
            operationsApplied = 1;
            break;
        }

        // Write result
        const parentDir = path.dirname(resolvedPath);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }
        fs.writeFileSync(resolvedPath, content, 'utf-8');

        logger.info(`[EditTools] Applied ${edit.type} to ${edit.path}`);

        return {
          success: true,
          path: resolvedPath,
          operationsApplied,
          backupPath,
        };
      } catch (error) {
        // Restore from backup on failure
        if (backupPath && resolvedPath) {
          try {
            restoreBackup(backupPath, resolvedPath);
          } catch (restoreError) {
            logger.error('[EditTools] Failed to restore backup:', restoreError);
          }
        }

        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`[EditTools] Edit failed: ${errorMessage}`);

        return {
          success: false,
          path: edit.path,
          operationsApplied: 0,
          backupPath,
          error: errorMessage,
        };
      }
    },

    /**
     * Apply multiple edits as a transaction (all or nothing)
     */
    async applyEdits(edits: EditOperation[]): Promise<EditResult[]> {
      const results: EditResult[] = [];
      const backups: Map<string, string> = new Map();

      try {
        // Apply all edits
        for (const edit of edits) {
          const result = await this.applyEdit(edit);
          results.push(result);

          if (!result.success) {
            throw new Error(`Edit failed: ${result.error}`);
          }

          if (result.backupPath) {
            backups.set(edit.path, result.backupPath);
          }
        }

        return results;
      } catch (error) {
        // Rollback all changes
        logger.warn('[EditTools] Rolling back all edits due to failure');

        for (const [originalPath, backupPath] of backups) {
          try {
            const resolvedPath = validatePath(originalPath, basePath);
            restoreBackup(backupPath, resolvedPath);
          } catch (restoreError) {
            logger.error(`[EditTools] Failed to restore ${originalPath}:`, restoreError);
          }
        }

        throw error;
      }
    },

    /**
     * Apply a unified diff patch
     */
    async applyDiff(filePath: string, diffContent: string): Promise<DiffResult> {
      const resolvedPath = validatePath(filePath, basePath);
      let backupPath: string | undefined;

      try {
        if (!fs.existsSync(resolvedPath)) {
          throw new Error(`File does not exist: ${filePath}`);
        }

        // Create backup
        if (shouldCreateBackup) {
          backupPath = createBackup(resolvedPath);
        }

        const originalContent = fs.readFileSync(resolvedPath, 'utf-8');
        const result = applyUnifiedDiff(originalContent, diffContent);

        if (result.conflicts.length > 0) {
          // Restore backup on conflicts
          if (backupPath) {
            restoreBackup(backupPath, resolvedPath);
          }
          return {
            success: false,
            path: resolvedPath,
            hunksApplied: result.hunksApplied,
            hunksRejected: result.hunksRejected,
            conflicts: result.conflicts,
            backupPath,
          };
        }

        fs.writeFileSync(resolvedPath, result.content, 'utf-8');

        logger.info(`[EditTools] Applied diff to ${filePath}: ${result.hunksApplied} hunks`);

        return {
          success: true,
          path: resolvedPath,
          hunksApplied: result.hunksApplied,
          hunksRejected: result.hunksRejected,
          conflicts: [],
          backupPath,
        };
      } catch (error) {
        if (backupPath) {
          restoreBackup(backupPath, resolvedPath);
        }

        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          path: resolvedPath,
          hunksApplied: 0,
          hunksRejected: 1,
          conflicts: [errorMessage],
          backupPath,
        };
      }
    },
  };
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Simple unified diff parser and applier
 */
function applyUnifiedDiff(
  original: string,
  diff: string
): { content: string; hunksApplied: number; hunksRejected: number; conflicts: string[] } {
  const lines = original.split('\n');
  const diffLines = diff.split('\n');
  const conflicts: string[] = [];
  let hunksApplied = 0;
  let hunksRejected = 0;

  let i = 0;
  while (i < diffLines.length) {
    const line = diffLines[i];

    // Look for hunk header @@ -a,b +c,d @@
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
      if (!match) {
        i++;
        continue;
      }

      const oldStart = parseInt(match[1], 10) - 1; // Convert to 0-indexed
      const newStart = parseInt(match[2], 10) - 1;

      i++;

      const additions: string[] = [];
      const removals: Set<number> = new Set();
      let currentOldLine = oldStart;

      // Parse hunk
      while (i < diffLines.length && !diffLines[i].startsWith('@@')) {
        const diffLine = diffLines[i];

        if (diffLine.startsWith('-')) {
          // Removal - verify the line matches
          const expectedLine = diffLine.slice(1);
          if (lines[currentOldLine]?.trim() === expectedLine.trim()) {
            removals.add(currentOldLine);
          } else {
            conflicts.push(`Line ${currentOldLine + 1} mismatch: expected "${expectedLine}" found "${lines[currentOldLine]}"`);
          }
          currentOldLine++;
        } else if (diffLine.startsWith('+')) {
          additions.push(diffLine.slice(1));
        } else if (diffLine.startsWith(' ')) {
          currentOldLine++;
        }

        i++;
      }

      if (conflicts.length === 0) {
        // Apply the hunk
        const offset = additions.length - removals.size;

        // Remove lines (in reverse order to maintain indices)
        const removalArray = Array.from(removals).sort((a, b) => b - a);
        for (const lineIdx of removalArray) {
          lines.splice(lineIdx, 1);
        }

        // Insert additions at the appropriate position
        const insertPos = oldStart;
        lines.splice(insertPos, 0, ...additions);

        hunksApplied++;
      } else {
        hunksRejected++;
      }
    } else {
      i++;
    }
  }

  return {
    content: lines.join('\n'),
    hunksApplied,
    hunksRejected,
    conflicts,
  };
}

export type EditTools = ReturnType<typeof createEditTools>;
