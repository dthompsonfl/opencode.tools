import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { ArtifactRecord } from '../types/run';
import { redactText } from '../security/redaction';

export class ArtifactManager {
  private runDir: string;
  private artifactsDir: string;

  constructor(runDir: string) {
    this.runDir = runDir;
    this.artifactsDir = path.join(runDir, 'artifacts');
    if (!fs.existsSync(this.artifactsDir)) {
      fs.mkdirSync(this.artifactsDir, { recursive: true });
    }
  }

  async store(
    relativePath: string,
    content: string | Buffer,
    type: string,
    metadata: Record<string, any> = {}
  ): Promise<ArtifactRecord> {
    const fullPath = path.join(this.artifactsDir, relativePath);
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }

    // Redact content if it's text
    let contentToWrite = content;
    if (typeof content === 'string') {
      contentToWrite = redactText(content);
    } else if (Buffer.isBuffer(content) && type.startsWith('text/')) {
       contentToWrite = Buffer.from(redactText(content.toString('utf-8')));
    }

    await fs.promises.writeFile(fullPath, contentToWrite);

    const hash = crypto.createHash('sha256').update(contentToWrite).digest('hex');
    
    const record: ArtifactRecord = {
      id: crypto.randomUUID(),
      path: path.relative(this.runDir, fullPath),
      type,
      hash,
      createdAt: new Date().toISOString(),
      metadata
    };

    return record;
  }

  async get(relativePath: string): Promise<Buffer> {
    const fullPath = path.join(this.artifactsDir, relativePath);
    return await fs.promises.readFile(fullPath);
  }

  exists(relativePath: string): boolean {
    const fullPath = path.join(this.artifactsDir, relativePath);
    return fs.existsSync(fullPath);
  }
}
