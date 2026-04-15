/**
 * Foundry TUI - EventBus Hook
 * Connects the TUI to the Cowork EventBus for real-time updates
 */

import * as React from 'react';
import { EventBus, EventEnvelope } from '../../cowork/orchestrator/event-bus';
import type { FoundryDispatch, Agent, TeamMember, CollaborationEntry, Artifact, QualityGate, Message } from '../types';

export function useEventBus(dispatch: FoundryDispatch): void {
  React.useEffect(() => {
    const eventBus = EventBus.getInstance();
    
    // Set connection status
    dispatch({ type: 'SET_CONNECTION_STATUS', connection: 'connected' });

    const unsubscribers: Array<() => void> = [];

    const subscribe = (
      event: string,
      handler: (payload: unknown, envelope?: EventEnvelope) => void
    ): void => {
      const unsubscribe = eventBus.subscribe(event, handler);
      unsubscribers.push(unsubscribe);
    };

    // Subscribe to all events for feed
    subscribe('*', (payload, envelope) => {
      if (!envelope) return;
      
      const entry: CollaborationEntry = {
        id: envelope.eventId,
        type: 'system:notification',
        event: envelope.event,
        actor: extractActor(payload, envelope),
        message: extractMessage(payload, envelope),
        metadata: envelope.metadata,
        timestamp: Date.parse(envelope.occurredAt) || Date.now(),
      };

      dispatch({ type: 'ADD_FEED_ENTRY', entry });
    });

    // Agent events
    subscribe('agent:start', (payload) => {
      const record = toRecord(payload);
      const agent: Agent = {
        id: readString(record, 'agentId') || uuidv4(),
        name: readString(record, 'agentName') || readString(record, 'agentId') || 'Unknown Agent',
        role: readRole(record, 'role'),
        roleLabel: readString(record, 'roleLabel') || readString(record, 'role') || 'Contributor',
        status: 'busy',
        progress: 0,
        task: readString(record, 'task') || 'Task assigned',
        capabilities: readArray(record, 'capabilities') || [],
        startTime: Date.now(),
        dependencies: readArray(record, 'dependencies') || [],
        outputs: [],
        updatedAt: Date.now(),
      };
      dispatch({ type: 'UPSERT_AGENT', agent });
    });

    subscribe('agent:progress', (payload) => {
      const record = toRecord(payload);
      const agentId = readString(record, 'agentId');
      if (agentId) {
        dispatch({
          type: 'UPDATE_AGENT_STATUS',
          agentId,
          status: 'busy',
          progress: readNumber(record, 'progress') || readNumber(record, 'percent') || 0,
        });
      }
    });

    subscribe('agent:complete', (payload) => {
      const record = toRecord(payload);
      const agentId = readString(record, 'agentId');
      if (agentId) {
        dispatch({
          type: 'UPDATE_AGENT_STATUS',
          agentId,
          status: 'completed',
          progress: 100,
        });
      }
    });

    subscribe('agent:error', (payload) => {
      const record = toRecord(payload);
      const agentId = readString(record, 'agentId');
      if (agentId) {
        dispatch({
          type: 'UPDATE_AGENT_STATUS',
          agentId,
          status: 'failed',
        });
        const error = readString(record, 'error') || 'Unknown error';
        dispatch({ type: 'APPEND_EXECUTION_ERROR', message: `${agentId}: ${error}` });
      }
    });

    subscribe('agent:typing:start', (payload) => {
      const record = toRecord(payload);
      dispatch({
        type: 'CHAT_SET_TYPING',
        isTyping: true,
        agentId: readString(record, 'agentId'),
      });
    });

    subscribe('agent:typing:stop', () => {
      dispatch({
        type: 'CHAT_SET_TYPING',
        isTyping: false,
      });
    });

    // Chat events
    subscribe('chat:message:received', (payload) => {
      const record = toRecord(payload);
      const message: Message = {
        id: readString(record, 'id') || uuidv4(),
        role: readMessageRole(record, 'role'),
        content: readString(record, 'content') || readString(record, 'message') || '',
        timestamp: Date.now(),
        agentId: readString(record, 'agentId'),
        agentName: readString(record, 'agentName'),
        threadId: readString(record, 'threadId'),
        replyTo: readString(record, 'replyTo'),
        mentions: readArray(record, 'mentions'),
      };
      dispatch({ type: 'CHAT_RECEIVE_MESSAGE', message });
    });

    subscribe('chat:suggestion:add', (payload) => {
      const record = toRecord(payload);
      const suggestion = readString(record, 'suggestion');
      if (suggestion) {
        dispatch({ type: 'CHAT_ADD_SUGGESTION', suggestion });
      }
    });

    // Team events
    subscribe('team:member:joined', (payload) => {
      const record = toRecord(payload);
      const member: TeamMember = {
        id: readString(record, 'memberId') || readString(record, 'id') || uuidv4(),
        name: readString(record, 'name') || 'Team Member',
        role: readRole(record, 'role'),
        roleLabel: readString(record, 'roleLabel') || readString(record, 'role') || 'Member',
        status: 'available',
        availability: 100,
        isActive: true,
        joinedAt: Date.now(),
        lastActivity: Date.now(),
      };
      dispatch({ type: 'UPSERT_TEAM_MEMBER', member });
    });

    subscribe('team:member:status_changed', (payload) => {
      const record = toRecord(payload);
      const memberId = readString(record, 'memberId') || readString(record, 'id');
      if (memberId) {
        const status = readTeamStatus(record, 'status');
        dispatch({ type: 'UPDATE_MEMBER_STATUS', memberId, status });
      }
    });

    // Artifact events
    subscribe('artifact:version:created', (payload, envelope) => {
      const record = toRecord(payload);
      const artifact: Artifact = {
        id: readString(record, 'artifactId') || readString(record, 'id') || uuidv4(),
        name: readString(record, 'name') || readString(record, 'key') || 'Unnamed Artifact',
        type: readArtifactType(record, 'type'),
        path: readString(record, 'path') || readString(record, 'key') || '',
        content: readString(record, 'content'),
        version: readNumber(record, 'version') || 1,
        createdAt: parseTimestamp(envelope?.occurredAt),
        updatedAt: parseTimestamp(envelope?.occurredAt),
        createdBy: readString(record, 'createdBy') || readString(record, 'author') || 'system',
        source: readString(record, 'source') || 'system',
        tags: readArray(record, 'tags') || [],
        size: readNumber(record, 'size'),
      };
      dispatch({ type: 'UPSERT_ARTIFACT', artifact });
    });

    subscribe('artifact:version:updated', (payload, envelope) => {
      const record = toRecord(payload);
      const artifactId = readString(record, 'artifactId') || readString(record, 'id');
      if (artifactId) {
        const artifact: Artifact = {
          id: artifactId,
          name: readString(record, 'name') || readString(record, 'key') || 'Unnamed Artifact',
          type: readArtifactType(record, 'type'),
          path: readString(record, 'path') || readString(record, 'key') || '',
          content: readString(record, 'content'),
          version: readNumber(record, 'version') || 1,
          createdAt: parseTimestamp(envelope?.occurredAt),
          updatedAt: parseTimestamp(envelope?.occurredAt),
          createdBy: readString(record, 'createdBy') || readString(record, 'author') || 'system',
          source: readString(record, 'source') || 'system',
          tags: readArray(record, 'tags') || [],
          size: readNumber(record, 'size'),
        };
        dispatch({ type: 'UPSERT_ARTIFACT', artifact });
      }
    });

    // Quality gate events
    subscribe('quality:gate:evaluated', (payload, envelope) => {
      const record = toRecord(payload);
      const gateId = readString(record, 'gateId') || readString(record, 'id');
      if (gateId) {
        const gate: QualityGate = {
          id: gateId,
          name: readString(record, 'name') || `${gateId} gate`,
          description: readString(record, 'description') || '',
          status: readGateStatus(record, 'status'),
          order: readNumber(record, 'order') || 1,
          detail: readString(record, 'detail') || readString(record, 'summary') || 'Gate evaluated',
          checks: readChecks(record, 'checks'),
          updatedAt: parseTimestamp(envelope?.occurredAt),
          startedAt: readNumber(record, 'startedAt'),
          completedAt: readNumber(record, 'completedAt'),
        };
        dispatch({ type: 'UPSERT_QUALITY_GATE', gate });
      }
    });

    subscribe('security:gate:evaluated', (payload, envelope) => {
      const record = toRecord(payload);
      const gate: QualityGate = {
        id: 'security',
        name: 'Security Gate',
        description: 'Security vulnerability scanning',
        status: readGateStatus(record, 'status'),
        order: 3,
        detail: readString(record, 'summary') || readString(record, 'message') || 'Security scan completed',
        checks: readChecks(record, 'checks'),
        updatedAt: parseTimestamp(envelope?.occurredAt),
      };
      dispatch({ type: 'UPSERT_QUALITY_GATE', gate });
    });

    // Phase events
    subscribe('workflow:phase_changed', (payload) => {
      const record = toRecord(payload);
      const phase = readString(record, 'to') || readString(record, 'phase');
      if (phase) {
        dispatch({ type: 'SET_PHASE', phase: normalizePhase(phase) });
      }
    });

    subscribe('foundry:phase:complete', (payload) => {
      const record = toRecord(payload);
      const phase = readString(record, 'phase');
      if (phase) {
        dispatch({ type: 'SET_PHASE', phase: normalizePhase(phase) });
      }
    });

    return () => {
      for (const unsubscribe of unsubscribers) {
        unsubscribe();
      }
      dispatch({ type: 'SET_CONNECTION_STATUS', connection: 'disconnected' });
    };
  }, [dispatch]);
}

// =============================================================================
// Helper Functions
// =============================================================================

function toRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function readString(record: Record<string, unknown> | null, key: string): string | undefined {
  if (!record) return undefined;
  const value = record[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readNumber(record: Record<string, unknown> | null, key: string): number | undefined {
  if (!record) return undefined;
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readArray(record: Record<string, unknown> | null, key: string): string[] | undefined {
  if (!record) return undefined;
  const value = record[key];
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : undefined;
}

function readRole(record: Record<string, unknown> | null, key: string) {
  const value = readString(record, key);
  const validRoles = ['cto', 'pm', 'architect', 'implementer', 'qa', 'security', 'docs', 'performance', 'reviewer'] as const;
  return validRoles.includes(value as typeof validRoles[number]) ? (value as typeof validRoles[number]) : 'implementer';
}

function readMessageRole(record: Record<string, unknown> | null, key: string) {
  const value = readString(record, key);
  const validRoles = ['user', 'agent', 'system', 'cto'] as const;
  return validRoles.includes(value as typeof validRoles[number]) ? (value as typeof validRoles[number]) : 'agent';
}

function readTeamStatus(record: Record<string, unknown> | null, key: string) {
  const value = readString(record, key);
  if (!value) return 'available';
  const normalized = value.toLowerCase();
  if (normalized.includes('busy')) return 'busy';
  if (normalized.includes('block')) return 'blocked';
  if (normalized.includes('offline')) return 'offline';
  return 'available';
}

function readArtifactType(record: Record<string, unknown> | null, key: string) {
  const value = readString(record, key);
  const validTypes = ['document', 'code', 'config', 'diagram', 'report', 'test'] as const;
  return validTypes.includes(value as typeof validTypes[number]) ? (value as typeof validTypes[number]) : 'document';
}

function readGateStatus(record: Record<string, unknown> | null, key: string) {
  const value = readString(record, key);
  if (!value) return 'pending';
  const normalized = value.toLowerCase();
  if (normalized.includes('pass')) return 'passed';
  if (normalized.includes('fail')) return 'failed';
  if (normalized.includes('run')) return 'running';
  if (normalized.includes('block')) return 'blocked';
  return 'pending';
}

function readChecks(record: Record<string, unknown> | null, key: string): QualityGate['checks'] {
  const value = record?.[key];
  if (!Array.isArray(value)) return [];
  return value.map((check, index) => ({
    id: (check as Record<string, unknown>)?.id?.toString() || `check-${index}`,
    name: (check as Record<string, unknown>)?.name?.toString() || `Check ${index + 1}`,
    passed: (check as Record<string, unknown>)?.passed as boolean | undefined,
    message: (check as Record<string, unknown>)?.message?.toString(),
  }));
}

function normalizePhase(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes('intake')) return 'intake';
  if (normalized.includes('plan')) return 'planning';
  if (normalized.includes('delegat')) return 'delegation';
  if (normalized.includes('execut')) return 'execution';
  if (normalized.includes('quality') || normalized.includes('gate') || normalized.includes('review')) return 'quality';
  if (normalized.includes('release') || normalized.includes('deploy')) return 'release';
  return 'planning';
}

function parseTimestamp(value?: string): number {
  if (!value) return Date.now();
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function extractActor(payload: unknown, envelope: EventEnvelope): string {
  const record = toRecord(payload);
  return readString(record, 'agentId') ||
    readString(record, 'actor') ||
    readString(record, 'source') ||
    readString(record, 'role') ||
    envelope.metadata?.source as string ||
    'system';
}

function extractMessage(payload: unknown, envelope: EventEnvelope): string {
  const record = toRecord(payload);
  return readString(record, 'message') ||
    readString(record, 'task') ||
    readString(record, 'summary') ||
    readString(record, 'content') ||
    envelope.event;
}

function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
