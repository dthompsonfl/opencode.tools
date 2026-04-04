import { z } from 'zod';
import { buildProvenance, resolveRunContext } from './run-context';

export const ToolResponseEnvelopeSchema = z.object({
  success: z.boolean(),
  runId: z.string().min(1),
  toolName: z.string().min(1),
  timestamp: z.string().datetime(),
  provenance: z.object({
    runtime: z.literal('opencode-tools'),
    source: z.enum(['provided', 'env', 'generated']),
    generatedAt: z.string().datetime()
  }),
  data: z.unknown(),
  error: z.object({
    message: z.string().min(1),
    code: z.string().optional(),
    details: z.unknown().optional()
  }).optional()
}).strict();

export type ToolResponseEnvelope<T = unknown> = Omit<z.infer<typeof ToolResponseEnvelopeSchema>, 'data'> & {
  data: T;
};

export function createToolResponseEnvelope<T>(params: {
  toolName: string;
  data: T;
  runId?: string;
  success?: boolean;
  error?: { message: string; code?: string; details?: unknown };
  timestamp?: string;
}): ToolResponseEnvelope<T> {
  const timestamp = params.timestamp ?? new Date().toISOString();
  const context = resolveRunContext(params.runId);

  return ToolResponseEnvelopeSchema.parse({
    success: params.success ?? true,
    runId: context.runId,
    toolName: params.toolName,
    timestamp,
    provenance: buildProvenance(context.source, timestamp),
    data: params.data,
    error: params.error
  }) as ToolResponseEnvelope<T>;
}

export function normalizeToolResponseEnvelope<T>(
  toolName: string,
  payload: T,
  runId?: string
): ToolResponseEnvelope<T> {
  const candidate = ToolResponseEnvelopeSchema.safeParse(payload);
  if (candidate.success) {
    return candidate.data as ToolResponseEnvelope<T>;
  }

  if (payload && typeof payload === 'object') {
    const maybeEnvelope = payload as Record<string, unknown>;
    if ('runId' in maybeEnvelope || 'toolName' in maybeEnvelope || 'provenance' in maybeEnvelope) {
      throw new Error(`Invalid tool response envelope for ${toolName}: ${candidate.error.message}`);
    }
  }

  return createToolResponseEnvelope({
    toolName,
    runId,
    data: payload
  });
}

export function assertToolResponseEnvelope(payload: unknown): ToolResponseEnvelope {
  return ToolResponseEnvelopeSchema.parse(payload) as ToolResponseEnvelope;
}
