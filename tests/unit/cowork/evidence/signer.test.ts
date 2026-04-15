/**
 * Evidence Signer Tests
 */

import { EvidenceSigner, Evidence } from '../../../../src/cowork/evidence/signer';

describe('EvidenceSigner', () => {
  let signer: EvidenceSigner;

  beforeEach(() => {
    EvidenceSigner['instance'] = undefined as unknown as EvidenceSigner;
    signer = EvidenceSigner.getInstance();
  });

  afterEach(() => {
    EvidenceSigner['instance'] = undefined as unknown as EvidenceSigner;
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = EvidenceSigner.getInstance();
      const instance2 = EvidenceSigner.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('generateKeyPair', () => {
    it('should generate a key pair', () => {
      signer.generateKeyPair();
      expect(signer.hasKeys()).toBe(true);
      expect(signer.getKeyId()).toBeTruthy();
    });

    it('should generate unique key IDs', () => {
      signer.generateKeyPair();
      const keyId1 = signer.getKeyId();
      
      signer.generateKeyPair();
      const keyId2 = signer.getKeyId();
      
      expect(keyId1).not.toBe(keyId2);
    });
  });

  describe('signEvidence', () => {
    it('should auto-generate keys if not present', () => {
      const evidence: Evidence = {
        id: 'test-evidence-1',
        type: 'test',
        source: 'test-source',
        projectId: 'project-1',
        timestamp: Date.now(),
        content: { data: 'test' },
        metadata: {}
      };

      const signed = signer.signEvidence(evidence);
      
      expect(signer.hasKeys()).toBe(true);
      expect(signed.signature).toBeTruthy();
      expect(signed.contentHash).toBeTruthy();
      expect(signed.signedAt).toBeGreaterThan(0);
      expect(signed.signedBy).toBe('evidence-collector');
    });

    it('should include all evidence fields in signed evidence', () => {
      signer.generateKeyPair();
      
      const evidence: Evidence = {
        id: 'test-evidence-2',
        type: 'agent_output',
        source: 'agent-1',
        projectId: 'project-1',
        timestamp: 1234567890,
        content: { result: 'success' },
        metadata: { key: 'value' }
      };

      const signed = signer.signEvidence(evidence, 'custom-signer');
      
      expect(signed.id).toBe(evidence.id);
      expect(signed.type).toBe(evidence.type);
      expect(signed.source).toBe(evidence.source);
      expect(signed.projectId).toBe(evidence.projectId);
      expect(signed.timestamp).toBe(evidence.timestamp);
      expect(signed.content).toEqual(evidence.content);
      expect(signed.metadata).toEqual(evidence.metadata);
      expect(signed.signedBy).toBe('custom-signer');
    });
  });

  describe('verifySignature', () => {
    it('should verify valid signatures', () => {
      signer.generateKeyPair();
      
      const evidence: Evidence = {
        id: 'test-evidence-3',
        type: 'test',
        source: 'test-source',
        projectId: 'project-1',
        timestamp: Date.now(),
        content: { data: 'test' },
        metadata: {}
      };

      const signed = signer.signEvidence(evidence);
      const isValid = signer.verifySignature(signed);
      
      expect(isValid).toBe(true);
    });

    it('should fail verification for tampered content', () => {
      signer.generateKeyPair();
      
      const evidence: Evidence = {
        id: 'test-evidence-4',
        type: 'test',
        source: 'test-source',
        projectId: 'project-1',
        timestamp: Date.now(),
        content: { data: 'original' },
        metadata: {}
      };

      const signed = signer.signEvidence(evidence);
      
      // Tamper with content
      signed.content = { data: 'tampered' };
      
      const isValid = signer.verifySignature(signed);
      expect(isValid).toBe(false);
    });

    it('should verify with provided public key', () => {
      signer.generateKeyPair();
      const publicKey = signer.exportPublicKey();
      
      const evidence: Evidence = {
        id: 'test-evidence-5',
        type: 'test',
        source: 'test-source',
        projectId: 'project-1',
        timestamp: Date.now(),
        content: { data: 'test' },
        metadata: {}
      };

      const signed = signer.signEvidence(evidence);
      
      // Create new instance and verify with exported public key
      EvidenceSigner['instance'] = undefined as unknown as EvidenceSigner;
      const newSigner = EvidenceSigner.getInstance();
      
      const isValid = newSigner.verifySignature(signed, publicKey!);
      expect(isValid).toBe(true);
    });

    it('should return false when no public key available', () => {
      const evidence: Evidence = {
        id: 'test-evidence-6',
        type: 'test',
        source: 'test-source',
        projectId: 'project-1',
        timestamp: Date.now(),
        content: { data: 'test' },
        metadata: {}
      };

      const signed = signer.signEvidence(evidence);
      
      // Clear keys
      EvidenceSigner['instance'] = undefined as unknown as EvidenceSigner;
      const newSigner = EvidenceSigner.getInstance();
      
      const isValid = newSigner.verifySignature(signed);
      expect(isValid).toBe(false);
    });
  });

  describe('hashContent', () => {
    it('should generate consistent hashes for same content', () => {
      const content = { test: 'data', number: 123 };
      
      const hash1 = signer.hashContent(content);
      const hash2 = signer.hashContent(content);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex string
    });

    it('should generate different hashes for different content', () => {
      const hash1 = signer.hashContent({ data: 'a' });
      const hash2 = signer.hashContent({ data: 'b' });
      
      expect(hash1).not.toBe(hash2);
    });

    it('should hash string content directly', () => {
      const hash = signer.hashContent('test string');
      expect(hash).toHaveLength(64);
    });
  });

  describe('importKeyPair', () => {
    it('should import and use external keys', () => {
      // Generate keys first
      signer.generateKeyPair();
      const publicKey = signer.exportPublicKey()!;
      const privateKey = (signer as unknown as { privateKey: string }).privateKey;

      // Create new instance and import keys
      EvidenceSigner['instance'] = undefined as unknown as EvidenceSigner;
      const newSigner = EvidenceSigner.getInstance();
      
      newSigner.importKeyPair(privateKey, publicKey, 'imported-key');
      
      expect(newSigner.hasKeys()).toBe(true);
      expect(newSigner.getKeyId()).toBe('imported-key');
      expect(newSigner.exportPublicKey()).toBe(publicKey);
    });
  });
});
