import * as fs from 'fs';
import * as path from 'path';
import { Database, ResearchRecord, ResearchFinding } from './types';

export class JsonDatabase implements Database {
  private dbPath: string;
  private data: Record<string, ResearchRecord> = {};

  constructor(storageDir: string = 'data') {
    // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
    this.dbPath = path.join(storageDir, 'research_db.json');
    this.ensureDbExists(storageDir);
    this.load();
  }

  private ensureDbExists(storageDir: string) {
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    if (!fs.existsSync(this.dbPath)) {
      fs.writeFileSync(this.dbPath, JSON.stringify({}, null, 2));
    }
  }

  private load() {
    try {
      const content = fs.readFileSync(this.dbPath, 'utf-8');
      this.data = JSON.parse(content);
    } catch (error) {
      console.error('Failed to load database:', error);
      this.data = {};
    }
  }

  private save() {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Failed to save database:', error);
    }
  }

  async saveResearch(record: ResearchRecord): Promise<void> {
    this.data[record.id] = record;
    this.save();
  }

  async getResearch(id: string): Promise<ResearchRecord | null> {
    if (!Object.prototype.hasOwnProperty.call(this.data, id)) {
      return null;
    }
    return this.data[id];
  }

  async getAllResearch(): Promise<ResearchRecord[]> {
    return Object.values(this.data);
  }

  private isValidResearchId(researchId: string): boolean {
    // Allow only alphanumeric characters, underscores, and dashes
    return /^[a-zA-Z0-9_-]+$/.test(researchId);
  }

  async addFinding(researchId: string, finding: ResearchFinding): Promise<void> {
    if (!this.isValidResearchId(researchId)) {
      throw new Error('Invalid researchId');
    }
    const record = this.data[researchId];
    if (record) {
      record.findings.push(finding);
      this.save();
    } else {
      throw new Error(`Research record ${researchId} not found`);
    }
  }

  async updateStatus(researchId: string, status: ResearchRecord['status']): Promise<void> {
    if (!this.isValidResearchId(researchId)) {
      throw new Error('Invalid researchId');
    }
    const record = this.data[researchId];
    if (record) {
      record.status = status;
      if (status === 'completed') {
        record.completedAt = new Date().toISOString();
      }
      this.save();
    } else {
      throw new Error(`Research record ${researchId} not found`);
    }
  }
}
