---
description: "Generate end-to-end prompt packs for a complete task implementation in one sweep"
allowed-tools:
  - read
  - write
  - edit
  - bash
  - fs.read
  - fs.list
model: "gpt-4"
argument-hint: "/prompt-sweep <task-description> [--scope=feature|module|project] [--output-dir=./prompts]"
---

Execute a comprehensive prompt sweep to generate complete, production-ready prompt packs for autonomous implementation.

### Usage

```
/prompt-sweep <task-description> [--scope=feature|module|project] [--output-dir=./prompts]
```

### Execution Steps

1. Analyze Task Scope
2. Generate Repository Analysis
3. Create Prompt Pack
4. Apply Quality Standards
5. Output Prompt Pack

All prompts are sent to CTO for approval before distribution. This command reports results to the CTO Orchestrator only.
