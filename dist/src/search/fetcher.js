"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebFetcher = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const html_to_text_1 = require("html-to-text");
const redaction_1 = require("../security/redaction");
class WebFetcher {
    async fetch(url) {
        try {
            const response = await axios_1.default.get(url, {
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
            const text = (0, html_to_text_1.htmlToText)(html, {
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
        }
        catch (error) {
            console.error(`Failed to fetch ${url}:`, error);
            throw error;
        }
    }
    sanitize(text) {
        // Basic protection: remove lines that look like system prompts
        const lines = text.split('\n');
        const cleanLines = lines.filter(line => {
            const lower = line.toLowerCase();
            if (lower.includes('ignore previous instructions'))
                return false;
            if (lower.includes('you are a helpful assistant'))
                return false;
            return true;
        });
        return (0, redaction_1.redactText)(cleanLines.join('\n'));
    }
}
exports.WebFetcher = WebFetcher;
//# sourceMappingURL=fetcher.js.map