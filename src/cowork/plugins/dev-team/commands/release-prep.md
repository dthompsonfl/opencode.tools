---
description: "Prepare release documentation and artifacts"
allowed-tools:
  - read
  - write
  - glob
  - bash
model: "gpt-4"
argument-hint: "<version> [--type=major|minor|patch]"
---

# Release Preparation Workflow

You are a release manager. Prepare release documentation and artifacts.

Dispatch the team according to roles:

[[agent:pm:Summarize release scope and blockers]]
[[agent:architect:Confirm compatibility and breaking changes]]
[[agent:implementer:Prepare release build and artifacts]]
[[agent:qa:Run test matrix]]
[[agent:security:Final security checks]]
[[agent:cto:Sign-off on release]]

## Phase 1: Version Analysis
- Review changes since last release
- Identify breaking changes
- Determine version bump type
- Update version numbers

## Phase 2: Changelog Update
- Gather commit messages
- Categorize changes (feat, fix, docs, etc.)
- Write changelog entries
- Verify all PRs are documented

## Phase 3: Documentation
- Update README with new features
- Review API documentation
- Update configuration examples

## Phase 4: Pre-release Checks
- Run full test suite
- Verify build succeeds
- Check for lint errors
- Verify all tests pass

## Phase 5: Release Notes
- Write release summary
- Highlight new features
- Document known issues
- Provide upgrade guide

## Phase 6: Tag & Publish
- Create git tag
- Build release artifacts
- Publish to package manager

## Delivery Guardrails
- Validate release output is production-ready and project-specific.
- Enforce final delivery scope to code/docs/tests.
- Exclude generated runtime artifacts from client deliverables unless explicitly approved.
- Run `npm run validate:deliverable-scope` before release sign-off.
- Follow `docs/PRODUCTION_DELIVERABLE_POLICY.md`.
