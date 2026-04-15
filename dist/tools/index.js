"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cto_sweep = exports.foundryCreateRequest = exports.foundryHealth = exports.foundryStatus = exports.foundryOrchestrate = exports.generateQuickDocument = exports.generateMarkdown = exports.generateCSV = exports.generatePPTX = exports.generateXLSX = exports.generateDOCX = exports.generateDocument = exports.ciVerify = exports.packageHandoff = exports.runSmoketest = exports.generateNginxConfig = exports.generateRunbook = exports.packageExport = exports.proposalPeerReview = exports.generateProposal = exports.qaPeerReview = exports.qaGenerateTests = exports.runStaticAnalysis = exports.generateRiskMatrix = exports.generateTestPlan = exports.codegenGenerateTests = exports.generateFeature = exports.scaffold = exports.generateBacklog = exports.generateArchitecture = exports.generateSOW = exports.generatePRD = exports.detectStack = exports.exportSession = exports.startSession = exports.researchDossierFinalize = exports.researchPeerReview = exports.researchCitationsAnalyze = exports.researchClaimsExtract = exports.researchGather = exports.researchPlan = exports.checkReproducibility = exports.replayRun = exports.logToolCall = exports.normalizeSource = exports.enforceRateLimit = exports.searchForFacts = exports.searchWithRetry = exports.search = exports.webfetch = void 0;
exports.securitySealEvidence = exports.securityRedact = exports.securityScan = exports.summarizeDossier = exports.pdfGenerate = exports.coworkAgents = exports.coworkPlugins = exports.coworkHealth = exports.coworkSpawn = exports.coworkRun = exports.coworkList = void 0;
// Web fetch and search tools
var webfetch_1 = require("./webfetch");
Object.defineProperty(exports, "webfetch", { enumerable: true, get: function () { return webfetch_1.webfetch; } });
var search_1 = require("./search");
Object.defineProperty(exports, "search", { enumerable: true, get: function () { return search_1.search; } });
Object.defineProperty(exports, "searchWithRetry", { enumerable: true, get: function () { return search_1.searchWithRetry; } });
Object.defineProperty(exports, "searchForFacts", { enumerable: true, get: function () { return search_1.searchForFacts; } });
// Rate limiting and normalization
var rate_limit_1 = require("./rate-limit");
Object.defineProperty(exports, "enforceRateLimit", { enumerable: true, get: function () { return rate_limit_1.enforceRateLimit; } });
var source_normalize_1 = require("./source-normalize");
Object.defineProperty(exports, "normalizeSource", { enumerable: true, get: function () { return source_normalize_1.normalizeSource; } });
// Audit tools
var audit_1 = require("./audit");
Object.defineProperty(exports, "logToolCall", { enumerable: true, get: function () { return audit_1.logToolCall; } });
Object.defineProperty(exports, "replayRun", { enumerable: true, get: function () { return audit_1.replayRun; } });
Object.defineProperty(exports, "checkReproducibility", { enumerable: true, get: function () { return audit_1.checkReproducibility; } });
// Research tools
var research_1 = require("./research");
Object.defineProperty(exports, "researchPlan", { enumerable: true, get: function () { return research_1.plan; } });
Object.defineProperty(exports, "researchGather", { enumerable: true, get: function () { return research_1.gather; } });
Object.defineProperty(exports, "researchClaimsExtract", { enumerable: true, get: function () { return research_1.extractClaims; } });
Object.defineProperty(exports, "researchCitationsAnalyze", { enumerable: true, get: function () { return research_1.analyzeCitations; } });
Object.defineProperty(exports, "researchPeerReview", { enumerable: true, get: function () { return research_1.peerReview; } });
Object.defineProperty(exports, "researchDossierFinalize", { enumerable: true, get: function () { return research_1.finalizeDossier; } });
// Discovery tools
var discovery_1 = require("./discovery");
Object.defineProperty(exports, "startSession", { enumerable: true, get: function () { return discovery_1.startSession; } });
Object.defineProperty(exports, "exportSession", { enumerable: true, get: function () { return discovery_1.exportSession; } });
Object.defineProperty(exports, "detectStack", { enumerable: true, get: function () { return discovery_1.detectStack; } });
// Documentation tools
var docs_1 = require("./docs");
Object.defineProperty(exports, "generatePRD", { enumerable: true, get: function () { return docs_1.generatePRD; } });
Object.defineProperty(exports, "generateSOW", { enumerable: true, get: function () { return docs_1.generateSOW; } });
// Architecture tools
var architecture_1 = require("./architecture");
Object.defineProperty(exports, "generateArchitecture", { enumerable: true, get: function () { return architecture_1.generateArchitecture; } });
Object.defineProperty(exports, "generateBacklog", { enumerable: true, get: function () { return architecture_1.generateBacklog; } });
// Code generation tools (explicit exports to avoid conflicts)
var codegen_1 = require("./codegen");
Object.defineProperty(exports, "scaffold", { enumerable: true, get: function () { return codegen_1.scaffold; } });
Object.defineProperty(exports, "generateFeature", { enumerable: true, get: function () { return codegen_1.generateFeature; } });
Object.defineProperty(exports, "codegenGenerateTests", { enumerable: true, get: function () { return codegen_1.generateTests; } });
// QA tools (explicit exports to avoid conflicts)
var qa_1 = require("./qa");
Object.defineProperty(exports, "generateTestPlan", { enumerable: true, get: function () { return qa_1.generateTestPlan; } });
Object.defineProperty(exports, "generateRiskMatrix", { enumerable: true, get: function () { return qa_1.generateRiskMatrix; } });
Object.defineProperty(exports, "runStaticAnalysis", { enumerable: true, get: function () { return qa_1.runStaticAnalysis; } });
Object.defineProperty(exports, "qaGenerateTests", { enumerable: true, get: function () { return qa_1.generateTests; } });
Object.defineProperty(exports, "qaPeerReview", { enumerable: true, get: function () { return qa_1.peerReview; } });
// Proposal tools (explicit exports to avoid conflicts)
var proposal_1 = require("./proposal");
Object.defineProperty(exports, "generateProposal", { enumerable: true, get: function () { return proposal_1.generateProposal; } });
Object.defineProperty(exports, "proposalPeerReview", { enumerable: true, get: function () { return proposal_1.peerReview; } });
Object.defineProperty(exports, "packageExport", { enumerable: true, get: function () { return proposal_1.packageExport; } });
// Delivery tools
var delivery_1 = require("./delivery");
Object.defineProperty(exports, "generateRunbook", { enumerable: true, get: function () { return delivery_1.generateRunbook; } });
Object.defineProperty(exports, "generateNginxConfig", { enumerable: true, get: function () { return delivery_1.generateNginxConfig; } });
Object.defineProperty(exports, "runSmoketest", { enumerable: true, get: function () { return delivery_1.runSmoketest; } });
Object.defineProperty(exports, "packageHandoff", { enumerable: true, get: function () { return delivery_1.packageHandoff; } });
// CI tools
var ci_1 = require("./ci");
Object.defineProperty(exports, "ciVerify", { enumerable: true, get: function () { return ci_1.verify; } });
// Document generation tools (DOCX, XLSX, PPTX, CSV, MD)
var documents_1 = require("./documents");
Object.defineProperty(exports, "generateDocument", { enumerable: true, get: function () { return documents_1.generateDocument; } });
Object.defineProperty(exports, "generateDOCX", { enumerable: true, get: function () { return documents_1.generateDOCX; } });
Object.defineProperty(exports, "generateXLSX", { enumerable: true, get: function () { return documents_1.generateXLSX; } });
Object.defineProperty(exports, "generatePPTX", { enumerable: true, get: function () { return documents_1.generatePPTX; } });
Object.defineProperty(exports, "generateCSV", { enumerable: true, get: function () { return documents_1.generateCSV; } });
Object.defineProperty(exports, "generateMarkdown", { enumerable: true, get: function () { return documents_1.generateMarkdown; } });
Object.defineProperty(exports, "generateQuickDocument", { enumerable: true, get: function () { return documents_1.generateQuickDocument; } });
// Foundry orchestration tools
var foundry_1 = require("./foundry");
Object.defineProperty(exports, "foundryOrchestrate", { enumerable: true, get: function () { return foundry_1.foundryOrchestrate; } });
Object.defineProperty(exports, "foundryStatus", { enumerable: true, get: function () { return foundry_1.foundryStatus; } });
Object.defineProperty(exports, "foundryHealth", { enumerable: true, get: function () { return foundry_1.foundryHealth; } });
Object.defineProperty(exports, "foundryCreateRequest", { enumerable: true, get: function () { return foundry_1.foundryCreateRequest; } });
// Gateway MCP tools
var mcp_server_legacy_1 = require("./mcp-server-legacy");
Object.defineProperty(exports, "cto_sweep", { enumerable: true, get: function () { return mcp_server_legacy_1.cto_sweep; } });
// Cowork multi-agent runtime tools
var cowork_1 = require("./cowork");
Object.defineProperty(exports, "coworkList", { enumerable: true, get: function () { return cowork_1.coworkList; } });
Object.defineProperty(exports, "coworkRun", { enumerable: true, get: function () { return cowork_1.coworkRun; } });
Object.defineProperty(exports, "coworkSpawn", { enumerable: true, get: function () { return cowork_1.coworkSpawn; } });
Object.defineProperty(exports, "coworkHealth", { enumerable: true, get: function () { return cowork_1.coworkHealth; } });
Object.defineProperty(exports, "coworkPlugins", { enumerable: true, get: function () { return cowork_1.coworkPlugins; } });
Object.defineProperty(exports, "coworkAgents", { enumerable: true, get: function () { return cowork_1.coworkAgents; } });
// New tools for MCP
var pdf_1 = require("./pdf");
Object.defineProperty(exports, "pdfGenerate", { enumerable: true, get: function () { return pdf_1.pdfGenerate; } });
var summarization_1 = require("./summarization");
Object.defineProperty(exports, "summarizeDossier", { enumerable: true, get: function () { return summarization_1.summarizeDossier; } });
var security_1 = require("./security");
Object.defineProperty(exports, "securityScan", { enumerable: true, get: function () { return security_1.securityScan; } });
Object.defineProperty(exports, "securityRedact", { enumerable: true, get: function () { return security_1.securityRedact; } });
Object.defineProperty(exports, "securitySealEvidence", { enumerable: true, get: function () { return security_1.securitySealEvidence; } });
//# sourceMappingURL=index.js.map