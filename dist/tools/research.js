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
Object.defineProperty(exports, "__esModule", { value: true });
exports.plan = plan;
exports.gather = gather;
exports.extractClaims = extractClaims;
exports.analyzeCitations = analyzeCitations;
exports.peerReview = peerReview;
exports.finalizeDossier = finalizeDossier;
const crypto = __importStar(require("crypto"));
const source_normalize_1 = require("./source-normalize");
const audit_1 = require("./audit");
const run_context_1 = require("../src/runtime/run-context");
const webfetch_1 = require("./webfetch");
function sentenceSplit(content) {
    return content
        .split(/(?<=[.!?])\s+/)
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
}
function toQuestions(brief) {
    const focusTokens = brief
        .toLowerCase()
        .match(/[a-z][a-z0-9-]{3,}/g)?.slice(0, 5) ?? [];
    if (focusTokens.length === 0) {
        return [
            'What measurable business goals should this research support?',
            'Which constraints most affect delivery risk?',
            'What evidence is currently missing for decision making?'
        ];
    }
    return focusTokens.map((token) => `What verifiable evidence supports decisions about ${token}?`);
}
function scoreDomain(url) {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.endsWith('.gov') || hostname.endsWith('.edu')) {
        return 0.95;
    }
    if (hostname.includes('github.com') || hostname.includes('docs.')) {
        return 0.8;
    }
    return 0.6;
}
async function plan(brief) {
    const context = (0, run_context_1.resolveRunContext)();
    const normalizedBrief = brief.trim();
    if (normalizedBrief.length < 10) {
        throw new Error('research.plan requires a meaningful brief with at least 10 characters.');
    }
    const questions = toQuestions(normalizedBrief);
    const hypotheses = [
        `The primary delivery risks are concentrated in ${questions[0].replace('What verifiable evidence supports decisions about ', '').replace('?', '')}.`,
        'A focused evidence set can reduce open architecture decisions before implementation starts.'
    ];
    await (0, audit_1.logToolCall)(context.runId, 'research.plan', { brief: normalizedBrief }, { questions, hypotheses });
    return { questions, hypotheses };
}
async function gather(query, sources) {
    const context = (0, run_context_1.resolveRunContext)();
    const normalizedEvidence = [];
    for (const sourceInput of sources) {
        const fetchResult = await (0, webfetch_1.webfetch)(sourceInput.url, 'text');
        if (!fetchResult.success) {
            continue;
        }
        const normalizedResult = await (0, source_normalize_1.normalizeSource)(fetchResult.content, sourceInput.url);
        const normalizedPayload = JSON.parse(normalizedResult.content);
        const source = {
            url: sourceInput.url,
            canonicalUrl: normalizedPayload.canonicalUrl,
            contentHash: normalizedPayload.contentHash,
            domainAuthorityScore: scoreDomain(sourceInput.url),
            recencyScore: 0.7,
            isPrimarySource: /report|docs|spec|whitepaper/i.test(sourceInput.url)
        };
        normalizedEvidence.push({
            source,
            content: normalizedPayload.cleanText
        });
    }
    await (0, audit_1.logToolCall)(context.runId, 'research.gather', {
        query,
        sourceCount: sources.length
    }, {
        normalizedCount: normalizedEvidence.length
    });
    return { normalizedEvidence };
}
async function extractClaims(normalizedEvidence, originalQuestions) {
    const context = (0, run_context_1.resolveRunContext)();
    const claims = [];
    let claimIndex = 1;
    for (const evidence of normalizedEvidence) {
        const sentences = sentenceSplit(evidence.content)
            .filter((line) => /\d|must|should|require|increase|decrease|risk/i.test(line))
            .slice(0, 2);
        for (const sentence of sentences) {
            const textOffset = evidence.content.indexOf(sentence);
            const evidencePassage = {
                sourceUrl: evidence.source.url,
                text: sentence,
                textOffset: textOffset >= 0 ? textOffset : 0,
                confidenceScore: Math.min(0.99, 0.5 + evidence.source.domainAuthorityScore / 2)
            };
            claims.push({
                id: `claim-${claimIndex++}`,
                text: sentence,
                sentiment: /risk|decline|failure|decrease/i.test(sentence) ? 'negative' : 'neutral',
                confidenceLabel: evidencePassage.confidenceScore >= 0.8 ? 'high' : 'medium',
                evidence: [evidencePassage],
                contradictions: []
            });
        }
    }
    const claimsGraph = {
        questions: originalQuestions,
        hypotheses: [
            {
                text: 'Higher quality sources increase confidence in extracted claims.',
                status: claims.length > 0 ? 'confirmed' : 'partial'
            }
        ],
        claims,
        unsupportedClaims: claims.filter((claim) => claim.evidence.length === 0)
    };
    await (0, audit_1.logToolCall)(context.runId, 'research.claims.extract', {
        evidenceCount: normalizedEvidence.length,
        questionCount: originalQuestions.length
    }, {
        claimCount: claims.length
    });
    return claimsGraph;
}
async function analyzeCitations(claimsGraph) {
    const context = (0, run_context_1.resolveRunContext)();
    const weakSources = [];
    const seen = new Set();
    for (const claim of claimsGraph.claims) {
        for (const item of claim.evidence) {
            if (!seen.has(item.sourceUrl) && !/\.gov|\.edu|github\.com/i.test(item.sourceUrl)) {
                seen.add(item.sourceUrl);
                weakSources.push({
                    url: item.sourceUrl,
                    canonicalUrl: item.sourceUrl.toLowerCase(),
                    contentHash: crypto.createHash('sha256').update(item.text).digest('hex'),
                    domainAuthorityScore: 0.4,
                    recencyScore: 0.5,
                    isPrimarySource: false
                });
            }
        }
    }
    const unsupportedClaims = claimsGraph.claims.filter((claim) => claim.evidence.length === 0);
    const analysis = {
        totalClaims: claimsGraph.claims.length,
        supportedClaims: claimsGraph.claims.length - unsupportedClaims.length,
        unsupportedClaims,
        consensusSummary: claimsGraph.claims
            .filter((claim) => claim.evidence.length > 0)
            .slice(0, 5)
            .map((claim) => ({
            claimId: claim.id,
            consensusView: claim.text,
            minorityView: claim.contradictions[0]?.text ?? 'No contradiction evidence found'
        })),
        weakSources
    };
    await (0, audit_1.logToolCall)(context.runId, 'research.citations.analyze', {
        totalClaims: analysis.totalClaims
    }, {
        unsupportedClaims: analysis.unsupportedClaims.length,
        weakSources: analysis.weakSources.length
    });
    return analysis;
}
async function peerReview(dossier, reviewer) {
    const context = (0, run_context_1.resolveRunContext)();
    const claimsCount = dossier.claims?.length ?? 0;
    const unsupported = dossier.analysis?.unsupportedClaims.length ?? 0;
    const requiredRevisions = [];
    if (unsupported > 0) {
        requiredRevisions.push('Add citations for unsupported claims before final export.');
    }
    if (claimsCount < 3) {
        requiredRevisions.push('Increase evidence coverage to at least three claims.');
    }
    const reviewerBias = reviewer === 'ExecutiveEditor' ? 1 : 0;
    const rubricScore = Math.max(1, Math.min(5, 5 - requiredRevisions.length + reviewerBias));
    const notes = `${reviewer} review complete with ${claimsCount} claims and ${unsupported} unsupported claims.`;
    await (0, audit_1.logToolCall)(context.runId, 'research.peer_review', { reviewer }, {
        rubricScore,
        requiredRevisions
    });
    return { notes, rubricScore, requiredRevisions };
}
async function finalizeDossier(claimGraph, analysis) {
    const context = (0, run_context_1.resolveRunContext)();
    if (analysis.unsupportedClaims.length > 0) {
        throw new Error('G1 Policy Violation: Dossier cannot be finalized with unsupported claims.');
    }
    const claimLines = claimGraph.claims
        .map((claim) => `- ${claim.id}: ${claim.text} (confidence: ${claim.confidenceLabel})`)
        .join('\n');
    const dossier = [
        '# Research Dossier',
        '',
        '## Supported Claims',
        claimLines || '- No claims extracted from provided evidence.',
        '',
        `Generated at: ${new Date().toISOString()}`
    ].join('\n');
    const deliverables = {
        claimCount: claimGraph.claims.length,
        weakSourceCount: analysis.weakSources.length,
        recommendedDiscoveryQuestions: claimGraph.questions.slice(0, 5),
        evidencePolicy: 'All claims must map to at least one evidence passage.'
    };
    await (0, audit_1.logToolCall)(context.runId, 'research.dossier.finalize', {
        claimCount: claimGraph.claims.length
    }, {
        dossierHash: crypto.createHash('sha256').update(dossier).digest('hex')
    });
    return { dossier, deliverables };
}
//# sourceMappingURL=research.js.map