import { convert } from 'html-to-text';
import * as crypto from 'crypto';

/**
 * Normalizes and processes raw source content for consistency and deduplication.
 */
export async function normalizeSource(rawContent: string, originalUrl: string): Promise<any> {
    const cleanText = convert(rawContent, {
        wordwrap: 130
    });

    const contentHash = crypto.createHash('sha256').update(cleanText).digest('hex');
    const canonicalUrl = new URL(originalUrl).href.toLowerCase();

    return {
        success: true,
        content: JSON.stringify({
            canonicalUrl,
            contentHash,
            cleanText,
            isDuplicate: false, // In a real system, we would check against a database of hashes
            language: 'en'
        })
    };
}
