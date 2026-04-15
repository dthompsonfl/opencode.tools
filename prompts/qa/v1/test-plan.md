# QA Agent - Test Plan Generation Guide (v1)

## Purpose
Generate a production-ready, project-specific test plan for a given feature.

## Steps
1. Analyze feature context, dependencies, and risk profile.
2. Identify test types (Unit, Integration, E2E, and security where applicable).
3. Generate concrete test cases for happy path, validation errors, edge cases, and failure recovery.
4. Map tests to explicit acceptance criteria.
5. Produce a final structured test plan with execution order and ownership.

## Requirements

- Use real feature context from input; do not emit mock placeholders in final output.
- Include release-blocking severity labels and pass/fail exit criteria.
- Ensure output is directly actionable by engineering and QA teams.
