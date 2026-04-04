import { FeedbackThreads, FeedbackThread, FeedbackSeverity, FeedbackStatus } from '../../../../src/cowork/collaboration/feedback-threads';
import { EventBus } from '../../../../src/cowork/orchestrator/event-bus';

describe('FeedbackThreads', () => {
  let feedback: FeedbackThreads;
  let eventBus: EventBus;

  beforeEach(() => {
    feedback = FeedbackThreads.getInstance();
    feedback.clear();
    eventBus = EventBus.getInstance();
    jest.clearAllMocks();
  });

  describe('createThread', () => {
    it('should create a new feedback thread', () => {
      const thread = feedback.createThread(
        'artifact-1',
        'reviewer-1',
        'Code quality issue',
        'This function is too long',
        'nit'
      );

      expect(thread).toBeDefined();
      expect(thread.artifactId).toBe('artifact-1');
      expect(thread.author).toBe('reviewer-1');
      expect(thread.title).toBe('Code quality issue');
      expect(thread.initialComment).toBe('This function is too long');
      expect(thread.severity).toBe('nit');
      expect(thread.status).toBe('pending');
      expect(thread.comments).toHaveLength(1);
    });

    it('should emit feedback:thread:created event', () => {
      const publishSpy = jest.spyOn(eventBus, 'publish');

      feedback.createThread('artifact-1', 'reviewer', 'Title', 'Content', 'blocking');

      expect(publishSpy).toHaveBeenCalledWith(
        'feedback:thread:created',
        expect.objectContaining({
          artifactId: 'artifact-1',
          severity: 'blocking'
        })
      );
    });

    it('should emit critical feedback event for critical severity', () => {
      const publishSpy = jest.spyOn(eventBus, 'publish');

      feedback.createThread('artifact-1', 'reviewer', 'Critical Issue', 'Security vulnerability', 'critical');

      expect(publishSpy).toHaveBeenCalledWith('feedback:critical', expect.anything());
    });

    it('should support optional location and tags', () => {
      const thread = feedback.createThread(
        'artifact-1',
        'reviewer-1',
        'Type error',
        'Invalid type annotation',
        'blocking',
        {
          location: { file: 'src/main.ts', line: 42, column: 5 },
          tags: ['type-safety', 'typescript'],
          metadata: { severityScore: 8 }
        }
      );

      expect(thread.location).toEqual({ file: 'src/main.ts', line: 42, column: 5 });
      expect(thread.tags).toContain('type-safety');
      expect(thread.tags).toContain('typescript');
      expect(thread.metadata).toEqual({ severityScore: 8 });
    });
  });

  describe('addComment', () => {
    it('should add comment to existing thread', () => {
      const thread = feedback.createThread('artifact-1', 'reviewer', 'Title', 'Content', 'nit');
      
      const comment = feedback.addComment(thread.id, 'author-2', 'I disagree with this');

      expect(comment).toBeDefined();
      expect(comment?.content).toBe('I disagree with this');
      expect(comment?.author).toBe('author-2');
      expect(comment?.parentCommentId).toBeUndefined();
      
      const updatedThread = feedback.getThread(thread.id);
      expect(updatedThread?.comments).toHaveLength(2);
    });

    it('should support threaded comments with parentCommentId', () => {
      const thread = feedback.createThread('artifact-1', 'reviewer', 'Title', 'Content', 'nit');
      const firstComment = thread.comments[0];
      
      const reply = feedback.addComment(
        thread.id,
        'author-2',
        'Reply to first comment',
        firstComment.id
      );

      expect(reply?.parentCommentId).toBe(firstComment.id);
    });

    it('should return null for non-existent thread', () => {
      const result = feedback.addComment('non-existent', 'author', 'Comment');
      expect(result).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should update thread status', () => {
      const thread = feedback.createThread('artifact-1', 'reviewer', 'Title', 'Content', 'blocking');
      
      const updated = feedback.updateStatus(thread.id, 'addressed', 'developer-1', 'Fixed in commit abc123');

      expect(updated?.status).toBe('addressed');
      expect(updated?.resolvedBy).toBe('developer-1');
      expect(updated?.resolvedAt).toBeDefined();
    });

    it('should emit feedback:thread:resolved when marked as addressed', () => {
      const thread = feedback.createThread('artifact-1', 'reviewer', 'Title', 'Content', 'blocking');
      const publishSpy = jest.spyOn(eventBus, 'publish');

      feedback.updateStatus(thread.id, 'addressed', 'developer-1');

      expect(publishSpy).toHaveBeenCalledWith('feedback:thread:resolved', expect.anything());
    });

    it('should return null for non-existent thread', () => {
      const result = feedback.updateStatus('non-existent', 'addressed', 'developer');
      expect(result).toBeNull();
    });
  });

  describe('updateSeverity', () => {
    it('should update thread severity', () => {
      const thread = feedback.createThread('artifact-1', 'reviewer', 'Title', 'Content', 'nit');
      
      const updated = feedback.updateSeverity(thread.id, 'critical', 'security-lead', 'After further review, this is critical');

      expect(updated?.severity).toBe('critical');
    });

    it('should emit escalation event when severity increased to critical', () => {
      const thread = feedback.createThread('artifact-1', 'reviewer', 'Title', 'Content', 'blocking');
      const publishSpy = jest.spyOn(eventBus, 'publish');

      feedback.updateSeverity(thread.id, 'critical', 'security-lead');

      expect(publishSpy).toHaveBeenCalledWith('feedback:escalated', expect.anything());
    });

    it('should not emit escalation if already critical', () => {
      const thread = feedback.createThread('artifact-1', 'reviewer', 'Title', 'Content', 'critical');
      const publishSpy = jest.spyOn(eventBus, 'publish');
      publishSpy.mockClear();

      feedback.updateSeverity(thread.id, 'critical', 'reviewer');

      expect(publishSpy).not.toHaveBeenCalledWith('feedback:escalated', expect.anything());
    });
  });

  describe('getThread and getThreadsForArtifact', () => {
    it('should retrieve thread by ID', () => {
      const thread = feedback.createThread('artifact-1', 'reviewer', 'Title', 'Content', 'nit');
      
      const retrieved = feedback.getThread(thread.id);
      expect(retrieved?.id).toBe(thread.id);
      expect(retrieved?.title).toBe('Title');
    });

    it('should return all threads for an artifact', () => {
      feedback.createThread('artifact-1', 'reviewer-1', 'Issue 1', 'Content 1', 'nit');
      feedback.createThread('artifact-1', 'reviewer-2', 'Issue 2', 'Content 2', 'blocking');
      feedback.createThread('artifact-2', 'reviewer-1', 'Other', 'Content', 'nit');

      const threads = feedback.getThreadsForArtifact('artifact-1');
      expect(threads).toHaveLength(2);
      expect(threads.every(t => t.artifactId === 'artifact-1')).toBe(true);
    });
  });

  describe('filterThreads', () => {
    beforeEach(() => {
      feedback.createThread('artifact-1', 'reviewer-1', 'Issue 1', 'Content', 'nit', { tags: ['style'] });
      feedback.createThread('artifact-1', 'reviewer-1', 'Issue 2', 'Content', 'blocking', { tags: ['logic'] });
      feedback.createThread('artifact-1', 'reviewer-2', 'Issue 3', 'Content', 'critical', { tags: ['security'] });
      feedback.createThread('artifact-2', 'reviewer-1', 'Other', 'Content', 'nit', { tags: ['style'] });
    });

    it('should filter by artifactId', () => {
      const threads = feedback.filterThreads({ artifactId: 'artifact-1' });
      expect(threads).toHaveLength(3);
    });

    it('should filter by author', () => {
      const threads = feedback.filterThreads({ author: 'reviewer-1' });
      expect(threads).toHaveLength(3);
    });

    it('should filter by severity', () => {
      const threads = feedback.filterThreads({ severity: 'critical' });
      expect(threads).toHaveLength(1);
      expect(threads[0].severity).toBe('critical');
    });

    it('should filter by tags', () => {
      const threads = feedback.filterThreads({ tags: ['style'] });
      expect(threads).toHaveLength(2);
    });

    it('should combine filters', () => {
      const threads = feedback.filterThreads({ 
        artifactId: 'artifact-1',
        author: 'reviewer-1',
        severity: 'nit'
      });
      expect(threads).toHaveLength(1);
    });
  });

  describe('getSummary', () => {
    it('should return summary statistics', () => {
      feedback.createThread('artifact-1', 'reviewer', 'Issue 1', 'Content', 'nit');
      feedback.createThread('artifact-1', 'reviewer', 'Issue 2', 'Content', 'blocking');
      const thread3 = feedback.createThread('artifact-1', 'reviewer', 'Issue 3', 'Content', 'critical');
      
      feedback.updateStatus(thread3.id, 'addressed', 'developer');

      const summary = feedback.getSummary();

      expect(summary.total).toBe(3);
      expect(summary.bySeverity.nit).toBe(1);
      expect(summary.bySeverity.blocking).toBe(1);
      expect(summary.bySeverity.critical).toBe(1);
      expect(summary.byStatus.addressed).toBe(1);
      expect(summary.criticalOpen).toBe(0);
      expect(summary.blockingOpen).toBe(1);
    });
  });

  describe('hasBlockingFeedback', () => {
    it('should return true when blocking feedback exists', () => {
      feedback.createThread('artifact-1', 'reviewer', 'Blocking Issue', 'Content', 'blocking');
      expect(feedback.hasBlockingFeedback('artifact-1')).toBe(true);
    });

    it('should return false when only nits exist', () => {
      feedback.createThread('artifact-1', 'reviewer', 'Nit', 'Content', 'nit');
      expect(feedback.hasBlockingFeedback('artifact-1')).toBe(false);
    });

    it('should return false when blocking feedback is addressed', () => {
      const thread = feedback.createThread('artifact-1', 'reviewer', 'Issue', 'Content', 'blocking');
      feedback.updateStatus(thread.id, 'addressed', 'developer');
      expect(feedback.hasBlockingFeedback('artifact-1')).toBe(false);
    });
  });

  describe('getBlockingThreads', () => {
    it('should return only blocking/critical threads', () => {
      feedback.createThread('artifact-1', 'reviewer', 'Nit', 'Content', 'nit');
      feedback.createThread('artifact-1', 'reviewer', 'Blocking', 'Content', 'blocking');
      feedback.createThread('artifact-1', 'reviewer', 'Critical', 'Content', 'critical');

      const blocking = feedback.getBlockingThreads('artifact-1');
      expect(blocking).toHaveLength(2);
      expect(blocking.every(t => t.severity === 'blocking' || t.severity === 'critical')).toBe(true);
    });
  });

  describe('deleteThread', () => {
    it('should delete thread', () => {
      const thread = feedback.createThread('artifact-1', 'reviewer', 'Title', 'Content', 'nit');
      
      const result = feedback.deleteThread(thread.id, 'admin', 'Duplicate feedback');

      expect(result).toBe(true);
      expect(feedback.getThread(thread.id)).toBeUndefined();
    });

    it('should return false for non-existent thread', () => {
      const result = feedback.deleteThread('non-existent', 'admin');
      expect(result).toBe(false);
    });
  });

  describe('tags', () => {
    it('should add tag to thread', () => {
      const thread = feedback.createThread('artifact-1', 'reviewer', 'Title', 'Content', 'nit');
      
      feedback.addTag(thread.id, 'security');

      const updated = feedback.getThread(thread.id);
      expect(updated?.tags).toContain('security');
    });

    it('should not add duplicate tags', () => {
      const thread = feedback.createThread('artifact-1', 'reviewer', 'Title', 'Content', 'nit');
      
      feedback.addTag(thread.id, 'security');
      feedback.addTag(thread.id, 'security');

      const updated = feedback.getThread(thread.id);
      expect(updated?.tags?.filter(t => t === 'security')).toHaveLength(1);
    });

    it('should remove tag from thread', () => {
      const thread = feedback.createThread('artifact-1', 'reviewer', 'Title', 'Content', 'nit', { tags: ['a', 'b'] });
      
      feedback.removeTag(thread.id, 'a');

      const updated = feedback.getThread(thread.id);
      expect(updated?.tags).not.toContain('a');
      expect(updated?.tags).toContain('b');
    });

    it('should get threads by tag', () => {
      feedback.createThread('artifact-1', 'reviewer', 'Title 1', 'Content', 'nit', { tags: ['security'] });
      feedback.createThread('artifact-1', 'reviewer', 'Title 2', 'Content', 'nit', { tags: ['performance'] });
      feedback.createThread('artifact-1', 'reviewer', 'Title 3', 'Content', 'nit', { tags: ['security'] });

      const securityThreads = feedback.getThreadsByTag('security');
      expect(securityThreads).toHaveLength(2);
    });
  });

  describe('export and import', () => {
    it('should export threads to JSON', () => {
      feedback.createThread('artifact-1', 'reviewer', 'Title 1', 'Content 1', 'nit');
      feedback.createThread('artifact-1', 'reviewer', 'Title 2', 'Content 2', 'blocking');

      const exported = feedback.exportThreads('artifact-1');
      const parsed = JSON.parse(exported);

      expect(parsed.threads).toHaveLength(2);
      expect(parsed.summary.total).toBe(2);
      expect(parsed.exportDate).toBeDefined();
    });

    it('should import threads from JSON', () => {
      const data = {
        threads: [
          {
            id: 'thread-1',
            artifactId: 'artifact-1',
            author: 'reviewer',
            title: 'Test',
            initialComment: 'Content',
            severity: 'nit',
            status: 'pending',
            comments: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]
      };

      const result = feedback.importThreads(JSON.stringify(data));

      expect(result.imported).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(feedback.getAllThreads()).toHaveLength(1);
    });

    it('should handle import errors gracefully', () => {
      const result = feedback.importThreads('invalid json');

      expect(result.imported).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
