/**
 * Evidence Key Store
 *
 * Persistent storage for evidence signing keys using XDG data directory.
 * Keys are stored at ~/.local/share/opencode/opencode-tools/evidence/
 *
 * Security features:
 * - Keys are stored with restricted permissions (0600 on Unix)
 * - Key files are named by key ID for auditability
 * - Supports key rotation and multiple keys
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { logger } from '../../runtime/logger';

export interface StoredKey {
  keyId: string;
  privateKey: string;
  publicKey: string;
  createdAt: number;
  algorithm: string;
  active: boolean;
}

export interface KeyStoreOptions {
  /** Override default data directory */
  dataDir?: string;
}

const KEY_ALGORITHM = 'RSA-SHA256';
const KEY_BITS = 2048;

/**
 * Get XDG data directory for key storage
 */
function getXdgDataDir(): string {
  const xdgDataHome = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
  return path.join(xdgDataHome, 'opencode', 'opencode-tools', 'evidence');
}

/**
 * Create the key store
 */
export function createKeyStore(options: KeyStoreOptions = {}) {
  const dataDir = options.dataDir || getXdgDataDir();
  const keysFile = path.join(dataDir, 'keys.json');
  const keysDir = path.join(dataDir, 'keys');

  /**
   * Ensure data directory exists with secure permissions
   */
  function ensureDataDir(): void {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      
      // Set restrictive permissions on Unix
      if (process.platform !== 'win32') {
        try {
          fs.chmodSync(dataDir, 0o700);
        } catch {
          // Ignore permission errors
        }
      }
    }

    if (!fs.existsSync(keysDir)) {
      fs.mkdirSync(keysDir, { recursive: true });
      
      if (process.platform !== 'win32') {
        try {
          fs.chmodSync(keysDir, 0o700);
        } catch {
          // Ignore permission errors
        }
      }
    }
  }

  /**
   * Load all stored keys
   */
  function loadKeys(): StoredKey[] {
    ensureDataDir();

    if (!fs.existsSync(keysFile)) {
      return [];
    }

    try {
      const content = fs.readFileSync(keysFile, 'utf-8');
      return JSON.parse(content) as StoredKey[];
    } catch (error) {
      logger.error('[KeyStore] Failed to load keys file:', error);
      return [];
    }
  }

  /**
   * Save keys to storage
   */
  function saveKeys(keys: StoredKey[]): void {
    ensureDataDir();

    try {
      fs.writeFileSync(keysFile, JSON.stringify(keys, null, 2), 'utf-8');
      
      // Set restrictive permissions on Unix
      if (process.platform !== 'win32') {
        try {
          fs.chmodSync(keysFile, 0o600);
        } catch {
          // Ignore permission errors
        }
      }
    } catch (error) {
      logger.error('[KeyStore] Failed to save keys:', error);
      throw new Error('Failed to save key store');
    }
  }

  /**
   * Generate a new key pair
   */
  function generateKeyPair(): { privateKey: string; publicKey: string; keyId: string } {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: KEY_BITS,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    const keyId = `key-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;

    return { privateKey, publicKey, keyId };
  }

  return {
    /**
     * Initialize the key store and generate a key if needed
     */
    initialize(): StoredKey {
      ensureDataDir();

      const keys = loadKeys();
      const activeKey = keys.find(k => k.active);

      if (activeKey) {
        logger.info(`[KeyStore] Using existing active key: ${activeKey.keyId}`);
        return activeKey;
      }

      // Generate new key if none exists
      const { privateKey, publicKey, keyId } = generateKeyPair();
      
      const newKey: StoredKey = {
        keyId,
        privateKey,
        publicKey,
        createdAt: Date.now(),
        algorithm: KEY_ALGORITHM,
        active: true,
      };

      keys.push(newKey);
      saveKeys(keys);

      // Also save individual key file for auditability
      const keyFilePath = path.join(keysDir, `${keyId}.pem`);
      fs.writeFileSync(keyFilePath, JSON.stringify({
        keyId,
        publicKey,
        createdAt: newKey.createdAt,
        algorithm: newKey.algorithm,
      }, null, 2), 'utf-8');

      logger.info(`[KeyStore] Generated new key: ${keyId}`);
      return newKey;
    },

    /**
     * Get the active key
     */
    getActiveKey(): StoredKey | null {
      const keys = loadKeys();
      return keys.find(k => k.active) || null;
    },

    /**
     * Get a key by ID
     */
    getKey(keyId: string): StoredKey | null {
      const keys = loadKeys();
      return keys.find(k => k.keyId === keyId) || null;
    },

    /**
     * Rotate keys - generate new active key, deactivate old
     */
    rotateKey(): StoredKey {
      ensureDataDir();

      const keys = loadKeys();
      
      // Deactivate all existing keys
      for (const key of keys) {
        key.active = false;
      }

      // Generate new key
      const { privateKey, publicKey, keyId } = generateKeyPair();
      
      const newKey: StoredKey = {
        keyId,
        privateKey,
        publicKey,
        createdAt: Date.now(),
        algorithm: KEY_ALGORITHM,
        active: true,
      };

      keys.push(newKey);
      saveKeys(keys);

      logger.info(`[KeyStore] Rotated to new key: ${keyId}`);
      return newKey;
    },

    /**
     * List all keys (public info only)
     */
    listKeys(): Array<{ keyId: string; createdAt: number; active: boolean }> {
      const keys = loadKeys();
      return keys.map(k => ({
        keyId: k.keyId,
        createdAt: k.createdAt,
        active: k.active,
      }));
    },

    /**
     * Sign a payload with the active key
     */
    signPayload(payload: string): { signature: string; keyId: string } | null {
      const activeKey = this.getActiveKey();
      if (!activeKey) {
        logger.error('[KeyStore] No active key available for signing');
        return null;
      }

      try {
        const sign = crypto.createSign(KEY_ALGORITHM);
        sign.update(payload);
        sign.end();

        const signature = sign.sign(activeKey.privateKey, 'base64');
        return { signature, keyId: activeKey.keyId };
      } catch (error) {
        logger.error('[KeyStore] Failed to sign payload:', error);
        return null;
      }
    },

    /**
     * Verify a signature with a specific key
     */
    verifySignature(payload: string, signature: string, keyId: string): boolean {
      const key = this.getKey(keyId);
      if (!key) {
        logger.warn(`[KeyStore] Key not found: ${keyId}`);
        return false;
      }

      try {
        const verify = crypto.createVerify(KEY_ALGORITHM);
        verify.update(payload);
        verify.end();

        return verify.verify(key.publicKey, signature, 'base64');
      } catch (error) {
        logger.error('[KeyStore] Failed to verify signature:', error);
        return false;
      }
    },

    /**
     * Get the data directory path
     */
    getDataDir(): string {
      return dataDir;
    },

    /**
     * Check if key store is initialized
     */
    isInitialized(): boolean {
      return fs.existsSync(keysFile);
    },
  };
}

export type KeyStore = ReturnType<typeof createKeyStore>;
