/**
 * MCP Tool Registry - Single source of truth for all available tools
 */

import { ToolDefinition } from './defs';
import * as schemas from './schemas';
import * as wrappers from './wrappers';

// Canonical tool definitions
const CANONICAL_TOOLS: ToolDefinition[] = [
  // Web tools
  {
    name: 'webfetch',
    description: 'Fetch content from a web URL',
    inputSchema: schemas.WEBFETCH_SCHEMA
  },
  {
    name: 'search',
    description: 'Perform a web search',
    inputSchema: schemas.SEARCH_SCHEMA
  },
  {
    name: 'searchWithRetry',
    description: 'Perform a web search with retry logic',
    inputSchema: schemas.SEARCH_WITH_RETRY_SCHEMA
  },
  {
    name: 'searchForFacts',
    description: 'Search for factual information',
    inputSchema: schemas.SEARCH_FOR_FACTS_SCHEMA
  },
  
  // Rate limiting and normalization
  {
    name: 'enforceRateLimit',
    description: 'Enforce rate limiting for tools',
    inputSchema: schemas.ENFORCE_RATE_LIMIT_SCHEMA
  },
  {
    name: 'normalizeSource',
    description: 'Normalize source content',
    inputSchema: schemas.NORMALIZE_SOURCE_SCHEMA
  },
  
  // Audit tools
  {
    name: 'logToolCall',
    description: 'Log a tool call for audit purposes',
    inputSchema: schemas.LOG_TOOL_CALL_SCHEMA
  },
  {
    name: 'replayRun',
    description: 'Replay a previous run',
    inputSchema: schemas.REPLAY_RUN_SCHEMA
  },
  {
    name: 'checkReproducibility',
    description: 'Check reproducibility of a run',
    inputSchema: schemas.CHECK_REPRODUCIBILITY_SCHEMA
  },
  
  // Research tools
  {
    name: 'researchPlan',
    description: 'Create a research plan',
    inputSchema: schemas.RESEARCH_PLAN_SCHEMA
  },
  {
    name: 'researchGather',
    description: 'Gather research data',
    inputSchema: schemas.RESEARCH_GATHER_SCHEMA
  },
  {
    name: 'researchClaimsExtract',
    description: 'Extract claims from content',
    inputSchema: schemas.RESEARCH_CLAIMS_EXTRACT_SCHEMA
  },
  {
    name: 'researchCitationsAnalyze',
    description: 'Analyze citations',
    inputSchema: schemas.RESEARCH_CITATIONS_ANALYZE_SCHEMA
  },
  {
    name: 'researchPeerReview',
    description: 'Peer review research',
    inputSchema: schemas.RESEARCH_PEER_REVIEW_SCHEMA
  },
  {
    name: 'researchDossierFinalize',
    description: 'Finalize research dossier',
    inputSchema: schemas.RESEARCH_DOSSIER_FINALIZE_SCHEMA
  },
  
  // Discovery tools
  {
    name: 'startSession',
    description: 'Start a discovery session',
    inputSchema: schemas.START_SESSION_SCHEMA
  },
  {
    name: 'exportSession',
    description: 'Export a discovery session',
    inputSchema: schemas.EXPORT_SESSION_SCHEMA
  },
  {
    name: 'detectStack',
    description: 'Detect technology stack',
    inputSchema: schemas.DETECT_STACK_SCHEMA
  },
  
  // Documentation tools
  {
    name: 'generatePRD',
    description: 'Generate Product Requirements Document',
    inputSchema: schemas.GENERATE_PRD_SCHEMA
  },
  {
    name: 'generateSOW',
    description: 'Generate Statement of Work',
    inputSchema: schemas.GENERATE_SOW_SCHEMA
  },
  
  // Architecture tools
  {
    name: 'generateArchitecture',
    description: 'Generate system architecture',
    inputSchema: schemas.GENERATE_ARCHITECTURE_SCHEMA
  },
  {
    name: 'generateBacklog',
    description: 'Generate project backlog',
    inputSchema: schemas.GENERATE_BACKLOG_SCHEMA
  },
  
  // Code generation tools
  {
    name: 'scaffold',
    description: 'Generate code scaffold',
    inputSchema: schemas.SCAFFOLD_SCHEMA
  },
  {
    name: 'generateFeature',
    description: 'Generate feature implementation',
    inputSchema: schemas.GENERATE_FEATURE_SCHEMA
  },
  {
    name: 'codegenGenerateTests',
    description: 'Generate code tests',
    inputSchema: schemas.CODEGEN_GENERATE_TESTS_SCHEMA
  },
  
  // QA tools
  {
    name: 'generateTestPlan',
    description: 'Generate test plan',
    inputSchema: schemas.GENERATE_TEST_PLAN_SCHEMA
  },
  {
    name: 'generateRiskMatrix',
    description: 'Generate risk matrix',
    inputSchema: schemas.GENERATE_RISK_MATRIX_SCHEMA
  },
  {
    name: 'runStaticAnalysis',
    description: 'Run static analysis',
    inputSchema: schemas.RUN_STATIC_ANALYSIS_SCHEMA
  },
  {
    name: 'qaGenerateTests',
    description: 'Generate QA tests',
    inputSchema: schemas.QA_GENERATE_TESTS_SCHEMA
  },
  {
    name: 'qaPeerReview',
    description: 'Peer review QA',
    inputSchema: schemas.QA_PEER_REVIEW_SCHEMA
  },
  
  // Proposal tools
  {
    name: 'generateProposal',
    description: 'Generate proposal',
    inputSchema: schemas.GENERATE_PROPOSAL_SCHEMA
  },
  {
    name: 'proposalPeerReview',
    description: 'Peer review proposal',
    inputSchema: schemas.PROPOSAL_PEER_REVIEW_SCHEMA
  },
  {
    name: 'packageExport',
    description: 'Export package',
    inputSchema: schemas.PACKAGE_EXPORT_SCHEMA
  },
  
  // Delivery tools
  {
    name: 'generateRunbook',
    description: 'Generate deployment runbook',
    inputSchema: schemas.GENERATE_RUNBOOK_SCHEMA
  },
  {
    name: 'generateNginxConfig',
    description: 'Generate nginx configuration',
    inputSchema: schemas.GENERATE_NGINX_CONFIG_SCHEMA
  },
  {
    name: 'runSmoketest',
    description: 'Run smoke tests',
    inputSchema: schemas.RUN_SMOKETEST_SCHEMA
  },
  {
    name: 'packageHandoff',
    description: 'Package handoff',
    inputSchema: schemas.PACKAGE_HANDOFF_SCHEMA
  },
  
  // CI tools
  {
    name: 'ciVerify',
    description: 'Verify CI configuration',
    inputSchema: schemas.CI_VERIFY_SCHEMA
  },
  
  // Document generation tools
  {
    name: 'generateDocument',
    description: 'Generate document',
    inputSchema: schemas.GENERATE_DOCUMENT_SCHEMA
  },
  {
    name: 'generateDOCX',
    description: 'Generate DOCX document',
    inputSchema: schemas.GENERATE_DOCX_SCHEMA
  },
  {
    name: 'generateXLSX',
    description: 'Generate XLSX spreadsheet',
    inputSchema: schemas.GENERATE_XLSX_SCHEMA
  },
  {
    name: 'generatePPTX',
    description: 'Generate PPTX presentation',
    inputSchema: schemas.GENERATE_PPTX_SCHEMA
  },
  {
    name: 'generateCSV',
    description: 'Generate CSV file',
    inputSchema: schemas.GENERATE_CSV_SCHEMA
  },
  {
    name: 'generateMarkdown',
    description: 'Generate Markdown document',
    inputSchema: schemas.GENERATE_MARKDOWN_SCHEMA
  },
  {
    name: 'generateQuickDocument',
    description: 'Generate quick document',
    inputSchema: schemas.GENERATE_QUICK_DOCUMENT_SCHEMA
  },
  
  // Foundry tools
  {
    name: 'foundryOrchestrate',
    description: 'Orchestrate Foundry workflow',
    inputSchema: schemas.FOUNDRY_ORCHESTRATE_SCHEMA
  },
  {
    name: 'foundryStatus',
    description: 'Get Foundry status',
    inputSchema: schemas.FOUNDRY_STATUS_SCHEMA
  },
  {
    name: 'foundryHealth',
    description: 'Get Foundry health',
    inputSchema: schemas.FOUNDRY_HEALTH_SCHEMA
  },
  {
    name: 'foundryCreateRequest',
    description: 'Create Foundry request',
    inputSchema: schemas.FOUNDRY_CREATE_REQUEST_SCHEMA
  },
  
  // Gateway tools
  {
    name: 'cto_sweep',
    description: 'Perform CTO sweep',
    inputSchema: schemas.CTO_SWEEP_SCHEMA
  },
  
  // Cowork tools
  {
    name: 'coworkList',
    description: 'List cowork items',
    inputSchema: schemas.COWORK_LIST_SCHEMA
  },
  {
    name: 'coworkRun',
    description: 'Run cowork command',
    inputSchema: schemas.COWORK_RUN_SCHEMA
  },
  {
    name: 'coworkSpawn',
    description: 'Spawn cowork agent',
    inputSchema: schemas.COWORK_SPAWN_SCHEMA
  },
  {
    name: 'coworkHealth',
    description: 'Get cowork health',
    inputSchema: schemas.COWORK_HEALTH_SCHEMA
  },
  {
    name: 'coworkPlugins',
    description: 'List cowork plugins',
    inputSchema: schemas.COWORK_PLUGINS_SCHEMA
  },
  {
    name: 'coworkAgents',
    description: 'List cowork agents',
    inputSchema: schemas.COWORK_AGENTS_SCHEMA
  },
  
  // New tools
  {
    name: 'pdf_generate',
    description: 'Generate PDF document',
    inputSchema: schemas.PDF_GENERATE_SCHEMA
  },
  {
    name: 'summarization_summarize',
    description: 'Summarize content using AI',
    inputSchema: schemas.SUMMARIZATION_SUMMARIZE_SCHEMA
  },
  {
    name: 'security_scan',
    description: 'Scan for security issues',
    inputSchema: schemas.SECURITY_SCAN_SCHEMA
  },
  {
    name: 'security_redact',
    description: 'Redact sensitive information',
    inputSchema: schemas.SECURITY_REDACT_SCHEMA
  },
  {
    name: 'security_seal_evidence',
    description: 'Seal evidence with cryptographic hash',
    inputSchema: schemas.SECURITY_SEAL_EVIDENCE_SCHEMA
  },
  {
    name: 'opencode_tools_cli',
    description: 'Execute opencode-tools CLI command',
    inputSchema: schemas.OPENCODE_TOOLS_CLI_SCHEMA
  }
];

// Handler mapping
export const TOOL_HANDLERS: Record<string, (args: any) => Promise<any>> = {
  // Web tools
  webfetch: wrappers.webfetchWrapper,
  search: wrappers.searchWrapper,
  searchWithRetry: wrappers.searchWithRetryWrapper,
  searchForFacts: wrappers.searchForFactsWrapper,
  
  // Rate limiting and normalization
  enforceRateLimit: wrappers.enforceRateLimitWrapper,
  normalizeSource: wrappers.normalizeSourceWrapper,
  
  // Audit tools
  logToolCall: wrappers.logToolCallWrapper,
  replayRun: wrappers.replayRunWrapper,
  checkReproducibility: wrappers.checkReproducibilityWrapper,
  
  // Research tools
  researchPlan: wrappers.researchPlanWrapper,
  researchGather: wrappers.researchGatherWrapper,
  researchClaimsExtract: wrappers.researchClaimsExtractWrapper,
  researchCitationsAnalyze: wrappers.researchCitationsAnalyzeWrapper,
  researchPeerReview: wrappers.researchPeerReviewWrapper,
  researchDossierFinalize: wrappers.researchDossierFinalizeWrapper,
  
  // Discovery tools
  startSession: wrappers.startSessionWrapper,
  exportSession: wrappers.exportSessionWrapper,
  detectStack: wrappers.detectStackWrapper,
  
  // Documentation tools
  generatePRD: wrappers.generatePRDWrapper,
  generateSOW: wrappers.generateSOWWrapper,
  
  // Architecture tools
  generateArchitecture: wrappers.generateArchitectureWrapper,
  generateBacklog: wrappers.generateBacklogWrapper,
  
  // Code generation tools
  scaffold: wrappers.scaffoldWrapper,
  generateFeature: wrappers.generateFeatureWrapper,
  codegenGenerateTests: wrappers.codegenGenerateTestsWrapper,
  
  // QA tools
  generateTestPlan: wrappers.generateTestPlanWrapper,
  generateRiskMatrix: wrappers.generateRiskMatrixWrapper,
  runStaticAnalysis: wrappers.runStaticAnalysisWrapper,
  qaGenerateTests: wrappers.qaGenerateTestsWrapper,
  qaPeerReview: wrappers.qaPeerReviewWrapper,
  
  // Proposal tools
  generateProposal: wrappers.generateProposalWrapper,
  proposalPeerReview: wrappers.proposalPeerReviewWrapper,
  packageExport: wrappers.packageExportWrapper,
  
  // Delivery tools
  generateRunbook: wrappers.generateRunbookWrapper,
  generateNginxConfig: wrappers.generateNginxConfigWrapper,
  runSmoketest: wrappers.runSmoketestWrapper,
  packageHandoff: wrappers.packageHandoffWrapper,
  
  // CI tools
  ciVerify: wrappers.ciVerifyWrapper,
  
  // Document generation tools
  generateDocument: wrappers.generateDocumentWrapper,
  generateDOCX: wrappers.generateDOCXWrapper,
  generateXLSX: wrappers.generateXLSXWrapper,
  generatePPTX: wrappers.generatePPTXWrapper,
  generateCSV: wrappers.generateCSVWrapper,
  generateMarkdown: wrappers.generateMarkdownWrapper,
  generateQuickDocument: wrappers.generateQuickDocumentWrapper,
  
  // Foundry tools
  foundryOrchestrate: wrappers.foundryOrchestrateWrapper,
  foundryStatus: wrappers.foundryStatusWrapper,
  foundryHealth: wrappers.foundryHealthWrapper,
  foundryCreateRequest: wrappers.foundryCreateRequestWrapper,
  
  // Gateway tools
  cto_sweep: wrappers.ctoSweepWrapper,
  
  // Cowork tools
  coworkList: wrappers.coworkListWrapper,
  coworkRun: wrappers.coworkRunWrapper,
  coworkSpawn: wrappers.coworkSpawnWrapper,
  coworkHealth: wrappers.coworkHealthWrapper,
  coworkPlugins: wrappers.coworkPluginsWrapper,
  coworkAgents: wrappers.coworkAgentsWrapper,
  
  // New tools
  pdf_generate: wrappers.pdfGenerateWrapper,
  summarization_summarize: wrappers.summarizationSummarizeWrapper,
  security_scan: wrappers.securityScanWrapper,
  security_redact: wrappers.securityRedactWrapper,
  security_seal_evidence: wrappers.securitySealEvidenceWrapper,
  opencode_tools_cli: wrappers.opencodeToolsCliWrapper
};

// Generate aliases
export const EXPLICIT_ALIASES: Record<string, string> = {
  // Existing MCP server names
  'cto_sweep': 'cto_sweep',
  'foundry_status': 'foundryStatus',
  'foundry_health': 'foundryHealth',
  'cowork_list': 'coworkList',
  'cowork_run': 'coworkRun',
  'cowork_spawn': 'coworkSpawn',
  
  // Scripts/native-integrate.ts names
  'search_with_retry': 'searchWithRetry',
  'search_for_facts': 'searchForFacts',
  'rate_limit': 'enforceRateLimit',
  'source_normalize': 'normalizeSource',
  'audit_log': 'logToolCall',
  'audit_replay': 'replayRun',
  'audit_check_reproducibility': 'checkReproducibility',
  'research_extract_claims': 'researchClaimsExtract',
  'research_analyze_citations': 'researchCitationsAnalyze',
  'research_finalize': 'researchDossierFinalize',
  'discovery_start_session': 'startSession',
  'discovery_export_session': 'exportSession',
  'docs_generate_prd': 'generatePRD',
  'docs_generate_sow': 'generateSOW',
  'arch_generate': 'generateArchitecture',
  'backlog_generate': 'generateBacklog',
  'codegen_scaffold': 'scaffold',
  'codegen_feature': 'generateFeature',
  'codegen_tests': 'codegenGenerateTests',
  'qa_generate_testplan': 'generateTestPlan',
  'qa_generate_risk_matrix': 'generateRiskMatrix',
  'qa_static_analysis': 'runStaticAnalysis',
  'qa_generate_tests': 'qaGenerateTests',
  'qa_peer_review': 'qaPeerReview',
  'proposal_generate': 'generateProposal',
  'proposal_peer_review': 'proposalPeerReview',
  'proposal_export': 'packageExport',
  'delivery_generate_runbook': 'generateRunbook',
  'delivery_generate_nginx': 'generateNginxConfig',
  'delivery_smoketest': 'runSmoketest',
  'delivery_handoff': 'packageHandoff',
  'documents_docx': 'generateDOCX',
  'documents_xlsx': 'generateXLSX',
  'documents_pptx': 'generatePPTX',
  'documents_csv': 'generateCSV',
  'documents_md': 'generateMarkdown',
  'ci_verify': 'ciVerify',
  
  // opencode.json dotted/hyphen aliases
  'arch.generate': 'generateArchitecture',
  'backlog.generate': 'generateBacklog',
  'docs.prd.generate': 'generatePRD',
  'docs.sow.generate': 'generateSOW',
  'codegen.scaffold': 'scaffold',
  'codegen.feature': 'generateFeature',
  'codegen.tests': 'codegenGenerateTests',
  'qa.testplan.generate': 'generateTestPlan',
  'qa.risk_matrix.generate': 'generateRiskMatrix',
  'qa.static.run': 'runStaticAnalysis',
  'qa.peer_review': 'qaPeerReview',
  'proposal.generate': 'generateProposal',
  'proposal.peer_review': 'proposalPeerReview',
  'proposal.package.export': 'packageExport',
  'delivery.runbook.generate': 'generateRunbook',
  'delivery.nginx.generate': 'generateNginxConfig',
  'delivery.smoketest.run': 'runSmoketest',
  'delivery.handoff.package': 'packageHandoff',
  'documents.docx.generate': 'generateDOCX',
  'documents.xlsx.generate': 'generateXLSX',
  'documents.pptx.generate': 'generatePPTX',
  'documents.csv.generate': 'generateCSV',
  'documents.md.generate': 'generateMarkdown',
  'ci.verify': 'ciVerify',
  'rate-limit': 'enforceRateLimit',
  'source-normalize': 'normalizeSource',
  'audit_logToolCall': 'logToolCall',
  'audit.logToolCall': 'logToolCall',
  'audit_replayRun': 'replayRun',
  'audit.replayRun': 'replayRun',
  'audit_checkReproducibility': 'checkReproducibility',
  'audit.checkReproducibility': 'checkReproducibility',
  'discovery.session.export': 'exportSession',
  'discovery_session_export': 'exportSession',
  'research.plan': 'researchPlan',
  'research.gather': 'researchGather',
  'research.claims.extract': 'researchClaimsExtract',
  'research_claims_extract': 'researchClaimsExtract',
  'research.citations.analyze': 'researchCitationsAnalyze',
  'research_citations_analyze': 'researchCitationsAnalyze',
  'research.dossier.finalize': 'researchDossierFinalize',
  'research_dossier_finalize': 'researchDossierFinalize'
};

function generateAliases(): ToolDefinition[] {
  const aliases: ToolDefinition[] = [];
  
  for (const [aliasName, canonicalName] of Object.entries(EXPLICIT_ALIASES)) {
    const canonicalTool = CANONICAL_TOOLS.find(t => t.name === canonicalName);
    if (canonicalTool) {
      aliases.push({
        name: aliasName,
        description: canonicalTool.description,
        inputSchema: canonicalTool.inputSchema
      });
    }
  }
  
  return aliases;
}

export const TOOL_ALIASES = generateAliases();
export const TOOL_DEFS: ToolDefinition[] = [...CANONICAL_TOOLS, ...TOOL_ALIASES];

// Helper function to get handler by name (including aliases)
export function getToolHandler(name: string): ((args: any) => Promise<any>) | undefined {
  if (Object.prototype.hasOwnProperty.call(TOOL_HANDLERS, name)) {
    return TOOL_HANDLERS[name];
  }
  
  if (Object.prototype.hasOwnProperty.call(EXPLICIT_ALIASES, name)) {
    const canonicalName = EXPLICIT_ALIASES[name];
    if (canonicalName && Object.prototype.hasOwnProperty.call(TOOL_HANDLERS, canonicalName)) {
      return TOOL_HANDLERS[canonicalName];
    }
  }
  
  return undefined;
}