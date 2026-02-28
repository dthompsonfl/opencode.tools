"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleSearchProvider = void 0;
const axios_1 = __importDefault(require("axios"));
class GoogleSearchProvider {
    constructor(apiKey, cx) {
        this.name = 'GoogleCustomSearch';
        this.apiKey = apiKey;
        this.cx = cx;
    }
    async search(query, limit = 10) {
        if (!this.apiKey || !this.cx) {
            throw new Error('Google Search API keys missing. Please provide a valid apiKey and cx parameter.');
        }
        try {
            const response = await axios_1.default.get('https://www.googleapis.com/customsearch/v1', {
                params: {
                    key: this.apiKey,
                    cx: this.cx,
                    q: query,
                    num: limit
                }
            });
            return (response.data.items || []).map((item) => ({
                url: item.link,
                title: item.title,
                snippet: item.snippet,
                source: 'google'
            }));
        }
        catch (error) {
            console.error('Search failed:', error);
            throw error;
        }
    }
}
exports.GoogleSearchProvider = GoogleSearchProvider;
//# sourceMappingURL=google-provider.js.map