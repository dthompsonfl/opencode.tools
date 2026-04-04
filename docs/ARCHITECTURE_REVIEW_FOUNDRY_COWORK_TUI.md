# Architecture Review: Foundry-Cowork-Agents-TUI Integration

**Date:** 2025-02-15  
**Scope:** Integration architecture between Foundry, Cowork, Agents, and TUI  
**Classification:** Enterprise Architecture Assessment  

---

## Executive Summary

This document provides a comprehensive architectural review of the integration between **Foundry** (enterprise state machine orchestration), **Cowork** (plugin-based multi-agent runtime), **Agents** (specialized AI workers), and **TUI** (terminal user interface) in the OpenCode Tools repository.

### Key Findings

| Aspect | Status | Risk Level |
|--------|--------|------------|
| Foundry → Cowork Initialization | ⚠️ Lazy, unvalidated | Medium |
| Real-Time Agent Collaboration | ❌ Not fully supported | High |
| Data Flow Completeness | ⚠️ One-way, no streaming | Medium |
| TUI Integration | ❌ Not integrated | High |
| State Management | ❌ Fragmented | High |
| Event System | ⚠️ Disconnected hubs | Medium |

---

## 1. Architecture Assessment

### 1.1 Current State Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CURRENT ARCHITECTURE                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   FoundryOrchestrator │────▶│  FoundryCoworkBridge  │────▶│ CoworkOrchestrator│
│  (State Machine)      │     │   (Bridge/Adapter)   │     │ (EventBus+BB)   │
└──────────┬───────────┘     └──────────────────────┘     └────────┬────────┘
           │                                                       │
           │  ┌───────────────────────────────────────────────────────┐
           │  │                                                       │
           ▼  ▼                                                       ▼
┌──────────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│FoundryCollaborationHub│     │   AgentSpawner       │◀────│  EventBus       │
│   (Isolated Msgs)     │     │  (Agent Lifecycle)   │     │  (Singleton)    │
└───────────────────────┘     └──────────┬───────────┘     └─────────────────┘
                                         │
                                         ▼
                              ┌──────────────────────┐
                              │    AgentRunner       │
                              │   (LLM Execution)    │
                              └──────────┬───────────┘
                                         │
                                         ▼
                              ┌──────────────────────┐
                              │  Individual Agents   │
                              │ (Research, Code, QA) │
                              └──────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│   TUI (React Ink) - COMPLETELY ISOLATED                                    │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                     │
│   │  StoreContext │  │  SessionStore │  │   Screens    │                     │
│   │  (React State) │  │  (Filesystem) │  │  (UI Views)  │                     │
│   └──────────────┘  └──────────────┘  └──────────────┘                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Component Responsibilities

| Component | Responsibility | Current State |
|-----------|---------------|---------------|
| **FoundryOrchestrator** | Enterprise workflow state machine, checkpointing, quality gates | ✅ Functional |
| **FoundryCoworkBridge** | Adapter between Foundry and Cowork systems | ⚠️ Basic implementation |
| **CoworkOrchestrator** | Multi-agent coordination, event bus, blackboard | ✅ Functional |
| **AgentSpawner** | Agent lifecycle management, timeout handling | ✅ Functional |
| **AgentRunner** | LLM-based agent execution with tool routing | ✅ Functional |
| **EventBus** | Pub/sub inter-agent communication | ✅ Singleton available |
| **Blackboard** | Shared artifact storage | ✅ Singleton available |
| **FoundryCollaborationHub** | Foundry-specific message broadcasting | ⚠️ Isolated from EventBus |
| **TUI** | Terminal UI with React Ink | ❌ No integration |

---

## 2. Critical Issues Analysis

### 2.1 Issue #1: Foundry → Cowork Auto-Launch

**Current Behavior:**
- Lazy initialization in `FoundryCoworkBridge.initialize()`
- Called during `FoundryOrchestrator.execute()`, not at construction
- Plugin loading, agent registration happen at first execution

**Problems:**
1. Cold start latency on first `execute()` call
2. No validation that required agents exist until runtime
3. No pre-flight health checks possible
4. First task dispatch includes initialization overhead

**Code Evidence:**
```typescript
// src/foundry/orchestrator.ts
public async execute(request: FoundryExecutionRequest): Promise<FoundryExecutionReport> {
    // ...
    this.coworkBridge.initialize(); // Lazy initialization
    // ...
}
```

**Recommendation:**
- Add `warmup()` method for eager initialization
- Implement health check endpoint
- Cache initialization state
- Validate agent availability at startup

---

### 2.2 Issue #2: Real-Time Agent Collaboration

**Current State:**

| Feature | Status | Notes |
|---------|--------|-------|
| EventBus pub/sub | ✅ Available | Singleton pattern |
| Blackboard artifacts | ✅ Available | Singleton pattern |
| Agent → Agent events | ❌ Not supported | Agents can't access EventBus |
| Bidirectional comms | ❌ Not supported | Request/response only |
| Concurrent execution | ⚠️ Partial | spawnMany() exists but no coordination |

**Code Analysis:**
```typescript
// src/cowork/orchestrator/cowork-orchestrator.ts
public async spawnAgent(agentId: string, task: string, context?: Record<string, unknown>): Promise<AgentResult> {
    const sharedArtifacts = this.blackboard.getAllArtifacts();
    
    // Event published, but agents don't subscribe
    this.eventBus.publish('agent:start', { agentId, task, context, sharedArtifacts });
    
    const taskContext: TaskContext = { task, context: { ...context, sharedArtifacts } };
    
    // Agent execution - NO EventBus access given to agent
    const result = await this.agentSpawner.spawn(agentId, taskContext, { timeout: this.options.defaultTimeout });
    
    // Result stored in blackboard
    this.blackboard.updateArtifact(`agent_output:${agentId}`, result.output, agentId, 'agent_output');
    
    return result;
}
```

**Gap:** Agents receive `sharedArtifacts` at spawn time but cannot:
- Subscribe to artifact updates
- Publish events for other agents
- Receive real-time messages from other agents

---

### 2.3 Issue #3: Data Flow Completeness

**Request Flow (✅ Working):**
```
FoundryOrchestrator.runRoleTask()
  → FoundryCoworkBridge.dispatchRoleTask()
    → CoworkOrchestrator.spawnAgent()
      → AgentSpawner.spawn()
        → AgentRunner.run()
          → Agent execution
```

**Return Flow (⚠️ Limited):**
```
Agent execution
  → AgentRunner returns AgentExecutionResult
    → AgentSpawner creates AgentResult
      → CoworkOrchestrator.spawnAgent() returns AgentResult
        → FoundryCoworkBridge.dispatchRoleTask() returns AgentResult
          → FoundryOrchestrator.runRoleTask() receives AgentResult
```

**Missing in Return Flow:**
- ❌ No real-time progress updates
- ❌ No streaming output
- ❌ No intermediate evidence collection
- ❌ No transcript passed back to Foundry
- ❌ Blackboard artifacts not linked to Foundry evidence

**Code Evidence:**
```typescript
// src/foundry/orchestrator.ts
private async runRoleTask(stateMachine, roleId, title, taskBody): Promise<boolean> {
    // ...
    const result = await this.coworkBridge.dispatchRoleTask(roleId, taskBody, context);
    
    // Only final success/failure checked
    if (!result || !result.metadata.success) {
        task.status = 'failed';
        return false;
    }
    
    task.status = 'completed';
    return true;
}
```

---

### 2.4 Issue #4: TUI Integration Gap

**Current TUI State:**
- Independent session management via React context
- Filesystem-based session persistence
- No connection to Foundry or Cowork

**TUI Architecture:**
```
┌─────────────────────────────────────────────────────┐
│                     TUI                             │
│  ┌───────────────────────────────────────────────┐ │
│  │              StoreProvider                     │ │
│  │  ┌─────────────┐    ┌─────────────────────┐  │ │
│  │  │   Reducer   │◀───│    Action Dispatch  │  │ │
│  │  └─────────────┘    └─────────────────────┘  │ │
│  │         │                                      │ │
│  │         ▼                                      │ │
│  │  ┌─────────────┐    ┌─────────────────────┐  │ │
│  │  │    State    │───▶│   sessionStore      │  │ │
│  │  │  (sessions) │    │  (filesystem)       │  │ │
│  │  └─────────────┘    └─────────────────────┘  │ │
│  └───────────────────────────────────────────────┘ │
│                    │                                │
│                    ▼                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │HomeScreen│  │ChatScreen│  │Dashboard │         │
│  └──────────┘  └──────────┘  └──────────┘         │
└─────────────────────────────────────────────────────┘
                    │
                    │ ❌ NO CONNECTION
                    ▼
┌─────────────────────────────────────────────────────┐
│           Foundry / Cowork / Agents                 │
└─────────────────────────────────────────────────────┘
```

**Missing Capabilities:**
1. TUI cannot start Foundry workflows
2. TUI cannot monitor agent progress
3. TUI cannot view Blackboard artifacts
4. TUI cannot subscribe to EventBus
5. Session state is not unified

---

### 2.5 Issue #5: Duplicate State Management

**Three Separate State Stores:**

| Store | Owner | Persistence | Scope |
|-------|-------|-------------|-------|
| FoundryOrchestrator | Foundry | SQLite (checkpoint) | Workflow state |
| CoworkOrchestrator | Cowork | Transcript file | Agent executions |
| TUI Store | TUI | Filesystem (JSON) | UI sessions |
| Blackboard | Cowork | In-memory | Shared artifacts |

**Problems:**
- No single source of truth
- State synchronization issues
- Duplicate persistence logic
- Inconsistent evidence tracking

---

### 2.6 Issue #6: Missing Integration Points

**Integration Matrix:**

| Component A | Component B | Status | Impact |
|-------------|-------------|--------|--------|
| FoundryCollaborationHub | Cowork EventBus | ❌ Not connected | Messages isolated |
| TUI Store | Cowork EventBus | ❌ Not connected | No real-time updates |
| TUI Store | Foundry Checkpoint | ❌ Not connected | No workflow visibility |
| Foundry Evidence | Blackboard | ❌ Not connected | Duplicate artifacts |
| Agent Registry | ROLE_TO_AGENT | ⚠️ Weak coupling | Runtime failures |

---

## 3. Integration Recommendations

### 3.1 EventBus as Central Nervous System

**Proposed Architecture:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EVENT-DRIVEN ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────────────┐
                              │     EventBus         │
                              │   (Central Hub)      │
                              └──────────┬───────────┘
                                         │
           ┌─────────────────────────────┼─────────────────────────────┐
           │                             │                             │
           ▼                             ▼                             ▼
┌──────────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   FoundryOrchestrator │     │   CoworkOrchestrator │     │   TUI Store     │
│   (Workflow Events)   │     │   (Agent Events)      │     │  (UI Events)    │
└──────────────────────┘     └──────────────────────┘     └─────────────────┘
           │                             │                             │
           │                             │                             │
           ▼                             ▼                             ▼
┌──────────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│FoundryCollaborationHub│     │   Blackboard         │     │   React UI      │
│   (via EventBridge)   │     │   (Artifact Events)  │     │   (Re-renders)  │
└──────────────────────┘     └──────────────────────┘     └─────────────────┘
                                         │
                                         ▼
                              ┌──────────────────────┐
                              │    All Agents        │
                              │ (Event Context)      │
                              └──────────────────────┘
```

**Benefits:**
- Loose coupling between components
- Real-time updates across all layers
- Single integration point (EventBus)
- Easy to add new subscribers

---

### 3.2 Unified State Management

**Proposed Unified State Store:**

```typescript
// Central state store that all components use
interface UnifiedState {
  // Foundry workflow state
  workflow: {
    projectId: string;
    phase: StatePhase;
    tasks: FoundryTask[];
    checkpoint: ExecutionCheckpoint;
  };
  
  // Cowork runtime state
  runtime: {
    agents: Map<string, AgentState>;
    artifacts: Artifact[];
    transcript: TranscriptEntry[];
  };
  
  // TUI session state
  ui: {
    sessions: Session[];
    activeSessionId: string | null;
    view: 'home' | 'chat' | 'dashboard';
  };
}
```

---

### 3.3 Agent Context Enhancement

**Enhanced Agent Execution Context:**

```typescript
interface EnhancedTaskContext extends TaskContext {
  // Event system access
  events: {
    publish: (event: string, payload: any) => void;
    subscribe: (event: string, callback: EventCallback) => () => void;
  };
  
  // Blackboard access with notifications
  artifacts: {
    get: (key: string) => any;
    set: (key: string, value: any) => void;
    onUpdate: (callback: (key: string, value: any) => void) => () => void;
  };
  
  // Progress reporting
  progress: {
    report: (percent: number, message: string) => void;
    log: (message: string) => void;
  };
  
  // Direct messaging
  messaging: {
    send: (toAgentId: string, message: any) => void;
    onMessage: (callback: (from: string, message: any) => void) => () => void;
  };
}
```

---

### 3.4 TUI Integration Strategy

**TUI Event Subscription:**

```typescript
// TUI Store Provider enhancement
export const StoreProvider: React.FC = ({ children }) => {
  const [state, dispatch] = React.useReducer(reducer, initialState);
  const eventBus = React.useMemo(() => EventBus.getInstance(), []);
  
  // Subscribe to agent events
  React.useEffect(() => {
    const unsubscribe = [];
    
    // Agent lifecycle events
    unsubscribe.push(
      subscribeToEvent(eventBus, 'agent:start', (payload) => {
        dispatch({ type: 'ADD_ACTIVITY', activity: { agentId: payload.agentId, status: 'running' } });
      })
    );
    
    // Agent progress events
    unsubscribe.push(
      subscribeToEvent(eventBus, 'agent:progress', (payload) => {
        dispatch({ type: 'UPDATE_ACTIVITY', activity: { agentId: payload.agentId, progress: payload.percent } });
      })
    );
    
    // Artifact updates
    unsubscribe.push(
      subscribeToEvent(eventBus, 'artifact:any:updated', (payload) => {
        dispatch({ type: 'ADD_MESSAGE', message: { type: 'system', content: `Artifact updated: ${payload.key}` } });
      })
    );
    
    return () => unsubscribe.forEach(fn => fn());
  }, [eventBus]);
  
  // ... rest of provider
};
```

---

## 4. Implementation Priority

### Phase 1: Critical (Week 1)

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| 1 | Create EventBusBridge between FoundryCollaborationHub and Cowork EventBus | 4h | High |
| 2 | Add TUI EventBus subscription for real-time updates | 6h | High |
| 3 | Inject EventBus into agent execution context | 8h | High |
| 4 | Add progress callbacks to AgentRunner | 4h | Medium |

**Deliverables:**
- EventBusBridge component
- TUI real-time activity feed
- Agents can publish/subscribe to events
- Progress tracking visible in TUI

### Phase 2: High (Week 2)

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| 5 | Implement unified state management layer | 16h | High |
| 6 | Create AgentCoordinator for multi-agent sync | 12h | High |
| 7 | Add streaming output from AgentRunner | 8h | Medium |
| 8 | Connect TUI session store with Foundry checkpoint | 6h | Medium |

**Deliverables:**
- Unified state store with single source of truth
- Agent coordination primitives
- Streaming agent output to TUI
- Session persistence across TUI and Foundry

### Phase 3: Medium (Week 3)

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| 9 | Add eager initialization and health checks | 6h | Medium |
| 10 | Implement agent-to-agent direct messaging | 8h | Medium |
| 11 | Create unified evidence/artifact store | 10h | Medium |
| 12 | Add transaction support for artifact updates | 6h | Low |

### Phase 4: Low (Week 4)

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| 13 | Add comprehensive metrics and monitoring | 8h | Low |
| 14 | Implement advanced coordination patterns | 12h | Low |
| 15 | Performance optimization | 8h | Low |

---

## 5. Sequence Diagrams

### 5.1 Current State: Agent Execution Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│   FO    │     │   FCB   │     │   CO    │     │   AS    │     │   AR    │     │   AG    │     │   BB    │
└────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘
     │               │               │               │               │               │               │
     │ dispatchRoleTask(roleId, task)│               │               │               │               │
     │──────────────▶│               │               │               │               │               │
     │               │ getAgentIdForRole(roleId)     │               │               │               │
     │               │───────────────┼───────────────┼───────────────┼───────────────┼──────────────▶│
     │               │               │               │               │               │               │
     │               │ spawnAgent(agentId, task, context)            │               │               │
     │               │──────────────▶│               │               │               │               │
     │               │               │ getAllArtifacts()             │               │               │
     │               │               │───────────────┼───────────────┼───────────────┼──────────────▶│
     │               │               │◀──────────────│               │               │ sharedArtifacts │
     │               │               │               │               │               │               │
     │               │               │ publish('agent:start')        │               │               │
     │               │               │───────────────┼───────────────┼──────────────▶│               │
     │               │               │               │               │               │               │
     │               │               │ spawn(agentId, taskContext)   │               │               │
     │               │               │──────────────▶│               │               │               │
     │               │               │               │ run(agentId, task, context)   │               │
     │               │               │               │──────────────▶│               │               │
     │               │               │               │               │ execute with tools             │
     │               │               │               │               │──────────────▶│               │
     │               │               │               │               │               │               │
     │               │               │               │               │◀──────────────│ Agent executes│
     │               │               │               │               │ without EventBus access        │
     │               │               │               │               │               │               │
     │               │               │               │◀──────────────│ AgentExecutionResult           │
     │               │               │               │ AgentResult   │               │               │
     │               │               │◀──────────────│               │               │               │
     │               │               │               │               │               │               │
     │               │               │ updateArtifact(agent_output, result)          │               │
     │               │               │───────────────┼───────────────┼───────────────┼──────────────▶│
     │               │               │               │               │               │               │
     │               │               │ publish('agent:complete')     │               │               │
     │               │               │───────────────┼───────────────┼──────────────▶│               │
     │               │◀──────────────│ AgentResult   │               │               │               │
     │◀──────────────│               │               │               │               │               │
     │               │               │               │               │               │               │
     │ Only final result received    │               │               │               │               │
     │ No progress updates available │               │               │               │               │
     │               │               │               │               │               │               │
```

### 5.2 Target State: Real-Time Collaboration

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│   FO    │     │   FCB   │     │   CO    │     │   AS    │     │   AR    │     │   AG    │     │   EB    │     │   TUI   │
└────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘
     │               │               │               │               │               │               │               │
     │               │               │               │               │               │◀──────────────│ subscribe     │
     │               │               │               │               │               │               │               │
     │ publish('workflow:start')     │               │               │               │               │               │
     │───────────────┼───────────────┼───────────────┼───────────────┼───────────────┼──────────────▶│               │
     │               │               │               │               │               │ notify workflow│               │
     │               │               │               │               │               │──────────────▶│               │
     │               │               │               │               │               │               │ update UI     │
     │               │               │               │               │               │               │               │
     │ dispatchRoleTask(roleId, task)│               │               │               │               │               │
     │──────────────▶│               │               │               │               │               │               │
     │               │ spawnAgent(agentId, task, context)            │               │               │               │
     │               │──────────────▶│               │               │               │               │               │
     │               │               │ publish('agent:start')        │               │               │               │
     │               │               │───────────────┼───────────────┼───────────────┼──────────────▶│               │
     │               │               │               │               │               │ notify agent  │               │
     │               │               │               │               │               │──────────────▶│               │
     │               │               │               │               │               │               │ add activity  │
     │               │               │               │               │               │               │               │
     │               │               │ spawn(agentId, enhancedContext)               │               │               │
     │               │               │──────────────▶│               │               │               │               │
     │               │               │               │ run(agentId, task, enhanced)  │               │               │
     │               │               │               │──────────────▶│               │               │               │
     │               │               │               │               │ execute with event access      │               │
     │               │               │               │               │──────────────▶│               │               │
     │               │               │               │               │               │               │               │
     ╞═══════════════╪═══════════════╪═══════════════╪═══════════════╪═══════════════╪═══════════════╪═══════════════╡
     ║ Progress Loop ║               ║               ║               ║               ║               ║               ║
     ╞═══════════════╪═══════════════╪═══════════════╪═══════════════╪═══════════════╪═══════════════╪═══════════════╡
     │               │               │               │               │ publish('agent:progress')     │               │
     │               │               │               │               │───────────────┼──────────────▶│               │
     │               │               │               │               │               │ notify progress│               │
     │               │               │               │               │               │──────────────▶│               │
     │               │               │               │               │               │               │ update        │
     ╞═══════════════╪═══════════════╪═══════════════╪═══════════════╪═══════════════╪═══════════════╪═══════════════╡
     │               │               │               │               │               │               │               │
     │               │               │               │               │               │               │               │
     │               │               │               │◀──────────────│ result        │               │               │
     │               │               │◀──────────────│ AgentResult   │               │               │               │
     │               │               │               │               │               │               │               │
     │               │               │ updateArtifact(...)           │               │               │               │
     │               │               │───────────────┼───────────────┼───────────────┼──────────────▶│               │
     │               │               │               │               │               │               │               │
     │               │               │ publish('artifact:updated')   │               │               │               │
     │               │               │───────────────┼───────────────┼───────────────┼──────────────▶│               │
     │               │               │               │               │               │ notify artifact│               │
     │               │               │               │               │               │──────────────▶│               │
     │               │               │               │               │               │               │               │
     │               │               │ publish('agent:complete')     │               │               │               │
     │               │               │───────────────┼───────────────┼───────────────┼──────────────▶│               │
     │               │               │               │               │               │ notify agent  │               │
     │               │               │               │               │               │──────────────▶│               │
     │               │               │               │               │               │               │ update status │
     │               │◀──────────────│ AgentResult   │               │               │               │               │
     │◀──────────────│               │               │               │               │               │               │
```

### 5.3 Multi-Agent Collaboration Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│   CO    │     │   AC    │     │   AG1   │     │   AG2   │     │   AG3   │     │   EB    │
└────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘
     │               │               │               │               │               │
     │ coordinateMultiAgent(tasks)   │               │               │               │
     │──────────────▶│               │               │               │               │
     │               │               │               │               │               │
     │               │ publish('collaboration:phase', 'parallel')    │               │
     │               │───────────────┼───────────────┼───────────────┼──────────────▶│
     │               │               │               │               │               │
     ╞═══════════════╪═══════════════╪═══════════════╪═══════════════╪═══════════════╡
     ║ Parallel Execution Phase                                                  ║
     ╞═══════════════╪═══════════════╪═══════════════╪═══════════════╪═══════════════╡
     │               │               │               │               │               │
     │               │ spawn with    │               │               │               │
     │               │ EventBus ctx  │               │               │               │
     │               │──────────────▶│               │               │               │
     │               │               │ set('architecture', design)   │               │
     │               │               │───────────────┼───────────────┼──────────────▶│
     │               │               │               │               │               │
     │               │               │ publish('artifact:arch:ready)│               │
     │               │               │───────────────┼───────────────┼──────────────▶│
     │               │               │               │◀──────────────│ notify        │
     │               │               │               │               │               │
     │               │ spawn with    │               │               │               │
     │               │ EventBus ctx  │               │               │               │
     │               │──────────────────────────────▶│               │               │
     │               │               │               │ subscribe('artifact:arch:ready)
     │               │               │               │               │               │
     │               │               │               │ wait for architecture...      │
     │               │◀──────────────│ result        │               │               │
     │               │               │               │               │               │
     ╞═══════════════╪═══════════════╪═══════════════╪═══════════════╪═══════════════╡
     ║ Review Phase                                                              ║
     ╞═══════════════╪═══════════════╪═══════════════╪═══════════════╪═══════════════╡
     │               │               │               │               │               │
     │               │ publish('collaboration:phase', 'review')      │               │
     │               │───────────────┼───────────────┼───────────────┼──────────────▶│
     │               │               │               │               │               │
     │               │ spawn AG3 with│               │               │               │
     │               │ EventBus ctx  │               │               │               │
     │               │──────────────────────────────────────────────▶│               │
     │               │               │               │               │ subscribe     │
     │               │               │               │               │──────────────▶│
     │               │               │               │               │◀──────────────│ notify
     │               │               │               │               │ get('impl')   │
     │               │               │               │               │──────────────▶│
     │               │               │               │               │◀──────────────│ code
     │               │               │               │               │               │
     │               │               │               │               │ review code   │
     │               │               │               │               │               │
     │               │               │               │               │ publish       │
     │               │               │               │               │('feedback')   │
     │               │               │               │               │──────────────▶│
     │               │               │               │◀──────────────│ notify        │
     │               │               │               │ address issues│               │
     │               │               │               │               │               │
     │               │◀──────────────────────────────────────────────│ result        │
     │◀──────────────│ merged results│               │               │               │
```

---

## 6. Code Structure Recommendations

### 6.1 New Components to Create

```
src/
├── integration/
│   ├── event-bus-bridge.ts      # Bridge between isolated EventBus instances
│   ├── unified-state-store.ts   # Single source of truth
│   ├── agent-coordinator.ts     # Multi-agent synchronization
│   └── progress-streamer.ts     # Real-time progress streaming
├── tui/
│   ├── hooks/
│   │   └── use-event-bus.ts     # React hook for EventBus subscription
│   └── integration/
│       └── foundry-connector.ts # Connect TUI to Foundry/Cowork
└── agents/
    └── context/
        └── agent-event-context.ts # Event system for agents
```

### 6.2 Refactoring Targets

| File | Current Issues | Recommended Changes |
|------|---------------|---------------------|
| `src/foundry/cowork-bridge.ts` | Lazy init, no health checks | Add warmup(), health checks, eager init option |
| `src/foundry/collaboration-hub.ts` | Isolated from EventBus | Integrate with EventBus via bridge |
| `src/cowork/orchestrator/agent-spawner.ts` | No EventBus in context | Inject EventBus into agent context |
| `src/cowork/runtime/agent-runner.ts` | No progress callbacks | Add progress callback support |
| `src/tui/store/store.tsx` | No EventBus connection | Subscribe to EventBus events |

---

## 7. Security Considerations

### 7.1 EventBus Security

**Current State:**
- EventBus is a global singleton
- Any component can publish/subscribe to any event
- No authentication or authorization

**Recommendations:**
1. Add event namespace isolation per project
2. Implement event authorization (which agents can publish/subscribe)
3. Sanitize event payloads to prevent injection
4. Add event rate limiting

### 7.2 Agent Context Security

**Current State:**
- Agents receive full shared artifacts
- No data classification or filtering

**Recommendations:**
1. Implement artifact classification (public, internal, confidential)
2. Filter artifacts based on agent clearance level
3. Audit all artifact access
4. Encrypt sensitive artifacts at rest

---

## 8. Compliance Considerations

### 8.1 Audit Trail Requirements

| Requirement | Current | Target |
|-------------|---------|--------|
| All state changes logged | ⚠️ Partial | ✅ Complete |
| Agent actions auditable | ⚠️ Partial | ✅ Complete |
| Evidence chain of custody | ❌ Missing | ✅ Implemented |
| Immutable audit log | ❌ Missing | ✅ Hash chain |

### 8.2 Evidence Management

**Unified Evidence Store:**
```typescript
interface UnifiedEvidence {
  id: string;
  type: 'artifact' | 'agent_output' | 'gate_result' | 'audit_event';
  source: 'foundry' | 'cowork' | 'agent' | 'tui';
  data: unknown;
  timestamp: string;
  hash: string;  // SHA-256
  previousHash: string;  // Chain link
  signature: string;  // Cryptographic signature
}
```

---

## 9. Success Metrics

### 9.1 Integration Completeness

| Metric | Current | Target |
|--------|---------|--------|
| Components connected to EventBus | 2 | 6 |
| Real-time update latency | N/A | <100ms |
| State store unification | 0% | 100% |
| TUI workflow visibility | 0% | 100% |

### 9.2 Performance Targets

| Metric | Target |
|--------|--------|
| Agent spawn time | <500ms |
| Event propagation latency | <50ms |
| TUI refresh rate | 60fps |
| Workflow state sync | <100ms |

---

## 10. Conclusion

### Summary of Findings

The current architecture has functional foundations but lacks tight integration between components:

1. **Foundry → Cowork**: Working but lazy initialization without health checks
2. **Real-Time Collaboration**: EventBus exists but agents cannot access it
3. **Data Flow**: One-way request/response, no streaming or progress updates
4. **TUI Integration**: Completely isolated, no real-time capabilities
5. **State Management**: Fragmented across three separate stores

### Recommended Path Forward

1. **Immediate (Week 1)**: Implement EventBusBridge and TUI subscriptions
2. **Short-term (Week 2-3)**: Unified state management and agent context enhancement
3. **Medium-term (Week 4)**: Health checks, direct messaging, transaction support
4. **Long-term**: Advanced coordination patterns and comprehensive monitoring

### Expected Outcome

After implementing these recommendations:
- ✅ Agents collaborate in real-time through EventBus
- ✅ TUI shows live workflow progress and agent activities
- ✅ Single source of truth for all state
- ✅ Bidirectional communication between all components
- ✅ Complete audit trail and evidence chain

---

**Document Version:** 1.0  
**Reviewers:** Enterprise Architecture Team  
**Next Review:** Post-implementation validation
