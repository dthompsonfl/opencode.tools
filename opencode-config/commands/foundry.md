# /foundry Command

## Metadata
- **ID**: foundry
- **Name**: Foundry Orchestration
- **Description**: Invoke the Foundry orchestration workflow with CTO-driven satisfaction loop

## Command Template

Execute a Foundry orchestration workflow for autonomous development.

### Usage

```
/foundry <project-name> [--repo=<path>] [--iterations=<n>] [--gates=<true|false>]
```

### Parameters

- `project-name`: Name or description of the project/feature
- `--repo`: Repository root path (default: current directory)
- `--iterations`: Maximum iterations (default: 2)
- `--gates`: Run quality gates (default: true)

### Execution

When this command is invoked:

1. **Initialize Foundry**
   - Call `foundry_orchestrate` MCP tool
   - Set up project context
   - Load available agents

2. **Execute Workflow**
   - Run discovery phase
   - Develop architecture
   - Implement features
   - Run quality gates
   - CTO review and approval

3. **Satisfaction Loop**
   - CTO reviews all outputs
   - If not satisfied, loop back with feedback
   - Repeat until CTO approves

4. **Report Results**
   - Summary of completed tasks
   - Gate results
   - Final CTO disposition

### Example

```
/foundry "Add OAuth2 authentication" --repo=./myapp --iterations=3
```

### Output Format

```markdown
## Foundry Execution Report

**Project**: Add OAuth2 authentication
**Status**: completed
**Phase**: released
**CTO Decision**: APPROVED

### Tasks Completed
- ✅ Discovery and requirements
- ✅ Architecture design
- ✅ OAuth2 implementation
- ✅ Security review
- ✅ QA tests
- ✅ Documentation

### Quality Gates
- ✅ build: passed
- ✅ test: passed (42 tests)
- ✅ lint: passed
- ✅ security: passed

### CTO Notes
Implementation meets all standards. Security review passed.
Ready for deployment.
```

---

**Note**: This command delegates to the Foundry Orchestrator agent which acts as CTO.
