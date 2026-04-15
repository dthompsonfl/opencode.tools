import * as crypto from 'crypto';
import { ClaimsGraph, Claim, EvidencePassage, Source, CitationAnalysis } from '../src/types/research';
import { normalizeSource } from './source-normalize';
import { logToolCall } from './audit';
import { resolveRunContext } from '../src/runtime/run-context';
import { webfetch } from './webfetch';

function sentenceSplit(content: string): string[] {
  return content
    .split(/(?<=[.!?])\s+/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function toQuestions(brief: string): string[] {
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

function scoreDomain(url: string): number {
  const hostname = new URL(url).hostname.toLowerCase();
  if (hostname.endsWith('.gov') || hostname.endsWith('.edu')) {
    return 0.95;
  }
  if (hostname.includes('github.com') || hostname.includes('docs.')) {
    return 0.8;
  }
  return 0.6;
}

export async function plan(brief: string): Promise<{ questions: string[]; hypotheses: string[] }> {
  const context = resolveRunContext();
  const normalizedBrief = brief.trim();

  if (normalizedBrief.length < 10) {
    throw new Error('research.plan requires a meaningful brief with at least 10 characters.');
  }

  const questions = toQuestions(normalizedBrief);
  const hypotheses = [
    `The primary delivery risks are concentrated in ${questions[0].replace('What verifiable evidence supports decisions about ', '').replace('?', '')}.`,
    'A focused evidence set can reduce open architecture decisions before implementation starts.'
  ];

  await logToolCall(context.runId, 'research.plan', { brief: normalizedBrief }, { questions, hypotheses });
  return { questions, hypotheses };
}

export async function gather(
  query: string,
  sources: { url: string }[]
): Promise<{ normalizedEvidence: { source: Source; content: string }[] }> {
  const context = resolveRunContext();
  const normalizedEvidence: { source: Source; content: string }[] = [];

  for (const sourceInput of sources) {
    const fetchResult = await webfetch(sourceInput.url, 'text');
    if (!fetchResult.success) {
      continue;
    }

    const normalizedResult = await normalizeSource(fetchResult.content, sourceInput.url);
    const normalizedPayload = JSON.parse(normalizedResult.content) as {
      canonicalUrl: string;
      contentHash: string;
      cleanText: string;
    };

    const source: Source = {
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

  await logToolCall(context.runId, 'research.gather', {
    query,
    sourceCount: sources.length
  }, {
    normalizedCount: normalizedEvidence.length
  });

  return { normalizedEvidence };
}

export async function extractClaims(
  normalizedEvidence: { source: Source; content: string }[],
  originalQuestions: string[]
): Promise<ClaimsGraph> {
  const context = resolveRunContext();
  const claims: Claim[] = [];
  let claimIndex = 1;

  for (const evidence of normalizedEvidence) {
    const sentences = sentenceSplit(evidence.content)
      .filter((line) => /\d|must|should|require|increase|decrease|risk/i.test(line))
      .slice(0, 2);

    for (const sentence of sentences) {
      const textOffset = evidence.content.indexOf(sentence);
      const evidencePassage: EvidencePassage = {
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

  const claimsGraph: ClaimsGraph = {
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

  await logToolCall(context.runId, 'research.claims.extract', {
    evidenceCount: normalizedEvidence.length,
    questionCount: originalQuestions.length
  }, {
    claimCount: claims.length
  });

  return claimsGraph;
}

export async function analyzeCitations(claimsGraph: ClaimsGraph): Promise<CitationAnalysis> {
  const context = resolveRunContext();
  const weakSources: Source[] = [];

  const seen = new Set<string>();
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
  const analysis: CitationAnalysis = {
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

  await logToolCall(context.runId, 'research.citations.analyze', {
    totalClaims: analysis.totalClaims
  }, {
    unsupportedClaims: analysis.unsupportedClaims.length,
    weakSources: analysis.weakSources.length
  });

  return analysis;
}

export async function peerReview(
  dossier: { claims?: Claim[]; analysis?: CitationAnalysis },
  reviewer: 'Methodology' | 'Citation' | 'Adversarial' | 'ExecutiveEditor'
): Promise<{ notes: string; rubricScore: number; requiredRevisions: string[] }> {
  const context = resolveRunContext();
  const claimsCount = dossier.claims?.length ?? 0;
  const unsupported = dossier.analysis?.unsupportedClaims.length ?? 0;
  const requiredRevisions: string[] = [];

  if (unsupported > 0) {
    requiredRevisions.push('Add citations for unsupported claims before final export.');
  }
  if (claimsCount < 3) {
    requiredRevisions.push('Increase evidence coverage to at least three claims.');
  }

  const reviewerBias = reviewer === 'ExecutiveEditor' ? 1 : 0;
  const rubricScore = Math.max(1, Math.min(5, 5 - requiredRevisions.length + reviewerBias));
  const notes = `${reviewer} review complete with ${claimsCount} claims and ${unsupported} unsupported claims.`;

  await logToolCall(context.runId, 'research.peer_review', { reviewer }, {
    rubricScore,
    requiredRevisions
  });

  return { notes, rubricScore, requiredRevisions };
}

export async function finalizeDossier(
  claimGraph: ClaimsGraph,
  analysis: CitationAnalysis
): Promise<{ dossier: string; deliverables: Record<string, unknown> }> {
  const context = resolveRunContext();

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

  const deliverables: Record<string, unknown> = {
    claimCount: claimGraph.claims.length,
    weakSourceCount: analysis.weakSources.length,
    recommendedDiscoveryQuestions: claimGraph.questions.slice(0, 5),
    evidencePolicy: 'All claims must map to at least one evidence passage.'
  };

  await logToolCall(context.runId, 'research.dossier.finalize', {
    claimCount: claimGraph.claims.length
  }, {
    dossierHash: crypto.createHash('sha256').update(dossier).digest('hex')
  });

  return { dossier, deliverables };
}
