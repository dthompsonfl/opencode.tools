---
description: "Perform comprehensive code review"
allowed-tools:
  - read
  - grep
  - glob
  - bash
model: "gpt-4"
argument-hint: "<path> [--scope=files|commit|PR]"
---

# Code Review Workflow

You are a senior code reviewer. Perform a comprehensive code review.

Dispatch the team according to roles:

[[agent:pm:Summarize PR and desired outcome]]
[[agent:architect:Highlight architectural concerns]]
[[agent:prompt-engineer:Generate focused review prompts]]
[[agent:reviewer:Perform detailed review and create remediation steps]]
[[agent:security:Run security checks on changed files]]
[[agent:qa:Validate tests and CI]]
[[agent:cto:Approve or request changes]]

## Phase 1: Preparation
- Clone/fetch the repository at the specified path
- Identify the scope of review (files, commit, or PR)
- Check for any CI configuration

## Phase 2: Code Quality Review
- Check code style and formatting
- Analyze code complexity
- Look for code smells
- Review naming conventions

## Phase 3: Security Review
- Check for security vulnerabilities
- Review authentication/authorization logic
- Look for hardcoded secrets
- Check dependency security

## Phase 4: Testing Review
- Check test coverage
- Review test quality
- Look for edge cases

## Phase 5: Report
- Summarize findings
- Rate severity (critical/high/medium/low)
- Provide actionable recommendations

## Delivery Guardrails
- Explicitly flag placeholder/generic outputs as release blockers.
- Enforce code/docs/tests-only scope for final deliverables.
- Treat generated artifacts as policy violations unless allow-listed.
- Follow `docs/PRODUCTION_DELIVERABLE_POLICY.md`.
