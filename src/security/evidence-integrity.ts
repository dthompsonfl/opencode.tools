import * as crypto from 'crypto';

const EVIDENCE_SECRET = process.env.EVIDENCE_SECRET || crypto.randomBytes(32).toString('hex');

export function sealEvidence(payload: any): any {
  // Simple deterministic stringify for canonicalization
  const canonicalStringify = (obj: any): string => {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return `[${obj.map(canonicalStringify).join(',')}]`;
    }
    const keys = Object.keys(obj).sort();
    return `{${keys.map(key => `${JSON.stringify(key)}:${canonicalStringify(obj[key])}`).join(',')}}`;
  };

  const payloadWithMetadata = {
    ...payload,
    sealedAt: new Date().toISOString(),
    runId: process.env.RUN_ID || 'unknown',
  };

  const hmac = crypto.createHmac('sha256', EVIDENCE_SECRET);
  const hash = hmac.update(canonicalStringify(payloadWithMetadata)).digest('hex');

  return { ...payloadWithMetadata, hash };
}