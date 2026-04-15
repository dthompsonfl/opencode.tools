# Foundry Governance Skill

## Metadata
- **ID**: foundry-governance
- **Name**: Foundry Governance Rules
- **Description**: Hard rules for security-first, no-TODO, no-truncation, CTO-only communication

## Skill Content

### Core Governance Rules

These rules are NON-NEGOTIABLE and must be enforced in all Foundry executions.

#### 1. No TODO Comments

**Rule**: Production code must never contain TODO comments.

**Rationale**: TODO comments indicate incomplete work. All code must be complete before approval.

**Enforcement**:
- Scan all modified files for TODO patterns
- Reject any PR/commit containing TODO
- Require immediate remediation

**Acceptable Alternatives**:
- Create separate follow-up tasks
- Document in issue tracker
- Add to backlog with priority

#### 2. No Truncation

**Rule**: All code output must be complete. No "..." or truncated code blocks.

**Rationale**: Partial code cannot be executed or tested. Complete implementations only.

**Enforcement**:
- Verify all code blocks are complete
- Check for ellipsis patterns in code
- Require full file content

**Acceptance Criteria**:
- All functions have complete bodies
- All imports are specified
- All exports are defined

#### 3. Security First

**Rule**: Every change must be reviewed for security implications.

**Requirements**:
- Input validation on all user inputs
- Output encoding for all displayed data
- Parameterized queries for database access
- Authentication checks on protected routes
- Authorization checks on sensitive operations

**Enforcement**:
- Security agent review required
- OWASP Top 10 checklist
- No hardcoded secrets
- No insecure dependencies

#### 4. CTO-Only Communication

**Rule**: Agents communicate ONLY with CTO. No agent-to-agent direct communication.

**Rationale**: Centralized control ensures consistency and auditability.

**Communication Flow**:
```
User → CTO → Agent → CTO → User
         ↓
      Agent → CTO → Agent
```

**Forbidden Patterns**:
- Agent A directly messaging Agent B
- Agents responding to users directly
- Bypassing CTO for any reason

**Enforcement**:
- All messages route through CTO
- CTO maintains full visibility
- Audit trail for all communications

#### 5. Quality Gates Required

**Rule**: All quality gates must pass before release.

**Required Gates**:
- Build: Clean compilation
- Test: All tests pass
- Lint: No linting errors
- Security: No security findings
- Documentation: Updated docs

**Enforcement**:
- Block release on gate failure
- Require remediation before retry
- CTO approval after gates pass

### Agent Responsibilities

Each agent has specific governance responsibilities:

| Agent | Responsibilities |
|-------|-----------------|
| CTO | Enforce all rules, final approval |
| Prompt Engineer | Generate compliant prompts |
| Security | Security review, gate enforcement |
| QA | Test coverage, gate execution |
| Implementer | Complete, secure code |
| Reviewer | Verify rule compliance |

### Violation Handling

When a governance rule is violated:

1. **Detect**: Automated scanning or manual review
2. **Block**: Prevent further progress
3. **Document**: Record the violation
4. **Remediate**: Fix the issue
5. **Verify**: Confirm fix is complete
6. **Resume**: Continue execution

### Audit Trail

All governance actions are logged:
- Rule enforcement events
- Violation detections
- Remediation actions
- CTO approvals/rejections

---

**Usage**: Load this skill when starting any Foundry workflow to ensure governance compliance.
