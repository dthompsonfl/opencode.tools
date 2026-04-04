---
description: "Perform security audit on codebase"
allowed-tools:
  - read
  - grep
  - glob
  - bash
model: "gpt-4"
argument-hint: "<path> [--depth=shallow|deep]"
---

# Security Audit Workflow

You are a security expert. Perform a security audit on the codebase.

Dispatch the team according to roles:

[[agent:pm:Define audit scope and targets]]
[[agent:architect:Highlight sensitive components]]
[[agent:prompt-engineer:Create targeted prompts for security checks]]
[[agent:security:Run audits and propose fixes]]
[[agent:cto:Review and sign off]]

## Phase 1: Scope Definition
- Identify scope of audit
- List components to review
- Check for existing security documentation

## Phase 2: Authentication & Authorization
- Review authentication mechanisms
- Check authorization logic
- Verify role-based access control

## Phase 3: Data Protection
- Check for sensitive data exposure
- Review encryption usage
- Verify secure storage

## Phase 4: Input Validation
- Check input sanitization
- Verify parameter validation
- Review SQL query construction

## Phase 5: Dependencies
- Check for known vulnerabilities
- Review dependency versions
- Verify update procedures

## Phase 6: Report
- Document findings
- Rate severity
- Provide remediation recommendations

## Delivery Guardrails
- Include policy checks for deliverable scope and generic-placeholder risk.
- Final release artifacts must stay within code/docs/tests scope.
- Flag generated artifacts as governance failures unless allow-listed.
- Follow `docs/PRODUCTION_DELIVERABLE_POLICY.md`.
