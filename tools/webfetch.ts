/**
 * Fetches content from a specified URL, handles HTTP requests, and extracts text using a readability algorithm.
 * 
 * SECURITY: Includes SSRF protection to prevent access to internal services.
 */
import axios from 'axios';
import { convert } from 'html-to-text';
import { URL } from 'url';

export interface WebFetchResult {
  success: boolean;
  content: string;
  url: string;
  error?: string;
  status?: number;
}

// SSRF Protection: Block internal/private IP ranges
const INTERNAL_IP_PATTERNS = [
  /^127\./,                           // Localhost
  /^10\./,                            // Private Class A
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // Private Class B
  /^192\.168\./,                      // Private Class C
  /^169\.254\./,                      // Link-local
  /^0\./,                             // Current network
  /^224\./,                           // Multicast
  /^240\./,                           // Reserved
  /^::1$/,                            // IPv6 localhost
  /^fe80:/i,                          // IPv6 link-local
  /^fc00:/i,                          // IPv6 unique local
  /^fd00:/i,                          // IPv6 unique local
];

// Maximum content size (5MB)
const MAX_CONTENT_SIZE = 5 * 1024 * 1024;

// Allowed protocols
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

/**
 * Check if a hostname resolves to an internal IP
 */
async function isInternalTarget(hostname: string): Promise<boolean> {
  // Check hostname patterns directly
  for (const pattern of INTERNAL_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return true;
    }
  }
  
  // Try to resolve and check the IP
  try {
    const dns = await import('dns');
    const { promises: dnsPromises } = dns;
    const addresses = await dnsPromises.resolve4(hostname).catch(() => []);
    const addresses6 = await dnsPromises.resolve6(hostname).catch(() => []);
    const allAddresses = [...addresses, ...addresses6];
    
    for (const ip of allAddresses) {
      for (const pattern of INTERNAL_IP_PATTERNS) {
        if (pattern.test(ip)) {
          return true;
        }
      }
    }
  } catch {
    // DNS resolution failed - might be a hostname we can't resolve
    // Be conservative and allow it (it likely won't connect anyway)
  }
  
  return false;
}

/**
 * Validate URL for SSRF protection
 */
async function validateUrl(urlString: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const url = new URL(urlString);
    
    // Check protocol allowlist
    if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
      return { valid: false, error: `Protocol '${url.protocol}' is not allowed. Only http: and https: are permitted.` };
    }
    
    // Check for internal IP/hostname
    const hostname = url.hostname.toLowerCase();
    if (await isInternalTarget(hostname)) {
      return { valid: false, error: `Cannot fetch from internal/private IP or hostname: ${hostname}` };
    }
    
    // Check for common internal ports
    const dangerousPorts = [22, 23, 25, 3306, 5432, 6379, 27017, 11211];
    const port = parseInt(url.port || (url.protocol === 'https:' ? '443' : '80'), 10);
    if (dangerousPorts.includes(port)) {
      return { valid: false, error: `Port ${port} is not allowed for security reasons.` };
    }
    
    return { valid: true };
  } catch (error: any) {
    return { valid: false, error: `Invalid URL: ${error.message}` };
  }
}

export async function webfetch(url: string, format: 'markdown' | 'text' | 'html' = 'markdown'): Promise<WebFetchResult> {
  // SSRF Protection: Validate URL before making request
  const validation = await validateUrl(url);
  if (!validation.valid) {
    return {
      success: false,
      content: '',
      url,
      error: `Security validation failed: ${validation.error}`,
      status: 400
    };
  }
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OpenCodeResearchBot/1.0; +http://opencode.tools)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 15000, // 15 seconds timeout
      validateStatus: (status) => status < 400, // Reject on 4xx/5xx
      maxContentLength: MAX_CONTENT_SIZE, // Limit response size
      maxBodyLength: MAX_CONTENT_SIZE
    });

    const html = response.data;
    let content = html;

    if (format === 'markdown' || format === 'text') {
      content = convert(html, {
        wordwrap: 130,
        selectors: [
          { selector: 'a', options: { ignoreHref: true } },
          { selector: 'img', format: 'skip' },
          { selector: 'script', format: 'skip' },
          { selector: 'style', format: 'skip' },
          { selector: 'nav', format: 'skip' },
          { selector: 'footer', format: 'skip' },
          { selector: 'header', format: 'skip' }
        ]
      });
    }

    return {
      success: true,
      content,
      url: response.request.res.responseUrl || url,
      status: response.status
    };
  } catch (error: any) {
    return {
      success: false,
      content: '',
      url,
      error: error.message,
      status: error.response?.status
    };
  }
}
