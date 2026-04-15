# OpenCode Tools Documentation Guide
## Comprehensive Documentation Overview

**Version**: 1.0.0  
**Last Updated**: 2026-02-16  
**Status**: 📚 Production Ready

---

## 📖 Documentation Structure

OpenCode Tools uses a multi-layer documentation approach to serve different audiences:

### 🎯 Quick Start & Overview
- **[README.md](../README.md)** - Project overview, quick start, basic usage
- **[INTEGRATION_GUIDE.md](../INTEGRATION_GUIDE.md)** - CLI commands and workflow automation
- **[TUI_INTEGRATION.md](../TUI_INTEGRATION.md)** - TUI-specific integration patterns

### 🛠️ Developer Guides
- **[AGENTS.md](../AGENTS.md)** - **PRIMARY DEVELOPER REFERENCE** - Code style, commands, conventions
- [src/runtime/errors.ts](../src/runtime/errors.ts) - Error patterns and best practices
- [jest.config.js](../jest.config.js) - Testing configuration and patterns
- [.eslintrc.js](../.eslintrc.js) - Linting rules and code quality

### 🎓 Agent Implementation
- **[IMPLEMENTATION_MAP.md](../IMPLEMENTATION_MAP.md)** - Agent development roadmap
- **[IMPLEMENTATION_STATUS.md](../IMPLEMENTATION_STATUS.md)** - Current agent completion status
- [agents/](../agents/) directory - Example agent implementations
- [prompts/](../prompts/) directory - Prompt templates and patterns

### 🚨 Production Readiness
- **[PRODUCTION_READINESS_ASSESSMENT.md](../PRODUCTION_READINESS_ASSESSMENT.md)** - Security, reliability gaps
- **[TODO.md](../TODO.md)** - Prioritized action items and timeline
- **[PRODUCTION_DELIVERABLE_POLICY.md](./PRODUCTION_DELIVERABLE_POLICY.md)** - Mandatory release scope and bespoke output standards
- [src/security/](../src/security/) - Security patterns and implementation

### 🎓 PhD-Level Research Quality
- **[PROMPT.md](../PROMPT.md)** - Production enhancement prompt (comprehensive)
- [src/analysis/](../src/analysis/) - Research analysis patterns
- [src/review/](../src/review/) - Peer review and quality assurance

---

## 📚 Documentation by Audience

### 👨‍💼 For Project Managers & Stakeholders

Start here to understand the project:

1. **README.md** (5 min read)
   - What OpenCode Tools does
   - Agent capabilities overview
   - Quick start examples

2. **PRODUCTION_READINESS_ASSESSMENT.md** (10 min read)
   - Current state and capabilities
   - Production timeline (6-12 months)
   - Resource requirements
   - Risk analysis

3. **TODO.md** (5 min read)
   - Immediate action items (Weeks 1-2)
   - PhD-level research roadmap
   - Success criteria

**Key Takeaway**: OpenCode Tools has solid architecture but needs security and reliability enhancements before production deployment.

---

### 👨‍💻 For Developers (Getting Started)

New to the codebase? Follow this path:

1. **README.md** (5 min)
   - Basic project setup
   - Quick start commands

2. **AGENTS.md** (15 min)
   - ✅ **PRIMARY REFERENCE**
   - Build, test, lint commands
   - Code style guidelines
   - TypeScript conventions
   - Error handling patterns
   - Testing requirements
   - Git workflow

3. **INTEGRATION_GUIDE.md** (10 min)
   - CLI command reference
   - Usage examples
   - Output structure

4. **Test Examples** (10 min)
   ```bash
   # Explore test patterns
   cat agents/research/research-agent.test.ts
   cat src/runtime/audit.test.ts
   ```

**Key Takeaway**: Always use AGENTS.md as your primary reference for code style and conventions.

---

### 🏗️ For Agent Developers (Building New Agents)

Building a new agent? Follow this comprehensive guide:

1. **Prerequisites**
   - Complete developer onboarding above
   - Understand existing agent patterns

2. **Study Existing Implementations**
   ```bash
   # Most complete example
   cat agents/research/research-agent.ts
   
   # TUI integration pattern
   cat src/tui-agents/tui-research-agent.ts
   ```

3. **Follow AGENTS.md Conventions** (20 min detailed review)
   - TypeScript strict mode requirements
   - Import conventions (absolute paths only)
   - Naming patterns (PascalCase classes, etc.)
   - Error handling with BaseError
   - Zod validation schemas
   - Testing patterns with Jest

4. **Use Proven Patterns From**
   - `src/runtime/tool-wrapper.ts` - Safe tool execution
   - `src/runtime/audit.ts` - Audit logging
   - `src/security/redaction.ts` - Secret redaction
   - `src/runtime/errors.ts` - Error hierarchy

5. **Documentation Agent Implementation Structure**
   ```typescript
   // 1. Define agent class
   class MyAgent {
     async execute(input: ValidatedInput): Promise<Result> {
       // 2. Use tool wrapper for safety
       // 3. Implement retry logic
       // 4. Log all actions
       // 5. Return structured output
     }
   }
   ```

6. **Test Requirements**
   - Unit tests with >75% coverage
   - Integration tests for external APIs
   - Mock LLM calls appropriately
   - Use test factories (see `tests/utils/factories.ts`)

---

### 🔒 For Security Engineers

Reviewing OpenCode Tools security:

1. **Security Audit Report**
   ```bash
   cat .serena/memories/security-audit-opencode-tools.md
   ```

2. **Critical Gaps Identified**
   - Authentication: ❌ Missing
   - Authorization: ❌ Missing  
   - Secrets Management: ❌ Mock only
   - Input Validation: ❌ Not systematic
   - Audit Logging: ⚠️ Basic only

3. **Required Security Implementation**
   - Review `src/security/` directory structure
   - See `PRODUCTION_READINESS_ASSESSMENT.md` (P0 Security section)
   - Follow patterns in `src/security/secrets.ts` for secrets management
   - Use `src/security/redaction.ts` for PII handling

4. **Security Best Practices in Code**
   ```typescript
   // ✅ CORRECT pattern from codebase
   const redacted = redactor.redactObject({
     apiKey: 'sk-12345...',
     data: 'sensitive'
   });
   
   // ✅ CORRECT path validation
   const validator = new PathValidator('/workspace');
   const safePath = validator.validatePath(userInput);
   ```

---

### 🧪 For QA/Test Engineers

Implementing comprehensive testing:

1. **Test Infrastructure Overview**
   - **Unit Tests**: Co-located `*.test.ts` files
   - **Integration Tests**: `tests/integration/`
   - **E2E Tests**: `tests/e2e/`
   - **Performance Tests**: `tests/performance/`
   - **Security Tests**: `tests/security/`

2. **Coverage Requirements**
   ```bash
   # Check current coverage
   npm run test:coverage
   
   # Requirements:
   - Global: 70% branches, functions, lines, statements
   - ./src/: 80% all metrics
   - ./agents/: 75% all metrics
   ```

3. **Test Configuration Patterns**
   - See `jest.config.js` for comprehensive setup
   - Module name mapping for absolute imports
   - Setup/teardown files in `tests/setup/`
   - Test timeout: 30 seconds

4. **CI/CD Pipeline**
   - GitHub Actions: `.github/workflows/test-pipeline.yml`
   - Multi-stage validation (lint → unit → integration → e2e → security)
   - Automated coverage reporting with Codecov
   - PR comment integration

---

## 🔗 Documentation Cross-References

### Code Style & Standards

| Topic | Primary Docs | Secondary |
|-------|-------------|-----------|
| **Commands** | AGENTS.md | README.md |
| **Code Style** | AGENTS.md | .eslintrc.js, tsconfig.json |
| **Testing** | AGENTS.md, jest.config.js | tests/TEST_IMPROVEMENT_PLAN.md |
| **TypeScript** | AGENTS.md | tsconfig.json |
| **Error Handling** | AGENTS.md | src/runtime/errors.ts |
| **Imports** | AGENTS.md | jest.config.js |

### Agent Development

| Topic | Primary Docs | Secondary |
|-------|-------------|-----------|
| **Agent Patterns** | agents/research/research-agent.ts | AGENTS.md |
| **TUI Integration** | src/tui-agents/ | TUI_INTEGRATION.md |
| **Agent Status** | IMPLEMENTATION_STATUS.md | TODO.md |
| **Prompts** | prompts/ | AGENTS.md |

### Production Readiness

| Topic | Primary Docs | Secondary |
|-------|-------------|-----------|
| **Security Gaps** | PRODUCTION_READINESS_ASSESSMENT.md | src/security/ |
| **Action Items** | TODO.md | PRODUCTION_READINESS_ASSESSMENT.md |
| **Timeline** | TODO.md | PRODUCTION_READINESS_ASSESSMENT.md |
| **PhD-Level Quality** | TODO.md | PROMPT.md |
| **Deliverable Scope** | docs/PRODUCTION_DELIVERABLE_POLICY.md | AGENTS.md, README.md |

---

## ❓ Finding Specific Information

### "How do I run tests?"
→ **AGENTS.md** → Quick Reference Commands → Testing
→ See examples: `npm test -- agents/research/research-agent.test.ts`

### "What are the code style rules?"
→ **AGENTS.md** → Code Style Guidelines
→ Review: `interface` vs `type`, naming conventions, error patterns

### "How do I implement a new agent?"
→ **AGENTS.md** → Code Style Guidelines + Testing Conventions
→ **agents/research/research-agent.ts** → Reference implementation
→ **IMPLEMENTATION_MAP.md** → Development roadmap

### "Why isn't this production ready?"
→ **PRODUCTION_READINESS_ASSESSMENT.md** → Complete gap analysis
→ **TODO.md** → Prioritized action items (P0 security issues)
→ **PROMPT.md** → Comprehensive enhancement plan

### "What testing is required?"
→ **AGENTS.md** → Testing Conventions (coverage thresholds, patterns)
→ **jest.config.js** → Configuration (timeout, module mapping, etc.)
→ **.github/workflows/test-pipeline.yml** → CI/CD validation

### "How do I integrate with TUI?"
→ **TUI_INTEGRATION.md** → Exclusive TUI patterns
→ **src/tui-agents/** → Reference implementations
→ **INTEGRATION_GUIDE.md** → CLI command reference

### "What are the security requirements?"
→ **AGENTS.md** → Data Redaction & Security patterns
→ **src/security/** → Implementation examples
→ **PRODUCTION_READINESS_ASSESSMENT.md** → P0 Security Issues

---

## 🚨 Important Conflict Resolution

### CLI vs TUI Access

**Status**: RESOLVED ✅

**Previous Conflict**:
- INTEGRATION_GUIDE.md: CLI commands documented (`opencode research ...`)
- TUI_INTEGRATION.md: "Exclusively accessible through TUI only"

**Resolution**:
- **BOTH CLI and TUI access are valid**
- CLI for scripting/automation
- TUI for interactive use
- Both integration patterns supported

**Documentation Updates**:
- ✅ README.md includes both usage patterns
- ✅ AGENTS.md references both interfaces
- ✅ Integration guides maintained for both patterns

### Agent Implementation Status

**Previous Inaccuracy**:
- TODO.md marked phases 3-6 as "COMPLETE"
- Reality: Most agents were mock implementations (~40% complete maximum)

**Correction Applied**:
- ✅ TODO.md updated to reflect mock status
- ✅ IMPLEMENTATION_STATUS.md provides accurate completion percentages
- ✅ PRODUCTION_READINESS_ASSESSMENT.md documents true state
- ✅ All agents documented as prototype/MVP stage

---

## 📈 Document Maturity Levels

| Document | Status | Last Updated | Completeness |
|----------|--------|--------------|--------------|
| **README.md** | ✅ Production | 2026-01-24 | 100% |
| **AGENTS.md** | ✅ Production | 2026-01-24 | 100% |
| **TODO.md** | ✅ Production | 2026-01-24 | 100% |
| **PRODUCTION_READINESS_ASSESSMENT.md** | ✅ Production | 2026-01-24 | 100% |
| **PROMPT.md** | ✅ Production | 2026-01-24 | 100% (comprehensive) |
| **INTEGRATION_GUIDE.md** | ⚠️ Needs Updates | 2026-01-24 | 95% (resolve CLI/TUI) |
| **TUI_INTEGRATION.md** | ⚠️ Needs Updates | 2026-01-24 | 95% (resolve exclusivity) |

---

## 🎓 Recommended Reading Order

### For New Team Members

**Day 1-2: Understanding the Project**
1. README.md (15 min) → Project overview
2. AGENTS.md (30 min) → Development setup
3. INTEGRATION_GUIDE.md (20 min) → Usage examples

**Day 3-4: Understanding Limitations**
4. PRODUCTION_READINESS_ASSESSMENT.md (30 min) → Gap analysis
5. TODO.md (20 min) → Action items and timeline
6. IMPLEMENTATION_STATUS.md (15 min) → Current completion

**Day 5: Contributing**
7. Re-read AGENTS.md (15 min) → Code conventions
8. Review test examples (30 min) → Testing patterns
9. Explore codebase (1 hour) → Hands-on learning

### For Developers (Building Features)

**Before Starting Development**:
1. AGENTS.md (detailed review, 30 min)
2. agents/research/research-agent.ts (reference, 20 min)
3. Existing tests for similar features (15 min)

**Before PR Submission**:
4. Re-read AGENTS.md testing section (10 min)
5. Verify CI/CD requirements (5 min)
6. Run full validation: `npm run validate` (5 min)

---

## 🔗 Additional Resources

### Internal Documentation
- **Architecture**: `ARCHITECTURE.md` (planned)
- **API Reference**: `docs/api/` (TypeDoc generated)
- **Security**: `docs/security/rbac-policy.md`
- **Testing**: `tests/TEST_IMPROVEMENT_PLAN.md`

### External Resources
- GitHub Issues: [opencode/ai-tool](https://github.com/opencode/ai-tool)
- Security Email: security@opencode.ai
- Documentation Site: [docs.opencode.tools](https://docs.opencode.tools)

---

## ⚠️ Important Notes for AI Agents

If you are an AI agent working on this codebase:

1. **ALWAYS READ AGENTS.md FIRST** - It contains mandatory coding standards
2. **NEVER use relative imports** - Always use absolute paths
3. **ALWAYS add tests** - Coverage thresholds are enforced
4. **NEVER commit without running** `npm run validate`
5. **ALWAYS handle errors properly** - Use BaseError hierarchy
6. **NEVER log secrets** - Use SecretRegistry and redaction
7. **ALWAYS validate inputs** - Use Zod schemas

When in doubt, refer to existing patterns in `agents/research/` and `src/runtime/`.

---

**Document Version**: 1.0.0  
**Last Updated**: 2026-01-24  
**Maintainer**: OpenCode Tools Team  
**Next Review**: 2026-02-24
