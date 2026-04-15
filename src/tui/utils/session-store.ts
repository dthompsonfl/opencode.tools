/**
 * Session Store
 *
 * Persistent storage for TUI sessions.
 * Uses XDG data directory to avoid conflicts with OpenCode tool definitions.
 * 
 * Storage location: ~/.local/share/opencode/opencode-tools/sessions/
 * Index file: ~/.local/share/opencode/opencode-tools/session-index.json
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Session } from '../types';

// XDG data directory for session storage (NOT ~/.config/opencode/tools/)
const XDG_DATA_HOME = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
const DATA_DIR = path.join(XDG_DATA_HOME, 'opencode', 'opencode-tools');
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');
const INDEX_FILE = path.join(DATA_DIR, 'session-index.json');

export interface SessionIndexItem {
  id: string;
  name: string;
  agentId: string;
  status: Session['status'];
  createdAt: number;
  updatedAt: number;
}

export class SessionStore {
  constructor() {
    this.ensureDirectory();
  }

  private ensureDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(SESSIONS_DIR)) {
      fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    }
  }

  public getIndex(): SessionIndexItem[] {
    try {
      if (fs.existsSync(INDEX_FILE)) {
        return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
      }
    } catch (err) {
      console.error('Failed to read session index', err);
    }
    return [];
  }

  private saveIndex(index: SessionIndexItem[]) {
    try {
      fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
    } catch (err) {
      console.error('Failed to save session index', err);
    }
  }

  public loadSession(id: string): Session | null {
    try {
      const sessionPath = path.join(SESSIONS_DIR, `${id}.json`);
      if (fs.existsSync(sessionPath)) {
        return JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
      }
    } catch (err) {
      console.error(`Failed to load session ${id}`, err);
    }
    return null;
  }

  public saveSession(session: Session) {
    try {
      // Save session file
      const sessionPath = path.join(SESSIONS_DIR, `${session.id}.json`);
      fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2));

      // Update index
      const index = this.getIndex();
      const existingIndex = index.findIndex(i => i.id === session.id);
      const indexItem: SessionIndexItem = {
        id: session.id,
        name: session.name,
        agentId: session.agentId,
        status: session.status,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      };

      if (existingIndex >= 0) {
        index[existingIndex] = indexItem;
      } else {
        index.unshift(indexItem);
      }
      this.saveIndex(index);
    } catch (err) {
      console.error(`Failed to save session ${session.id}`, err);
    }
  }

  public deleteSession(id: string) {
    try {
      const sessionPath = path.join(SESSIONS_DIR, `${id}.json`);
      if (fs.existsSync(sessionPath)) {
        fs.unlinkSync(sessionPath);
      }

      const index = this.getIndex();
      this.saveIndex(index.filter(i => i.id !== id));
    } catch (err) {
      console.error(`Failed to delete session ${id}`, err);
    }
  }
}

export const sessionStore = new SessionStore();
