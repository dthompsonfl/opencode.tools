/**
 * Evidence Signer
 *
 * Provides cryptographic signing for evidence collection using RSA key pairs.
 * Ensures evidence integrity and non-repudiation through digital signatures.
 */

import { logger } from '../../runtime/logger';
import crypto from 'crypto';

const KEY_PAIR_BITS = 2048;
const HASH_ALGORITHM = 'sha256';
const SIGN_ALGORITHM = 'RSA-SHA256';

export interface Evidence {
  id: string;
  type: string;
  source: string;
  projectId: string;
  timestamp: number;
  content: unknown;
  metadata: Record<string, unknown>;
}

export interface SignedEvidence extends Evidence {
  signature: string;
  contentHash: string;
  signedAt: number;
  signedBy: string;
}

export class EvidenceSigner {
  private static instance: EvidenceSigner;
  private privateKey: string | null = null;
  private publicKey: string | null = null;
  private keyId: string | null = null;

  private constructor() {}

  public static getInstance(): EvidenceSigner {
    if (!EvidenceSigner.instance) {
      EvidenceSigner.instance = new EvidenceSigner();
    }
    return EvidenceSigner.instance;
  }

  /**
   * Generate a new RSA key pair for signing
   */
  public generateKeyPair(): void {
    try {
      const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: KEY_PAIR_BITS,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });

      this.privateKey = privateKey;
      this.publicKey = publicKey;
      this.keyId = `key-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      logger.info('[EvidenceSigner] Generated new RSA key pair', { keyId: this.keyId });
    } catch (error) {
      logger.error('[EvidenceSigner] Failed to generate key pair', error);
      throw new Error('Failed to generate cryptographic key pair');
    }
  }

  /**
   * Sign evidence with the private key
   */
  public signEvidence(
    evidence: Evidence,
    signedBy: string = 'evidence-collector'
  ): SignedEvidence {
    if (!this.privateKey) {
      logger.warn('[EvidenceSigner] No key pair available, generating new keys');
      this.generateKeyPair();
    }

    try {
      const contentHash = this.hashContent(evidence.content);
      const dataToSign = this.createSignaturePayload(evidence, contentHash);

      const sign = crypto.createSign(SIGN_ALGORITHM);
      sign.update(dataToSign);
      sign.end();

      const signature = sign.sign(this.privateKey!, 'base64');

      logger.debug(`[EvidenceSigner] Signed evidence ${evidence.id}`, {
        keyId: this.keyId,
        signatureLength: signature.length
      });

      return {
        ...evidence,
        signature,
        contentHash,
        signedAt: Date.now(),
        signedBy
      };
    } catch (error) {
      logger.error(`[EvidenceSigner] Failed to sign evidence ${evidence.id}`, error);
      throw new Error(`Failed to sign evidence: ${evidence.id}`);
    }
  }

  /**
   * Verify the signature of signed evidence
   */
  public verifySignature(evidence: SignedEvidence, publicKey?: string): boolean {
    const keyToUse = publicKey || this.publicKey;

    if (!keyToUse) {
      logger.warn('[EvidenceSigner] No public key available for verification');
      return false;
    }

    try {
      // Verify content hash matches
      const computedHash = this.hashContent(evidence.content);
      if (computedHash !== evidence.contentHash) {
        logger.warn(`[EvidenceSigner] Content hash mismatch for evidence ${evidence.id}`);
        return false;
      }

      // Verify signature
      const verify = crypto.createVerify(SIGN_ALGORITHM);
      const dataToVerify = this.createSignaturePayload(evidence, evidence.contentHash);
      verify.update(dataToVerify);
      verify.end();

      const isValid = verify.verify(keyToUse, evidence.signature, 'base64');

      logger.debug(`[EvidenceSigner] Signature verification for ${evidence.id}: ${isValid}`);

      return isValid;
    } catch (error) {
      logger.error(`[EvidenceSigner] Error verifying signature for ${evidence.id}`, error);
      return false;
    }
  }

  /**
   * Hash content using SHA-256
   */
  public hashContent(content: unknown): string {
    const contentString = typeof content === 'string'
      ? content
      : JSON.stringify(content);

    return crypto.createHash(HASH_ALGORITHM)
      .update(contentString)
      .digest('hex');
  }

  /**
   * Export the public key
   */
  public exportPublicKey(): string | null {
    return this.publicKey;
  }

  /**
   * Import a key pair
   */
  public importKeyPair(privateKey: string, publicKey: string, keyId?: string): void {
    this.privateKey = privateKey;
    this.publicKey = publicKey;
    this.keyId = keyId || `imported-${Date.now()}`;

    logger.info('[EvidenceSigner] Imported key pair', { keyId: this.keyId });
  }

  /**
   * Check if keys are available
   */
  public hasKeys(): boolean {
    return this.privateKey !== null && this.publicKey !== null;
  }

  /**
   * Get the current key ID
   */
  public getKeyId(): string | null {
    return this.keyId;
  }

  /**
   * Create the payload to sign
   */
  private createSignaturePayload(evidence: Evidence, contentHash: string): string {
    return JSON.stringify({
      id: evidence.id,
      type: evidence.type,
      source: evidence.source,
      projectId: evidence.projectId,
      timestamp: evidence.timestamp,
      contentHash,
      metadata: evidence.metadata
    });
  }
}

export default EvidenceSigner;
