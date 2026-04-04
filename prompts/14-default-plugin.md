# Prompt: Create Default Dev Team Plugin

## Task
Create a default "Dev Team" plugin with standard workflows in `src/cowork/plugins/dev-team/`.

## Requirements

### Plugin Structure

```
src/cowork/plugins/dev-team/
├── plugin.json
├── commands/
│   ├── code-review.md
│   ├── feature-dev.md
│   ├── bugfix.md
│   ├── security-audit.md
│   └── release-prep.md
└── agents/
    ├── pm.md
    ├── architect.md
    ├── implementer.md
    ├── reviewer.md
    ├── qa.md
    ├── security.md
    ├── performance.md
    └── docs.md
```

### plugin.json

```json
{
  "id": "dev-team",
  "name": "Dev Team",
  "version": "1.0.0",
  "description": "Default development team workflows and agents",
  "author": "OpenCode Tools Team",
  "license": "MIT"
}
```

### Command: code-review.md

```yaml
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
```

### Agent: pm.md

```yaml
---
name: "pm"
description: "Project Manager - coordinates tasks and planning"
tools:
  - read
  - write
model: "gpt-4"
color: "blue"
---

# Project Manager Agent

You are an experienced Project Manager who excels at:
- Breaking down complex projects into manageable tasks
- Creating realistic timelines
- Identifying dependencies and risks
- Coordinating team efforts
- Communicating with stakeholders

## Your Approach
1. First, understand the full scope of the request
2. Break it down into epics and user stories
3. Identify dependencies and critical path
4. Estimate effort and timeline assumptions and constraints

## Output Format
Provide your
5. Document response in structured format with:
- Executive Summary
- Epics/Phases
- User Stories with acceptance criteria
- Risks and Mitigations
- Timeline estimate
```

## Implementation Guidelines

- Create all files in `src/cowork/plugins/dev-team/`
- Follow frontmatter schemas exactly
- Use descriptive prompts
- Include comprehensive workflows

## Validation

- Load plugin with plugin-loader
- Verify all commands parse correctly
- Verify all agents parse correctly
- Run each command through orchestrator

## Dependencies
- `./markdown-parser` (for validation)
