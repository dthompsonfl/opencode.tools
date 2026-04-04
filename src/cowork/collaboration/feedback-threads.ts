/**
 * Feedback Threads System
 * 
 * Provides threaded conversations on artifacts with severity levels,
 * status tracking, and event notifications.
 */

import { logger } from '../../runtime/logger';
import { EventBus } from '../orchestrator/event-bus';
import { randomUUID } from 'crypto';

export type FeedbackSeverity = 'nit' | 'blocking' | 'critical';
export type FeedbackStatus = 'pending' | 'addressed' | 'wontfix' | 'in_progress';

export interface FeedbackComment {
  id: string;
  threadId: string;
  author: string;
  content: string;
  timestamp: string;
  parentCommentId?: string;
}

export interface FeedbackThread {
  id: string;
  artifactId: string;
  author: string;
  title: string;
  initialComment: string;
  severity: FeedbackSeverity;
  status: FeedbackStatus;
  comments: FeedbackComment[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  location?: {
    file?: string;
    line?: number;
    column?: number;
  };
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface ThreadFilter {
  artifactId?: string;
  author?: string;
  severity?: FeedbackSeverity;
  status?: FeedbackStatus;
  tags?: string[];
}

export class FeedbackThreads {
  private static instance: FeedbackThreads;
  private threads: Map<string, FeedbackThread> = new Map();
  private artifactThreads: Map<string, Set<string>> = new Map();
  private eventBus: EventBus;

  private constructor() {
    this.eventBus = EventBus.getInstance();
  }

  public static getInstance(): FeedbackThreads {
    if (!FeedbackThreads.instance) {
      FeedbackThreads.instance = new FeedbackThreads();
    }
    return FeedbackThreads.instance;
  }

  /**
   * Create a new feedback thread
   */
  public createThread(
    artifactId: string,
    author: string,
    title: string,
    initialComment: string,
    severity: FeedbackSeverity,
    options?: {
      location?: { file?: string; line?: number; column?: number };
      tags?: string[];
      metadata?: Record<string, unknown>;
    }
  ): FeedbackThread {
    const threadId = `thread-${artifactId}-${randomUUID()}`;
    const now = new Date().toISOString();

    const comment: FeedbackComment = {
      id: `comment-${randomUUID()}`,
      threadId,
      author,
      content: initialComment,
      timestamp: now
    };

    const thread: FeedbackThread = {
      id: threadId,
      artifactId,
      author,
      title,
      initialComment,
      severity,
      status: 'pending',
      comments: [comment],
      createdAt: now,
      updatedAt: now,
      location: options?.location,
      tags: options?.tags,
      metadata: options?.metadata
    };

    this.threads.set(threadId, thread);

    // Index by artifact
    if (!this.artifactThreads.has(artifactId)) {
      this.artifactThreads.set(artifactId, new Set());
    }
    this.artifactThreads.get(artifactId)!.add(threadId);

    this.eventBus.publish('feedback:thread:created', thread);
    
    if (severity === 'critical') {
      this.eventBus.publish('feedback:critical', thread);
    } else if (severity === 'blocking') {
      this.eventBus.publish('feedback:blocking', thread);
    }

    logger.debug(`[FeedbackThreads] Created ${severity} thread on ${artifactId}: ${title}`);

    return thread;
  }

  /**
   * Add comment to existing thread
   */
  public addComment(
    threadId: string,
    author: string,
    content: string,
    parentCommentId?: string
  ): FeedbackComment | null {
    const thread = this.threads.get(threadId);
    if (!thread) {
      logger.warn(`[FeedbackThreads] Cannot add comment to non-existent thread: ${threadId}`);
      return null;
    }

    const comment: FeedbackComment = {
      id: `comment-${randomUUID()}`,
      threadId,
      author,
      content,
      timestamp: new Date().toISOString(),
      parentCommentId
    };

    thread.comments.push(comment);
    thread.updatedAt = comment.timestamp;

    this.eventBus.publish('feedback:comment:added', { thread, comment });
    logger.debug(`[FeedbackThreads] Added comment to thread ${threadId} by ${author}`);

    return comment;
  }

  /**
   * Update thread status
   */
  public updateStatus(
    threadId: string,
    newStatus: FeedbackStatus,
    updatedBy: string,
    reason?: string
  ): FeedbackThread | null {
    const thread = this.threads.get(threadId);
    if (!thread) {
      logger.warn(`[FeedbackThreads] Cannot update status of non-existent thread: ${threadId}`);
      return null;
    }

    const oldStatus = thread.status;
    thread.status = newStatus;
    thread.updatedAt = new Date().toISOString();

    if (newStatus === 'addressed') {
      thread.resolvedAt = thread.updatedAt;
      thread.resolvedBy = updatedBy;
    }

    this.eventBus.publish('feedback:status:changed', {
      thread,
      oldStatus,
      newStatus,
      updatedBy,
      reason
    });

    if (newStatus === 'addressed') {
      this.eventBus.publish('feedback:thread:resolved', thread);
    }

    logger.debug(`[FeedbackThreads] Thread ${threadId} status changed from ${oldStatus} to ${newStatus}`);

    return thread;
  }

  /**
   * Update thread severity
   */
  public updateSeverity(
    threadId: string,
    newSeverity: FeedbackSeverity,
    updatedBy: string,
    reason?: string
  ): FeedbackThread | null {
    const thread = this.threads.get(threadId);
    if (!thread) {
      logger.warn(`[FeedbackThreads] Cannot update severity of non-existent thread: ${threadId}`);
      return null;
    }

    const oldSeverity = thread.severity;
    thread.severity = newSeverity;
    thread.updatedAt = new Date().toISOString();

    this.eventBus.publish('feedback:severity:changed', {
      thread,
      oldSeverity,
      newSeverity,
      updatedBy,
      reason
    });

    if (newSeverity === 'critical' && oldSeverity !== 'critical') {
      this.eventBus.publish('feedback:escalated', thread);
    }

    logger.debug(`[FeedbackThreads] Thread ${threadId} severity changed from ${oldSeverity} to ${newSeverity}`);

    return thread;
  }

  /**
   * Get thread by ID
   */
  public getThread(threadId: string): FeedbackThread | undefined {
    return this.threads.get(threadId);
  }

  /**
   * Get all threads for an artifact
   */
  public getThreadsForArtifact(artifactId: string): FeedbackThread[] {
    const threadIds = this.artifactThreads.get(artifactId);
    if (!threadIds) return [];

    return Array.from(threadIds)
      .map(id => this.threads.get(id))
      .filter((t): t is FeedbackThread => t !== undefined);
  }

  /**
   * Get all threads
   */
  public getAllThreads(): FeedbackThread[] {
    return Array.from(this.threads.values());
  }

  /**
   * Filter threads
   */
  public filterThreads(filter: ThreadFilter): FeedbackThread[] {
    return this.getAllThreads().filter(thread => {
      if (filter.artifactId && thread.artifactId !== filter.artifactId) return false;
      if (filter.author && thread.author !== filter.author) return false;
      if (filter.severity && thread.severity !== filter.severity) return false;
      if (filter.status && thread.status !== filter.status) return false;
      if (filter.tags && !filter.tags.some(tag => thread.tags?.includes(tag))) return false;
      return true;
    });
  }

  /**
   * Get summary statistics
   */
  public getSummary(): {
    total: number;
    bySeverity: Record<FeedbackSeverity, number>;
    byStatus: Record<FeedbackStatus, number>;
    criticalOpen: number;
    blockingOpen: number;
  } {
    const threads = this.getAllThreads();
    const bySeverity: Record<FeedbackSeverity, number> = { nit: 0, blocking: 0, critical: 0 };
    const byStatus: Record<FeedbackStatus, number> = { pending: 0, addressed: 0, wontfix: 0, 'in_progress': 0 };

    for (const thread of threads) {
      bySeverity[thread.severity]++;
      byStatus[thread.status]++;
    }

    return {
      total: threads.length,
      bySeverity,
      byStatus,
      criticalOpen: threads.filter(t => t.severity === 'critical' && t.status !== 'addressed').length,
      blockingOpen: threads.filter(t => t.severity === 'blocking' && t.status !== 'addressed').length
    };
  }

  /**
   * Check if artifact has blocking or critical feedback
   */
  public hasBlockingFeedback(artifactId: string): boolean {
    const threads = this.getThreadsForArtifact(artifactId);
    return threads.some(t => 
      (t.severity === 'blocking' || t.severity === 'critical') && 
      t.status !== 'addressed' && 
      t.status !== 'wontfix'
    );
  }

  /**
   * Get blocking threads for artifact
   */
  public getBlockingThreads(artifactId: string): FeedbackThread[] {
    return this.getThreadsForArtifact(artifactId).filter(t =>
      (t.severity === 'blocking' || t.severity === 'critical') &&
      t.status !== 'addressed' &&
      t.status !== 'wontfix'
    );
  }

  /**
   * Delete thread
   */
  public deleteThread(threadId: string, deletedBy: string, reason?: string): boolean {
    const thread = this.threads.get(threadId);
    if (!thread) return false;

    this.threads.delete(threadId);

    const artifactThreads = this.artifactThreads.get(thread.artifactId);
    if (artifactThreads) {
      artifactThreads.delete(threadId);
      if (artifactThreads.size === 0) {
        this.artifactThreads.delete(thread.artifactId);
      }
    }

    this.eventBus.publish('feedback:thread:deleted', {
      threadId,
      artifactId: thread.artifactId,
      deletedBy,
      reason,
      timestamp: new Date().toISOString()
    });

    logger.info(`[FeedbackThreads] Deleted thread ${threadId} by ${deletedBy}`);

    return true;
  }

  /**
   * Add tag to thread
   */
  public addTag(threadId: string, tag: string): FeedbackThread | null {
    const thread = this.threads.get(threadId);
    if (!thread) return null;

    if (!thread.tags) {
      thread.tags = [];
    }

    if (!thread.tags.includes(tag)) {
      thread.tags.push(tag);
      thread.updatedAt = new Date().toISOString();
      this.eventBus.publish('feedback:tag:added', { threadId, tag });
    }

    return thread;
  }

  /**
   * Remove tag from thread
   */
  public removeTag(threadId: string, tag: string): FeedbackThread | null {
    const thread = this.threads.get(threadId);
    if (!thread || !thread.tags) return null;

    const index = thread.tags.indexOf(tag);
    if (index > -1) {
      thread.tags.splice(index, 1);
      thread.updatedAt = new Date().toISOString();
      this.eventBus.publish('feedback:tag:removed', { threadId, tag });
    }

    return thread;
  }

  /**
   * Get threads by tag
   */
  public getThreadsByTag(tag: string): FeedbackThread[] {
    return this.getAllThreads().filter(t => t.tags?.includes(tag));
  }

  /**
   * Restore persisted thread state without emitting events.
   */
  public restoreThread(thread: FeedbackThread): void {
    this.threads.set(thread.id, thread);

    if (!this.artifactThreads.has(thread.artifactId)) {
      this.artifactThreads.set(thread.artifactId, new Set());
    }
    this.artifactThreads.get(thread.artifactId)?.add(thread.id);
  }

  /**
   * Clear all threads (use with caution - mainly for testing)
   */
  public clear(): void {
    this.threads.clear();
    this.artifactThreads.clear();
    logger.warn('[FeedbackThreads] All threads cleared');
  }

  /**
   * Export threads to JSON
   */
  public exportThreads(artifactId?: string): string {
    const threads = artifactId 
      ? this.getThreadsForArtifact(artifactId)
      : this.getAllThreads();

    return JSON.stringify({
      exportDate: new Date().toISOString(),
      artifactId,
      threads,
      summary: this.getSummary()
    }, null, 2);
  }

  /**
   * Import threads from JSON
   */
  public importThreads(json: string): { imported: number; errors: string[] } {
    const errors: string[] = [];
    let imported = 0;

    try {
      const data = JSON.parse(json);
      
      if (!Array.isArray(data.threads)) {
        errors.push('Invalid format: threads array not found');
        return { imported, errors };
      }

      for (const threadData of data.threads) {
        try {
          const thread: FeedbackThread = {
            ...threadData,
            comments: threadData.comments || []
          };

          this.threads.set(thread.id, thread);

          if (!this.artifactThreads.has(thread.artifactId)) {
            this.artifactThreads.set(thread.artifactId, new Set());
          }
          this.artifactThreads.get(thread.artifactId)!.add(thread.id);

          imported++;
        } catch (err) {
          errors.push(`Failed to import thread: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    } catch (err) {
      errors.push(`Failed to parse JSON: ${err instanceof Error ? err.message : String(err)}`);
    }

    logger.info(`[FeedbackThreads] Imported ${imported} threads with ${errors.length} errors`);

    return { imported, errors };
  }
}

export default FeedbackThreads;
