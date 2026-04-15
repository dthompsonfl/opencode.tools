/**
 * Real Web Search Tool
 * 
 * Executes search queries using DuckDuckGo HTML and parses results properly.
 * Uses cheerio for HTML parsing to extract real search results.
 */
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface SearchResult {
    title: string;
    url: string;
    snippet: string;
    position: number;
}

export interface SearchResponse {
    success: boolean;
    query: string;
    results: SearchResult[];
    totalResults?: number;
    error?: string;
}

/**
 * Executes a search query using DuckDuckGo HTML
 */
export async function search(query: string, options?: {
    numResults?: number;
    safeSearch?: boolean;
}): Promise<SearchResponse> {
    const numResults = options?.numResults || 10;
    
    if (!query || query.trim().length === 0) {
        return {
            success: false,
            query,
            results: [],
            error: 'Search query cannot be empty'
        };
    }

    try {
        // Fetch DuckDuckGo HTML results
        const response = await axios.get(`https://html.duckduckgo.com/html/`, {
            params: {
                q: query,
                b: 1  // Start from first result
            },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const results: SearchResult[] = [];
        
        // Parse search results from DuckDuckGo HTML
        $('.result').each((index, element) => {
            if (index >= numResults) return;
            
            const $element = $(element);
            const $link = $element.find('.result__a');
            const $snippet = $element.find('.result__snippet');
            const $title = $element.find('.result__a');
            
            const title = $title.text().trim() || $link.attr('title') || '';
            const url = $link.attr('href') || '';
            const snippet = $snippet.text().trim() || $element.find('.result__description').text().trim() || '';
            
            // DuckDuckGo uses redirects, extract actual URL
            let cleanUrl = url;
            if (url.includes('uddg=')) {
                try {
                    const urlObj = new URL(url);
                    cleanUrl = urlObj.searchParams.get('uddg') || url;
                } catch {
                    // Keep original URL if parsing fails
                }
            }
            
            if (title && cleanUrl) {
                results.push({
                    title,
                    url: cleanUrl,
                    snippet: snippet.replace(/\s+/g, ' ').trim(),
                    position: index + 1
                });
            }
        });

        // Also check for "no results" message
        if (results.length === 0) {
            const noResults = $('.result--no-results').text();
            if (noResults) {
                return {
                    success: true,
                    query,
                    results: [],
                    error: 'No results found'
                };
            }
        }

        return {
            success: true,
            query,
            results,
            totalResults: results.length
        };

    } catch (error: any) {
        // Handle specific error types
        if (error.code === 'ECONNABORTED') {
            return {
                success: false,
                query,
                results: [],
                error: 'Search request timed out. Please try again.'
            };
        }
        
        if (error.response?.status === 403) {
            return {
                success: false,
                query,
                results: [],
                error: 'Search service temporarily unavailable. Rate limit may be exceeded.'
            };
        }
        
        return {
            success: false,
            query,
            results: [],
            error: error.message || 'Search failed'
        };
    }
}

/**
 * Search with retry logic for resilience
 */
export async function searchWithRetry(
    query: string, 
    options?: {
        numResults?: number;
        maxRetries?: number;
        retryDelay?: number;
    }
): Promise<SearchResponse> {
    const maxRetries = options?.maxRetries || 3;
    const retryDelay = options?.retryDelay || 2000;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const result = await search(query, options);
        
        if (result.success) {
            return result;
        }
        
        // Don't retry on certain errors
        if (result.error?.includes('empty') || result.error?.includes('No results')) {
            return result;
        }
        
        // Wait before retrying
        if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
    }
    
    return {
        success: false,
        query,
        results: [],
        error: `Search failed after ${maxRetries} attempts`
    };
}

/**
 * Extract structured data from search results
 */
export async function searchForFacts(query: string, factsToFind: string[]): Promise<{
    success: boolean;
    facts: Record<string, string | null>;
}> {
    const result = await search(query, { numResults: 5 });
    
    if (!result.success) {
        return { success: false, facts: {} };
    }
    
    const facts: Record<string, string | null> = {};
    
    for (const fact of factsToFind) {
        // Search for each fact in results
        const factResult = await search(`${query} ${fact}`, { numResults: 3 });
        
        if (factResult.success && factResult.results.length > 0) {
            // Extract potential answer from snippets
            const snippet = factResult.results[0].snippet;
            facts[fact] = snippet;
        } else {
            facts[fact] = null;
        }
    }
    
    return { success: true, facts };
}

export default search;
