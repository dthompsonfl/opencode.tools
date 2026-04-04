import { CouncilMember } from './council';
import { ReviewResult, ReviewScore } from '../types/review';
import { LLMProvider, MockLLMProvider } from '../runtime/llm';

abstract class BaseValidator implements CouncilMember {
  abstract name: string;
  abstract role: string;
  protected llm: LLMProvider;

  constructor(llm?: LLMProvider) {
    this.llm = llm || new MockLLMProvider();
  }

  abstract review(content: any): Promise<ReviewResult>;

  protected parseLLMResponse(responseContent: string): { valid: boolean; score: number; comment: string; issues?: string[] } {
    try {
      return JSON.parse(responseContent);
    } catch {
      // Fallback if not JSON
      return {
        valid: false, // Fail closed for production readiness
        score: 0.0,
        comment: `Failed to parse validation response. Raw response: ${responseContent}`,
        issues: ['Parsing Error']
      };
    }
  }

  protected createResult(passed: boolean, scoreVal: number, comment: string, criteriaId: string): ReviewResult {
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

export class CitationVerifier extends BaseValidator {
  name = 'CitationVerifier';
  role = 'Citation Verification';

  async review(content: any): Promise<ReviewResult> {
    const response = await this.llm.analyze(JSON.stringify(content), 'citation verification');
    const parsed = this.parseLLMResponse(response.content);
    return this.createResult(parsed.valid, parsed.score, parsed.comment, 'citations');
  }
}

export class SummaryReviewer extends BaseValidator {
  name = 'SummaryReviewer';
  role = 'Summary Verification';

  async review(content: any): Promise<ReviewResult> {
    const response = await this.llm.analyze(JSON.stringify(content), 'summary verification');
    const parsed = this.parseLLMResponse(response.content);
    return this.createResult(parsed.valid, parsed.score, parsed.comment, 'summary');
  }
}

export class DataValidator extends BaseValidator {
  name = 'DataValidator';
  role = 'Data Validity Check';

  async review(content: any): Promise<ReviewResult> {
    const response = await this.llm.analyze(JSON.stringify(content), 'data validity');
    const parsed = this.parseLLMResponse(response.content);
    return this.createResult(parsed.valid, parsed.score, parsed.comment, 'data-validity');
  }
}
