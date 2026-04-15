import * as React from 'react';
import { EventBus, EventEnvelope, EventCallback } from '../../cowork/orchestrator/event-bus';
import {
  AgentRuntime,
  ArtifactRecord,
  CollaborationEntry,
  FoundryDispatch,
  FoundryPhase,
  QualityGate,
  TeamMember,
  TeamStatus,
} from '../types';

const FEED_LIMIT = 120;

export function useFoundryEvents(dispatch: FoundryDispatch): void {
  React.useEffect(() => {
    const eventBus = EventBus.getInstance();
    dispatch({ type: 'SET_CONNECTION_STATUS', connection: 'connected' });

    const unsubscribers: Array<() => void> = [];

    const subscribe = (
      event: string,
      handler: (payload: unknown, envelope?: EventEnvelope) => void,
    ): void => {
      const callback: EventCallback = (payload, envelope) => {
        handler(payload, envelope);
      };
      const unsubscribe = eventBus.subscribe(event, callback);
      unsubscribers.push(unsubscribe);
    };

    subscribe('*', (payload, envelope) => {
      if (!envelope) {
        return;
      }

      const entry = toFeedEntry(envelope.event, payload, envelope);
      dispatch({ type: 'ADD_FEED_ENTRY', entry });
    });

    subscribe('agent:start', (payload) => {
      const record = toRecord(payload);
      const id = readString(record, 'agentId') ?? 'unknown-agent';
      const task = readString(record, 'task') ?? 'task assigned';
      const role = readString(record, 'role') ?? 'Contributor';

      const agent: AgentRuntime = {
        id,
        name: readString(record, 'agentName') ?? id,
        role,
        status: 'busy',
        progress: 0,
        task,
        updatedAt: Date.now(),
      };
      dispatch({ type: 'UPSERT_AGENT', agent });
    });

    subscribe('agent:progress', (payload) => {
      const record = toRecord(payload);
      const id = readString(record, 'agentId') ?? 'unknown-agent';
      const task = readString(record, 'message') ?? readString(record, 'task') ?? 'in progress';
      const percent = readNumber(record, 'percent') ?? 0;

      const agent: AgentRuntime = {
        id,
        name: readString(record, 'agentName') ?? id,
        role: readString(record, 'role') ?? 'Contributor',
        status: 'busy',
        progress: Math.max(0, Math.min(100, percent)),
        task,
        updatedAt: Date.now(),
      };
      dispatch({ type: 'UPSERT_AGENT', agent });
    });

    subscribe('agent:complete', (payload) => {
      const record = toRecord(payload);
      const id = readString(record, 'agentId') ?? 'unknown-agent';

      const agent: AgentRuntime = {
        id,
        name: readString(record, 'agentName') ?? id,
        role: readString(record, 'role') ?? 'Contributor',
        status: 'completed',
        progress: 100,
        task: readString(record, 'task') ?? 'completed',
        updatedAt: Date.now(),
      };
      dispatch({ type: 'UPSERT_AGENT', agent });
    });

    subscribe('agent:error', (payload) => {
      const record = toRecord(payload);
      const id = readString(record, 'agentId') ?? 'unknown-agent';
      const error = readString(record, 'error') ?? 'Unknown error';

      const agent: AgentRuntime = {
        id,
        name: readString(record, 'agentName') ?? id,
        role: readString(record, 'role') ?? 'Contributor',
        status: 'blocked',
        progress: Math.max(0, Math.min(100, readNumber(record, 'percent') ?? 0)),
        task: error,
        updatedAt: Date.now(),
      };
      dispatch({ type: 'UPSERT_AGENT', agent });
      dispatch({ type: 'APPEND_EXECUTION_ERROR', message: `${id}: ${error}` });
    });

    subscribe('team:member:status_changed', (payload) => {
      const record = toRecord(payload);
      const id = readString(record, 'agentId') ?? readString(record, 'memberId') ?? 'team-member';
      const member: TeamMember = {
        id,
        name: readString(record, 'name') ?? id,
        role: readString(record, 'role') ?? 'Contributor',
        status: toTeamStatus(readString(record, 'status')),
      };
      dispatch({ type: 'UPSERT_TEAM_MEMBER', member });
    });

    subscribe('artifact:any:updated', (payload, envelope) => {
      const record = toRecord(payload);
      const artifact = toArtifactRecord(record, envelope?.occurredAt);
      if (artifact) {
        dispatch({ type: 'UPSERT_ARTIFACT', artifact });
      }
    });

    subscribe('artifact:version:updated', (payload, envelope) => {
      const record = toRecord(payload);
      const artifact = toArtifactRecord(record, envelope?.occurredAt);
      if (artifact) {
        dispatch({ type: 'UPSERT_ARTIFACT', artifact });
      }
    });

    subscribe('artifact:version:created', (payload, envelope) => {
      const record = toRecord(payload);
      const artifact = toArtifactRecord(record, envelope?.occurredAt);
      if (artifact) {
        dispatch({ type: 'UPSERT_ARTIFACT', artifact });
      }
    });

    subscribe('state:transition', (payload) => {
      const record = toRecord(payload);
      const phaseValue = readString(record, 'to') ?? readString(record, 'phase');
      if (phaseValue) {
        dispatch({ type: 'SET_PHASE', phase: normalizePhase(phaseValue) });
      }
    });

    subscribe('workflow:phase_changed', (payload) => {
      const record = toRecord(payload);
      const phaseValue = readString(record, 'to') ?? readString(record, 'phase');
      if (phaseValue) {
        dispatch({ type: 'SET_PHASE', phase: normalizePhase(phaseValue) });
      }
    });

    subscribe('foundry:phase:complete', (payload) => {
      const record = toRecord(payload);
      const phaseValue = readString(record, 'phase') ?? readString(record, 'completedPhase');
      if (phaseValue) {
        dispatch({ type: 'SET_PHASE', phase: normalizePhase(phaseValue) });
      }
    });

    subscribe('security:gate:evaluated', (payload, envelope) => {
      const gate = toGateRecord('security', payload, envelope?.occurredAt);
      if (gate) {
        dispatch({ type: 'UPSERT_QUALITY_GATE', gate });
      }
    });

    subscribe('release:gates:complete', (payload, envelope) => {
      const gate = toGateRecord('release', payload, envelope?.occurredAt);
      if (gate) {
        dispatch({ type: 'UPSERT_QUALITY_GATE', gate });
      }
    });

    subscribe('feature:gates:complete', (payload, envelope) => {
      const gate = toGateRecord('feature', payload, envelope?.occurredAt);
      if (gate) {
        dispatch({ type: 'UPSERT_QUALITY_GATE', gate });
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

function toFeedEntry(event: string, payload: unknown, envelope: EventEnvelope): CollaborationEntry {
  const record = toRecord(payload);
  const actor =
    readString(record, 'agentId') ??
    readString(record, 'source') ??
    readString(record, 'role') ??
    'system';

  const message =
    readString(record, 'message') ??
    readString(record, 'task') ??
    readString(record, 'summary') ??
    describePayload(payload);

  const timestamp = Number.isFinite(Date.parse(envelope.occurredAt))
    ? Date.parse(envelope.occurredAt)
    : Date.now();

  return {
    id: envelope.eventId,
    event,
    actor,
    message,
    timestamp,
  };
}

function toArtifactRecord(payload: Record<string, unknown> | null, occurredAt?: string): ArtifactRecord | null {
  if (!payload) {
    return null;
  }

  const name = readString(payload, 'key') ?? readString(payload, 'artifactId') ?? readString(payload, 'name');
  if (!name) {
    return null;
  }

  return {
    id: name,
    name,
    source: readString(payload, 'source') ?? readString(payload, 'author') ?? 'unknown',
    version: Math.max(1, Math.floor(readNumber(payload, 'version') ?? 1)),
    updatedAt: parseTimestamp(occurredAt),
  };
}

function toGateRecord(
  gateName: string,
  payload: unknown,
  occurredAt?: string,
): QualityGate | null {
  const record = toRecord(payload);
  if (!record) {
    return null;
  }

  const statusSource =
    readString(record, 'status') ??
    (readBoolean(record, 'passed') === true ? 'passed' : readBoolean(record, 'passed') === false ? 'failed' : 'running');

  return {
    id: gateName,
    name: `${gateName} gate`,
    status: normalizeGateStatus(statusSource),
    detail: readString(record, 'summary') ?? readString(record, 'message') ?? 'Gate update received',
    updatedAt: parseTimestamp(occurredAt),
  };
}

function normalizeGateStatus(value: string): QualityGate['status'] {
  const normalized = value.toLowerCase();
  if (normalized.includes('pass') || normalized === 'ok') {
    return 'passed';
  }
  if (normalized.includes('fail') || normalized.includes('block') || normalized.includes('error')) {
    return 'failed';
  }
  if (normalized.includes('run') || normalized.includes('progress')) {
    return 'running';
  }
  return 'pending';
}

function normalizePhase(value: string): FoundryPhase {
  const normalized = value.toLowerCase();
  if (normalized.includes('intake')) {
    return 'intake';
  }
  if (normalized.includes('plan')) {
    return 'planning';
  }
  if (normalized.includes('delegat') || normalized.includes('spawn')) {
    return 'delegation';
  }
  if (normalized.includes('execut')) {
    return 'execution';
  }
  if (normalized.includes('quality') || normalized.includes('gate') || normalized.includes('review')) {
    return 'quality';
  }
  if (normalized.includes('release') || normalized.includes('deploy')) {
    return 'release';
  }
  return 'planning';
}

function toTeamStatus(value: string | undefined): TeamStatus {
  if (!value) {
    return 'available';
  }

  const normalized = value.toLowerCase();
  if (normalized.includes('busy') || normalized.includes('run') || normalized.includes('thinking')) {
    return 'busy';
  }
  if (normalized.includes('block') || normalized.includes('fail')) {
    return 'blocked';
  }
  if (normalized.includes('offline')) {
    return 'offline';
  }
  return 'available';
}

function parseTimestamp(value?: string): number {
  if (!value) {
    return Date.now();
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function readString(record: Record<string, unknown> | null, key: string): string | undefined {
  if (!record) {
    return undefined;
  }
  const value = record[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readNumber(record: Record<string, unknown> | null, key: string): number | undefined {
  if (!record) {
    return undefined;
  }
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readBoolean(record: Record<string, unknown> | null, key: string): boolean | undefined {
  if (!record) {
    return undefined;
  }
  const value = record[key];
  return typeof value === 'boolean' ? value : undefined;
}

function describePayload(payload: unknown): string {
  if (payload === null || payload === undefined) {
    return 'no payload';
  }
  if (typeof payload === 'string') {
    return payload;
  }
  if (typeof payload === 'number' || typeof payload === 'boolean') {
    return String(payload);
  }
  if (Array.isArray(payload)) {
    return `array payload (${payload.length} items)`;
  }
  try {
    const text = JSON.stringify(payload);
    return text.length > FEED_LIMIT ? `${text.slice(0, FEED_LIMIT)}...` : text;
  } catch {
    return 'unserializable payload';
  }
}
