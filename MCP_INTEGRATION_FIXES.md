# OpenCode Tools - MCP Integration Fixes

## Summary of Changes

This document details the fixes made to enable proper MCP integration and global installation of opencode-tools.

---

## Critical Issues Fixed

### 1. MCP Server Configuration (opencode.json)

**Problem**: 
- MCP server configuration used `{project_root}` placeholder which OpenCode doesn't resolve
- Duplicate/conflicting MCP entries pointing to the same server
- Tools configured but not implemented in mcp-server.ts

**Fixes Applied**:
- Changed MCP server command from `["node", "{project_root}/dist/tools/mcp-server.js"]` to `["opencode-tools", "mcp"]`
- Removed duplicate `discovery.session.export` MCP entry (was pointing to same server)
- Removed external MCP tools that may not be available (Desktop-Commander, TestSprite, next-devtools)
- Kept core MCP tools: SequentialThinking, Memory, critical-thinking, DeepWiki-SSE, Serena

### 2. MCP Server Implementation (tools/mcp-server.ts)

**Problem**:
- Only 6 tools implemented out of 14+ configured
- Many tools returned placeholder responses
- Missing tool handlers for configured tools

**Fixes Applied**:
- Added all missing tool implementations:
  - `audit.logToolCall` - Logs tool calls for auditing
  - `audit.replayRun` - Replays previous runs
  - `audit.checkReproducibility` - Checks run reproducibility
  - `research.plan` - Generates research plans
  - `research.gather` - Gathers research data
  - `research.claims.extract` - Extracts claims from content
  - `research.citations.analyze` - Analyzes source credibility
  - `research.peer_review` - Reviews research dossiers
  - `research.dossier.finalize` - Finalizes and exports dossiers
  - `discovery.session.export` - Exports discovery sessions
- Fixed TypeScript errors (missing arguments in function calls)

### 3. Global Installation Flow

**Problem**:
- `scripts/native-integrate.ts` had incorrect CLI path calculation
- Missing manifest.json files in vantus_agents subdirectories
- `package.json` missing `files` array for npm publishing

**Fixes Applied**:
- Fixed CLI path detection in `native-integrate.ts` to handle both source and compiled modes
- Created manifest.json files for all vantus_agents:
  - `vantus_agents/AutoGPT/manifest.json`
  - `vantus_agents/agenticSeek/manifest.json`
  - `vantus_agents/nemotron-page-elements-v3/manifest.json`
  - `vantus_agents/nemotron-table-structure-v1/manifest.json`
  - `vantus_agents/nemotron-ocr-v1/manifest.json`
  - `vantus_agents/nemotron-graphic-elements-v1/manifest.json`
- Added `files` array to package.json for proper npm publishing
- Added `engines` field to package.json (Node >=18.0.0)

### 4. Build System

**Problem**:
- TypeScript compilation errors in mcp-server.ts
- Incorrect function signatures

**Fixes Applied**:
- Fixed `search()` call to pass correct arguments
- Fixed `checkReproducibility()` call to pass required `promptHash` argument
- Build now succeeds without errors

---

## Verification Steps

### 1. Build the Project
```bash
npm run build
```

### 2. Test MCP Server
```bash
node dist/tools/mcp-server.js
# Should output: "OpenCode Tools MCP server running on stdio"
```

### 3. Test Global Installation
```bash
# Run postinstall script
node dist/scripts/postinstall.js

# Should output: "Registered bundled plugins in OpenCode: vantus.autogpt, vantus.agentic-seek, ..."
```

### 4. Test CLI
```bash
./dist/src/cli.js --help
```

### 5. Test Native Integration
```bash
node dist/scripts/native-integrate.js
```

This will:
- Create `~/.config/opencode/opencode.json` with MCP server configuration
- Create `~/.config/opencode/plugins/` directory with plugin manifests
- Display welcome message

---

## Current Status

### ✅ Working
- MCP server starts and handles tool requests
- Global installation copies files to `~/.config/opencode/`
- Plugins are registered in OpenCode
- CLI commands are available
- Build completes without errors
- Most tests pass (475/476)

### ⚠️ Known Limitations

#### 1. PDF Agent Returns Placeholders
- `generatePDF()` returns placeholder buffer, not actual PDF
- Charts and diagrams return empty buffers
- Sub-modules exist but aren't integrated

#### 2. Architecture Agent Uses Static Output
- `generateMermaidDiagram()` returns same diagram regardless of input
- `generateBacklog()` creates only placeholder content

#### 3. Other Agents Have Limited Functionality
- Documentation Agent uses hardcoded templates
- CodeGen Agent doesn't write files to filesystem
- QA Agent returns static test plans

#### 4. No LLM Integration
- All "intelligence" is hardcoded or template-based
- No OpenAI, Anthropic, or other LLM provider integration

#### 5. Corporate-Level Experience Gaps
- No authentication/authorization system
- No secrets management beyond basic redaction
- No comprehensive observability/monitoring
- Missing deployment configurations (Docker, K8s)

---

## Next Steps for Full Corporate Experience

### High Priority
1. **Implement Actual PDF Generation**
   - Integrate existing sub-modules (charts, graphics, rendering)
   - Use pdfkit or pdf-lib to generate real PDFs
   - Write output to filesystem

2. **Complete Architecture Agent**
   - Implement dynamic diagram generation based on PRD input
   - Create intelligent backlog generation

3. **Add LLM Integration**
   - Integrate OpenAI or Anthropic API
   - Replace hardcoded logic with LLM-powered reasoning
   - Add prompt management system

### Medium Priority
4. **Complete Remaining Agents**
   - Documentation Agent with dynamic content
   - CodeGen Agent with file writing
   - QA Agent with actual test execution

5. **Add Security Layer**
   - Authentication system
   - API key management
   - Role-based access control

6. **Add Observability**
   - Metrics collection
   - Distributed tracing
   - Health check endpoints

### Low Priority
7. **Deployment & Infrastructure**
   - Docker configuration
   - Kubernetes manifests
   - CI/CD pipeline improvements

---

## File Inventory - Changes Made

| File | Change Type | Description |
|------|-------------|-------------|
| `opencode.json` | Modified | Fixed MCP server command, removed duplicates |
| `tools/mcp-server.ts` | Modified | Added all missing tool implementations |
| `scripts/native-integrate.ts` | Modified | Fixed CLI path detection |
| `scripts/postinstall.js` | Working | Registers bundled plugins |
| `package.json` | Modified | Added files array and engines field |
| `vantus_agents/*/manifest.json` | Created | 6 new manifest files |

---

## Testing Results

```
Test Suites: 2 failed, 24 passed, 26 total
Tests:       1 failed, 475 passed, 476 total
```

**Failing Tests**:
- `tests/e2e/pdf-workflows.test.ts` - Expected due to PDF placeholder implementation
- `tests/agents/asset-manager.test.ts` - TypeScript module resolution issue

---

## Usage After Fixes

### Global Installation
```bash
cd /path/to/opencode-tools
npm install -g .
```

This will:
1. Build the TypeScript project
2. Register bundled plugins in `~/.config/opencode/plugins/`
3. Configure MCP server in `~/.config/opencode/opencode.json`

### Using MCP Tools in OpenCode
After installation, all MCP tools are available in OpenCode:
- `webfetch` - Fetch content from URLs
- `search` - Web search
- `research.plan` - Generate research plans
- `audit.logToolCall` - Log tool calls
- And more...

### CLI Commands
```bash
opencode-tools research <company>
opencode-tools docs <input>
opencode-tools architect <prd>
opencode-tools tui
opencode-tools mcp  # Start MCP server
```

---

## Conclusion

The MCP integration is now functional. The global installation process properly:
- Registers the MCP server with OpenCode
- Copies plugin manifests to the correct location
- Makes all tools available for use

The remaining work focuses on completing agent implementations and adding enterprise features like authentication, observability, and LLM integration.
