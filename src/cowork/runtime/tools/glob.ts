import * as path from 'path';
import * as fs from 'fs';

export interface GlobOptions {
  basePath: string;
  include?: string[]; // simple suffix-based includes
  exclude?: string[];
  maxResults?: number;
}

export function createGlobTool(options: GlobOptions) {
  const { basePath, include = ['**/*'], exclude = [], maxResults = 100 } = options;

  function isPathSafe(p: string) {
    if (p.includes('\0')) return false;
    const resolved = path.resolve(basePath, p);
    const rel = path.relative(basePath, resolved);
    if (rel.startsWith('..') || path.isAbsolute(rel)) return false;
    return true;
  }

  function walk(dir: string, acc: string[]) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      const rel = path.relative(basePath, full);
      if (exclude.some(e => rel.includes(e))) continue;
      if (entry.isDirectory()) {
        walk(full, acc);
      } else {
        acc.push(rel.replace(/\\/g, '/'));
        if (acc.length >= maxResults) return;
      }
      if (acc.length >= maxResults) return;
    }
  }

  return {
    async glob(patterns?: string[]) {
      if (!basePath || !fs.existsSync(basePath)) {
        throw new Error('Base path for glob does not exist');
      }

      const results: string[] = [];
      walk(basePath, results);

      // simple include filter: if patterns provided, filter by substring
      let filtered = results;
      if (patterns && patterns.length > 0) {
        filtered = results.filter(r => patterns.some(p => r.includes(p)));
      }

      return filtered.slice(0, maxResults);
    },
  };
}

export type GlobTool = ReturnType<typeof createGlobTool>;
