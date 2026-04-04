"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataValidator = exports.SummaryReviewer = exports.CitationVerifier = void 0;
const llm_1 = require("../runtime/llm");
class BaseValidator {
    constructor(llm) {
        this.llm = llm || new llm_1.MockLLMProvider();
    }
    parseLLMResponse(responseContent) {
        try {
            return JSON.parse(responseContent);
        }
        catch {
            // Fallback if not JSON
            return {
                valid: false, // Fail closed for production readiness
                score: 0.0,
                comment: `Failed to parse validation response. Raw response: ${responseContent}`,
                issues: ['Parsing Error']
            };
        }
    }
    createResult(passed, scoreVal, comment, criteriaId) {
        return {
            reviewerId: this.name,
            rubricId: 'research-council-rubric',
            passed,
            totalScore: scoreVal,
            comments: comment,
            timestamp: new Date().toISOString(),
            scores: [{
                    criteriaId,
                    score: scoreVal,
                    comment
                }]
        };
    }
}
class CitationVerifier extends BaseValidator {
    constructor() {
        super(...arguments);
        this.name = 'CitationVerifier';
        this.role = 'Citation Verification';
    }
    async review(content) {
        const response = await this.llm.analyze(JSON.stringify(content), 'citation verification');
        const parsed = this.parseLLMResponse(response.content);
        return this.createResult(parsed.valid, parsed.score, parsed.comment, 'citations');
    }
}
exports.CitationVerifier = CitationVerifier;
class SummaryReviewer extends BaseValidator {
    constructor() {
        super(...arguments);
        this.name = 'SummaryReviewer';
        this.role = 'Summary Verification';
    }
    async review(content) {
        const response = await this.llm.analyze(JSON.stringify(content), 'summary verification');
        const parsed = this.parseLLMResponse(response.content);
        return this.createResult(parsed.valid, parsed.score, parsed.comment, 'summary');
    }
}
exports.SummaryReviewer = SummaryReviewer;
class DataValidator extends BaseValidator {
    constructor() {
        super(...arguments);
        this.name = 'DataValidator';
        this.role = 'Data Validity Check';
    }
    async review(content) {
        const response = await this.llm.analyze(JSON.stringify(content), 'data validity');
        const parsed = this.parseLLMResponse(response.content);
        return this.createResult(parsed.valid, parsed.score, parsed.comment, 'data-validity');
    }
}
exports.DataValidator = DataValidator;
//# sourceMappingURL=validators.js.map