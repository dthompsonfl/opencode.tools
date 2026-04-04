import { randomUUID } from 'crypto';

export type RunIdSource = 'provided' | 'env' | 'generated';

export interface ResolvedRunContext {
  runId: string;
  source: RunIdSource;
}

const RUN_ID_ENV_KEYS = ['OPENCODE_RUN_ID', 'RUN_ID'] as const;

export function resolveRunContext(explicitRunId?: string): ResolvedRunContext {
  const candidate = explicitRunId?.trim();
  if (candidate) {
    return { runId: candidate, source: 'provided' };
  }

  for (const key of RUN_ID_ENV_KEYS) {
    const envValue = process.env[key]?.trim();
    if (envValue) {
      return { runId: envValue, source: 'env' };
    }
  }

  return {
    runId: randomUUID(),
    source: 'generated'
  };
}

export interface ProvenanceMetadata {
  runtime: 'opencode-tools';
  source: RunIdSource;
  generatedAt: string;
}

export function buildProvenance(source: RunIdSource, generatedAt?: string): ProvenanceMetadata {
  return {
    runtime: 'opencode-tools',
    source,
    generatedAt: generatedAt ?? new Date().toISOString()
  };
}
