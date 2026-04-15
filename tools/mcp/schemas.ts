/**
 * JSON Schemas for MCP tool wrappers
 */

export const WEBFETCH_SCHEMA = {
  type: 'object',
  properties: {
    url: { type: 'string', description: 'URL to fetch' }
  },
  required: ['url'],
  additionalProperties: true
};

export const SEARCH_SCHEMA = {
  type: 'object',
  properties: {
    query: { type: 'string', description: 'Search query' },
    num: { type: 'number', description: 'Number of results', minimum: 1, maximum: 20 }
  },
  required: ['query'],
  additionalProperties: true
};

export const SEARCH_WITH_RETRY_SCHEMA = {
  type: 'object',
  properties: {
    query: { type: 'string', description: 'Search query' },
    num: { type: 'number', description: 'Number of results', minimum: 1, maximum: 20 },
    retries: { type: 'number', description: 'Number of retries', minimum: 0, maximum: 5 }
  },
  required: ['query'],
  additionalProperties: true
};

export const SEARCH_FOR_FACTS_SCHEMA = {
  type: 'object',
  properties: {
    query: { type: 'string', description: 'Search query for facts' },
    num: { type: 'number', description: 'Number of results', minimum: 1, maximum: 20 },
    facts: { type: 'array', items: { type: 'string' }, description: 'Specific facts to find' }
  },
  required: ['query'],
  additionalProperties: true
};

export const ENFORCE_RATE_LIMIT_SCHEMA = {
  type: 'object',
  properties: {
    toolName: { type: 'string', description: 'Tool name to rate limit' },
    limit: { type: 'number', description: 'Rate limit per minute', minimum: 1, maximum: 1000 }
  },
  required: ['toolName'],
  additionalProperties: true
};

export const NORMALIZE_SOURCE_SCHEMA = {
  type: 'object',
  properties: {
    source: { type: 'string', description: 'Source to normalize' },
    format: { type: 'string', description: 'Output format', enum: ['markdown', 'json', 'text'] }
  },
  required: ['source'],
  additionalProperties: true
};

export const LOG_TOOL_CALL_SCHEMA = {
  type: 'object',
  properties: {
    toolName: { type: 'string', description: 'Tool name' },
    args: { type: 'object', description: 'Tool arguments' },
    result: { type: 'object', description: 'Tool result' },
    error: { type: 'object', description: 'Tool error' }
  },
  required: ['toolName', 'args'],
  additionalProperties: true
};

export const REPLAY_RUN_SCHEMA = {
  type: 'object',
  properties: {
    runId: { type: 'string', description: 'Run ID to replay' },
    mode: { type: 'string', description: 'Replay mode', enum: ['exact', 'interactive'] }
  },
  required: ['runId'],
  additionalProperties: true
};

export const CHECK_REPRODUCIBILITY_SCHEMA = {
  type: 'object',
  properties: {
    runId: { type: 'string', description: 'Run ID to check' },
    tolerance: { type: 'number', description: 'Tolerance level', minimum: 0, maximum: 1 }
  },
  required: ['runId'],
  additionalProperties: true
};

export const RESEARCH_PLAN_SCHEMA = {
  type: 'object',
  properties: {
    topic: { type: 'string', description: 'Research topic' },
    scope: { type: 'string', description: 'Research scope' },
    goals: { type: 'array', items: { type: 'string' }, description: 'Research goals' }
  },
  required: ['topic'],
  additionalProperties: true
};

export const RESEARCH_GATHER_SCHEMA = {
  type: 'object',
  properties: {
    plan: { type: 'object', description: 'Research plan' },
    sources: { type: 'array', items: { type: 'string' }, description: 'Source URLs' }
  },
  required: ['plan'],
  additionalProperties: true
};

export const RESEARCH_CLAIMS_EXTRACT_SCHEMA = {
  type: 'object',
  properties: {
    content: { type: 'string', description: 'Content to extract claims from' },
    format: { type: 'string', description: 'Output format', enum: ['json', 'markdown'] }
  },
  required: ['content'],
  additionalProperties: true
};

export const RESEARCH_CITATIONS_ANALYZE_SCHEMA = {
  type: 'object',
  properties: {
    claims: { type: 'array', items: { type: 'object' }, description: 'Claims to analyze' },
    sources: { type: 'array', items: { type: 'string' }, description: 'Source URLs' }
  },
  required: ['claims'],
  additionalProperties: true
};

export const RESEARCH_PEER_REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    dossier: { type: 'object', description: 'Research dossier to review' },
    criteria: { type: 'array', items: { type: 'string' }, description: 'Review criteria' }
  },
  required: ['dossier'],
  additionalProperties: true
};

export const RESEARCH_DOSSIER_FINALIZE_SCHEMA = {
  type: 'object',
  properties: {
    research: { type: 'object', description: 'Research data' },
    format: { type: 'string', description: 'Output format', enum: ['json', 'markdown', 'pdf'] }
  },
  required: ['research'],
  additionalProperties: true
};

export const START_SESSION_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'Session name' },
    type: { type: 'string', description: 'Session type', enum: ['research', 'development', 'analysis'] }
  },
  required: ['name'],
  additionalProperties: true
};

export const EXPORT_SESSION_SCHEMA = {
  type: 'object',
  properties: {
    sessionId: { type: 'string', description: 'Session ID to export' },
    format: { type: 'string', description: 'Export format', enum: ['json', 'markdown', 'pdf'] }
  },
  required: ['sessionId'],
  additionalProperties: true
};

export const DETECT_STACK_SCHEMA = {
  type: 'object',
  properties: {
    path: { type: 'string', description: 'Path to analyze' },
    depth: { type: 'number', description: 'Analysis depth', minimum: 1, maximum: 10 }
  },
  required: ['path'],
  additionalProperties: true
};

export const GENERATE_PRD_SCHEMA = {
  type: 'object',
  properties: {
    dossier: { type: 'object', description: 'Research dossier' },
    brief: { type: 'string', description: 'Project brief' }
  },
  required: ['dossier'],
  additionalProperties: true
};

export const GENERATE_SOW_SCHEMA = {
  type: 'object',
  properties: {
    dossier: { type: 'object', description: 'Research dossier' },
    brief: { type: 'string', description: 'Project brief' }
  },
  required: ['dossier'],
  additionalProperties: true
};

export const GENERATE_ARCHITECTURE_SCHEMA = {
  type: 'object',
  properties: {
    prd: { type: 'string', description: 'PRD content' },
    format: { type: 'string', description: 'Output format', enum: ['mermaid', 'plantuml', 'json'] }
  },
  required: ['prd'],
  additionalProperties: true
};

export const GENERATE_BACKLOG_SCHEMA = {
  type: 'object',
  properties: {
    architecture: { type: 'string', description: 'Architecture diagram' },
    prd: { type: 'string', description: 'PRD content' },
    format: { type: 'string', description: 'Output format', enum: ['json', 'markdown'] }
  },
  required: ['architecture', 'prd'],
  additionalProperties: true
};

export const SCAFFOLD_SCHEMA = {
  type: 'object',
  properties: {
    template: { type: 'string', description: 'Scaffold template' },
    output: { type: 'string', description: 'Output directory' },
    variables: { type: 'object', description: 'Template variables' }
  },
  required: ['template', 'output'],
  additionalProperties: true
};

export const GENERATE_FEATURE_SCHEMA = {
  type: 'object',
  properties: {
    prd: { type: 'string', description: 'PRD content' },
    architecture: { type: 'string', description: 'Architecture diagram' },
    backlog: { type: 'object', description: 'Backlog items' },
    format: { type: 'string', description: 'Output format', enum: ['typescript', 'javascript', 'python'] }
  },
  required: ['prd', 'architecture'],
  additionalProperties: true
};

export const CODEGEN_GENERATE_TESTS_SCHEMA = {
  type: 'object',
  properties: {
    code: { type: 'string', description: 'Code to generate tests for' },
    framework: { type: 'string', description: 'Test framework', enum: ['jest', 'mocha', 'pytest'] },
    format: { type: 'string', description: 'Output format', enum: ['typescript', 'javascript', 'python'] }
  },
  required: ['code'],
  additionalProperties: true
};

export const GENERATE_TEST_PLAN_SCHEMA = {
  type: 'object',
  properties: {
    prd: { type: 'string', description: 'PRD content' },
    architecture: { type: 'string', description: 'Architecture diagram' },
    format: { type: 'string', description: 'Output format', enum: ['json', 'markdown'] }
  },
  required: ['prd', 'architecture'],
  additionalProperties: true
};

export const GENERATE_RISK_MATRIX_SCHEMA = {
  type: 'object',
  properties: {
    prd: { type: 'string', description: 'PRD content' },
    architecture: { type: 'string', description: 'Architecture diagram' },
    format: { type: 'string', description: 'Output format', enum: ['json', 'markdown'] }
  },
  required: ['prd', 'architecture'],
  additionalProperties: true
};

export const RUN_STATIC_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    path: { type: 'string', description: 'Path to analyze' },
    tools: { type: 'array', items: { type: 'string' }, description: 'Analysis tools to use' }
  },
  required: ['path'],
  additionalProperties: true
};

export const QA_GENERATE_TESTS_SCHEMA = {
  type: 'object',
  properties: {
    code: { type: 'string', description: 'Code to generate tests for' },
    framework: { type: 'string', description: 'Test framework', enum: ['jest', 'mocha', 'pytest'] },
    format: { type: 'string', description: 'Output format', enum: ['typescript', 'javascript', 'python'] }
  },
  required: ['code'],
  additionalProperties: true
};

export const QA_PEER_REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    code: { type: 'string', description: 'Code to review' },
    criteria: { type: 'array', items: { type: 'string' }, description: 'Review criteria' }
  },
  required: ['code'],
  additionalProperties: true
};

export const GENERATE_PROPOSAL_SCHEMA = {
  type: 'object',
  properties: {
    dossier: { type: 'object', description: 'Research dossier' },
    brief: { type: 'string', description: 'Project brief' },
    format: { type: 'string', description: 'Output format', enum: ['json', 'markdown', 'pdf'] }
  },
  required: ['dossier'],
  additionalProperties: true
};

export const PROPOSAL_PEER_REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    proposal: { type: 'object', description: 'Proposal to review' },
    criteria: { type: 'array', items: { type: 'string' }, description: 'Review criteria' }
  },
  required: ['proposal'],
  additionalProperties: true
};

export const PACKAGE_EXPORT_SCHEMA = {
  type: 'object',
  properties: {
    content: { type: 'object', description: 'Content to package' },
    format: { type: 'string', description: 'Package format', enum: ['zip', 'tar', 'json'] }
  },
  required: ['content'],
  additionalProperties: true
};

export const GENERATE_RUNBOOK_SCHEMA = {
  type: 'object',
  properties: {
    project: { type: 'object', description: 'Project configuration' },
    format: { type: 'string', description: 'Output format', enum: ['markdown', 'json'] }
  },
  required: ['project'],
  additionalProperties: true
};

export const GENERATE_NGINX_CONFIG_SCHEMA = {
  type: 'object',
  properties: {
    config: { type: 'object', description: 'Nginx configuration' },
    format: { type: 'string', description: 'Output format', enum: ['nginx', 'json'] }
  },
  required: ['config'],
  additionalProperties: true
};

export const RUN_SMOKETEST_SCHEMA = {
  type: 'object',
  properties: {
    target: { type: 'string', description: 'Target to test' },
    tests: { type: 'array', items: { type: 'string' }, description: 'Test names to run' }
  },
  required: ['target'],
  additionalProperties: true
};

export const PACKAGE_HANDOFF_SCHEMA = {
  type: 'object',
  properties: {
    project: { type: 'object', description: 'Project to package' },
    format: { type: 'string', description: 'Package format', enum: ['zip', 'tar', 'json'] }
  },
  required: ['project'],
  additionalProperties: true
};

export const CI_VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    project: { type: 'object', description: 'Project to verify' },
    checks: { type: 'array', items: { type: 'string' }, description: 'Checks to run' }
  },
  required: ['project'],
  additionalProperties: true
};

export const GENERATE_DOCUMENT_SCHEMA = {
  type: 'object',
  properties: {
    content: { type: 'string', description: 'Document content' },
    format: { type: 'string', description: 'Document format', enum: ['markdown', 'html', 'text'] }
  },
  required: ['content'],
  additionalProperties: true
};

export const GENERATE_DOCX_SCHEMA = {
  type: 'object',
  properties: {
    content: { type: 'object', description: 'Document content' },
    template: { type: 'string', description: 'Template to use' }
  },
  required: ['content'],
  additionalProperties: true
};

export const GENERATE_XLSX_SCHEMA = {
  type: 'object',
  properties: {
    data: { type: 'array', items: { type: 'object' }, description: 'Spreadsheet data' },
    format: { type: 'string', description: 'Output format', enum: ['xlsx', 'csv'] }
  },
  required: ['data'],
  additionalProperties: true
};

export const GENERATE_PPTX_SCHEMA = {
  type: 'object',
  properties: {
    slides: { type: 'array', items: { type: 'object' }, description: 'Presentation slides' },
    template: { type: 'string', description: 'Template to use' }
  },
  required: ['slides'],
  additionalProperties: true
};

export const GENERATE_CSV_SCHEMA = {
  type: 'object',
  properties: {
    data: { type: 'array', items: { type: 'object' }, description: 'CSV data' },
    headers: { type: 'array', items: { type: 'string' }, description: 'CSV headers' }
  },
  required: ['data'],
  additionalProperties: true
};

export const GENERATE_MARKDOWN_SCHEMA = {
  type: 'object',
  properties: {
    content: { type: 'string', description: 'Markdown content' },
    format: { type: 'string', description: 'Output format', enum: ['markdown', 'html'] }
  },
  required: ['content'],
  additionalProperties: true
};

export const GENERATE_QUICK_DOCUMENT_SCHEMA = {
  type: 'object',
  properties: {
    content: { type: 'string', description: 'Document content' },
    format: { type: 'string', description: 'Document format', enum: ['markdown', 'html', 'text'] }
  },
  required: ['content'],
  additionalProperties: true
};

export const FOUNDRY_ORCHESTRATE_SCHEMA = {
  type: 'object',
  properties: {
    intent: { type: 'string', description: 'Orchestration intent' },
    projectPath: { type: 'string', description: 'Project path' },
    mode: { type: 'string', description: 'Orchestration mode', enum: ['research', 'docs', 'architect', 'code', 'full'] }
  },
  required: ['intent'],
  additionalProperties: true
};

export const FOUNDRY_STATUS_SCHEMA = {
  type: 'object',
  properties: {},
  additionalProperties: true
};

export const FOUNDRY_HEALTH_SCHEMA = {
  type: 'object',
  properties: {},
  additionalProperties: true
};

export const FOUNDRY_CREATE_REQUEST_SCHEMA = {
  type: 'object',
  properties: {
    description: { type: 'string', description: 'Request description' },
    projectPath: { type: 'string', description: 'Project path' },
    enforceDeliverableScope: { type: 'boolean', description: 'Enforce deliverable scope' }
  },
  required: ['description'],
  additionalProperties: true
};

export const CTO_SWEEP_SCHEMA = {
  type: 'object',
  properties: {
    target: { type: 'string', description: 'Target to sweep' },
    depth: { type: 'number', description: 'Sweep depth', minimum: 1, maximum: 10 }
  },
  required: ['target'],
  additionalProperties: true
};

export const COWORK_LIST_SCHEMA = {
  type: 'object',
  properties: {
    commands: { type: 'boolean', description: 'List commands only' },
    agents: { type: 'boolean', description: 'List agents only' },
    plugins: { type: 'boolean', description: 'List plugins only' }
  },
  additionalProperties: true
};

export const COWORK_RUN_SCHEMA = {
  type: 'object',
  properties: {
    command: { type: 'string', description: 'Command to run' },
    args: { type: 'array', items: { type: 'string' }, description: 'Command arguments' }
  },
  required: ['command'],
  additionalProperties: true
};

export const COWORK_SPAWN_SCHEMA = {
  type: 'object',
  properties: {
    agentId: { type: 'string', description: 'Agent ID to spawn' },
    task: { type: 'string', description: 'Task description' },
    context: { type: 'object', description: 'Task context' }
  },
  required: ['agentId', 'task'],
  additionalProperties: true
};

export const COWORK_HEALTH_SCHEMA = {
  type: 'object',
  properties: {},
  additionalProperties: true
};

export const COWORK_PLUGINS_SCHEMA = {
  type: 'object',
  properties: {},
  additionalProperties: true
};

export const COWORK_AGENTS_SCHEMA = {
  type: 'object',
  properties: {},
  additionalProperties: true
};

export const PDF_GENERATE_SCHEMA = {
  type: 'object',
  properties: {
    input: { type: 'object', description: 'PDF input configuration' },
    outputPath: { type: 'string', description: 'Output file path' }
  },
  required: ['input'],
  additionalProperties: true
};

export const SUMMARIZATION_SUMMARIZE_SCHEMA = {
  type: 'object',
  properties: {
    dossier: { type: 'object', description: 'Dossier to summarize' },
    sources: { type: 'array', items: { type: 'string' }, description: 'Source documents' }
  },
  required: ['dossier'],
  additionalProperties: true
};

export const SECURITY_SCAN_SCHEMA = {
  type: 'object',
  properties: {
    target: { type: 'string', description: 'Target to scan' },
    type: { type: 'string', description: 'Scan type', enum: ['code', 'dependencies', 'secrets'] },
    rules: { type: 'array', items: { type: 'string' }, description: 'Scanning rules' }
  },
  required: ['target'],
  additionalProperties: true
};

export const SECURITY_REDACT_SCHEMA = {
  type: 'object',
  properties: {
    text: { type: 'string', description: 'Text to redact' }
  },
  required: ['text'],
  additionalProperties: true
};

export const SECURITY_SEAL_EVIDENCE_SCHEMA = {
  type: 'object',
  properties: {
    payload: { type: 'object', description: 'Payload to seal' }
  },
  required: ['payload'],
  additionalProperties: true
};

export const OPENCODE_TOOLS_CLI_SCHEMA = {
  type: 'object',
  properties: {
    args: { type: 'array', items: { type: 'string' }, description: 'CLI arguments' }
  },
  required: ['args'],
  additionalProperties: true
};