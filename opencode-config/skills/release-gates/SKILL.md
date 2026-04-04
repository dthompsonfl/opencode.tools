# Release Gates Skill

## Metadata
- **ID**: release-gates
- **Name**: Release Gate Definitions
- **Description**: CI/test/security gate checklist definitions for release readiness

## Skill Content

### Release Gate Overview

Release gates are quality checkpoints that must ALL pass before a release can proceed. The CTO has final authority to approve release even with gate failures, but this requires explicit justification.

### Required Gates

#### 1. Build Gate

**Purpose**: Verify code compiles and packages correctly.

**Checks**:
- [ ] TypeScript compilation succeeds
- [ ] No type errors
- [ ] Bundle generation succeeds
- [ ] Asset compilation succeeds

**Command**:
```bash
npm run build
```

**Pass Criteria**: Exit code 0, no errors

---

#### 2. Test Gate

**Purpose**: Verify all automated tests pass.

**Checks**:
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass (if applicable)
- [ ] Test coverage meets threshold (≥80%)

**Command**:
```bash
npm run test:all
```

**Pass Criteria**: All tests pass, coverage ≥80%

---

#### 3. Lint Gate

**Purpose**: Verify code style and static analysis.

**Checks**:
- [ ] No linting errors
- [ ] No formatting issues
- [ ] No unused imports/variables
- [ ] No circular dependencies

**Command**:
```bash
npm run lint
```

**Pass Criteria**: Exit code 0, no errors

---

#### 4. Security Gate

**Purpose**: Verify no security vulnerabilities.

**Checks**:
- [ ] No known vulnerable dependencies
- [ ] No hardcoded secrets
- [ ] No SQL injection patterns
- [ ] No XSS vulnerabilities
- [ ] Authentication/authorization verified

**Commands**:
```bash
npm audit --audit-level=moderate
npm run security:scan  # if available
```

**Pass Criteria**: No moderate+ vulnerabilities

---

#### 5. Documentation Gate

**Purpose**: Verify documentation is complete and current.

**Checks**:
- [ ] README updated for new features
- [ ] API documentation updated
- [ ] CHANGELOG updated
- [ ] Breaking changes documented
- [ ] Migration guide provided (if needed)

**Pass Criteria**: All relevant docs updated

---

#### 6. Deliverable Scope Gate

**Purpose**: Verify only appropriate files are included.

**Allowed Artifacts**:
- Source code (.ts, .tsx, .js, .jsx)
- Test files (.test.ts, .spec.ts)
- Documentation (.md)
- Configuration (.json, .yaml, .env.example)

**Excluded Artifacts**:
- node_modules/
- dist/ build/
- .env files (with secrets)
- Log files
- Temporary files
- Binary files

**Pass Criteria**: No excluded artifacts in deliverable

---

### Gate Execution Order

```
1. Build Gate      (fast fail if broken)
2. Lint Gate       (fast fail if style issues)
3. Test Gate       (comprehensive validation)
4. Security Gate   (security validation)
5. Documentation   (completeness check)
6. Scope Gate      (deliverable verification)
```

### Gate Failure Handling

#### Automatic Failures
- Build failure
- Security vulnerability (high/critical)
- Test failure (core functionality)

#### Remediation Required
- Lint warnings
- Test coverage below threshold
- Documentation incomplete

#### CTO Override
CTO may override gate failures with:
- Explicit justification
- Risk acknowledgment
- Remediation plan

### Gate Report Format

```markdown
## Gate Execution Report

**Project**: [project-name]
**Branch**: [branch-name]
**Commit**: [commit-hash]
**Executed**: [timestamp]

### Results

| Gate | Status | Details |
|------|--------|---------|
| Build | ✅ PASS | Compiled successfully |
| Lint | ✅ PASS | No issues |
| Test | ✅ PASS | 42/42 tests, 85% coverage |
| Security | ⚠️ WARN | 1 moderate vulnerability |
| Documentation | ✅ PASS | All docs updated |
| Scope | ✅ PASS | Valid artifacts only |

### Summary
- **Overall**: PASS (with warnings)
- **CTO Decision**: REQUIRED for security warning

### Remediation Required
- Update lodash to ^4.17.21 to resolve CVE-2021-23337
```

### Integration with Foundry

The release gates are automatically executed during:
1. **phase_4_hardening**: Initial gate run
2. **gate_evaluation**: Gate result processing
3. **release_review**: Final gate verification

The CTO receives gate results and makes the final release decision.

---

**Usage**: Load this skill when executing release preparation or gate evaluation phases.
