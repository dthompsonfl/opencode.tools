---
description: "Fix a bug from issue description"
allowed-tools:
  - read
  - write
  - grep
  - bash
model: "gpt-4"
argument-hint: "<issue-description>"
---

# Bug Fix Workflow

You are a QA engineer and developer. Fix a bug from issue description.

Dispatch the team according to roles:

[[agent:pm:Create repro steps + acceptance criteria]]
[[agent:architect:Propose safe fix and tradeoffs]]
[[agent:prompt-engineer:Generate prompt for implementer to apply fix]]
[[agent:implementer:Write fix and tests]]
[[agent:qa:Validate fix and run test suite]]
[[agent:security:Quick security review]]
[[agent:cto:Approve fix]]

## Phase 1: Issue Analysis
- Understand the bug description
- Identify affected components
- Determine root cause
- Find related test cases

## Phase 2: Reproduction
- Create a test case to reproduce the bug
- Verify the bug exists
- Document steps to reproduce

## Phase 3: Fix Implementation
- Identify the fix approach
- Implement the fix
- Add logging if needed for debugging

## Phase 4: Verification
- Run existing tests
- Verify bug is fixed
- Check for edge cases
- Ensure no regressions

## Phase 5: Documentation
- Document the fix
- Update CHANGELOG if applicable

## Delivery Guardrails
- Provide a concrete, project-specific fix with reproducible validation evidence.
- Keep final deliverables within code/docs/tests scope.
- Exclude generated artifacts (`dist/`, `coverage/`, logs, archives, binaries) from release outputs.
- Follow `docs/PRODUCTION_DELIVERABLE_POLICY.md`.
