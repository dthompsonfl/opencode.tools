import { createHash, randomUUID } from 'crypto';
import { redactText } from './redaction';

const DEFAULT_BLOCKED_KEYS = [
  '__proto__',
  'constructor',
  'authorization',
  'apiKey',
  'cookie',
  'password',
  'prototype',
  'secret',
  'token',
];

const SAFE_EVENT_NAME = /^[a-z0-9]+(?::[a-z0-9_-]+)*$/;

export interface EventActor {
  id: string;
  kind: 'system' | 'agent' | 'command' | 'user';
}

export interface SecureEventEnvelope {
  id: string;
  event: string;
  actor: EventActor;
  sessionId?: string;
  timestamp: string;
  payload: unknown;
  payloadDigest: string;
}

export interface GuardrailPolicy {
  maxPayloadBytes?: number;
  maxDepth?: number;
  maxStringLength?: number;
  blockedKeys?: string[];
  maxClockSkewMs?: number;
}

export interface DirectMessagePolicy {
  defaultAllow?: boolean;
  allowedRoutes?: Array<{ from: string; to: string }>;
}

const AGENT_EVENT_SEGMENT = /^[a-z0-9_-]+$/;

export function isSafeEventName(event: string): boolean {
  return SAFE_EVENT_NAME.test(event);
}

export function createSecureEnvelope(
  event: string,
  payload: unknown,
  actor: EventActor,
  options: GuardrailPolicy = {},
  sessionId?: string,
): SecureEventEnvelope {
  const now = new Date().toISOString();
  const id = randomUUID();
  const sanitizedPayload = sanitizeEventPayload(payload, options);
  const payloadDigest = createHash('sha256')
    .update(JSON.stringify(sanitizedPayload))
    .digest('hex');

  return {
    id,
    event,
    actor,
    sessionId,
    timestamp: now,
    payload: sanitizedPayload,
    payloadDigest,
  };
}

export function validateSecureEnvelope(
  envelope: SecureEventEnvelope,
  options: GuardrailPolicy = {},
): { valid: true } | { valid: false; reason: string } {
  if (!isSafeEventName(envelope.event)) {
    return { valid: false, reason: 'Unsafe event name format' };
  }

  if (!envelope.actor?.id || !envelope.actor?.kind) {
    return { valid: false, reason: 'Missing actor metadata' };
  }

  const skewLimit = options.maxClockSkewMs ?? 5 * 60 * 1000;
  const eventTimestamp = Date.parse(envelope.timestamp);
  if (Number.isNaN(eventTimestamp)) {
    return { valid: false, reason: 'Invalid timestamp' };
  }

  if (Math.abs(Date.now() - eventTimestamp) > skewLimit) {
    return { valid: false, reason: 'Timestamp outside allowed skew window' };
  }

  const maxPayloadBytes = options.maxPayloadBytes ?? 64 * 1024;
  const payloadBytes = Buffer.byteLength(JSON.stringify(envelope.payload), 'utf-8');
  if (payloadBytes > maxPayloadBytes) {
    return { valid: false, reason: 'Payload exceeds configured size limit' };
  }

  const expectedDigest = createHash('sha256')
    .update(JSON.stringify(envelope.payload))
    .digest('hex');
  if (expectedDigest !== envelope.payloadDigest) {
    return { valid: false, reason: 'Payload digest mismatch' };
  }

  return { valid: true };
}

export function authorizeDirectMessage(
  from: string,
  to: string,
  policy: DirectMessagePolicy,
): boolean {
  const allowedRoutes = policy.allowedRoutes ?? [];
  if (allowedRoutes.length === 0) {
    return policy.defaultAllow ?? false;
  }

  return allowedRoutes.some((route) => {
    const fromAllowed = route.from === from || route.from === '*';
    const toAllowed = route.to === to || route.to === '*';
    return fromAllowed && toAllowed;
  });
}

export function isAuthorizedAgentEventName(agentId: string, eventName: string): boolean {
  if (!agentId || !isSafeEventName(eventName)) {
    return false;
  }

  const segments = eventName.split(':');
  if (segments.length < 2) {
    return false;
  }

  if (segments[0] !== 'agent' || segments[1] !== agentId) {
    return false;
  }

  if (segments.length === 2) {
    return true;
  }

  return segments.slice(2).every((segment) => AGENT_EVENT_SEGMENT.test(segment));
}

export function sanitizeEventPayload(payload: unknown, options: GuardrailPolicy = {}): unknown {
  const maxDepth = options.maxDepth ?? 8;
  const maxStringLength = options.maxStringLength ?? 4096;
  const blockedKeySet = new Set(
    (options.blockedKeys ?? DEFAULT_BLOCKED_KEYS).map((key) => key.toLowerCase()),
  );

  const visit = (value: unknown, depth: number): unknown => {
    if (depth > maxDepth) {
      return '[TRUNCATED:MAX_DEPTH]';
    }

    if (typeof value === 'string') {
      const trimmed = value.length > maxStringLength ? `${value.slice(0, maxStringLength)}...[TRUNCATED]` : value;
      return redactText(trimmed);
    }

    if (Array.isArray(value)) {
      return value.map((item) => visit(item, depth + 1));
    }

    if (typeof value === 'object' && value !== null) {
      const entries = Object.entries(value as Record<string, unknown>);
      const safe: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
      for (const [key, item] of entries) {
        if (blockedKeySet.has(key.toLowerCase())) {
          safe[key] = '[REDACTED:BLOCKED_KEY]';
          continue;
        }
        safe[key] = visit(item, depth + 1);
      }
      return safe;
    }

    return value;
  };

  return visit(payload, 0);
}
