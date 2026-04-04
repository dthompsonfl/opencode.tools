/**
 * Collaboration Protocol Tests
 * 
 * Tests for agent-to-agent collaboration including help requests,
 * finding sharing, reviews, and escalations.
 */

import { CollaborationProtocol } from '../../../../src/cowork/team/collaboration-protocol';
import { TeamManager } from '../../../../src/cowork/team/team-manager';
import { EventBus } from '../../../../src/cowork/orchestrator/event-bus';
import { Blackboard } from '../../../../src/cowork/orchestrator/blackboard';
import { resetCoworkSingletonsForTests } from '../test-helpers';

describe('CollaborationProtocol', () => {
  let protocol: CollaborationProtocol;
  let teamManager: TeamManager;
  let eventBus: EventBus;
  let blackboard: Blackboard;

  beforeEach(() => {
    resetCoworkSingletonsForTests();
    
    // Get fresh instances
    protocol = CollaborationProtocol.getInstance();
    teamManager = TeamManager.getInstance();
    eventBus = EventBus.getInstance();
    blackboard = Blackboard.getInstance();
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    resetCoworkSingletonsForTests();
  });

  describe('Request Help', () => {
    it('should create and send help request', async () => {
      protocol.onRequest('agent-2', (request) => {
        protocol.respondToRequest(request.id, true, { helper: 'agent-2' }, 'I can help');
      });

      const response = await protocol.requestHelp(
        'agent-1',
        'agent-2',
        'Need help with async/await',
        { file: 'test.ts', line: 42 },
        'normal',
        100
      );

      expect(response).toBeDefined();
      expect(response.timestamp).toBeDefined();
      expect(response.accepted).toBe(true);
    });

    it('should emit help requested event', async () => {
      const publishSpy = jest.spyOn(eventBus, 'publish');

      protocol.onRequest('agent-2', (request) => {
        protocol.respondToRequest(request.id, true, undefined, 'ack');
      });

      await protocol.requestHelp(
        'agent-1',
        'agent-2',
        'Need help',
        undefined,
        'normal',
        100
      );

      expect(publishSpy).toHaveBeenCalledWith(
        'collaboration:help:requested',
        expect.objectContaining({
          fromAgentId: 'agent-1',
          toAgentId: 'agent-2',
          task: 'Need help'
        })
      );
    });

    it('should timeout if no response', async () => {
      const response = await protocol.requestHelp(
        'agent-1',
        'agent-2',
        'Need help',
        undefined,
        'normal',
        100 // Short timeout for testing
      );

      expect(response.accepted).toBe(false);
      expect(response.message).toBe('Request timed out');
    });
  });

  describe('Share Finding', () => {
    it('should share finding with team', () => {
      const publishSpy = jest.spyOn(eventBus, 'publish');

      protocol.shareFinding(
        'agent-1',
        {
          type: 'vulnerability',
          title: 'SQL Injection Risk',
          description: 'User input not sanitized',
          severity: 'critical'
        },
        'team'
      );

      expect(publishSpy).toHaveBeenCalledWith(
        'collaboration:finding:shared',
        expect.objectContaining({
          fromAgentId: 'agent-1',
          finding: expect.objectContaining({
            title: 'SQL Injection Risk'
          })
        })
      );
    });

    it('should store finding on blackboard', () => {
      const updateSpy = jest.spyOn(blackboard, 'updateArtifact');

      protocol.shareFinding(
        'agent-1',
        {
          type: 'bug',
          title: 'Null pointer',
          description: 'Found null pointer exception'
        }
      );

      expect(updateSpy).toHaveBeenCalled();
    });
  });

  describe('Request Review', () => {
    beforeEach(() => {
      // Set up team with code reviewer
      teamManager.registerRoleMapping({
        roleId: 'DEVELOPER',
        roleName: 'Developer',
        agentId: 'dev-1',
        capabilities: ['code', 'code-review'],
        vetoGates: [],
        approvalGates: []
      });

      teamManager.registerRoleMapping({
        roleId: 'LEAD',
        roleName: 'Lead',
        agentId: 'lead-1',
        capabilities: ['lead', 'code-review'],
        vetoGates: [],
        approvalGates: []
      });

      teamManager.formTeam({
        projectId: 'proj-1',
        projectName: 'Test',
        requiredRoles: ['DEVELOPER', 'LEAD'],
        leadRoleId: 'LEAD'
      });
    });

    it('should request code review', async () => {
      protocol.onRequest('lead-1', (request) => {
        protocol.respondToRequest(request.id, true, undefined, 'review accepted');
      });

      const response = await protocol.requestReview(
        'dev-1',
        'artifact-123',
        'code',
        undefined,
        'normal',
        100
      );

      expect(response).toBeDefined();
      expect(response.accepted).toBe(true);
    });

    it('should emit review requested event', async () => {
      const publishSpy = jest.spyOn(eventBus, 'publish');

      protocol.onRequest('lead-1', (request) => {
        protocol.respondToRequest(request.id, true, undefined, 'ok');
      });

      await protocol.requestReview(
        'dev-1',
        'artifact-123',
        'code',
        undefined,
        'normal',
        100
      );

      expect(publishSpy).toHaveBeenCalledWith(
        'collaboration:review:requested',
        expect.objectContaining({
          fromAgentId: 'dev-1',
          artifactId: 'artifact-123',
          reviewType: 'code'
        })
      );
    });
  });

  describe('Escalation', () => {
    beforeEach(() => {
      teamManager.registerRoleMapping({
        roleId: 'DEVELOPER',
        roleName: 'Developer',
        agentId: 'dev-1',
        capabilities: ['code'],
        vetoGates: [],
        approvalGates: []
      });

      teamManager.registerRoleMapping({
        roleId: 'CTO',
        roleName: 'CTO',
        agentId: 'cto-1',
        capabilities: ['orchestrate'],
        vetoGates: [],
        approvalGates: []
      });

      teamManager.formTeam({
        projectId: 'proj-1',
        projectName: 'Test',
        requiredRoles: ['DEVELOPER', 'CTO'],
        leadRoleId: 'CTO'
      });
    });

    it('should escalate issue to team lead', async () => {
      protocol.onRequest('cto-1', (request) => {
        protocol.respondToRequest(request.id, true, undefined, 'escalation acknowledged');
      });

      const response = await protocol.escalate(
        'dev-1',
        {
          title: 'Critical Bug',
          description: 'System is down',
          severity: 'critical'
        },
        [],
        'high',
        120
      );

      expect(response).toBeDefined();
      expect(response.escalated).toBe(true);
    });

    it('should emit escalation event', async () => {
      const publishSpy = jest.spyOn(eventBus, 'publish');

      protocol.onRequest('cto-1', (request) => {
        protocol.respondToRequest(request.id, true, undefined, 'ack');
      });

      await protocol.escalate(
        'dev-1',
        {
          title: 'Security Issue',
          description: 'Data breach detected',
          severity: 'critical'
        },
        [],
        'high',
        120
      );

      expect(publishSpy).toHaveBeenCalledWith(
        'collaboration:escalation',
        expect.objectContaining({
          fromAgentId: 'dev-1',
          issue: expect.objectContaining({
            title: 'Security Issue'
          })
        })
      );
    });
  });

  describe('Broadcast', () => {
    it('should broadcast message', () => {
      const publishSpy = jest.spyOn(eventBus, 'publish');

      protocol.broadcast(
        'agent-1',
        'Starting deployment to production',
        { deploymentId: 'deploy-123' }
      );

      expect(publishSpy).toHaveBeenCalledWith(
        'collaboration:broadcast',
        expect.objectContaining({
          fromAgentId: 'agent-1',
          message: 'Starting deployment to production'
        })
      );
    });

    it('should store broadcast on blackboard', () => {
      const updateSpy = jest.spyOn(blackboard, 'updateArtifact');

      protocol.broadcast('agent-1', 'Test message');

      expect(updateSpy).toHaveBeenCalled();
    });
  });

  describe('Request/Response Pattern', () => {
    it('should subscribe to requests', () => {
      const callback = jest.fn();

      const unsubscribe = protocol.onRequest('agent-1', callback);

      // Create a request
      protocol.requestHelp('agent-2', 'agent-1', 'Need help', undefined, 'normal', 100);

      expect(callback).toHaveBeenCalled();

      unsubscribe();
    });

    it('should get pending requests', () => {
      protocol.requestHelp('agent-1', 'agent-2', 'Need help 1', undefined, 'normal', 100);
      protocol.requestHelp('agent-1', 'agent-2', 'Need help 2', undefined, 'normal', 100);

      const pending = protocol.getPendingRequests('agent-2');
      expect(pending).toHaveLength(2);
    });

    it('should respond to request', async () => {
      // Create request
      const requestPromise = protocol.requestHelp(
        'agent-1',
        'agent-2',
        'Need help',
        undefined,
        'normal',
        1000
      );

      // Get the request
      const pending = protocol.getPendingRequests('agent-2');
      expect(pending.length).toBeGreaterThan(0);

      // Respond
      protocol.respondToRequest(pending[0].id, true, undefined, 'I\'ll help');

      const response = await requestPromise;
      expect(response.accepted).toBe(true);
      expect(response.message).toBe('I\'ll help');
    });

    it('should complete a request', () => {
      // Create and accept a request
      protocol.requestHelp('agent-1', 'agent-2', 'Need help', undefined, 'normal', 100);
      const pending = protocol.getPendingRequests('agent-2');
      protocol.respondToRequest(pending[0].id, true);

      const result = protocol.completeRequest(pending[0].id, { result: 'done' });
      expect(result).toBe(true);
    });
  });

  describe('Request Lifecycle', () => {
    it('should mark expired requests', async () => {
      // Create request with short timeout
      protocol.requestHelp('agent-1', 'agent-2', 'Need help', undefined, 'normal', 50);

       const pendingBefore = protocol.getPendingRequests('agent-2');
       expect(pendingBefore.length).toBeGreaterThan(0);
       const requestId = pendingBefore[0].id;

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));

      protocol.triggerCleanupForTests();

      const pendingAfter = protocol.getPendingRequests('agent-2');
      expect(pendingAfter).toHaveLength(0);

      const request = protocol.getRequest(requestId);
      expect(request?.status).toBe('expired');
    });

    it('should get all requests', () => {
      protocol.requestHelp('agent-1', 'agent-2', 'Help 1', undefined, 'normal', 100);
      protocol.requestHelp('agent-3', 'agent-4', 'Help 2', undefined, 'normal', 100);

      const all = protocol.getAllRequests();
      expect(all).toHaveLength(2);
    });

    it('should get request by ID', () => {
      protocol.requestHelp('agent-1', 'agent-2', 'Help', undefined, 'normal', 100);
      const pending = protocol.getPendingRequests('agent-2');

      const found = protocol.getRequest(pending[0].id);
      expect(found?.id).toBe(pending[0].id);
    });
  });

  describe('Finding Severity Levels', () => {
    it('should share info finding', () => {
      const publishSpy = jest.spyOn(eventBus, 'publish');

      protocol.shareFinding('agent-1', {
        type: 'info',
        title: 'FYI',
        description: 'Just letting you know',
        severity: 'info'
      });

      expect(publishSpy).toHaveBeenCalled();
    });

    it('should share warning finding', () => {
      const publishSpy = jest.spyOn(eventBus, 'publish');

      protocol.shareFinding('agent-1', {
        type: 'warning',
        title: 'Deprecation',
        description: 'API will be deprecated soon',
        severity: 'warning'
      });

      expect(publishSpy).toHaveBeenCalled();
    });

    it('should share critical finding', () => {
      const publishSpy = jest.spyOn(eventBus, 'publish');

      protocol.shareFinding('agent-1', {
        type: 'vulnerability',
        title: 'Critical Security Issue',
        description: 'Immediate attention required',
        severity: 'critical'
      });

      expect(publishSpy).toHaveBeenCalled();
    });
  });

  describe('Priority Levels', () => {
    it('should handle low priority requests', async () => {
      const response = await protocol.requestHelp(
        'agent-1',
        'agent-2',
        'Low priority help',
        undefined,
        'low',
        100
      );

      expect(response).toBeDefined();
    });

    it('should handle high priority requests', async () => {
      const response = await protocol.requestHelp(
        'agent-1',
        'agent-2',
        'High priority help',
        undefined,
        'high',
        100
      );

      expect(response).toBeDefined();
    });

    it('should handle critical priority requests', async () => {
      const response = await protocol.requestHelp(
        'agent-1',
        'agent-2',
        'Critical help needed',
        undefined,
        'critical',
        100
      );

      expect(response).toBeDefined();
    });
  });
});
