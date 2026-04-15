import * as fs from 'fs';
import * as path from 'path';
import { ToolCallRecord } from '../types/run';
import { redactText } from '../security/redaction';

export class AuditLogger {
  private logPath: string;

  constructor(runDir: string) {
    this.logPath = path.join(runDir, 'toolcalls.jsonl');
  }

  async log(record: ToolCallRecord): Promise<void> {
    const redactedRecord = redactText(JSON.stringify(record));
    const line = JSON.stringify(redactedRecord) + '\n';
    await fs.promises.appendFile(this.logPath, line, 'utf-8');
  }

  async readAll(): Promise<ToolCallRecord[]> {
    if (!fs.existsSync(this.logPath)) return [];
    const content = await fs.promises.readFile(this.logPath, 'utf-8');
    return content
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));
  }
}
