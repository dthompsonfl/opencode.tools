import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export class ToolCache {
  private cacheDir: string;

  constructor(runDir: string) {
    // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
    this.cacheDir = path.join(runDir, 'cache');
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  getCacheKey(toolId: string, args: any, version: string): string {
    const hash = crypto.createHash('sha256')
      .update(toolId)
      .update(JSON.stringify(args))
      .update(version)
      .digest('hex');
    return hash;
  }

  async get(key: string): Promise<any | null> {
    // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
    const cachePath = path.join(this.cacheDir, `${key}.json`);
    if (fs.existsSync(cachePath)) {
      const content = await fs.promises.readFile(cachePath, 'utf-8');
      return JSON.parse(content);
    }
    return null;
  }

  async set(key: string, value: any): Promise<void> {
    // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
    const cachePath = path.join(this.cacheDir, `${key}.json`);
    await fs.promises.writeFile(cachePath, JSON.stringify(value, null, 2));
  }
}
