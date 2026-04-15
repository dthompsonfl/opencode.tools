"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockLLMProvider = void 0;
const llm_1 = require("../tui/llm");
class MockLLMProvider {
    async generate(prompt, context) {
        if (process.env.NODE_ENV === 'test' || process.env.COWORK_ALLOW_MOCK_LLM === 'true') {
            if (prompt.includes('summarize') || prompt.includes('summary')) {
                return {
                    content: `**Executive Summary**\n\nBased on the extensive research provided, this report outlines the key findings regarding the target subject. The data suggests a strong market presence and significant opportunities for growth.\n\n**Key Findings**:\n1. Market leadership in core sectors.\n2. Innovation driven by recent R&D investments.\n3. Potential risks in supply chain stability.\n\n**Conclusion**\nThe subject demonstrates robust health with specific areas requiring attention.`
                };
            }
            return {
                content: `Generated content based on prompt: ${prompt.substring(0, 50)}...`
            };
        }
        else {
            const provider = (0, llm_1.createProvider)('openai');
            const response = await provider.chatCompletion({
                messages: [{ role: 'user', content: prompt }]
            });
            return { content: response.content || '' };
        }
    }
    async analyze(content, criteria) {
        if (process.env.NODE_ENV === 'test' || process.env.COWORK_ALLOW_MOCK_LLM === 'true') {
            if (criteria.includes('citation') || criteria.includes('verify')) {
                return {
                    content: JSON.stringify({
                        valid: true,
                        score: 0.95,
                        issues: [],
                        comment: "Citations appear valid and reachable."
                    })
                };
            }
            if (criteria.includes('credibility') || criteria.includes('validity')) {
                return {
                    content: JSON.stringify({
                        valid: true,
                        score: 0.88,
                        issues: ["Minor inconsistency in date formatting"],
                        comment: "Data sources are credible and cross-referenced."
                    })
                };
            }
            return {
                content: JSON.stringify({
                    valid: true,
                    score: 0.9,
                    comment: "Analysis passed based on provided criteria."
                })
            };
        }
        else {
            const provider = (0, llm_1.createProvider)('openai');
            const response = await provider.chatCompletion({
                messages: [{ role: 'user', content: `Analyze the following content based on these criteria: ${criteria}\n\nContent:\n${content}` }]
            });
            return { content: response.content || '' };
        }
    }
}
exports.MockLLMProvider = MockLLMProvider;
//# sourceMappingURL=llm.js.map