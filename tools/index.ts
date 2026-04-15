// Web fetch and search tools
export { webfetch } from './webfetch';
export { search, searchWithRetry, searchForFacts } from './search';

// Rate limiting and normalization
export { enforceRateLimit } from './rate-limit';
export { normalizeSource } from './source-normalize';

// Audit tools
export { logToolCall, replayRun, checkReproducibility } from './audit';

// Research tools
export { 
  plan as researchPlan, 
  gather as researchGather, 
  extractClaims as researchClaimsExtract, 
  analyzeCitations as researchCitationsAnalyze,
  peerReview as researchPeerReview,
  finalizeDossier as researchDossierFinalize 
} from './research';

// Discovery tools
export { startSession, exportSession, detectStack } from './discovery';

// Documentation tools
export { generatePRD, generateSOW } from './docs';

// Architecture tools
export { generateArchitecture, generateBacklog } from './architecture';

// Code generation tools (explicit exports to avoid conflicts)
export { scaffold, generateFeature, generateTests as codegenGenerateTests } from './codegen';

// QA tools (explicit exports to avoid conflicts)
export { 
  generateTestPlan, 
  generateRiskMatrix, 
  runStaticAnalysis, 
  generateTests as qaGenerateTests, 
  peerReview as qaPeerReview 
} from './qa';

// Proposal tools (explicit exports to avoid conflicts)
export { 
  generateProposal, 
  peerReview as proposalPeerReview, 
  packageExport 
} from './proposal';

// Delivery tools
export { generateRunbook, generateNginxConfig, runSmoketest, packageHandoff } from './delivery';

// CI tools
export { verify as ciVerify } from './ci';

// Document generation tools (DOCX, XLSX, PPTX, CSV, MD)
export { 
  generateDocument, 
  generateDOCX, 
  generateXLSX, 
  generatePPTX, 
  generateCSV, 
  generateMarkdown,
  generateQuickDocument 
} from './documents';

// Foundry orchestration tools
export { 
  foundryOrchestrate,
  foundryStatus,
  foundryHealth,
  foundryCreateRequest
} from './foundry';

// Gateway MCP tools
export { cto_sweep } from './mcp-server-legacy';

// Cowork multi-agent runtime tools
export { 
  coworkList,
  coworkRun,
  coworkSpawn,
  coworkHealth,
  coworkPlugins,
  coworkAgents
} from './cowork';

// New tools for MCP
export { pdfGenerate } from './pdf';
export { summarizeDossier } from './summarization';
export { securityScan, securityRedact, securitySealEvidence } from './security';