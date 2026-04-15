import * as path from 'path';
import * as fs from 'fs';

export interface GrepOptions {
  basePath: string;
  maxFiles?: number;
  maxFileSize?: number; // bytes
}

export function createGrepTool(options: GrepOptions) {
  const { basePath, maxFiles = 50, maxFileSize = 200 * 1024 } = options;

  function isSafeFile(file: string) {
    if (file.includes('\0')) return false;
    const resolved = path.resolve(basePath, file);
    const rel = path.relative(basePath, resolved);
    if (rel.startsWith('..') || path.isAbsolute(rel)) return false;
    try {
      const stat = fs.statSync(resolved);
      if (!stat.isFile()) return false;
      if (stat.size > maxFileSize) return false;
    } catch {
      return false;
    }
    return true;
  }

  return {
    async grep(pattern: string, files: string[]) {
      if (!pattern || typeof pattern !== 'string') {
        throw new Error('Invalid pattern');
      }

      const results: Array<{ file: string; matches: string[] }> = [];
      let filesSearched = 0;

      for (const f of files) {
        if (filesSearched >= maxFiles) break;
        if (!isSafeFile(f)) continue;
        const resolved = path.resolve(basePath, f);
        const content = fs.readFileSync(resolved, 'utf-8');
        const lines = content.split(/\r?\n/);
        const matches: string[] = [];
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(pattern)) {
            matches.push(`${i + 1}: ${lines[i]}`);
          }
        }
        if (matches.length > 0) {
          results.push({ file: f, matches });
        }
        filesSearched++;
      }

      return results;
    }
  };
}

export type GrepTool = ReturnType<typeof createGrepTool>;
