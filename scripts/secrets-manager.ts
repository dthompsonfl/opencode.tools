/**
 * Secrets Manager integration.
 *
 * Loads secrets securely from environment variables, preventing committed secrets.
 * In advanced deployments, this would interface with AWS Secrets Manager, Hashicorp Vault, etc.
 */

/**
 * Retrieves a secret value by key from the environment.
 * Throws an error if the secret is not found.
 * @param key The key of the secret to retrieve.
 * @returns The secret value.
 */
export function getSecret(key: string): string {
  const secret = process.env[key];

  if (!secret) {
    throw new Error(`CRITICAL: Secret '${key}' not found in environment. Please ensure it is set before running.`);
  }

  return secret;
}
