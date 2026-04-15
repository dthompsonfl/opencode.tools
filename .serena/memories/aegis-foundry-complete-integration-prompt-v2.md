# Aegis Foundry — Complete Corporate Integration Prompt (One-Shot)

## Mission Statement

Build and integrate **Aegis Foundry** as a first-class, production-grade multi-agent orchestration system into the Neo.mjs repository. This system operates as a **real-world autonomous engineering company** with a functional **Coworker Space UI**, where the user acts as the **CEO** and the **CTO Orchestrator** serves as the primary point of contact.

---

## Executive Vision

### The Experience
You (the CEO) interact with a **CTO Orchestrator Agent** who:
1. **Validates** all required documents are present before proceeding
2. **Asks clarifying questions** based on source code analysis to ensure optimal outcomes
3. **Translates** your intent into actionable engineering plans
4. **Delegates** to Manager agents (PM, EM, QA, Security, DX)
5. **Orchestrates** Worker agents who implement features exhaustively
6. **Ensures** 100% complete, secure, optimized, production-ready code

### Non-Negotiable Principles
- **Zero TODOs**: All code must be 100% complete
- **Zero Hallucination**: CTO asks questions rather than assume
- **Security First**: All changes pass security gates
- **Evidence-Based**: All completion claims require proof
- **Self-Healing**: System detects issues and auto-remediates
- **Self-Improving**: System learns from each run and optimizes

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CEO (Human User)                                  │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CTO ORCHESTRATOR (Main Agent)                          │
│  • Validates documents        • Asks clarifying questions                   │
│  • Analyzes source code       • Generates plans                             │
│  • Requests approvals         • Runs retrospectives                         │
└──────────────────────┬──────────────────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┬──────────────┬──────────────┐
        ▼              ▼              ▼              ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   EM Mgr    │ │   PM Mgr    │ │   QA Mgr    │ │ Security Mgr│ │   DX Mgr    │
│Architecture │ │  Scope/AC   │ │ Test Plans  │ │ Secrets/Auth│ │  Runbooks   │
└──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
       │               │               │               │               │
       └───────────────┴───────┬───────┴───────────────┴───────────────┘
                               │
                               ▼
              ┌───────────────────────────────────────┐
              │           WORKER AGENTS               │
              │  Frontend  Backend  Infra  Tests      │
              └───────────────────────────────────────┘
```

---

## Phase 0: Pre-Flight Checklist (MANDATORY)

Before writing ANY code, the CTO Orchestrator MUST:

1. **Read Required Documents** (in `docs/aegis_foundry/`):
   - `README.md` — System overview and integration points
   - `PRD.md` — Product requirements and success criteria
   - `ARCHITECTURE.md` — System design and code layout
   - `PROTOCOL.md` — WebSocket event/command protocol
   - `GOVERNANCE.md` — Loop prevention and check-in policies
   - `UI_SPEC.md` — Coworker Space UI requirements
   - `MODEL_CONTROL.md` — Per-agent model routing
   - `REPO_SELF_MODIFICATION.md` — Safe code change workflow
   - `SELF_ADAPTATION.md` — Bounded improvement loop
   - `CTO_CONSOLE_GUIDE.md` — User-facing CTO interaction guide

2. **Read Agent Specifications** (in `docs/aegis_foundry/autonomous_engineering_company/`):
   - `ORG_SPEC.yaml` — Organization structure and principles
   - `agents/*.yaml` — Individual agent role definitions
   - `workflows/end_to_end_delivery_workflow.yaml` — Delivery process
   - `state_machine/cto_agent_state_machine.yaml` — Orchestration state machine

3. **Create/Update ADR**:
   - File: `docs/aegis_foundry/adr/ADR-0002-neo-aegis-integration.md`
   - Include: Integration map, protocol decisions, persistence strategy, UI layout, governance configuration

4. **Verify Neo.mjs Integration Points**:
   - `ai/Agent.mjs` — Base agent runtime
   - `ai/agent/Loop.mjs` — Agent execution loop
   - `src/data/connection/WebSocket.mjs` — Browser WS client
   - `ai/mcp/server/neural-link/Bridge.mjs` — Node WS bridge pattern

**NO CODE IS WRITTEN UNTIL THIS CHECKLIST IS COMPLETE.**

---

## Phase 1: Core Runtime Implementation

### 1.1 Directory Structure

Create the following structure:

```
E:\neo\
├── ai\
│   └── aegis-foundry\
│       ├── cli.mjs                          # Entry point: starts runtime
│       ├── config.mjs                       # Environment + config validation
│       ├── protocol\
│       │   ├── schemas.mjs                  # Zod schemas for validation
│       │   ├── events.mjs                   # Event type definitions
│       │   └── commands.mjs                 # Command type definitions
│       ├── runtime\
│       │   ├── Orchestrator.mjs             # CTO/MOA logic + delegation
│       │   ├── RoleAgent.mjs                # Base agent wrapper
│       │   ├── ManagerAgent.mjs             # Manager specialization
│       │   ├── WorkerAgent.mjs              # Worker specialization
│       │   ├── Registry.mjs                 # Agent lifecycle + roster
│       │   └── ProjectContainer.mjs         # Per-project isolation
│       ├── governance\
│       │   ├── GovernanceEngine.mjs         # Budgets, cadence, detection
│       │   ├── CycleDetector.mjs            # Loop detection algorithms
│       │   ├── CheckinScheduler.mjs         # Check-in coordination
│       │   └── InterventionManager.mjs      # Alert + action handling
│       ├── tasks\
│       │   ├── TaskGraph.mjs                # Task state machine
│       │   ├── TaskStore.mjs                # Task persistence
│       │   └── TaskAssigner.mjs             # Intelligent assignment
│       ├── store\
│       │   ├── SessionStore.mjs             # Append-only event log
│       │   ├── SnapshotManager.mjs          # State snapshots
│       │   └── ProjectStore.mjs             # Project metadata
│       ├── model-routing\
│       │   ├── ModelRouter.mjs              # Model selection logic
│       │   ├── BudgetManager.mjs            # Token/cost tracking
│       │   └── ModelCatalog.mjs             # Available models registry
│       └── ws\
│           ├── Bridge.mjs                   # WebSocket server
│           ├── ConnectionManager.mjs        # Client connections
│           └── MessageRouter.mjs            # Event routing
├── apps\
│   └── aegis-foundry\
│       ├── index.html                       # Entry HTML
│       ├── app.mjs                          # Neo app bootstrap
│       ├── neo-config.json                  # Neo configuration
│       ├── store\
│       │   ├── ProjectStore.mjs             # Project state
│       │   ├── RunStore.mjs                 # Run state
│       │   ├── AgentStore.mjs               # Agent state
│       │   ├── TaskStore.mjs                # Task board state
│       │   ├── ChatStore.mjs                # Chat/messaging state
│       │   ├── EventLogStore.mjs            # Timeline state
│       │   └── CTOConsoleStore.mjs          # CTO interaction state
│       ├── model\
│       │   ├── Project.mjs                  # Project entity
│       │   ├── Run.mjs                      # Run entity
│       │   ├── Agent.mjs                    # Agent entity
│       │   ├── Task.mjs                     # Task entity
│       │   ├── Message.mjs                  # Chat message entity
│       │   ├── Event.mjs                    # Event log entry
│       │   └── Alert.mjs                    # Governance alert
│       └── view\
│           ├── MainContainer.mjs            # Root container
│           ├── sidebar\
│           │   ├── ProjectSelector.mjs      # Project dropdown
│           │   ├── ChannelList.mjs          # Channel list
│           │   ├── AgentQuickList.mjs       # Agent status indicators
│           │   └── RunControls.mjs          # Start/pause/resume/stop
│           ├── panels\
│           │   ├── ChatPanel.mjs            # Channel + DM chat
│           │   ├── TaskBoardPanel.mjs       # Kanban task board
│           │   ├── TimelinePanel.mjs        # Event log timeline
│           │   ├── CTOConsolePanel.mjs      # Talk to CTO
│           │   └── SettingsPanel.mjs        # Configuration UI
│           ├── components\
│           │   ├── AgentStatusBoard.mjs     # Agent grid with metrics
│           │   ├── TaskCard.mjs             # Task board card
│           │   ├── MessageBubble.mjs        # Chat message
│           │   ├── AlertBanner.mjs          # Governance alerts
│           │   ├── ModelSelector.mjs        # Per-agent model dropdown
│           │   └── ApprovalQueue.mjs        # Pending approvals list
│           └── dialogs\
│               ├── CreateProjectDialog.mjs  # New project modal
│               ├── EditRosterDialog.mjs     # Agent roster editor
│               ├── TaskDetailDialog.mjs     # Task detail view
│               └── HelpRequestDialog.mjs    # Request help modal
└── .aegis-foundry\
    └── projects\
        └── <projectId>\
            ├── project.json                 # Roster + policies
            ├── runs\
            │   └── <runId>\
            │       ├── events.ndjson        # Append-only event log
            │       ├── snapshot.json        # State snapshot
            │       └── artifacts\
            │           ├── plans\
            │           ├── diffs\
            │           └── reports
            └── memory\
                ├── knowledge-index.json
                └── retrospective.md
```

### 1.2 Protocol Implementation (100% Complete)

Implement ALL events from PROTOCOL.md:

**Events (Runtime → UI):**
- `RUN_STATE_CHANGED` — Run state transitions
- `AGENT_STATE_UPDATED` — Agent status, turn count, loop risk
- `CHAT_MESSAGE_CREATED` — New chat/DM messages
- `TASK_CREATED` — New task added
- `TASK_UPDATED` — Task modified
- `TASK_STATE_CHANGED` — Task status change
- `EVENT_LOG_APPENDED` — New event log entry
- `GOVERNANCE_ALERT_RAISED` — Loop/budget alert
- `PLAN_CHANGE_REQUESTED` — Requires approval
- `PLAN_CHANGE_APPROVED` — Change approved
- `CHECKIN_REQUESTED` — Manager requesting check-in
- `CHECKIN_COMPLETED` — Check-in finished
- `PROJECT_ROSTER_UPDATED` — Agent added/removed
- `AGENT_MODEL_UPDATED` — Model change confirmed
- `PROTOCOL_ERROR` — Validation failure

**Commands (UI → Runtime):**
- `START_RUN` — Begin new run
- `PAUSE_RUN` — Pause execution
- `RESUME_RUN` — Resume from pause
- `STOP_RUN` — Terminate run
- `FORCE_CHECKIN` — Immediate check-in
- `REASSIGN_TASK` — Change task owner
- `CREATE_TASK` — Add new task
- `REQUEST_HELP` — Create help subtask
- `APPROVE_PLAN_CHANGE` — Approve change
- `ACK_ALERT` — Acknowledge alert
- `SET_AGENT_MODEL` — Change agent model
- `ADD_AGENT_TO_PROJECT` — Add agent
- `REMOVE_AGENT_FROM_PROJECT` — Remove agent

### 1.3 Governance Engine (100% Complete)

Implement ALL governance policies:

**Budget Policies:**
- Max turns per task: 50 (configurable)
- Max consecutive no-progress turns: 3
- Max retries per tool error: 5
- Token budget per agent per run

**Cycle Detection:**
- State fingerprint repetition: ≥3 in 8 turns
- Progress delta threshold: <0.2 for 3 turns
- Task stagnation: Unchanged for 20 events while busy

**Check-in Cadence:**
- Worker → Manager: Every 6 turns or blocked
- Manager → CTO: Every 10 turns or high-risk
- CTO → Human: Milestones + repeated triggers

**Intervention Actions:**
- Force check-in
- Re-plan task
- Assign reviewer
- Create remediation subtask
- Pause run (require approval)
- Stop run (human only)

### 1.4 Model Routing (100% Complete)

Implement per-agent model control:

```javascript
// Model routing policy structure
const modelPolicy = {
  agent_id: "worker_fe_001",
  assigned_model: {
    provider: "gemini",
    name: "gemini-2.0-flash",
    params: { temperature: 0.2, max_output_tokens: 4000 }
  },
  fallback_models: [
    { provider: "openai", name: "gpt-4o-mini" }
  ],
  budget: {
    max_tokens_per_run: 100000,
    max_cost_usd: 5.00
  },
  constraints: {
    allowed_providers: ["gemini", "openai"],
    blocked_models: ["gpt-3.5-turbo"] // Too weak
  }
};
```

**Enforcement:**
- Runtime validates model before each agent turn
- Event log records `agent_model` metadata
- Disallowed model attempts rejected + alert raised
- Every model change audited with who/what/when/old/new

---

## Phase 2: Coworker Space UI (100% Complete)

### 2.1 Required Panels

**1. CTO Console Panel (Primary Interface)**
```
┌─────────────────────────────────────────────────────────────────┐
│  TALK TO CTO                                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CEO: I want to add user authentication to the Neo framework   │
│                                                                 │
│  CTO: I'll help you implement authentication. First, let me    │
│  verify we have the required documents...                      │
│                                                                 │
│  [✓] PRD.md exists                                             │
│  [✗] THREAT_MODEL.md missing — required for auth features      │
│                                                                 │
│  CTO: Before proceeding, I need you to create THREAT_MODEL.md  │
│  or shall I generate a template based on the authentication    │
│  scope?                                                        │
│                                                                 │
│  [Generate Template] [I'll Create It] [Reduce Scope]           │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  APPROVALS QUEUE          │  DECISIONS LOG                     │
│  • Add OAuth support      │  • OAuth approved (2 min ago)      │
│    [Approve] [Deny]       │  • JWT tokens approved (5 min ago) │
│  • Database migration     │  • Scope reduced (10 min ago)      │
│    [Approve] [Deny]       │                                    │
├─────────────────────────────────────────────────────────────────┤
│  QUICK ACTIONS                                                  │
│  [Generate Plan] [Status Brief] [Force Check-in] [Pause Run]   │
└─────────────────────────────────────────────────────────────────┘
```

**2. Team Chat Panel**
- Channels: #orchestrator, #engineering, #qa, #security, #docs, #help-requests
- DMs: Agent↔Agent, Human↔Agent
- Persistent history with scrollback
- @mentions support
- Message links to tasks/events
- "Request Help" button creates subtask + event

**3. Agent Status Board**
```
┌──────────────┬──────────┬──────────────┬─────────┬────────┬──────────┬───────────┐
│ Agent        │ Role     │ Model        │ Status  │ Task   │ Turns    │ Loop Risk │
├──────────────┼──────────┼──────────────┼─────────┼────────┼──────────┼───────────┤
│ cto_main     │ CTO      │ gemini-pro   │ Active  │ Plan   │ 12       │ Normal    │
│ em_sarah     │ EM       │ gpt-4o       │ Busy    │ Arch   │ 8        │ Normal    │
│ pm_mike      │ PM       │ claude-3.5   │ Idle    │ —      │ 3        │ Normal    │
│ fe_worker_1  │ Frontend │ gemini-flash │ Blocked │ Auth   │ 15       │ ⚠️ HIGH   │
│              │          │              │         │        │          │ [Check-in]│
└──────────────┴──────────┴──────────────┴─────────┴────────┴──────────┴───────────┘
```

**4. Task Board Panel**
- States: backlog → planned → in_progress → in_review → blocked → done
- Hierarchical: epic → story → task
- Drag-and-drop status changes
- Task detail panel with:
  - Description and acceptance criteria
  - Owner assignment
  - Blocker list
  - Linked messages/events
  - Progress checklist
- Create subtask, reassign, mark blocked/unblocked

**5. Timeline / Event Log Panel**
- Chronological event stream
- Filter by: agent, task, severity, event type
- Click to expand details
- Export session button
- Real-time updates via WebSocket

**6. Settings Panel**
- Project selector + create new
- Roster editor (add/remove agents)
- Per-agent model selector with constraints
- Governance threshold configuration
- Run history viewer

### 2.2 UI Implementation Requirements

**Framework:** Neo.mjs (native to repo)
**State Management:** Neo.data.Store with WebSocket sync
**Styling:** CSS with Neo theming system
**Real-time:** WebSocket connection with auto-reconnect

**All UI elements must:**
- Update in real-time via WebSocket events
- Persist state on refresh (restore from snapshot)
- Show loading states during async operations
- Display error messages for failures
- Be accessible (keyboard navigation, screen reader support)

---

## Phase 3: CTO Orchestrator Agent (100% Complete)

### 3.1 Role Definition

The CTO Orchestrator is the primary interface between the CEO (user) and the engineering team.

**Responsibilities:**
1. **Document Validation**: Verify all required docs exist before starting work
2. **Requirements Clarification**: Ask targeted questions to understand intent
3. **Source Code Analysis**: Read existing code to inform decisions
4. **Plan Generation**: Create actionable engineering plans
5. **Delegation**: Assign tasks to appropriate managers/workers
6. **Quality Gates**: Ensure all work passes acceptance criteria
7. **Escalation**: Request human approval for significant changes
8. **Retrospectives**: Learn from each run and propose improvements

### 3.2 Clarification Protocol

When the CEO submits a request, the CTO MUST:

```
STEP 1: Document Check
├─ Check for PRD.md
├─ Check for THREAT_MODEL.md (if security-related)
├─ Check for ARCHITECTURE.md
├─ Check for relevant existing code
└─ Report missing documents

STEP 2: Intent Analysis
├─ What is the user trying to achieve?
├─ What is the business value?
├─ What are the constraints?
├─ What are the acceptance criteria?
├─ What could go wrong?
└─ Identify gaps

STEP 3: Source Code Review
├─ Read relevant existing modules
├─ Identify integration points
├─ Note existing patterns/conventions
├─ Check for conflicts with proposed changes
└─ Ask code-specific questions

STEP 4: Clarification Questions
├─ Ask targeted questions based on gaps
├─ Propose alternatives if needed
├─ Confirm understanding before proceeding
└─ Get explicit confirmation

STEP 5: Plan Generation (only after confirmation)
├─ Break down into phases
├─ Assign to appropriate agents
├─ Define acceptance criteria per task
├─ Set model assignments
└─ Present plan for approval
```

### 3.3 Example Clarification Dialogue

```
CEO: Add a user authentication system to Neo

CTO: I'll help you implement authentication. Let me first verify our
     documentation and understand your requirements.

[CTO reads existing Neo auth-related code, checks for docs]

CTO: I've analyzed the request. Here are my clarifying questions:

  1. AUTH METHOD: Do you want:
     a) JWT tokens (stateless, scalable)
     b) Session-based (simpler, traditional)
     c) OAuth integration (Google/GitHub login)
     d) All of the above?

  2. USER DATA: Where should user data be stored?
     a) In-memory (development only)
     b) SQLite (simple, file-based)
     c) PostgreSQL (production-grade)

  3. EXISTING CODE: I see Neo already has a basic permission system
     in src/core/Security.mjs. Should I:
     a) Extend the existing system
     b) Replace it entirely
     c) Create a new auth module that integrates with it

  4. UI REQUIREMENTS: Do you need login/logout UI components?

  5. THREAT MODEL: For security features, I need a THREAT_MODEL.md.
     Shall I generate one based on your answers above?

Please answer these questions so I can create the optimal implementation plan.
```

---

## Phase 4: Manager Agents (100% Complete)

### 4.1 Engineering Manager (EM)

**Role:** Architecture, integration, code quality

**Responsibilities:**
- Design system architecture
- Define integration patterns
- Enforce code quality standards
- Review technical implementations
- Coordinate frontend/backend workers

**Check-in Requirements:**
- Every 10 turns or when architecture decision needed
- Report: Component design, integration points, blockers

### 4.2 Product Manager (PM)

**Role:** Scope, acceptance criteria, task breakdown

**Responsibilities:**
- Define feature scope
- Write acceptance criteria
- Break epics into stories/tasks
- Validate user requirements
- Prioritize backlog

**Check-in Requirements:**
- Every 10 turns or when scope clarification needed
- Report: Task breakdown, AC definition, priority changes

### 4.3 QA Manager

**Role:** Test plan, validation, regression

**Responsibilities:**
- Define test strategy
- Write test plans
- Validate test coverage
- Run regression checks
- Approve task completion

**Check-in Requirements:**
- Every 10 turns or when test failure detected
- Report: Test coverage, failures, remediation needed

### 4.4 Security Manager

**Role:** Secrets, permissions, boundaries, data handling

**Responsibilities:**
- Review security implications
- Manage secret handling
- Define permission boundaries
- Run security scans
- Veto unsafe changes

**Check-in Requirements:**
- Every 10 turns or security concern arises
- Report: Security review status, vulnerabilities, recommendations

### 4.5 DX/Docs Manager

**Role:** Runbooks, onboarding, documentation

**Responsibilities:**
- Write runbooks
- Maintain documentation
- Create onboarding guides
- Document APIs
- Update changelogs

**Check-in Requirements:**
- Every 10 turns or when docs need updating
- Report: Doc coverage, gaps, updates needed

---

## Phase 5: Worker Agents (100% Complete)

### 5.1 Frontend Worker

**Specialization:** UI components, styling, client-side logic

**Outputs:**
- Complete component implementations
- CSS/styling
- Client-side JavaScript
- Accessibility compliance
- Visual verification evidence

### 5.2 Backend Worker

**Specialization:** APIs, databases, server logic

**Outputs:**
- API endpoint implementations
- Database schemas/migrations
- Server-side logic
- Integration code
- API documentation

### 5.3 Infrastructure Worker

**Specialization:** DevOps, CI/CD, deployment

**Outputs:**
- CI/CD pipeline configs
- Deployment scripts
- Infrastructure as code
- Monitoring setup
- Rollback procedures

### 5.4 Test Automation Worker

**Specialization:** Test writing, test execution

**Outputs:**
- Unit tests
- Integration tests
- E2E tests
- Test reports
- Coverage analysis

---

## Phase 6: Project Scoping (100% Complete)

### 6.1 Project Isolation

Each project has complete isolation:

```javascript
const project = {
  id: "proj_auth_system",
  name: "Authentication System",
  roster: [
    { id: "cto_main", role: "CTO_ORCHESTRATOR", model: "gemini-pro" },
    { id: "em_sarah", role: "EM_MANAGER", model: "gpt-4o" },
    { id: "fe_worker_1", role: "FRONTEND_WORKER", model: "gemini-flash" }
  ],
  task_graph: { /* tasks */ },
  chat_channels: ["#engineering", "#security"],
  event_log: [/* events */],
  policies: {
    model_routing: { /* model assignments */ },
    governance: { /* thresholds */ },
    budget: { /* limits */ }
  },
  memory: {
    knowledge_index: {},
    retrospectives: []
  }
};
```

### 6.2 Project Operations

**Available in UI:**
- Create new project (wizard)
- Archive project
- Switch between projects
- Clone project template
- Export project state

**Per-project settings:**
- Agent roster editor
- Model assignments per agent
- Governance thresholds
- Budget limits
- Allowed providers/models list

---

## Phase 7: Self-Healing & Self-Improvement (100% Complete)

### 7.1 Self-Healing Capabilities

**Auto-Remediation Triggers:**
- Test failure → Auto-create fix task → Assign to worker
- Security vulnerability → Alert + Create remediation task
- Performance regression → Profile + Optimize task
- Visual verification mismatch → Debug + Fix task
- Flaky test → Stabilize + Re-run

**Remediation Loop:**
```
Trigger Detected
     ↓
Create Remediation Task
     ↓
Assign to Best-Qualified Agent
     ↓
Implement Fix
     ↓
Run Affected Checks
     ↓
Pass? → Continue
Fail? → Loop (max 3 attempts, then escalate)
```

### 7.2 Self-Improvement Loop

**Metrics Collection:**
- Time to task completion
- Number of governance alerts per run
- Intervention frequency
- Test failure rate
- User override count
- Code quality scores

**Retrospective Process:**
```
End of Run
     ↓
Generate Metrics Report
     ↓
Identify Top 3 Friction Points
     ↓
Create Improvement Proposals
     ↓
Propose Changes (prompts/policies/models)
     ↓
CTO Reviews Proposals
     ↓
Approved? → Apply via PR flow
Declined? → Document reason
```

**What Can Be Improved:**
- Agent prompt templates
- Governance thresholds
- Model assignments per role
- Task decomposition heuristics
- Definition of done checklists

---

## Phase 8: Repo Self-Modification (100% Complete)

### 8.1 Safe Change Workflow

All code changes follow this gated process:

```
1. PROPOSE
   ├─ Generate plan (diff summary)
   ├─ List affected files
   ├─ Risk analysis
   └─ Rollback strategy

2. VALIDATE
   ├─ Run unit tests
   ├─ Run linting
   ├─ Run type checking
   └─ Security scan

3. REVIEW
   ├─ Manager agent review
   ├─ Security review (if needed)
   └─ CTO approval for risky changes

4. APPROVE (if required)
   ├─ Human approval for:
   │   ├─ New dependencies
   │   ├─ Build system changes
   │   ├─ Network access changes
   │   ├─ Privilege escalation
   │   └─ Large refactors (>600 lines)
   └─ Auto-approve for small changes (if policy allows)

5. APPLY
   ├─ Create branch
   ├─ Commit with descriptive message
   ├─ Run CI checks
   └─ Merge if green

6. POST-MERGE
   ├─ Update knowledge index
   ├─ Write retrospective entry
   └─ Notify stakeholders
```

### 8.2 Audit Requirements

Every change creates:
- Event log entry
- Artifact files:
  - `plan.md` — Change proposal
  - `diff.patch` — Actual diff
  - `test-report.json` — Test results
  - `review-notes.md` — Review comments
  - `approval.json` — Approval record

---

## Phase 9: Vertical Slice Delivery Plan

### Slice 0 — Recon & Planning (No Code)
**Duration:** 1 session
**Deliverables:**
- [ ] ADR-0002 with integration map
- [ ] Updated ARCHITECTURE.md with module layout
- [ ] Protocol schemas defined
- [ ] State machine implementation plan
- [ ] UI wireframes

**Exit Criteria:**
- Reviewer can point to where every component will live
- All file paths documented
- All interfaces defined

### Slice 1 — Minimal Runtime + UI (Must Run End-to-End)
**Duration:** 2-3 sessions
**Deliverables:**
- [ ] Basic runtime with WS bridge
- [ ] Session store with persist/restore
- [ ] Minimal roster + tasks
- [ ] Simple chat panel
- [ ] Agent list panel
- [ ] Start/pause/resume/stop controls

**Exit Criteria:**
- User can start run from UI
- Events stream to UI in real-time
- Refresh restores state
- `npm run test-unit` passes

### Slice 2 — Collaboration Completeness
**Duration:** 2 sessions
**Deliverables:**
- [ ] Multi-channel chat
- [ ] DMs between agents
- [ ] Help requests create subtasks
- [ ] Event log panel with filtering
- [ ] Task board with status changes

**Exit Criteria:**
- Agents can "talk like coworkers"
- Help request → subtask → assignment flow works
- Task board updates in real-time

### Slice 3 — Governance + CTO Console + Model Control
**Duration:** 2-3 sessions
**Deliverables:**
- [ ] Check-in scheduling
- [ ] Cycle detection (fingerprints + progress)
- [ ] Governance alerts in UI
- [ ] CTO Console with chat + approvals
- [ ] Per-agent model selector
- [ ] Model routing enforcement

**Exit Criteria:**
- Loop detection triggers and alerts
- CTO Console allows "talk to CTO"
- Model changes enforced by runtime
- `npm run test-unit` passes

### Slice 4 — Project Scoping + Self-Modification + Adaptation
**Duration:** 2-3 sessions
**Deliverables:**
- [ ] Project selector + create project
- [ ] Roster editor
- [ ] Run history
- [ ] Gated repo self-modification flow
- [ ] Metrics collection
- [ ] Retrospective generation
- [ ] Improvement proposal pipeline

**Exit Criteria:**
- Multiple projects isolated
- Agents can propose code changes safely
- Self-adaptation loop runs
- All tests pass

### Slice 5 — Polish & Production Hardening
**Duration:** 1-2 sessions
**Deliverables:**
- [ ] Error handling throughout
- [ ] Loading states
- [ ] Documentation complete
- [ ] Performance optimization
- [ ] Security audit
- [ ] Accessibility compliance

**Exit Criteria:**
- System is production-ready
- All docs accurate and complete
- CEO can successfully delegate complex tasks

---

## Phase 10: Testing Requirements (100% Coverage)

### Unit Tests (Required)
```
ai/aegis-foundry/tests/
├── protocol/
│   ├── schema-validation.test.mjs
│   └── event-serialization.test.mjs
├── governance/
│   ├── cycle-detection.test.mjs
│   ├── checkin-scheduler.test.mjs
│   └── budget-enforcement.test.mjs
├── runtime/
│   ├── orchestrator.test.mjs
│   ├── registry.test.mjs
│   └── project-container.test.mjs
├── model-routing/
│   ├── model-router.test.mjs
│   └── budget-manager.test.mjs
└── store/
    ├── session-store.test.mjs
    └── snapshot-manager.test.mjs
```

### UI Tests (Required)
```
apps/aegis-foundry/tests/
├── components/
│   ├── AgentStatusBoard.test.mjs
│   ├── TaskCard.test.mjs
│   └── ModelSelector.test.mjs
├── panels/
│   ├── ChatPanel.test.mjs
│   ├── TaskBoard.test.mjs
│   └── CTOConsole.test.mjs
└── integration/
    ├── ws-connection.test.mjs
    └── state-persistence.test.mjs
```

### Integration Tests (Required)
- End-to-end run flow
- WebSocket event/command round-trip
- Session persistence round-trip
- Model routing enforcement
- Governance intervention flow

**Command:** `npm run test-unit` must pass before any PR.

---

## Phase 11: Documentation Requirements (Always Current)

Documents must be updated AS YOU IMPLEMENT:

- [ ] `docs/aegis_foundry/RUNBOOK.md` — Exact commands
- [ ] `docs/aegis_foundry/ARCHITECTURE.md` — Actual module layout
- [ ] `docs/aegis_foundry/PROTOCOL.md` — All events/commands with examples
- [ ] `docs/aegis_foundry/GOVERNANCE.md` — Thresholds and interventions
- [ ] `docs/aegis_foundry/UI_SPEC.md` — All panels and flows
- [ ] `docs/aegis_foundry/CHANGELOG.md` — What shipped
- [ ] `README.md` — Quick start guide

---

## Safety & Compliance Checklist

### Security
- [ ] No secrets in code or logs
- [ ] All inputs validated with Zod schemas
- [ ] Fail closed on protocol errors
- [ ] Permission checks on all repo modifications
- [ ] Security scan before any merge

### Reliability
- [ ] Bounded retries on all external calls
- [ ] Circuit breakers for failing services
- [ ] Graceful degradation
- [ ] State persistence for crash recovery

### Observability
- [ ] Every action logged to event log
- [ ] Structured logging with correlation IDs
- [ ] Metrics collection
- [ ] Alert on anomalies

---

## Success Criteria (Definition of Done)

The integration is complete when ALL of the following are true:

✅ **Functional:**
- CEO can start a project and talk to CTO
- CTO asks clarifying questions before proceeding
- Manager agents delegate to workers
- Workers implement 100% complete features
- All code is production-ready (no TODOs)

✅ **UI:**
- Coworker Space loads and connects via WebSocket
- Real-time updates for chat, tasks, agents
- CTO Console allows direct CTO interaction
- Model selector works per-agent
- Project isolation functional

✅ **Governance:**
- Loop detection triggers appropriately
- Check-ins occur at configured cadence
- Alerts visible and actionable
- Interventions can be applied

✅ **Quality:**
- All tests pass (`npm run test-unit`)
- Zero lint warnings
- Type checking passes
- Security scan clean

✅ **Documentation:**
- All docs accurate and up-to-date
- RUNBOOK has exact commands
- Architecture matches implementation

✅ **Self-Capabilities:**
- Self-healing remediates common issues
- Self-improvement proposes optimizations
- Repo self-modification is safe and gated

---

## Final Ship Report Template

When complete, produce:

```markdown
# Aegis Foundry Integration — Ship Report

## Summary
- Runtime: [status]
- UI: [status]
- Governance: [status]
- Projects: [status]
- Self-adaptation: [status]

## Quick Start
```bash
# Start runtime
npm run aegis:runtime

# Start UI
npm run aegis:ui

# Run tests
npm run test-unit
```

## URLs
- UI: http://localhost:8080/apps/aegis-foundry/
- WS: ws://localhost:8091

## Test Results
```
✓ 127 tests passed
✓ 0 failed
```

## Files Changed
- Added: [list]
- Modified: [list]

## Known Limitations
- [Small, concrete items]

## Next Steps
- [Priority items for v1.1]
```

---

## Prompt for Agent Execution

When this prompt is given to an agent, they shall:

1. **Acknowledge** they have read and understood the complete specification
2. **Verify** they can access all referenced documentation
3. **Begin with Phase 0** (no code) and confirm completion
4. **Proceed through phases** in order, verifying exit criteria
5. **Ask clarifying questions** whenever anything is ambiguous
6. **Produce 100% complete code** — no TODOs, no placeholders
7. **Update docs** alongside implementation
8. **Write tests** for all new functionality
9. **Report progress** at each phase boundary
10. **Deliver Ship Report** at completion

---

*This is a complete, production-ready specification for integrating Aegis Foundry into Neo.mjs as a corporate-grade autonomous engineering system.*
