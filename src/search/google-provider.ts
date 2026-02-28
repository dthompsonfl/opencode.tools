import axios from 'axios';
import { SearchProvider, SearchResult } from './types';

export class GoogleSearchProvider implements SearchProvider {
  name = 'GoogleCustomSearch';
  private apiKey: string;
  private cx: string;

  constructor(apiKey: string, cx: string) {
    this.apiKey = apiKey;
    this.cx = cx;
  }

  async search(query: string, limit: number = 10): Promise<SearchResult[]> {
    if (!this.apiKey || !this.cx) {
        throw new Error('Google Search API keys missing. Please provide a valid apiKey and cx parameter.');
    }

    try {
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: this.apiKey,
          cx: this.cx,
          q: query,
          num: limit
        }
      });

      return (response.data.items || []).map((item: any) => ({
        url: item.link,
        title: item.title,
        snippet: item.snippet,
        source: 'google'
      }));
    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  }
}
