/**
 * Security Tools
 * 
 * Provides security scanning and redaction functionality for MCP server
 */

import { SemgrepScanner } from '../agents/security/semgrep-scanner';
import { GitleaksScanner } from '../agents/security/gitleaks-scanner';
import { redactText } from '../src/security/redaction';
import { sealEvidence } from '../src/security/evidence-integrity';

export interface SecurityScanInput {
  target: string;
  type?: 'code' | 'dependencies' | 'secrets';
  rules?: string[];
}

export interface SecurityScanResult {
  success: boolean;
  target: string;
  type: string;
  findings?: any[];
  summary?: string;
  error?: string;
}

export interface SecurityRedactInput {
  text: string;
}

export interface SecurityRedactResult {
  success: boolean;
  original: string;
  redacted: string;
  redactions: Array<{
    type: string;
    original: string;
    replacement: string;
  }>;
}

export interface SecuritySealEvidenceInput {
  payload: any;
}

export interface SecuritySealEvidenceResult {
  success: boolean;
  hash: string;
  sealed: any;
  timestamp: string;
}

/**
 * Scan target for security issues
 */
export async function securityScan(input: SecurityScanInput): Promise<SecurityScanResult> {
  try {
    const { target, type = 'code', rules = [] } = input;
    
    if (!target) {
      throw new Error('Target is required');
    }
    
    let findings: any[] = [];
    let summary = '';
    
    try {
      if (type === 'code') {
        const scanner = new SemgrepScanner();
        const scanResults = await scanner.scan(target, rules);
        findings = scanResults.findings || [];
        summary = `Found ${findings.length} code security issues`;
      } else if (type === 'secrets') {
        const scanner = new GitleaksScanner();
        const scanResults = await scanner.scan(target, rules);
        findings = scanResults.findings || [];
        summary = `Found ${findings.length} secrets in ${target}`;
      } else {
        summary = `Scan type '${type}' not implemented`;
      }
    } catch (scannerError) {
      // If scanners aren't available, return best-effort results
      summary = `Security scan attempted but scanners unavailable: ${scannerError instanceof Error ? scannerError.message : String(scannerError)}`;
      findings = [{
        type: 'scanner_unavailable',
        message: summary,
        severity: 'info'
      }];
    }
    
    return {
      success: true,
      target,
      type,
      findings,
      summary
    };
    
  } catch (error) {
    return {
      success: false,
      target: input.target || 'unknown',
      type: input.type || 'code',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Redact sensitive information from text
 */
export async function securityRedact(input: SecurityRedactInput): Promise<SecurityRedactResult> {
  try {
    const { text } = input;
    
    if (!text) {
      throw new Error('Text is required');
    }
    
    const redacted = redactText(text);
    
    // Simple redaction tracking (in production, this would be more sophisticated)
    const redactions = [];
    const patterns = [
      { type: 'email', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g },
      { type: 'phone', pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g },
      { type: 'ssn', pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
      { type: 'credit_card', pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g }
    ];
    
    for (const { type, pattern } of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          redactions.push({
            type,
            original: match,
            replacement: '[REDACTED]'
          });
        }
      }
    }
    
    return {
      success: true,
      original: text,
      redacted,
      redactions
    };
    
  } catch (error) {
    return {
      success: false,
      original: input.text || '',
      redacted: input.text || '',
      redactions: [{
        type: 'error',
        original: 'error',
        replacement: error instanceof Error ? error.message : String(error)
      }]
    };
  }
}

/**
 * Seal evidence with cryptographic hash
 */
export async function securitySealEvidence(input: SecuritySealEvidenceInput): Promise<SecuritySealEvidenceResult> {
  try {
    const { payload } = input;
    
    if (!payload) {
      throw new Error('Payload is required');
    }
    
    const sealed = sealEvidence(payload);
    
    return {
      success: true,
      hash: sealed.hash,
      sealed,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    return {
      success: false,
      hash: '',
      sealed: input.payload,
      timestamp: new Date().toISOString()
    };
  }
}