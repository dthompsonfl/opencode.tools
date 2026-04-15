import axios from 'axios';
import * as cheerio from 'cheerio';
import { htmlToText } from 'html-to-text';
import { redactText } from '../security/redaction';

export interface WebPage {
  url: string;
  title: string;
  content: string; // Markdown or text
  html: string;
  metadata: Record<string, any>;
}

export class WebFetcher {
  async fetch(url: string): Promise<WebPage> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'OpenCode/1.0 (ResearchBot)'
        },
        timeout: 10000
      });

      const html = response.data;
      const $ = cheerio.load(html);
      
      // Remove scripts, styles, etc.
      $('script').remove();
      $('style').remove();
      $('nav').remove();
      $('footer').remove();
      $('header').remove();

      const title = $('title').text().trim();
      const text = htmlToText(html, {
        wordwrap: 130
      });

      // Prompt Injection Protection: Strip instruction-like content
      const cleanText = this.sanitize(text);

      return {
        url,
        title,
        content: cleanText,
        html, // Store raw HTML if needed for evidence, but maybe truncate?
        metadata: {
          fetchedAt: new Date().toISOString(),
          contentType: response.headers['content-type']
        }
      };
    } catch (error) {
      console.error(`Failed to fetch ${url}:`, error);
      throw error;
    }
  }

  private sanitize(text: string): string {
    // Basic protection: remove lines that look like system prompts
    const lines = text.split('\n');
    const cleanLines = lines.filter(line => {
      const lower = line.toLowerCase();
      if (lower.includes('ignore previous instructions')) return false;
      if (lower.includes('you are a helpful assistant')) return false;
      return true;
    });
    return redactText(cleanLines.join('\n'));
  }
}
