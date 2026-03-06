# Autonomous Coding Agent Prompt: Data Analytics & Feedback Loop

## Objective
Implement mechanisms for the agent to learn from past mistakes and require confidence scoring for code changes.

## Target Architecture
These features involve persistent databases for memory storage and modifying the LLM response schema in the Tool Router.

## File-by-File Implementation Instructions

### 1. Error Categorization & Memory
**Files to Create/Modify:**
- `src/cowork/persistence/migrations/0002_add_error_memory.sql` (NEW): Create a Postgres schema to store error strings, context, and the eventual successful fix (diff).
- `src/cowork/runtime/error-knowledgebase.ts` (NEW): Implement logic to automatically record a successful task's error history into the database upon passing tests.
- `tools/mcp-server.ts`: Expose a `query_past_mistakes(error_string)` tool allowing agents to search the database when they encounter a new bug.

### 2. Telemetry & Confidence Scoring
**Files to Create/Modify:**
- `src/cowork/runtime/tool-router.ts`: Update the expected JSON schema for tool calls. Add `"confidence": number` (1-100) and `"rationale": string` to the envelope requirements.
- `src/cowork/runtime/agent-runner.ts`: Evaluate the confidence score on every execution loop. If the score is below a configurable threshold (e.g., 75%), immediately pause the loop and trigger a `request_human_input` escalation.
- `src/cowork/monitoring/parallel-state-monitor.ts`: Log the confidence scores to the telemetry stream.

## Testing Requirements
- Unit tests for the `tool-router.ts` parser ensuring it rejects outputs missing the `confidence` score.
- Integration tests simulating an agent returning low confidence and verifying the human escalation path is triggered.
- Ensure all tests pass: `npm run test:unit`.
