/**
 * Evidence Collection Module
 *
 * Provides cryptographic signing and automatic evidence collection from
 * agent outputs, task completions, findings, and state transitions.
 */

export {
  EvidenceSigner,
  Evidence,
  SignedEvidence
} from './signer';

export {
  EvidenceCollector,
  EvidenceContext,
  EvidenceFilter,
  EvidenceManifest,
  EvidencePackage,
  IntegrityReport
} from './collector';
