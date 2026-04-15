# COWORK_PLAN.md

## Autonomous Coding Agent Prompt for Complete Collaborative Agent Workspace

### Version: 1.0.0
### Last Updated: 2026-02-16
### Status: IMPLEMENTATION PLAN

---

## Executive Summary

This document provides a **complete, exhaustive autonomous coding agent prompt** to upgrade and elevate the Cowork (`src/cowork/`) codebase from its current state to a **corporate-level senior development team platform**. The goal is to enable the Foundry orchestrator to act as a complete autonomous engineering organization with multiple AI agents collaborating effectively.

**Production deliverable baseline**: enforce code/docs/tests-only release scope and require bespoke, client-specific outputs. Reference `docs/PRODUCTION_DELIVERABLE_POLICY.md`.

### Current State Assessment
- **Maturity Score**: 42/100 (Enterprise Gap Backlog)
- **Architecture**: Strong event-driven foundation with modular design
- **Implemented**: Collaboration workspace, team management, monitoring, evidence collection, task routing
- **Critical Gaps**: Persistence layer, production hardening, advanced scheduling, human-in-the-loop, workflow engine

### Target State Vision
- **Maturity Score**: 90/100 (Enterprise Production Ready)
- **Architecture**: Distributed, multi-tenant, persistent, observable
- **Capabilities**: Real-time collaboration, intelligent orchestration, human-in-the-loop, advanced conflict resolution

---

## Table of Contents

1. [Architecture Blueprint](#1-architecture-blueprint)
2. [Phase-by-Phase Implementation Roadmap](#2-phase-by-phase-implementation-roadmap)
3. [Core Subsystem Specifications](#3-core-subsystem-specifications)
4. [Agent Capability Matrix](#4-agent-capability-matrix)
5. [Integration Requirements](#5-integration-requirements)
6. [Code Standards and Patterns](#6-code-standards-and-patterns)
7. [Testing Strategy](#7-testing-strategy)
8. [Governance and Compliance](#8-governance-and-compliance)
9. [Human-in-the-Loop Design](#9-human-in-the-loop-design)
10. [Implementation Commands](#10-implementation-commands)

---

## 1. Architecture Blueprint

### 1.1 High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ENTERPRISE COWORK PLATFORM                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    ORCHESTRATION LAYER (Foundry)                       │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │  │
│  │  │   Workflow   │  │   Domain     │  │   Quality    │  │  Policy    │ │  │
│  │  │   Engine     │  │Orchestrators │  │    Gates     │  │  Engine    │ │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                      │                                       │
│  ┌───────────────────────────────────▼─────────────────────────────────────┐  │
│  │                    COLLABORATION LAYER (Cowork)                          │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐   │  │
│  │  │    Team      │  │   Workspace  │  │    Task      │  │   Event    │   │  │
│  │  │  Management  │  │   Manager    │  │   Router     │  │    Bus     │   │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘   │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐   │  │
│  │  │   Artifact   │  │   Feedback   │  │   Conflict   │  │  Protocol  │   │  │
│  │  │  Versioning  │  │   Threads    │  │  Resolution  │  │   Layer    │   │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘   │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                      │                                       │
│  ┌───────────────────────────────────▼─────────────────────────────────────┐  │
│  │                    RUNTIME LAYER (Cowork Runtime)                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐   │  │
│  │  │ Agent Runner │  │ Tool Router  │  │   Plugin     │  │   Black-   │   │  │
│  │  │              │  │              │  │   Loader     │  │   board    │   │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘   │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                      │                                       │
│  ┌───────────────────────────────────▼─────────────────────────────────────┐  │
│  │                    INFRASTRUCTURE LAYER                                  │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐   │  │
│  │  │ Persistence  │  │   Message    │  │    Cache     │  │  Secrets   │   │  │
│  │  │   Store      │  │    Queue     │  │    Layer     │  │   Manager  │   │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘   │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐   │  │
│  │  │    Auth      │  │   Audit      │  │  Observabil- │  │  Config    │   │  │
│  │  │   (RBAC)     │  │    Log       │  │    ity       │  │  Manager   │   │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘   │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                      │                                       │
│  ┌───────────────────────────────────▼─────────────────────────────────────┐  │
│  │                    EXTERNAL INTEGRATIONS                                 │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │  │
│  │  │  GitHub  │ │  GitLab  │ │  Slack   │ │  Jira    │ │  CI/CD   │       │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘       │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Component Responsibilities

| Component | Responsibility | Current Status | Target State |
|-----------|---------------|----------------|--------------|
| Workflow Engine | Define, execute, and monitor complex multi-agent workflows | NOT IMPLEMENTED | Full BPMN-like workflow engine with conditional branching |
| Domain Orchestrators | Domain-specific orchestration (Security, Feature, Release) | IMPLEMENTED | Enhanced with workflow integration |
| Quality Gates | Automated quality checks at workflow stages | IMPLEMENTED | Policy-driven gates with ML-based anomaly detection |
| Policy Engine | Enforce organizational policies and compliance | PARTIAL | Full policy-as-code with runtime enforcement |
| Team Management | Dynamic team formation and lifecycle management | IMPLEMENTED | Enhanced with skill inference and auto-scaling |
| Workspace Manager | Project-scoped workspace management | IMPLEMENTED | Multi-tenant with resource quotas |
| Task Router | Intelligent task distribution and load balancing | IMPLEMENTED | ML-based routing with deadline awareness |
| Event Bus | Pub/sub messaging for inter-agent communication | IMPLEMENTED | Persistent event streaming with replay |
| Artifact Versioning | Version control for all artifacts | IMPLEMENTED | Git-like branching and merge capabilities |
| Feedback Threads | Threaded discussions on artifacts | IMPLEMENTED | Real-time collaborative editing with OT |
| Conflict Resolution | Detect and resolve concurrent edit conflicts | PARTIAL | Three-way merge with semantic conflict detection |
| Protocol Layer | Agent-to-agent communication protocols | IMPLEMENTED | Extended with negotiation protocols |
| Agent Runner | Execute individual agents | IMPLEMENTED | Sandboxed execution with resource limits |
| Tool Router | Route tool calls with permission checking | IMPLEMENTED | Federated tool discovery |
| Plugin Loader | Load and manage plugins | IMPLEMENTED | Signed plugins with compatibility checks |
| Blackboard | Shared state and artifact storage | IMPLEMENTED | Persistent with distributed consensus |
| Persistence Store | Database for all persistent data | NOT IMPLEMENTED | Multi-model database (document, graph, time-series) |
| Message Queue | Async message processing | NOT IMPLEMENTED | Distributed message queue (Redis/RabbitMQ) |
| Cache Layer | Performance caching | NOT IMPLEMENTED | Multi-tier caching with invalidation |
| Secrets Manager | Secure credential management | NOT IMPLEMENTED | Integration with Vault/AWS Secrets Manager |
| Auth (RBAC) | Role-based access control | NOT IMPLEMENTED | Full RBAC with ABAC extensions |
| Audit Log | Immutable audit trail | IMPLEMENTED | Blockchain-backed tamper-proof logs |
| Observability | Metrics, traces, and logs | PARTIAL | Full OpenTelemetry integration |
| Config Manager | Dynamic configuration | NOT IMPLEMENTED | Centralized config with hot reloading |

### 1.3 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW PATTERNS                              │
└─────────────────────────────────────────────────────────────────────────────┘

PATTERN 1: Agent Execution Flow
───────────────────────────────
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ Request │───▶│ Workflow│───▶│  Task   │───▶│  Agent  │───▶│ Artifact│
│ Received│    │ Engine  │    │ Router  │    │ Runner  │    │ Stored  │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
     │              │              │              │              │
     ▼              ▼              ▼              ▼              ▼
  Event:        Event:         Event:         Event:         Event:
  request:      workflow:      task:          agent:         artifact:
  received      started        assigned       started        created

PATTERN 2: Collaborative Editing Flow
──────────────────────────────────────
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ Agent A │───▶│  Edit   │───▶│Conflict │───▶│  Merge  │───▶│ Version │
│  Edits  │    │  Event  │    │ Detect  │    │Resolve  │    │Updated  │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
     ▲                                               │              │
     │              ┌─────────┐                       │              │
     └──────────────│ Agent B │◀──────────────────────┘              │
                    │ Notified│                                       │
                    └─────────┘                                       │
                                                                      ▼
                                                              ┌─────────┐
                                                              │Feedback │
                                                              │ Thread  │
                                                              └─────────┘

PATTERN 3: Monitoring and Escalation Flow
──────────────────────────────────────────
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ Monitor │───▶│ Finding │───▶│ Severity│───▶│ Escalate│───▶│ Human   │
│  Agent  │    │Detected │    │  Check  │    │  Check  │    │Notified │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
     │              │              │              │              │
     ▼              ▼              ▼              ▼              ▼
  Event:        Event:         Event:         Event:         Event:
  monitor:      finding:       severity:      escalation:    human:
  tick          detected       critical       triggered      notified

PATTERN 4: Evidence Collection Flow
────────────────────────────────────
Every Event ──▶ Evidence Collector ──▶ Cryptographic Sign ──▶ Audit Store
                    │                                               │
                    ▼                                               ▼
            Chain Hash Updated ◀───────────────────── Tamper Verification
```

### 1.4 Technology Stack Recommendations

| Layer | Technology Options | Recommendation |
|-------|-------------------|----------------|
| **Database** | PostgreSQL, MongoDB, Neo4j | PostgreSQL (primary) + Neo4j (graph) |
| **Message Queue** | Redis, RabbitMQ, Kafka | Redis (short-term) → Kafka (scale) |
| **Cache** | Redis, Memcached | Redis with clustering |
| **Secrets** | HashiCorp Vault, AWS Secrets | HashiCorp Vault |
| **Auth** | Keycloak, Auth0, Custom | Keycloak (OIDC) |
| **Observability** | OpenTelemetry, Jaeger, Prometheus | Full OpenTelemetry stack |
| **Workflow Engine** | Temporal, Cadence, Custom | Temporal (enterprise) |
| **Container Orchestration** | Kubernetes, Docker Swarm | Kubernetes |

---

## 2. Phase-by-Phase Implementation Roadmap

### Phase 0: Foundation and Safety Baseline (Weeks 1-2)

**Objective**: Establish safe, consistent development practices and fix critical gaps.

#### Deliverables

1. **Persistence Layer Foundation** (`src/cowork/persistence/`)
   - Abstract repository interfaces
   - PostgreSQL adapter implementation
   - Migration system with versioning
   - Connection pooling and health checks

2. **Configuration Management** (`src/cowork/config/`)
   - Environment-based configuration loader
   - Schema validation with Zod
   - Hot-reload capability
   - Secrets injection

3. **Code Quality Enforcement**
   - Stricter lint rules (no implicit any, no unchecked indexed access)
   - Pre-commit hooks for quality checks
   - Automated dependency vulnerability scanning

4. **Documentation Standardization**
   - JSDoc requirements for all public APIs
   - Architecture Decision Records (ADRs)
   - API documentation generation

#### Implementation Prompt

```typescript
// PERSISTENCE LAYER - Create these files

// src/cowork/persistence/types.ts
export interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findAll(filter?: FilterOptions): Promise<T[]>;
  create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  update(id: string, updates: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}

export interface Transaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface PersistenceManager {
  getRepository<T>(entityType: string): Repository<T>;
  beginTransaction(): Promise<Transaction>;
  healthCheck(): Promise<HealthStatus>;
  migrate(): Promise<void>;
}

// src/cowork/persistence/postgres/postgres-manager.ts
export class PostgresPersistenceManager implements PersistenceManager {
  private pool: Pool;
  private repositories: Map<string, Repository<any>> = new Map();
  
  constructor(config: PostgresConfig) {
    this.pool = new Pool(config);
  }
  
  getRepository<T>(entityType: string): Repository<T> {
    if (!this.repositories.has(entityType)) {
      this.repositories.set(entityType, this.createRepository(entityType));
    }
    return this.repositories.get(entityType)!;
  }
  
  private createRepository<T>(entityType: string): Repository<T> {
    // Implementation based on entityType
    switch (entityType) {
      case 'workspace':
        return new WorkspaceRepository(this.pool) as Repository<T>;
      case 'artifact':
        return new ArtifactRepository(this.pool) as Repository<T>;
      case 'feedback':
        return new FeedbackRepository(this.pool) as Repository<T>;
      case 'evidence':
        return new EvidenceRepository(this.pool) as Repository<T>;
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
  }
  
  async beginTransaction(): Promise<Transaction> {
    const client = await this.pool.connect();
    await client.query('BEGIN');
    return new PostgresTransaction(client);
  }
  
  async healthCheck(): Promise<HealthStatus> {
    try {
      await this.pool.query('SELECT 1');
      return { healthy: true, latency: 0 };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }
  
  async migrate(): Promise<void> {
    // Run migrations from src/cowork/persistence/migrations/
  }
}
```

#### Success Criteria
- [ ] All entities can be persisted and retrieved
- [ ] Database migrations run automatically on startup
- [ ] Health checks report database connectivity
- [ ] Connection pooling configured
- [ ] All tests pass with real database (testcontainers)

---

### Phase 1: Core Runtime Hardening (Weeks 3-4)

**Objective**: Make the runtime production-ready with proper persistence, error handling, and observability.

#### Deliverables

1. **Enhanced Agent Runner** (`src/cowork/runtime/enhanced-agent-runner.ts`)
   - Sandboxed execution environment
   - Resource limits (CPU, memory, execution time)
   - Graceful degradation and recovery
   - Checkpoint-based resume capability

2. **Persistent Event Bus** (`src/cowork/orchestrator/persistent-event-bus.ts`)
   - Event persistence for replay capability
   - Event sourcing pattern implementation
   - At-least-once delivery guarantees
   - Event replay for state reconstruction

3. **Workflow Engine Foundation** (`src/cowork/workflow/`)
   - Workflow definition DSL
   - State machine execution
   - Checkpoint and resume
   - Error handling and compensation

4. **Observability Integration**
   - OpenTelemetry instrumentation
   - Distributed tracing across agents
   - Structured logging correlation
   - Metrics collection and export

#### Implementation Prompt

```typescript
// ENHANCED AGENT RUNNER

// src/cowork/runtime/enhanced-agent-runner.ts
export interface SandboxConfig {
  maxCpuTime: number;        // milliseconds
  maxMemory: number;         // bytes
  maxExecutionTime: number;  // milliseconds
  allowedSystemCalls: string[];
  networkAccess: 'none' | 'restricted' | 'full';
  filesystemAccess: 'none' | 'read-only' | 'read-write';
}

export interface Checkpoint {
  id: string;
  timestamp: Date;
  state: Record<string, unknown>;
  stepIndex: number;
  toolResults: ToolResult[];
}

export class EnhancedAgentRunner {
  private checkpointStore: CheckpointStore;
  private resourceMonitor: ResourceMonitor;
  private sandbox: Sandbox;
  
  async runWithSandbox(
    agent: Agent,
    context: TaskContext,
    config: SandboxConfig
  ): Promise<AgentResult> {
    // Start resource monitoring
    const monitorHandle = this.resourceMonitor.start(config);
    
    try {
      // Create sandboxed environment
      const sandboxContext = await this.sandbox.create(config, context);
      
      // Execute with checkpoint support
      return await this.runWithCheckpoints(agent, sandboxContext);
      
    } finally {
      this.resourceMonitor.stop(monitorHandle);
    }
  }
  
  private async runWithCheckpoints(
    agent: Agent,
    context: TaskContext
  ): Promise<AgentResult> {
    const checkpointInterval = context.checkpointInterval || 10000;
    let lastCheckpoint = Date.now();
    
    for (let step = 0; step < context.maxSteps; step++) {
      // Check if we should create a checkpoint
      if (Date.now() - lastCheckpoint > checkpointInterval) {
        await this.createCheckpoint(agent.id, step, context);
        lastCheckpoint = Date.now();
      }
      
      // Execute step with timeout
      const stepResult = await this.executeStep(agent, context, step);
      
      if (stepResult.complete) {
        return stepResult.result;
      }
      
      // Check resource usage
      const usage = this.resourceMonitor.getUsage(agent.id);
      if (usage.memory > context.maxMemory || usage.cpu > context.maxCpu) {
        throw new ResourceExhaustedError(`Resource limit exceeded: ${JSON.stringify(usage)}`);
      }
    }
    
    throw new MaxStepsExceededError(`Max steps (${context.maxSteps}) exceeded`);
  }
  
  async resumeFromCheckpoint(checkpointId: string): Promise<AgentResult> {
    const checkpoint = await this.checkpointStore.load(checkpointId);
    const agent = await this.loadAgent(checkpoint.agentId);
    
    // Restore context from checkpoint
    const context = this.reconstructContext(checkpoint);
    
    // Resume from saved step
    return this.runWithCheckpoints(agent, context, checkpoint.stepIndex);
  }
}

// WORKFLOW ENGINE

// src/cowork/workflow/types.ts
export interface WorkflowDefinition {
  id: string;
  name: string;
  version: string;
  startState: string;
  states: WorkflowState[];
  transitions: WorkflowTransition[];
  variables: WorkflowVariable[];
}

export interface WorkflowState {
  id: string;
  type: 'task' | 'decision' | 'parallel' | 'join' | 'end';
  config: TaskConfig | DecisionConfig | ParallelConfig;
  onEntry?: WorkflowAction[];
  onExit?: WorkflowAction[];
}

export interface WorkflowTransition {
  from: string;
  to: string;
  condition?: WorkflowCondition;
  trigger: 'auto' | 'manual' | 'event';
}

export interface WorkflowInstance {
  id: string;
  definitionId: string;
  status: 'running' | 'completed' | 'failed' | 'suspended';
  currentState: string;
  variables: Record<string, unknown>;
  history: WorkflowEvent[];
  createdAt: Date;
  updatedAt: Date;
}

export class WorkflowEngine {
  private definitions: Map<string, WorkflowDefinition> = new Map();
  private instances: Map<string, WorkflowInstance> = new Map();
  private persistence: WorkflowPersistence;
  private eventBus: EventBus;
  
  async registerDefinition(definition: WorkflowDefinition): Promise<void> {
    // Validate workflow graph (no cycles, all states reachable)
    this.validateWorkflow(definition);
    this.definitions.set(definition.id, definition);
    await this.persistence.saveDefinition(definition);
  }
  
  async startWorkflow(definitionId: string, variables: Record<string, unknown>): Promise<string> {
    const definition = this.definitions.get(definitionId);
    if (!definition) {
      throw new WorkflowNotFoundError(definitionId);
    }
    
    const instance: WorkflowInstance = {
      id: generateId(),
      definitionId,
      status: 'running',
      currentState: definition.startState,
      variables,
      history: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.instances.set(instance.id, instance);
    await this.persistence.saveInstance(instance);
    
    // Execute initial state
    await this.executeState(instance);
    
    return instance.id;
  }
  
  async signalWorkflow(instanceId: string, signal: WorkflowSignal): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new WorkflowInstanceNotFoundError(instanceId);
    }
    
    // Process signal in current state
    const definition = this.definitions.get(instance.definitionId)!;
    const state = definition.states.find(s => s.id === instance.currentState)!;
    
    await this.handleSignal(instance, state, signal);
  }
  
  private async executeState(instance: WorkflowInstance): Promise<void> {
    const definition = this.definitions.get(instance.definitionId)!;
    const state = definition.states.find(s => s.id === instance.currentState)!;
    
    // Execute onEntry actions
    if (state.onEntry) {
      for (const action of state.onEntry) {
        await this.executeAction(instance, action);
      }
    }
    
    // Execute state-specific logic
    switch (state.type) {
      case 'task':
        await this.executeTaskState(instance, state.config as TaskConfig);
        break;
      case 'decision':
        await this.executeDecisionState(instance, state.config as DecisionConfig);
        break;
      case 'parallel':
        await this.executeParallelState(instance, state.config as ParallelConfig);
        break;
      case 'join':
        await this.executeJoinState(instance);
        break;
      case 'end':
        await this.executeEndState(instance);
        break;
    }
    
    // Execute onExit actions
    if (state.onExit) {
      for (const action of state.onExit) {
        await this.executeAction(instance, action);
      }
    }
  }
  
  private async executeTaskState(instance: WorkflowInstance, config: TaskConfig): Promise<void> {
    // Execute task via agent
    const result = await this.executeTask(config, instance.variables);
    
    // Store result in variables
    instance.variables[config.outputVariable] = result;
    
    // Transition to next state
    await this.transition(instance, result);
  }
  
  private async transition(instance: WorkflowInstance, result?: unknown): Promise<void> {
    const definition = this.definitions.get(instance.definitionId)!;
    const transitions = definition.transitions.filter(t => t.from === instance.currentState);
    
    // Find matching transition
    const transition = transitions.find(t => 
      !t.condition || this.evaluateCondition(t.condition, instance.variables, result)
    );
    
    if (!transition) {
      throw new NoValidTransitionError(instance.currentState);
    }
    
    instance.currentState = transition.to;
    instance.updatedAt = new Date();
    await this.persistence.saveInstance(instance);
    
    // Publish event
    this.eventBus.publish('workflow:state:changed', {
      instanceId: instance.id,
      newState: transition.to
    });
    
    // Execute new state
    await this.executeState(instance);
  }
}
```

#### Success Criteria
- [ ] Agents run in sandboxed environments with resource limits
- [ ] Checkpoints are created and can be resumed
- [ ] Workflows can be defined and executed
- [ ] All events are persisted and replayable
- [ ] Distributed tracing works across agent boundaries

---

### Phase 2: Advanced Collaboration Features (Weeks 5-6)

**Objective**: Implement advanced collaboration features including real-time editing, intelligent conflict resolution, and enhanced team coordination.

#### Deliverables

1. **Real-Time Collaborative Editing** (`src/cowork/collaboration/realtime/`)
   - Operational Transform (OT) or CRDT implementation
   - WebSocket-based real-time sync
   - Presence awareness (who's editing what)
   - Cursor and selection synchronization

2. **Semantic Conflict Resolution** (`src/cowork/collaboration/conflict-resolution.ts`)
   - Three-way merge for structured data
   - AST-based merge for code
   - Semantic diff for better conflict detection
   - Automated resolution strategies

3. **Enhanced Team Coordination**
   - Skill inference and learning
   - Dynamic capability discovery
   - Agent performance tracking and optimization
   - Team rebalancing based on workload

4. **Negotiation Protocol** (`src/cowork/team/negotiation-protocol.ts`)
   - Agent-to-agent negotiation for resources
   - Consensus-building mechanisms
   - Auction-based task allocation
   - Promise and commitment tracking

#### Implementation Prompt

```typescript
// REAL-TIME COLLABORATIVE EDITING

// src/cowork/collaboration/realtime/operation-transform.ts
export interface Operation {
  type: 'retain' | 'insert' | 'delete';
  count?: number;
  text?: string;
  attributes?: Record<string, unknown>;
}

export class OperationTransform {
  /**
   * Transform operation A against operation B
   * Returns [A', B'] where A' is A transformed against B, and B' is B transformed against A
   */
  transform(a: Operation[], b: Operation[]): [Operation[], Operation[]] {
    const aPrime: Operation[] = [];
    const bPrime: Operation[] = [];
    
    let i = 0, j = 0;
    while (i < a.length || j < b.length) {
      const opA = a[i];
      const opB = b[j];
      
      if (!opA) {
        bPrime.push(opB);
        j++;
      } else if (!opB) {
        aPrime.push(opA);
        i++;
      } else if (opA.type === 'retain' && opB.type === 'retain') {
        // Both retain - transform each against the other
        const minLen = Math.min(opA.count!, opB.count!);
        aPrime.push({ type: 'retain', count: minLen });
        bPrime.push({ type: 'retain', count: minLen });
        
        if (opA.count! > minLen) {
          a[i] = { ...opA, count: opA.count! - minLen };
        } else {
          i++;
        }
        
        if (opB.count! > minLen) {
          b[j] = { ...opB, count: opB.count! - minLen };
        } else {
          j++;
        }
      } else if (opA.type === 'insert' && opB.type === 'insert') {
        // Both insert - order by agent ID to ensure consistency
        if (opA.attributes?.agentId < opB.attributes?.agentId) {
          aPrime.push(opA);
          bPrime.push({ type: 'retain', count: opA.text!.length });
          i++;
        } else {
          aPrime.push({ type: 'retain', count: opB.text!.length });
          bPrime.push(opB);
          j++;
        }
      } else if (opA.type === 'insert') {
        // A inserts, B does something else - A goes through, B retains
        aPrime.push(opA);
        bPrime.push({ type: 'retain', count: opA.text!.length });
        i++;
      } else if (opB.type === 'insert') {
        // B inserts, A does something else - B goes through, A retains
        aPrime.push({ type: 'retain', count: opB.text!.length });
        bPrime.push(opB);
        j++;
      } else if (opA.type === 'delete' && opB.type === 'delete') {
        // Both delete same region - both deleted
        const minLen = Math.min(opA.count!, opB.count!);
        
        if (opA.count! > minLen) {
          a[i] = { ...opA, count: opA.count! - minLen };
        } else {
          i++;
        }
        
        if (opB.count! > minLen) {
          b[j] = { ...opB, count: opB.count! - minLen };
        } else {
          j++;
        }
      } else if (opA.type === 'delete') {
        // A deletes, B retains
        const minLen = Math.min(opA.count!, opB.count!);
        aPrime.push({ type: 'delete', count: minLen });
        
        if (opA.count! > minLen) {
          a[i] = { ...opA, count: opA.count! - minLen };
        } else {
          i++;
        }
        
        if (opB.count! > minLen) {
          b[j] = { ...opB, count: opB.count! - minLen };
        } else {
          j++;
        }
      } else if (opB.type === 'delete') {
        // B deletes, A retains
        const minLen = Math.min(opA.count!, opB.count!);
        bPrime.push({ type: 'delete', count: minLen });
        
        if (opB.count! > minLen) {
          b[j] = { ...opB, count: opB.count! - minLen };
        } else {
          j++;
        }
        
        if (opA.count! > minLen) {
          a[i] = { ...opA, count: opA.count! - minLen };
        } else {
          i++;
        }
      }
    }
    
    return [aPrime, bPrime];
  }
  
  /**
   * Compose two operations into one
   */
  compose(a: Operation[], b: Operation[]): Operation[] {
    const composed: Operation[] = [];
    // Implementation details...
    return composed;
  }
  
  /**
   * Apply operation to document
   */
  apply(document: string, operation: Operation[]): string {
    let result = '';
    let index = 0;
    
    for (const op of operation) {
      switch (op.type) {
        case 'retain':
          result += document.slice(index, index + op.count!);
          index += op.count!;
          break;
        case 'insert':
          result += op.text;
          break;
        case 'delete':
          index += op.count!;
          break;
      }
    }
    
    result += document.slice(index);
    return result;
  }
}

// SEMANTIC CONFLICT RESOLUTION

// src/cowork/collaboration/conflict-resolution.ts
export interface MergeResult {
  success: boolean;
  result?: unknown;
  conflicts: Conflict[];
  autoResolved: boolean;
}

export interface Conflict {
  path: string;
  baseValue: unknown;
  localValue: unknown;
  remoteValue: unknown;
  resolution?: Resolution;
}

export interface Resolution {
  strategy: 'accept-local' | 'accept-remote' | 'accept-both' | 'custom' | 'manual';
  value?: unknown;
  resolver?: string;
  timestamp: Date;
}

export class SemanticConflictResolver {
  private strategies: Map<string, MergeStrategy> = new Map();
  
  constructor() {
    this.registerDefaultStrategies();
  }
  
  registerStrategy(contentType: string, strategy: MergeStrategy): void {
    this.strategies.set(contentType, strategy);
  }
  
  async merge(base: unknown, local: unknown, remote: unknown, contentType: string): Promise<MergeResult> {
    const strategy = this.strategies.get(contentType) || this.strategies.get('generic')!;
    
    // Check for conflicts
    const conflicts = strategy.detectConflicts(base, local, remote);
    
    if (conflicts.length === 0) {
      // No conflicts - return merged result
      return {
        success: true,
        result: strategy.merge(base, local, remote),
        conflicts: [],
        autoResolved: true
      };
    }
    
    // Try auto-resolution
    const autoResolved: Conflict[] = [];
    const manualRequired: Conflict[] = [];
    
    for (const conflict of conflicts) {
      const resolution = await this.attemptAutoResolution(conflict, contentType);
      if (resolution) {
        conflict.resolution = resolution;
        autoResolved.push(conflict);
      } else {
        manualRequired.push(conflict);
      }
    }
    
    if (manualRequired.length === 0) {
      // All conflicts auto-resolved
      return {
        success: true,
        result: strategy.applyResolutions(base, local, remote, autoResolved),
        conflicts: autoResolved,
        autoResolved: true
      };
    }
    
    // Manual resolution required
    return {
      success: false,
      conflicts: manualRequired,
      autoResolved: false
    };
  }
  
  private async attemptAutoResolution(conflict: Conflict, contentType: string): Promise<Resolution | null> {
    // Try different auto-resolution strategies
    
    // Strategy 1: Last-write-wins (if timestamps available)
    if (this.hasTimestamps(conflict)) {
      const localTime = (conflict.localValue as any).__timestamp;
      const remoteTime = (conflict.remoteValue as any).__timestamp;
      
      if (localTime > remoteTime) {
        return {
          strategy: 'accept-local',
          value: conflict.localValue,
          resolver: 'last-write-wins',
          timestamp: new Date()
        };
      } else {
        return {
          strategy: 'accept-remote',
          value: conflict.remoteValue,
          resolver: 'last-write-wins',
          timestamp: new Date()
        };
      }
    }
    
    // Strategy 2: Semantic merge for code
    if (contentType === 'typescript' || contentType === 'javascript') {
      const semanticMerge = await this.attemptSemanticMerge(conflict);
      if (semanticMerge) {
        return semanticMerge;
      }
    }
    
    // Strategy 3: Array merge
    if (Array.isArray(conflict.localValue) && Array.isArray(conflict.remoteValue)) {
      return {
        strategy: 'accept-both',
        value: [...(conflict.localValue as any[]), ...(conflict.remoteValue as any[])],
        resolver: 'array-concat',
        timestamp: new Date()
      };
    }
    
    // No auto-resolution possible
    return null;
  }
  
  private async attemptSemanticMerge(conflict: Conflict): Promise<Resolution | null> {
    // Parse as AST and attempt semantic merge
    // This would require integrating with TypeScript compiler API
    // Implementation omitted for brevity
    return null;
  }
  
  private hasTimestamps(conflict: Conflict): boolean {
    return (
      typeof conflict.localValue === 'object' &&
      typeof conflict.remoteValue === 'object' &&
      (conflict.localValue as any).__timestamp &&
      (conflict.remoteValue as any).__timestamp
    );
  }
  
  private registerDefaultStrategies(): void {
    this.strategies.set('generic', new GenericMergeStrategy());
    this.strategies.set('json', new JsonMergeStrategy());
    this.strategies.set('typescript', new TypeScriptMergeStrategy());
    this.strategies.set('markdown', new MarkdownMergeStrategy());
  }
}

// NEGOTIATION PROTOCOL

// src/cowork/team/negotiation-protocol.ts
export interface Negotiation {
  id: string;
  type: 'resource' | 'task' | 'consensus';
  initiator: string;
  participants: string[];
  proposal: Proposal;
  responses: Map<string, Response>;
  status: 'active' | 'resolved' | 'rejected' | 'timeout';
  deadline: Date;
  createdAt: Date;
}

export interface Proposal {
  resource?: string;
  quantity?: number;
  taskId?: string;
  conditions: Condition[];
  utility: number; // 0-1, higher is better for initiator
}

export interface Response {
  participant: string;
  accepted: boolean;
  counterProposal?: Proposal;
  reason?: string;
  timestamp: Date;
}

export interface Condition {
  type: 'capability' | 'time' | 'priority' | 'custom';
  value: unknown;
  negotiable: boolean;
}

export class NegotiationProtocol {
  private activeNegotiations: Map<string, Negotiation> = new Map();
  private eventBus: EventBus;
  private timeoutMs: number = 30000;
  
  async initiateNegotiation(
    initiator: string,
    type: Negotiation['type'],
    proposal: Proposal,
    participants: string[]
  ): Promise<string> {
    const negotiation: Negotiation = {
      id: generateId(),
      type,
      initiator,
      participants,
      proposal,
      responses: new Map(),
      status: 'active',
      deadline: new Date(Date.now() + this.timeoutMs),
      createdAt: new Date()
    };
    
    this.activeNegotiations.set(negotiation.id, negotiation);
    
    // Notify all participants
    for (const participant of participants) {
      this.eventBus.publish(`negotiation:invitation:${participant}`, {
        negotiationId: negotiation.id,
        initiator,
        type,
        proposal
      });
    }
    
    // Set timeout
    setTimeout(() => this.checkNegotiationTimeout(negotiation.id), this.timeoutMs);
    
    return negotiation.id;
  }
  
  async respondToNegotiation(
    negotiationId: string,
    participant: string,
    accepted: boolean,
    counterProposal?: Proposal,
    reason?: string
  ): Promise<void> {
    const negotiation = this.activeNegotiations.get(negotiationId);
    if (!negotiation || negotiation.status !== 'active') {
      throw new NegotiationNotFoundError(negotiationId);
    }
    
    if (!negotiation.participants.includes(participant)) {
      throw new UnauthorizedNegotiationParticipantError(participant);
    }
    
    const response: Response = {
      participant,
      accepted,
      counterProposal,
      reason,
      timestamp: new Date()
    };
    
    negotiation.responses.set(participant, response);
    
    // Check if negotiation is complete
    await this.checkNegotiationComplete(negotiationId);
  }
  
  private async checkNegotiationComplete(negotiationId: string): Promise<void> {
    const negotiation = this.activeNegotiations.get(negotiationId)!;
    
    // Check if all participants have responded
    const allResponded = negotiation.participants.every(p => 
      negotiation.responses.has(p)
    );
    
    if (!allResponded) {
      return;
    }
    
    // Check if all accepted
    const allAccepted = Array.from(negotiation.responses.values()).every(r => r.accepted);
    
    if (allAccepted) {
      negotiation.status = 'resolved';
      this.eventBus.publish('negotiation:resolved', {
        negotiationId,
        proposal: negotiation.proposal,
        participants: negotiation.participants
      });
    } else {
      // Check for acceptable counter-proposals
      const counterProposals = Array.from(negotiation.responses.values())
        .filter(r => r.counterProposal)
        .map(r => r.counterProposal!);
      
      if (counterProposals.length > 0) {
        // Initiate new negotiation with best counter-proposal
        const bestCounter = this.selectBestCounterProposal(counterProposals);
        await this.initiateNegotiation(
          negotiation.initiator,
          negotiation.type,
          bestCounter,
          negotiation.participants
        );
      }
      
      negotiation.status = 'rejected';
      this.eventBus.publish('negotiation:rejected', {
        negotiationId,
        responses: Array.from(negotiation.responses.entries())
      });
    }
  }
  
  private selectBestCounterProposal(proposals: Proposal[]): Proposal {
    // Select proposal with best utility for initiator
    return proposals.reduce((best, current) => 
      current.utility > best.utility ? current : best
    );
  }
  
  private checkNegotiationTimeout(negotiationId: string): void {
    const negotiation = this.activeNegotiations.get(negotiationId);
    if (negotiation && negotiation.status === 'active') {
      negotiation.status = 'timeout';
      this.eventBus.publish('negotiation:timeout', { negotiationId });
    }
  }
}
```

#### Success Criteria
- [ ] Multiple agents can edit same document simultaneously without conflicts
- [ ] Semantic conflicts are automatically resolved where possible
- [ ] Agents can negotiate for resources and tasks
- [ ] Team capabilities are dynamically learned and optimized
- [ ] All collaborative actions emit appropriate events

---

### Phase 3: Human-in-the-Loop System (Weeks 7-8)

**Objective**: Implement comprehensive human-in-the-loop capabilities for approvals, escalations, and collaboration.

#### Deliverables

1. **Approval Workflow Engine** (`src/cowork/human/approval-engine.ts`)
   - Multi-stage approval workflows
   - Approval delegation and escalation
   - Timeout handling and reminders
   - Approval policy enforcement

2. **Notification System** (`src/cowork/human/notification-service.ts`)
   - Multi-channel notifications (email, Slack, webhook)
   - Notification templates and personalization
   - Delivery tracking and retry logic
   - Preference management

3. **Human Task Management** (`src/cowork/human/task-manager.ts`)
   - Human task assignment and tracking
   - Task queues and workload balancing
   - SLA monitoring and escalation
   - Task delegation and reassignment

4. **Interactive Chat Interface** (`src/cowork/human/chat-interface.ts`)
   - Real-time chat with agents
   - Context preservation across sessions
   - Multi-party conversations
   - Command integration

#### Implementation Prompt

```typescript
// APPROVAL WORKFLOW ENGINE

// src/cowork/human/approval-engine.ts
export interface ApprovalWorkflow {
  id: string;
  name: string;
  steps: ApprovalStep[];
  escalationPolicy: EscalationPolicy;
}

export interface ApprovalStep {
  id: string;
  name: string;
  approvers: ApproverSpec[];
  approvalType: 'any' | 'all' | 'majority' | 'custom';
  timeout: number; // milliseconds
  reminderInterval: number; // milliseconds
  autoEscalate: boolean;
}

export interface ApproverSpec {
  type: 'user' | 'role' | 'capability' | 'expression';
  value: string;
}

export interface ApprovalRequest {
  id: string;
  workflowId: string;
  itemType: string;
  itemId: string;
  requestor: string;
  payload: unknown;
  status: 'pending' | 'approved' | 'rejected' | 'escalated' | 'timeout';
  currentStep: number;
  stepResults: StepResult[];
  createdAt: Date;
  expiresAt: Date;
}

export class ApprovalEngine {
  private workflows: Map<string, ApprovalWorkflow> = new Map();
  private requests: Map<string, ApprovalRequest> = new Map();
  private notificationService: NotificationService;
  private eventBus: EventBus;
  
  async registerWorkflow(workflow: ApprovalWorkflow): Promise<void> {
    this.validateWorkflow(workflow);
    this.workflows.set(workflow.id, workflow);
  }
  
  async submitForApproval(
    workflowId: string,
    itemType: string,
    itemId: string,
    requestor: string,
    payload: unknown
  ): Promise<string> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new WorkflowNotFoundError(workflowId);
    }
    
    const request: ApprovalRequest = {
      id: generateId(),
      workflowId,
      itemType,
      itemId,
      requestor,
      payload,
      status: 'pending',
      currentStep: 0,
      stepResults: [],
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.calculateTimeout(workflow))
    };
    
    this.requests.set(request.id, request);
    
    // Start approval process
    await this.processStep(request.id);
    
    return request.id;
  }
  
  async approve(requestId: string, approver: string, comments?: string): Promise<void> {
    const request = this.requests.get(requestId);
    if (!request || request.status !== 'pending') {
      throw new ApprovalRequestNotFoundError(requestId);
    }
    
    const workflow = this.workflows.get(request.workflowId)!;
    const step = workflow.steps[request.currentStep];
    
    // Verify approver is authorized
    if (!await this.isAuthorizedApprover(approver, step)) {
      throw new UnauthorizedApproverError(approver);
    }
    
    // Record approval
    await this.recordStepResult(request, approver, 'approved', comments);
    
    // Check if step is complete
    if (await this.isStepComplete(request, step)) {
      await this.advanceToNextStep(request);
    }
  }
  
  async reject(requestId: string, approver: string, reason: string): Promise<void> {
    const request = this.requests.get(requestId);
    if (!request || request.status !== 'pending') {
      throw new ApprovalRequestNotFoundError(requestId);
    }
    
    const workflow = this.workflows.get(request.workflowId)!;
    const step = workflow.steps[request.currentStep];
    
    // Verify approver is authorized
    if (!await this.isAuthorizedApprover(approver, step)) {
      throw new UnauthorizedApproverError(approver);
    }
    
    // Record rejection
    await this.recordStepResult(request, approver, 'rejected', reason);
    
    request.status = 'rejected';
    
    this.eventBus.publish('approval:rejected', {
      requestId,
      approver,
      reason,
      itemType: request.itemType,
      itemId: request.itemId
    });
  }
  
  private async processStep(requestId: string): Promise<void> {
    const request = this.requests.get(requestId)!;
    const workflow = this.workflows.get(request.workflowId)!;
    const step = workflow.steps[request.currentStep];
    
    // Find approvers
    const approvers = await this.resolveApprovers(step);
    
    // Send notifications
    for (const approver of approvers) {
      await this.notificationService.sendApprovalRequest(request, approver);
    }
    
    // Set timeout
    setTimeout(() => this.handleStepTimeout(requestId), step.timeout);
    
    // Set reminder
    if (step.reminderInterval > 0) {
      setTimeout(() => this.sendReminders(requestId), step.reminderInterval);
    }
  }
  
  private async isStepComplete(request: ApprovalRequest, step: ApprovalStep): Promise<boolean> {
    const results = request.stepResults.filter(r => r.stepId === step.id);
    
    switch (step.approvalType) {
      case 'any':
        return results.some(r => r.decision === 'approved');
      case 'all':
        const approvers = await this.resolveApprovers(step);
        return approvers.every(a => 
          results.some(r => r.approver === a && r.decision === 'approved')
        );
      case 'majority':
        const approvers = await this.resolveApprovers(step);
        const approvals = results.filter(r => r.decision === 'approved').length;
        return approvals > approvers.length / 2;
      default:
        return false;
    }
  }
  
  private async advanceToNextStep(request: ApprovalRequest): Promise<void> {
    const workflow = this.workflows.get(request.workflowId)!;
    
    if (request.currentStep >= workflow.steps.length - 1) {
      // Final step complete - approve
      request.status = 'approved';
      this.eventBus.publish('approval:approved', {
        requestId: request.id,
        itemType: request.itemType,
        itemId: request.itemId
      });
    } else {
      // Move to next step
      request.currentStep++;
      await this.processStep(request.id);
    }
  }
  
  private async handleStepTimeout(requestId: string): Promise<void> {
    const request = this.requests.get(requestId);
    if (!request || request.status !== 'pending') {
      return;
    }
    
    const workflow = this.workflows.get(request.workflowId)!;
    const step = workflow.steps[request.currentStep];
    
    if (step.autoEscalate) {
      await this.escalate(request);
    } else {
      request.status = 'timeout';
      this.eventBus.publish('approval:timeout', { requestId });
    }
  }
  
  private async escalate(request: ApprovalRequest): Promise<void> {
    const workflow = this.workflows.get(request.workflowId)!;
    const policy = workflow.escalationPolicy;
    
    request.status = 'escalated';
    
    // Notify escalation contacts
    for (const contact of policy.contacts) {
      await this.notificationService.sendEscalation(request, contact);
    }
    
    this.eventBus.publish('approval:escalated', {
      requestId: request.id,
      itemType: request.itemType,
      itemId: request.itemId
    });
  }
}

// NOTIFICATION SERVICE

// src/cowork/human/notification-service.ts
export interface Notification {
  id: string;
  type: 'approval' | 'escalation' | 'mention' | 'system' | 'custom';
  recipient: string;
  channels: Channel[];
  subject: string;
  body: string;
  payload: unknown;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  createdAt: Date;
  sentAt?: Date;
  deliveredAt?: Date;
}

export type Channel = 'email' | 'slack' | 'webhook' | 'in_app';

export interface NotificationTemplate {
  id: string;
  type: Notification['type'];
  subject: string;
  body: string;
  variables: string[];
}

export class NotificationService {
  private templates: Map<string, NotificationTemplate> = new Map();
  private channels: Map<Channel, ChannelAdapter> = new Map();
  private queue: Notification[] = [];
  private preferences: Map<string, ChannelPreference[]> = new Map();
  
  constructor() {
    this.registerDefaultTemplates();
    this.registerChannelAdapters();
  }
  
  async sendApprovalRequest(request: ApprovalRequest, approver: string): Promise<void> {
    const template = this.templates.get('approval-request')!;
    const notification = await this.createNotification({
      type: 'approval',
      recipient: approver,
      template,
      payload: request,
      priority: 'high'
    });
    
    await this.queueNotification(notification);
  }
  
  async sendEscalation(request: ApprovalRequest, contact: string): Promise<void> {
    const template = this.templates.get('escalation')!;
    const notification = await this.createNotification({
      type: 'escalation',
      recipient: contact,
      template,
      payload: request,
      priority: 'urgent'
    });
    
    await this.queueNotification(notification);
  }
  
  async sendToAgent(agentId: string, message: string, context?: unknown): Promise<void> {
    const notification = await this.createNotification({
      type: 'custom',
      recipient: agentId,
      template: null,
      subject: 'Message from Human',
      body: message,
      payload: context,
      priority: 'normal'
    });
    
    await this.queueNotification(notification);
  }
  
  private async createNotification(config: {
    type: Notification['type'];
    recipient: string;
    template: NotificationTemplate | null;
    subject?: string;
    body?: string;
    payload: unknown;
    priority: Notification['priority'];
  }): Promise<Notification> {
    let subject = config.subject || '';
    let body = config.body || '';
    
    if (config.template) {
      subject = this.renderTemplate(config.template.subject, config.payload);
      body = this.renderTemplate(config.template.body, config.payload);
    }
    
    const preferences = this.preferences.get(config.recipient) || 
      this.getDefaultPreferences();
    const channels = preferences.map(p => p.channel);
    
    return {
      id: generateId(),
      type: config.type,
      recipient: config.recipient,
      channels,
      subject,
      body,
      payload: config.payload,
      priority: config.priority,
      status: 'pending',
      createdAt: new Date()
    };
  }
  
  private async queueNotification(notification: Notification): Promise<void> {
    this.queue.push(notification);
    
    // Process queue asynchronously
    setImmediate(() => this.processQueue());
  }
  
  private async processQueue(): Promise<void> {
    while (this.queue.length > 0) {
      const notification = this.queue.shift()!;
      await this.sendNotification(notification);
    }
  }
  
  private async sendNotification(notification: Notification): Promise<void> {
    const results: boolean[] = [];
    
    for (const channel of notification.channels) {
      const adapter = this.channels.get(channel);
      if (adapter) {
        try {
          const success = await adapter.send(notification);
          results.push(success);
        } catch (error) {
          console.error(`Failed to send notification via ${channel}:`, error);
          results.push(false);
        }
      }
    }
    
    notification.status = results.some(r => r) ? 'sent' : 'failed';
    notification.sentAt = new Date();
  }
  
  private renderTemplate(template: string, payload: unknown): string {
    // Simple template rendering
    return template.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
      const value = (payload as any)[variable];
      return value !== undefined ? String(value) : match;
    });
  }
  
  private registerDefaultTemplates(): void {
    this.templates.set('approval-request', {
      id: 'approval-request',
      type: 'approval',
      subject: 'Approval Required: {{itemType}} #{{itemId}}',
      body: 'Please review and approve {{itemType}} #{{itemId}} requested by {{requestor}}.',
      variables: ['itemType', 'itemId', 'requestor']
    });
    
    this.templates.set('escalation', {
      id: 'escalation',
      type: 'escalation',
      subject: 'URGENT: Approval Escalation - {{itemType}} #{{itemId}}',
      body: 'An approval request has been escalated and requires your immediate attention.',
      variables: ['itemType', 'itemId']
    });
  }
  
  private registerChannelAdapters(): void {
    this.channels.set('email', new EmailChannelAdapter());
    this.channels.set('slack', new SlackChannelAdapter());
    this.channels.set('webhook', new WebhookChannelAdapter());
    this.channels.set('in_app', new InAppChannelAdapter());
  }
  
  private getDefaultPreferences(): ChannelPreference[] {
    return [
      { channel: 'in_app', priority: 1 },
      { channel: 'email', priority: 2 }
    ];
  }
}

// CHAT INTERFACE

// src/cowork/human/chat-interface.ts
export interface ChatSession {
  id: string;
  participants: string[]; // agent IDs and user IDs
  context: ChatContext;
  messages: ChatMessage[];
  status: 'active' | 'archived';
  createdAt: Date;
  lastActivityAt: Date;
}

export interface ChatMessage {
  id: string;
  sender: string;
  type: 'text' | 'command' | 'file' | 'event';
  content: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface ChatContext {
  workspaceId?: string;
  taskId?: string;
  artifactId?: string;
  customData?: Record<string, unknown>;
}

export class ChatInterface {
  private sessions: Map<string, ChatSession> = new Map();
  private eventBus: EventBus;
  private contextManager: ContextManager;
  private commandRegistry: CommandRegistry;
  
  async createSession(
    participants: string[],
    context: ChatContext
  ): Promise<string> {
    const session: ChatSession = {
      id: generateId(),
      participants,
      context,
      messages: [],
      status: 'active',
      createdAt: new Date(),
      lastActivityAt: new Date()
    };
    
    this.sessions.set(session.id, session);
    
    // Subscribe to events for this session
    this.eventBus.subscribe(`chat:${session.id}:message`, (event) => {
      this.handleIncomingMessage(session.id, event.payload);
    });
    
    return session.id;
  }
  
  async sendMessage(
    sessionId: string,
    sender: string,
    content: string,
    type: ChatMessage['type'] = 'text'
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new ChatSessionNotFoundError(sessionId);
    }
    
    const message: ChatMessage = {
      id: generateId(),
      sender,
      type,
      content,
      timestamp: new Date()
    };
    
    session.messages.push(message);
    session.lastActivityAt = new Date();
    
    // Process commands
    if (type === 'command') {
      await this.processCommand(session, message);
    }
    
    // Broadcast to all participants
    this.eventBus.publish(`chat:${sessionId}:message`, message);
    
    // If sender is human, also broadcast to agents
    if (!sender.startsWith('agent:')) {
      for (const participant of session.participants) {
        if (participant.startsWith('agent:')) {
          this.eventBus.publish(`agent:${participant}:chat`, {
            sessionId,
            message,
            context: session.context
          });
        }
      }
    }
  }
  
  async getSessionHistory(sessionId: string): Promise<ChatMessage[]> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new ChatSessionNotFoundError(sessionId);
    }
    
    return [...session.messages];
  }
  
  async archiveSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new ChatSessionNotFoundError(sessionId);
    }
    
    session.status = 'archived';
    
    this.eventBus.publish('chat:session:archived', { sessionId });
  }
  
  private async processCommand(session: ChatSession, message: ChatMessage): Promise<void> {
    // Parse command
    const match = message.content.match(/^\/(\w+)(?:\s+(.*))?$/);
    if (!match) {
      return;
    }
    
    const [, commandName, args] = match;
    
    // Execute command
    try {
      const result = await this.commandRegistry.execute(commandName, {
        args: args?.split(' ') || [],
        context: session.context,
        sender: message.sender
      });
      
      // Send result back to chat
      await this.sendMessage(
        session.id,
        'system',
        result,
        'event'
      );
    } catch (error) {
      await this.sendMessage(
        session.id,
        'system',
        `Error executing command: ${error.message}`,
        'event'
      );
    }
  }
  
  private async handleIncomingMessage(sessionId: string, payload: unknown): Promise<void> {
    // Handle messages from other sources
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'active') {
      return;
    }
    
    // Update last activity
    session.lastActivityAt = new Date();
  }
}
```

#### Success Criteria
- [ ] Multi-stage approval workflows execute correctly
- [ ] Humans receive notifications via preferred channels
- [ ] Human tasks are tracked and can be assigned
- [ ] Real-time chat works between humans and agents
- [ ] SLAs are enforced with automatic escalation

---

### Phase 4: External Integrations (Weeks 9-10)

**Objective**: Integrate with external systems to enable seamless enterprise workflows.

#### Deliverables

1. **Git Provider Integration** (`src/cowork/integrations/git/`)
   - GitHub/GitLab/Bitbucket API integration
   - Pull request automation
   - Branch protection and policies
   - Webhook handling

2. **Issue Tracker Integration** (`src/cowork/integrations/issue/`)
   - Jira/Linear/GitHub Issues integration
   - Bidirectional sync
   - Issue lifecycle automation
   - Comment synchronization

3. **CI/CD Integration** (`src/cowork/integrations/cicd/`)
   - GitHub Actions/GitLab CI/Jenkins integration
   - Pipeline triggering and monitoring
   - Build artifact management
   - Deployment coordination

4. **Communication Integration** (`src/cowork/integrations/comm/`)
   - Slack/Teams/Discord integration
   - Channel management
   - Bot interactions
   - Rich message formatting

#### Implementation Prompt

```typescript
// GIT INTEGRATION

// src/cowork/integrations/git/git-provider.ts
export interface GitProvider {
  readonly name: string;
  
  createRepository(config: RepositoryConfig): Promise<Repository>;
  getRepository(repoId: string): Promise<Repository>;
  createPullRequest(repoId: string, pr: PullRequest): Promise<string>;
  updatePullRequest(repoId: string, prId: string, updates: Partial<PullRequest>): Promise<void>;
  getPullRequest(repoId: string, prId: string): Promise<PullRequest>;
  listPullRequests(repoId: string, filters?: PRFilters): Promise<PullRequest[]>;
  mergePullRequest(repoId: string, prId: string, options: MergeOptions): Promise<void>;
  createBranch(repoId: string, branch: Branch): Promise<void>;
  deleteBranch(repoId: string, branchName: string): Promise<void>;
  getFile(repoId: string, path: string, ref: string): Promise<FileContent>;
  updateFile(repoId: string, path: string, content: string, commit: Commit): Promise<void>;
  createWebhook(repoId: string, config: WebhookConfig): Promise<string>;
  deleteWebhook(repoId: string, webhookId: string): Promise<void>;
}

// src/cowork/integrations/git/github-provider.ts
export class GitHubProvider implements GitProvider {
  readonly name = 'github';
  private octokit: Octokit;
  
  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }
  
  async createPullRequest(repoId: string, pr: PullRequest): Promise<string> {
    const [owner, repo] = repoId.split('/');
    
    const response = await this.octokit.rest.pulls.create({
      owner,
      repo,
      title: pr.title,
      body: pr.description,
      head: pr.sourceBranch,
      base: pr.targetBranch,
      draft: pr.draft || false
    });
    
    // Add reviewers
    if (pr.reviewers && pr.reviewers.length > 0) {
      await this.octokit.rest.pulls.requestReviewers({
        owner,
        repo,
        pull_number: response.data.number,
        reviewers: pr.reviewers
      });
    }
    
    // Add labels
    if (pr.labels && pr.labels.length > 0) {
      await this.octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number: response.data.number,
        labels: pr.labels
      });
    }
    
    return response.data.number.toString();
  }
  
  async updatePullRequest(repoId: string, prId: string, updates: Partial<PullRequest>): Promise<void> {
    const [owner, repo] = repoId.split('/');
    const pullNumber = parseInt(prId, 10);
    
    await this.octokit.rest.pulls.update({
      owner,
      repo,
      pull_number: pullNumber,
      title: updates.title,
      body: updates.description,
      state: updates.state
    });
  }
  
  async mergePullRequest(repoId: string, prId: string, options: MergeOptions): Promise<void> {
    const [owner, repo] = repoId.split('/');
    const pullNumber = parseInt(prId, 10);
    
    await this.octokit.rest.pulls.merge({
      owner,
      repo,
      pull_number: pullNumber,
      commit_title: options.commitTitle,
      commit_message: options.commitMessage,
      sha: options.sha,
      merge_method: options.squash ? 'squash' : options.rebase ? 'rebase' : 'merge'
    });
  }
  
  async createWebhook(repoId: string, config: WebhookConfig): Promise<string> {
    const [owner, repo] = repoId.split('/');
    
    const response = await this.octokit.rest.repos.createWebhook({
      owner,
      repo,
      config: {
        url: config.url,
        content_type: 'json',
        secret: config.secret
      },
      events: config.events,
      active: true
    });
    
    return response.data.id.toString();
  }
  
  async handleWebhook(payload: unknown, signature: string, secret: string): Promise<void> {
    // Verify signature
    const isValid = this.verifyWebhookSignature(payload, signature, secret);
    if (!isValid) {
      throw new WebhookValidationError('Invalid webhook signature');
    }
    
    const event = payload as GitHubWebhookEvent;
    
    // Process event
    switch (event.action) {
      case 'opened':
        this.eventBus.publish('git:pr:opened', {
          repoId: event.repository.full_name,
          prId: event.pull_request.number.toString(),
          pr: this.mapPullRequest(event.pull_request)
        });
        break;
        
      case 'synchronize':
        this.eventBus.publish('git:pr:updated', {
          repoId: event.repository.full_name,
          prId: event.pull_request.number.toString(),
          pr: this.mapPullRequest(event.pull_request)
        });
        break;
        
      case 'closed':
        this.eventBus.publish('git:pr:closed', {
          repoId: event.repository.full_name,
          prId: event.pull_request.number.toString(),
          merged: event.pull_request.merged
        });
        break;
    }
  }
  
  private verifyWebhookSignature(payload: unknown, signature: string, secret: string): boolean {
    const hmac = createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    const digest = `sha256=${hmac.digest('hex')}`;
    return timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  }
}

// CI/CD INTEGRATION

// src/cowork/integrations/cicd/cicd-provider.ts
export interface CICDProvider {
  readonly name: string;
  
  triggerPipeline(repoId: string, config: PipelineConfig): Promise<string>;
  getPipelineStatus(repoId: string, pipelineId: string): Promise<PipelineStatus>;
  cancelPipeline(repoId: string, pipelineId: string): Promise<void>;
  retryPipeline(repoId: string, pipelineId: string): Promise<string>;
  getPipelineLogs(repoId: string, pipelineId: string, jobId?: string): Promise<string>;
  listArtifacts(repoId: string, pipelineId: string): Promise<Artifact[]>;
  downloadArtifact(repoId: string, pipelineId: string, artifactId: string): Promise<Buffer>;
}

// src/cowork/integrations/cicd/github-actions-provider.ts
export class GitHubActionsProvider implements CICDProvider {
  readonly name = 'github-actions';
  private octokit: Octokit;
  
  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }
  
  async triggerPipeline(repoId: string, config: PipelineConfig): Promise<string> {
    const [owner, repo] = repoId.split('/');
    
    const response = await this.octokit.rest.actions.createWorkflowDispatch({
      owner,
      repo,
      workflow_id: config.workflowId,
      ref: config.branch,
      inputs: config.inputs
    });
    
    // Get the run ID
    const runs = await this.octokit.rest.actions.listWorkflowRuns({
      owner,
      repo,
      workflow_id: config.workflowId,
      branch: config.branch,
      per_page: 1
    });
    
    return runs.data.workflow_runs[0].id.toString();
  }
  
  async getPipelineStatus(repoId: string, pipelineId: string): Promise<PipelineStatus> {
    const [owner, repo] = repoId.split('/');
    const runId = parseInt(pipelineId, 10);
    
    const response = await this.octokit.rest.actions.getWorkflowRun({
      owner,
      repo,
      run_id: runId
    });
    
    const run = response.data;
    
    return {
      id: pipelineId,
      status: this.mapStatus(run.status),
      conclusion: run.conclusion || undefined,
      startedAt: run.run_started_at ? new Date(run.run_started_at) : undefined,
      completedAt: run.updated_at ? new Date(run.updated_at) : undefined,
      jobs: await this.getJobs(owner, repo, runId)
    };
  }
  
  private async getJobs(owner: string, repo: string, runId: number): Promise<JobStatus[]> {
    const response = await this.octokit.rest.actions.listJobsForWorkflowRun({
      owner,
      repo,
      run_id: runId
    });
    
    return response.data.jobs.map(job => ({
      id: job.id.toString(),
      name: job.name,
      status: this.mapStatus(job.status),
      conclusion: job.conclusion || undefined,
      startedAt: job.started_at ? new Date(job.started_at) : undefined,
      completedAt: job.completed_at ? new Date(job.completed_at) : undefined
    }));
  }
  
  private mapStatus(status: string): PipelineStatus['status'] {
    switch (status) {
      case 'queued':
        return 'pending';
      case 'in_progress':
        return 'running';
      case 'completed':
        return 'completed';
      default:
        return 'unknown';
    }
  }
}

// COMMUNICATION INTEGRATION

// src/cowork/integrations/comm/slack-provider.ts
export class SlackProvider implements CommunicationProvider {
  readonly name = 'slack';
  private client: WebClient;
  
  constructor(token: string) {
    this.client = new WebClient(token);
  }
  
  async sendMessage(channel: string, message: Message): Promise<string> {
    const blocks = this.formatMessage(message);
    
    const response = await this.client.chat.postMessage({
      channel,
      text: message.text,
      blocks,
      attachments: message.attachments?.map(a => ({
        color: this.mapSeverity(a.severity),
        title: a.title,
        text: a.text,
        fields: a.fields
      }))
    });
    
    return response.ts as string;
  }
  
  async createChannel(name: string, options: ChannelOptions): Promise<string> {
    const response = await this.client.conversations.create({
      name: name.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
      is_private: options.private || false
    });
    
    const channelId = response.channel!.id;
    
    // Invite members
    if (options.members && options.members.length > 0) {
      await this.client.conversations.invite({
        channel: channelId,
        users: options.members.join(',')
      });
    }
    
    return channelId;
  }
  
  async handleEvent(payload: SlackEvent): Promise<void> {
    switch (payload.type) {
      case 'message':
        if (payload.subtype === 'bot_message') {
          return; // Ignore bot messages
        }
        
        this.eventBus.publish('slack:message', {
          channel: payload.channel,
          user: payload.user,
          text: payload.text,
          timestamp: payload.ts
        });
        break;
        
      case 'reaction_added':
        this.eventBus.publish('slack:reaction', {
          channel: payload.item.channel,
          user: payload.user,
          reaction: payload.reaction,
          messageTs: payload.item.ts
        });
        break;
    }
  }
  
  private formatMessage(message: Message): Block[] {
    const blocks: Block[] = [];
    
    if (message.header) {
      blocks.push({
        type: 'header',
        text: {
          type: 'plain_text',
          text: message.header
        }
      });
    }
    
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: message.text
      }
    });
    
    if (message.actions && message.actions.length > 0) {
      blocks.push({
        type: 'actions',
        elements: message.actions.map(action => ({
          type: 'button',
          text: {
            type: 'plain_text',
            text: action.label
          },
          action_id: action.id,
          value: action.value,
          style: action.style === 'danger' ? 'danger' : undefined
        }))
      });
    }
    
    return blocks;
  }
  
  private mapSeverity(severity: string): string {
    switch (severity) {
      case 'critical':
        return 'danger';
      case 'warning':
      case 'blocking':
        return 'warning';
      default:
        return 'good';
    }
  }
}
```

#### Success Criteria
- [ ] Pull requests can be created and managed automatically
- [ ] Issues are synchronized bidirectionally
- [ ] CI/CD pipelines can be triggered and monitored
- [ ] Slack notifications are sent for important events
- [ ] Webhooks are properly handled and validated

---

### Phase 5: Production Hardening (Weeks 11-12)

**Objective**: Make the system production-ready with enterprise-grade security, scalability, and reliability.

#### Deliverables

1. **Multi-Tenancy Support** (`src/cowork/tenancy/`)
   - Tenant isolation at all layers
   - Resource quotas and limits
   - Tenant-specific configuration
   - Cross-tenant security

2. **Advanced Security** (`src/cowork/security/`)
   - Full RBAC implementation
   - Secret rotation automation
   - Encryption at rest and in transit
   - Security scanning integration

3. **Scalability Enhancements**
   - Horizontal scaling support
   - Load balancing
   - Database sharding strategies
   - Caching optimization

4. **Disaster Recovery**
   - Automated backups
   - Point-in-time recovery
   - Multi-region support
   - Failover automation

#### Implementation Prompt

```typescript
// MULTI-TENANCY

// src/cowork/tenancy/tenant-manager.ts
export interface Tenant {
  id: string;
  name: string;
  status: 'active' | 'suspended' | 'deleted';
  config: TenantConfig;
  quotas: ResourceQuotas;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantConfig {
  features: string[];
  integrations: IntegrationConfig[];
  security: SecurityConfig;
  customization: CustomizationConfig;
}

export interface ResourceQuotas {
  maxWorkspaces: number;
  maxAgents: number;
  maxStorage: number; // bytes
  maxCompute: number; // CPU seconds per month
  maxApiCalls: number; // per minute
}

export class TenantManager {
  private tenants: Map<string, Tenant> = new Map();
  private resourceTrackers: Map<string, ResourceTracker> = new Map();
  private persistence: TenantPersistence;
  
  async createTenant(config: TenantConfig, quotas: ResourceQuotas): Promise<Tenant> {
    const tenant: Tenant = {
      id: generateId(),
      name: config.name,
      status: 'active',
      config,
      quotas,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Validate quotas
    await this.validateQuotas(quotas);
    
    // Create tenant isolation
    await this.createTenantIsolation(tenant);
    
    // Initialize resource tracking
    this.resourceTrackers.set(tenant.id, new ResourceTracker(quotas));
    
    // Persist tenant
    await this.persistence.saveTenant(tenant);
    this.tenants.set(tenant.id, tenant);
    
    return tenant;
  }
  
  async getTenant(tenantId: string): Promise<Tenant> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new TenantNotFoundError(tenantId);
    }
    return tenant;
  }
  
  async checkResourceAvailability(
    tenantId: string,
    resourceType: keyof ResourceQuotas,
    amount: number
  ): Promise<boolean> {
    const tracker = this.resourceTrackers.get(tenantId);
    if (!tracker) {
      throw new TenantNotFoundError(tenantId);
    }
    
    return tracker.checkAvailability(resourceType, amount);
  }
  
  async consumeResource(
    tenantId: string,
    resourceType: keyof ResourceQuotas,
    amount: number
  ): Promise<void> {
    const tracker = this.resourceTrackers.get(tenantId);
    if (!tracker) {
      throw new TenantNotFoundError(tenantId);
    }
    
    const success = await tracker.consume(resourceType, amount);
    if (!success) {
      throw new QuotaExceededError(tenantId, resourceType);
    }
  }
  
  async isolateContext<T>(tenantId: string, operation: () => Promise<T>): Promise<T> {
    // Store tenant context in async local storage
    return await storage.run({ tenantId }, operation);
  }
  
  private async createTenantIsolation(tenant: Tenant): Promise<void> {
    // Create isolated database schemas
    await this.persistence.createTenantSchema(tenant.id);
    
    // Create isolated storage buckets
    await this.storage.createTenantBucket(tenant.id);
    
    // Set up network isolation (if applicable)
    await this.network.configureTenantIsolation(tenant.id);
  }
  
  private async validateQuotas(quotas: ResourceQuotas): Promise<void> {
    // Ensure quotas are within system limits
    const systemLimits = await this.getSystemLimits();
    
    for (const [key, value] of Object.entries(quotas)) {
      const limit = systemLimits[key as keyof ResourceQuotas];
      if (value > limit) {
        throw new InvalidQuotaError(key, value, limit);
      }
    }
  }
}

// RBAC IMPLEMENTATION

// src/cowork/security/rbac-manager.ts
export interface Role {
  id: string;
  name: string;
  tenantId: string;
  permissions: Permission[];
  inheritedRoles: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  resource: string;
  action: string;
  conditions?: PermissionCondition[];
}

export interface PermissionCondition {
  type: 'ownership' | 'time' | 'expression';
  value: unknown;
}

export interface User {
  id: string;
  tenantId: string;
  roles: string[];
  attributes: Record<string, unknown>;
}

export class RBACManager {
  private roles: Map<string, Role> = new Map();
  private users: Map<string, User> = new Map();
  private persistence: RBACPersistence;
  
  async createRole(role: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<Role> {
    const newRole: Role = {
      ...role,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Validate no circular inheritance
    await this.validateInheritance(newRole);
    
    await this.persistence.saveRole(newRole);
    this.roles.set(newRole.id, newRole);
    
    return newRole;
  }
  
  async checkPermission(
    userId: string,
    resource: string,
    action: string,
    context?: Record<string, unknown>
  ): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) {
      return false;
    }
    
    // Get all permissions (including inherited)
    const permissions = await this.getUserPermissions(user);
    
    // Check for matching permission
    for (const permission of permissions) {
      if (this.permissionMatches(permission, resource, action)) {
        // Check conditions
        if (permission.conditions) {
          const conditionsMet = await this.evaluateConditions(
            permission.conditions,
            user,
            context
          );
          if (!conditionsMet) {
            continue;
          }
        }
        return true;
      }
    }
    
    return false;
  }
  
  async requirePermission(
    userId: string,
    resource: string,
    action: string,
    context?: Record<string, unknown>
  ): Promise<void> {
    const hasPermission = await this.checkPermission(userId, resource, action, context);
    if (!hasPermission) {
      throw new UnauthorizedError(`User ${userId} does not have ${action} permission on ${resource}`);
    }
  }
  
  private async getUserPermissions(user: User): Promise<Permission[]> {
    const permissions: Permission[] = [];
    const visitedRoles = new Set<string>();
    
    for (const roleId of user.roles) {
      await this.collectPermissions(roleId, permissions, visitedRoles);
    }
    
    return permissions;
  }
  
  private async collectPermissions(
    roleId: string,
    permissions: Permission[],
    visitedRoles: Set<string>
  ): Promise<void> {
    if (visitedRoles.has(roleId)) {
      return;
    }
    
    visitedRoles.add(roleId);
    
    const role = this.roles.get(roleId);
    if (!role) {
      return;
    }
    
    permissions.push(...role.permissions);
    
    // Recursively collect from inherited roles
    for (const inheritedId of role.inheritedRoles) {
      await this.collectPermissions(inheritedId, permissions, visitedRoles);
    }
  }
  
  private permissionMatches(permission: Permission, resource: string, action: string): boolean {
    // Support wildcards
    const resourceMatch = this.matchPattern(permission.resource, resource);
    const actionMatch = this.matchPattern(permission.action, action);
    
    return resourceMatch && actionMatch;
  }
  
  private matchPattern(pattern: string, value: string): boolean {
    // Convert pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(value);
  }
  
  private async evaluateConditions(
    conditions: PermissionCondition[],
    user: User,
    context?: Record<string, unknown>
  ): Promise<boolean> {
    for (const condition of conditions) {
      switch (condition.type) {
        case 'ownership':
          if (context?.owner !== user.id) {
            return false;
          }
          break;
          
        case 'time':
          const now = new Date();
          const timeRange = condition.value as { start: string; end: string };
          if (now < new Date(timeRange.start) || now > new Date(timeRange.end)) {
            return false;
          }
          break;
          
        case 'expression':
          // Evaluate expression using context
          const expression = condition.value as string;
          const result = this.evaluateExpression(expression, { user, context });
          if (!result) {
            return false;
          }
          break;
      }
    }
    
    return true;
  }
  
  private async validateInheritance(role: Role): Promise<void> {
    // Detect circular inheritance
    const visited = new Set<string>();
    const stack = [...role.inheritedRoles];
    
    while (stack.length > 0) {
      const currentId = stack.pop()!;
      
      if (currentId === role.id) {
        throw new CircularInheritanceError(role.id);
      }
      
      if (visited.has(currentId)) {
        continue;
      }
      
      visited.add(currentId);
      
      const currentRole = this.roles.get(currentId);
      if (currentRole) {
        stack.push(...currentRole.inheritedRoles);
      }
    }
  }
}
```

#### Success Criteria
- [ ] Tenants are fully isolated from each other
- [ ] Resource quotas are enforced
- [ ] RBAC permissions are checked on all operations
- [ ] Secrets are automatically rotated
- [ ] System can scale horizontally
- [ ] Automated backups are configured

---

## 3. Core Subsystem Specifications

### 3.1 Event System Specification

```typescript
// src/cowork/event-system/specification.ts

/**
 * EVENT NAMING CONVENTION
 * 
 * Format: {domain}:{entity}:{action}[:subaction]
 * 
 * Examples:
 * - agent:spawned
 * - workspace:artifact:created
 * - workflow:step:completed
 * - collaboration:conflict:detected
 * - human:approval:requested
 * - security:finding:critical
 */

export interface EventSpecification {
  name: string;
  description: string;
  schema: ZodSchema;
  producers: string[];
  consumers: string[];
  persistence: 'ephemeral' | 'durable' | 'archival';
  retention: number; // milliseconds
}

export const EventSpecifications: Record<string, EventSpecification> = {
  'agent:spawned': {
    name: 'agent:spawned',
    description: 'Emitted when a new agent is spawned',
    schema: z.object({
      agentId: z.string(),
      taskId: z.string(),
      capabilities: z.array(z.string()),
      spawnedAt: z.date()
    }),
    producers: ['AgentSpawner', 'WorkflowEngine'],
    consumers: ['TeamManager', 'EventBusBridge', 'TUIStore'],
    persistence: 'durable',
    retention: 30 * 24 * 60 * 60 * 1000 // 30 days
  },
  
  'workspace:artifact:created': {
    name: 'workspace:artifact:created',
    description: 'Emitted when a new artifact is created in a workspace',
    schema: z.object({
      workspaceId: z.string(),
      artifactId: z.string(),
      artifactType: z.string(),
      createdBy: z.string(),
      createdAt: z.date(),
      initialVersion: z.string()
    }),
    producers: ['CollaborativeWorkspace'],
    consumers: ['ArtifactVersioning', 'EvidenceCollector', 'NotificationService'],
    persistence: 'archival',
    retention: 7 * 365 * 24 * 60 * 60 * 1000 // 7 years
  },
  
  'workflow:step:completed': {
    name: 'workflow:step:completed',
    description: 'Emitted when a workflow step completes',
    schema: z.object({
      workflowId: z.string(),
      instanceId: z.string(),
      stepId: z.string(),
      result: z.unknown(),
      completedAt: z.date()
    }),
    producers: ['WorkflowEngine'],
    consumers: ['WorkflowEngine', 'QualityGateRunner'],
    persistence: 'durable',
    retention: 90 * 24 * 60 * 60 * 1000 // 90 days
  },
  
  'collaboration:conflict:detected': {
    name: 'collaboration:conflict:detected',
    description: 'Emitted when a conflict is detected during collaborative editing',
    schema: z.object({
      workspaceId: z.string(),
      artifactId: z.string(),
      conflictType: z.enum(['concurrent-edit', 'semantic', 'dependency']),
      participants: z.array(z.string()),
      detectedAt: z.date()
    }),
    producers: ['ConflictResolver'],
    consumers: ['NotificationService', 'CollaborativeWorkspace'],
    persistence: 'durable',
    retention: 365 * 24 * 60 * 60 * 1000 // 1 year
  },
  
  'human:approval:requested': {
    name: 'human:approval:requested',
    description: 'Emitted when human approval is requested',
    schema: z.object({
      requestId: z.string(),
      workflowId: z.string(),
      approvers: z.array(z.string()),
      itemType: z.string(),
      itemId: z.string(),
      requestedAt: z.date(),
      expiresAt: z.date()
    }),
    producers: ['ApprovalEngine'],
    consumers: ['NotificationService', 'ChatInterface'],
    persistence: 'durable',
    retention: 7 * 365 * 24 * 60 * 60 * 1000 // 7 years
  },
  
  'security:finding:critical': {
    name: 'security:finding:critical',
    description: 'Emitted when a critical security finding is detected',
    schema: z.object({
      findingId: z.string(),
      severity: z.literal('critical'),
      category: z.string(),
      description: z.string(),
      affectedResources: z.array(z.string()),
      detectedAt: z.date(),
      requiresImmediateAction: z.boolean()
    }),
    producers: ['SecurityMonitorAgent'],
    consumers: ['NotificationService', 'ParallelStateMonitor', 'ApprovalEngine'],
    persistence: 'archival',
    retention: 10 * 365 * 24 * 60 * 60 * 1000 // 10 years
  }
};
```

### 3.2 API Contract Specifications

All APIs must follow these contracts:

```typescript
// API Response Contract
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    requestId: string;
    timestamp: Date;
    duration: number;
    pagination?: {
      page: number;
      perPage: number;
      total: number;
      totalPages: number;
    };
  };
}

// API Error Codes
enum APIErrorCode {
  // 4xx Client Errors
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  
  // 5xx Server Errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  
  // Domain-specific
  WORKSPACE_NOT_FOUND = 'WORKSPACE_NOT_FOUND',
  AGENT_NOT_FOUND = 'AGENT_NOT_FOUND',
  WORKFLOW_NOT_FOUND = 'WORKFLOW_NOT_FOUND',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  PERMISSION_DENIED = 'PERMISSION_DENIED'
}
```

### 3.3 Configuration Schema

```typescript
// src/cowork/config/schema.ts
export const ConfigSchema = z.object({
  // Core settings
  tenant: z.object({
    id: z.string(),
    name: z.string()
  }),
  
  // Collaboration settings
  collaboration: z.object({
    enabled: z.boolean().default(true),
    maxConcurrentEditors: z.number().int().positive().default(10),
    conflictDetectionWindow: z.number().int().positive().default(300000), // 5 minutes
    autoResolveConflicts: z.boolean().default(false),
    realtimeEditing: z.object({
      enabled: z.boolean().default(true),
      syncInterval: z.number().int().positive().default(100)
    })
  }),
  
  // Team settings
  team: z.object({
    autoForm: z.boolean().default(true),
    minTeamSize: z.number().int().positive().default(3),
    maxTeamSize: z.number().int().positive().default(7),
    healthCheckInterval: z.number().int().positive().default(30000),
    autoRecovery: z.boolean().default(true)
  }),
  
  // Workflow settings
  workflow: z.object({
    defaultTimeout: z.number().int().positive().default(3600000), // 1 hour
    maxSteps: z.number().int().positive().default(100),
    checkpointInterval: z.number().int().positive().default(10000),
    compensationEnabled: z.boolean().default(true)
  }),
  
  // Human-in-the-loop settings
  human: z.object({
    approval: z.object({
      defaultTimeout: z.number().int().positive().default(86400000), // 24 hours
      reminderInterval: z.number().int().positive().default(14400000), // 4 hours
      autoEscalate: z.boolean().default(true)
    }),
    notification: z.object({
      channels: z.array(z.enum(['email', 'slack', 'webhook'])).default(['email']),
      defaultPriority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal')
    })
  }),
  
  // Monitoring settings
  monitoring: z.object({
    enabled: z.boolean().default(true),
    securityScanInterval: z.number().int().positive().default(60000),
    complianceRegulation: z.enum(['SOX', 'GDPR', 'PCI-DSS', 'HIPAA']).optional(),
    autoEscalate: z.boolean().default(true),
    metrics: z.object({
      enabled: z.boolean().default(true),
      exportInterval: z.number().int().positive().default(60000)
    })
  }),
  
  // Integration settings
  integrations: z.object({
    git: z.object({
      provider: z.enum(['github', 'gitlab', 'bitbucket']).optional(),
      token: z.string().optional()
    }).optional(),
    slack: z.object({
      token: z.string().optional(),
      defaultChannel: z.string().optional()
    }).optional(),
    jira: z.object({
      host: z.string().optional(),
      token: z.string().optional()
    }).optional()
  }),
  
  // Security settings
  security: z.object({
    rbac: z.object({
      enabled: z.boolean().default(true),
      defaultRoles: z.array(z.string()).default(['viewer', 'editor', 'admin'])
    }),
    encryption: z.object({
      atRest: z.boolean().default(true),
      inTransit: z.boolean().default(true)
    }),
    audit: z.object({
      enabled: z.boolean().default(true),
      retention: z.number().int().positive().default(2555) // days
    })
  }),
  
  // Resource quotas
  quotas: z.object({
    maxWorkspaces: z.number().int().positive().default(100),
    maxAgents: z.number().int().positive().default(50),
    maxStorage: z.number().int().positive().default(10737418240), // 10GB
    maxCompute: z.number().int().positive().default(1000000), // CPU seconds
    maxApiCalls: z.number().int().positive().default(10000) // per minute
  })
});

export type CoworkConfig = z.infer<typeof ConfigSchema>;
```

---

## 4. Agent Capability Matrix

### 4.1 Core Agent Roles

| Role | Capabilities | Collaboration | Human Interaction | Autonomy Level |
|------|--------------|---------------|-------------------|----------------|
| **Architect** | System design, tech decisions, trade-off analysis | Leads design reviews, coordinates with implementers | Presents options, explains decisions | High |
| **Implementer** | Code generation, refactoring, testing | Accepts tasks from architect, reports progress | Escalates blockers, requests clarification | High |
| **Reviewer** | Code review, quality assessment, feedback | Reviews all PRs, coordinates with implementers | Escalates critical issues, requests changes | Medium |
| **Security** | Vulnerability scanning, threat modeling, compliance | Monitors all changes, reviews security-sensitive code | Escalates findings, requests emergency reviews | High |
| **QA** | Test generation, test execution, coverage analysis | Validates implementer work, reports to PM | Escalates quality issues | Medium |
| **PM** | Requirements analysis, task breakdown, prioritization | Coordinates team, manages backlog | Reports status, requests decisions | Low |
| **Docs** | Documentation generation, API docs, user guides | Syncs with implementers for accuracy | Requests technical reviews | Medium |
| **Performance** | Profiling, optimization, bottleneck analysis | Works with architect and implementer | Reports findings | Medium |

### 4.2 Agent State Machine

```
┌──────────┐    spawn     ┌──────────┐   task assigned   ┌──────────┐
│  Idle    │─────────────▶│ Starting │──────────────────▶│ Working  │
└──────────┘              └──────────┘                   └────┬─────┘
     ▲                                                        │
     │                                                        │
     │                                                        ▼
┌────┴─────┐   completed    ┌──────────┐   review needed  ┌──────────┐
│  Done    │◀───────────────│ Reviewing│◀─────────────────│  Blocked │
└──────────┘                └──────────┘                  └──────────┘
     │
     │ error
     ▼
┌──────────┐   recovered   ┌──────────┐
│  Error   │──────────────▶│ Working  │
└──────────┘               └──────────┘
```

### 4.3 Agent Communication Protocol

```typescript
// Standard agent message format
interface AgentMessage {
  id: string;
  from: string;
  to: string | string[];
  type: MessageType;
  payload: unknown;
  priority: Priority;
  timestamp: Date;
  correlationId?: string; // For request/response
  ttl?: number; // Time-to-live in milliseconds
}

type MessageType = 
  | 'task:assigned'
  | 'task:completed'
  | 'task:blocked'
  | 'review:request'
  | 'review:feedback'
  | 'help:request'
  | 'help:response'
  | 'finding:share'
  | 'status:update'
  | 'escalation'
  | 'notification';

type Priority = 'low' | 'normal' | 'high' | 'urgent';

// Agent capability advertisement
interface AgentCapabilities {
  agentId: string;
  skills: Skill[];
  availability: 'available' | 'busy' | 'offline';
  currentLoad: number; // 0-1
  performance: {
    successRate: number;
    avgCompletionTime: number;
    qualityScore: number;
  };
}

interface Skill {
  name: string;
  level: 'novice' | 'intermediate' | 'expert';
  endorsements: number;
}
```

---

## 5. Integration Requirements

### 5.1 Foundry Integration

The Cowork system must integrate seamlessly with Foundry orchestration:

```typescript
// Integration points
interface FoundryCoworkIntegration {
  // Bridge initialization
  initialize(): Promise<void>;
  
  // Project execution
  executeProject(projectId: string, config: ExecutionConfig): Promise<ExecutionResult>;
  
  // Team formation
  formTeam(requirements: TeamRequirements): Promise<Team>;
  
  // Artifact handling
  createArtifact(projectId: string, artifact: Artifact): Promise<string>;
  getArtifact(projectId: string, artifactId: string): Promise<Artifact>;
  
  // Event forwarding
  forwardEvent(event: CoworkEvent): Promise<void>;
  
  // Health check
  healthCheck(): Promise<HealthStatus>;
}

// Event forwarding
interface EventBridge {
  // Foundry events to Cowork
  'foundry:phase:started' → 'workflow:step:started'
  'foundry:phase:completed' → 'workflow:step:completed'
  'foundry:artifact:created' → 'workspace:artifact:created'
  'foundry:gate:passed' → 'workflow:gate:passed'
  'foundry:gate:failed' → 'workflow:gate:failed'
  
  // Cowork events to Foundry
  'workspace:conflict:detected' → 'foundry:escalation:required'
  'team:health:critical' → 'foundry:escalation:required'
  'security:finding:critical' → 'foundry:escalation:required'
  'human:approval:completed' → 'foundry:approval:received'
}
```

### 5.2 TUI Integration

Real-time updates to TUI via EventBus:

```typescript
// TUI state synchronization
interface TUISynchronization {
  // Agent activity
  'agent:start' → Update agent list with status
  'agent:progress' → Update progress bar
  'agent:complete' → Mark agent as complete
  'agent:error' → Show error notification
  
  // Workspace updates
  'workspace:artifact:created' → Add to artifact list
  'workspace:artifact:updated' → Update artifact version
  'workspace:feedback:added' → Show feedback indicator
  
  // Team updates
  'team:member:joined' → Add to team list
  'team:member:status_changed' → Update status indicator
  'team:health:degraded' → Show warning
  
  // Human interaction
  'human:approval:requested' → Show approval dialog
  'chat:message' → Add to chat feed
}
```

### 5.3 External System Integration Requirements

| System | Integration Points | Data Flow | Error Handling |
|--------|-------------------|-----------|----------------|
| **GitHub** | PRs, Issues, Webhooks | Bidirectional | Retry with backoff, fallback to polling |
| **Jira** | Issues, Comments, Transitions | Bidirectional | Queue failed updates, alert on persistent failures |
| **Slack** | Notifications, Commands | Outbound primarily | Retry immediately, then queue |
| **CI/CD** | Pipeline triggers, Status | Bidirectional | Poll for status if webhooks fail |
| **Vault** | Secrets, Certificates | Outbound | Circuit breaker pattern |

---

## 6. Code Standards and Patterns

### 6.1 Required Patterns

#### Singleton with Lazy Initialization
```typescript
export class ServiceName {
  private static instance: ServiceName;
  
  static getInstance(): ServiceName {
    if (!ServiceName.instance) {
      ServiceName.instance = new ServiceName();
    }
    return ServiceName.instance;
  }
  
  private constructor() {}
}
```

#### Event-Driven Architecture
```typescript
// Always emit events for state changes
async performAction(): Promise<void> {
  // ... perform action ...
  
  this.eventBus.publish('domain:entity:action', {
    entityId,
    result,
    timestamp: new Date()
  });
}
```

#### Repository Pattern
```typescript
export interface EntityRepository {
  findById(id: string): Promise<Entity | null>;
  findAll(filter: Filter): Promise<Entity[]>;
  create(data: CreateDTO): Promise<Entity>;
  update(id: string, data: UpdateDTO): Promise<Entity>;
  delete(id: string): Promise<void>;
}
```

#### Dependency Injection
```typescript
export class Service {
  constructor(
    private repository: EntityRepository,
    private eventBus: EventBus,
    private config: Config
  ) {}
}
```

### 6.2 Error Handling Standards

```typescript
// Custom error classes
export class CoworkError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'CoworkError';
  }
}

export class WorkspaceNotFoundError extends CoworkError {
  constructor(workspaceId: string) {
    super(
      `Workspace ${workspaceId} not found`,
      'WORKSPACE_NOT_FOUND',
      404,
      { workspaceId }
    );
  }
}

// Error handling pattern
try {
  const result = await operation();
  return result;
} catch (error) {
  if (error instanceof CoworkError) {
    // Log and re-throw
    logger.error({ error, context }, 'Operation failed');
    throw error;
  }
  
  // Wrap unknown errors
  logger.error({ error, context }, 'Unexpected error');
  throw new CoworkError(
    'Internal error occurred',
    'INTERNAL_ERROR',
    500,
    { originalError: error }
  );
}
```

### 6.3 Testing Standards

```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  let mocks: {
    repository: Mocked<EntityRepository>;
    eventBus: Mocked<EventBus>;
  };
  
  beforeEach(() => {
    mocks = {
      repository: mock<EntityRepository>(),
      eventBus: mock<EventBus>()
    };
    
    service = new ServiceName(
      mocks.repository,
      mocks.eventBus
    );
  });
  
  describe('methodName', () => {
    it('should handle success case', async () => {
      // Arrange
      const input = { /* ... */ };
      const expected = { /* ... */ };
      mocks.repository.findById.mockResolvedValue(expected);
      
      // Act
      const result = await service.methodName(input);
      
      // Assert
      expect(result).toEqual(expected);
      expect(mocks.eventBus.publish).toHaveBeenCalledWith(
        'expected:event',
        expect.any(Object)
      );
    });
    
    it('should handle error case', async () => {
      // Arrange
      mocks.repository.findById.mockRejectedValue(new Error('DB error'));
      
      // Act & Assert
      await expect(service.methodName({}))
        .rejects
        .toThrow(CoworkError);
    });
    
    it('should handle edge case', async () => {
      // Test edge cases
    });
  });
});
```

### 6.4 Documentation Standards

```typescript
/**
 * Brief description of the class/function
 * 
 * Detailed description explaining behavior, side effects, and important
 * considerations. Include usage examples when helpful.
 * 
 * @example
 * ```typescript
 * const result = await service.method({
 *   param1: 'value',
 *   param2: 123
 * });
 * ```
 * 
 * @param paramName - Description of parameter
 * @returns Description of return value
 * @throws {ErrorType} When/why this error is thrown
 * 
 * @since 1.0.0
 * @see RelatedClass or function
 */
```

---

## 7. Testing Strategy

### 7.1 Testing Pyramid

```
                    ╱╲
                   ╱  ╲
                  ╱ E2E╲        ~10 tests
                 ╱────────╲     Full workflows
                ╱            ╲
               ╱  Integration  ╲   ~50 tests
              ╱──────────────────╲ Component interactions
             ╱                      ╲
            ╱        Unit             ╲  ~500+ tests
           ╱────────────────────────────╲ Individual functions
```

### 7.2 Test Categories

| Category | Scope | Tools | Coverage Target |
|----------|-------|-------|-----------------|
| **Unit** | Individual functions/classes | Jest | 90% |
| **Integration** | Component interactions | Jest + testcontainers | 80% |
| **Contract** | API contracts | Pact | 100% of public APIs |
| **E2E** | Full workflows | Playwright | Critical paths |
| **Performance** | Load and stress | k6 | Baseline established |
| **Security** | Vulnerability scanning | Snyk, OWASP ZAP | 0 critical/high |
| **Chaos** | Failure scenarios | Chaos Monkey | Resilience validated |

### 7.3 Critical Test Scenarios

```typescript
// tests/e2e/critical-paths.test.ts
const CriticalPaths = [
  {
    name: 'Full Project Execution',
    steps: [
      'Create project workspace',
      'Form development team',
      'Execute architecture phase',
      'Execute implementation phase',
      'Execute review phase',
      'Pass quality gates',
      'Generate compliance package'
    ]
  },
  {
    name: 'Conflict Resolution Flow',
    steps: [
      'Two agents edit same artifact',
      'Conflict detected',
      'Auto-resolution attempted',
      'Human notified if manual resolution needed',
      'Resolution applied',
      'Both agents notified'
    ]
  },
  {
    name: 'Security Escalation',
    steps: [
      'Security monitor detects critical finding',
      'Finding published to event bus',
      'Notification sent to security team',
      'Workflow paused',
      'Human reviews and approves/rejects',
      'Workflow resumes or terminates'
    ]
  },
  {
    name: 'Team Recovery',
    steps: [
      'Team member becomes unresponsive',
      'Health check detects issue',
      'Recovery attempted automatically',
      'If recovery fails, escalate to lead',
      'Lead reassigns tasks',
      'Team continues with reduced capacity'
    ]
  }
];
```

### 7.4 Test Data Management

```typescript
// tests/fixtures/workspaces.ts
export const WorkspaceFixtures = {
  minimal: {
    id: 'ws-minimal',
    name: 'Minimal Workspace',
    status: 'active',
    members: []
  },
  
  withArtifacts: {
    id: 'ws-with-artifacts',
    name: 'Workspace with Artifacts',
    status: 'active',
    members: ['agent-1', 'agent-2'],
    artifacts: [
      { id: 'art-1', name: 'architecture.md', versions: 3 },
      { id: 'art-2', name: 'implementation.ts', versions: 1 }
    ]
  },
  
  withConflicts: {
    id: 'ws-with-conflicts',
    name: 'Workspace with Conflicts',
    status: 'active',
    members: ['agent-1', 'agent-2'],
    conflicts: [
      {
        artifactId: 'art-1',
        participants: ['agent-1', 'agent-2'],
        status: 'pending_resolution'
      }
    ]
  }
};

// Factory for dynamic test data
export class WorkspaceFactory {
  static create(overrides?: Partial<Workspace>): Workspace {
    return {
      id: generateId(),
      name: `Test Workspace ${Date.now()}`,
      status: 'active',
      members: [],
      artifacts: [],
      createdAt: new Date(),
      ...overrides
    };
  }
}
```

---

## 8. Governance and Compliance

### 8.1 Audit Requirements

All actions must be auditable:

```typescript
interface AuditRecord {
  id: string;
  timestamp: Date;
  actor: string;
  action: string;
  resource: string;
  resourceId: string;
  tenantId: string;
  beforeState?: unknown;
  afterState?: unknown;
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    correlationId: string;
  };
  integrity: {
    hash: string;
    previousHash: string;
    signature: string;
  };
}
```

### 8.2 Compliance Frameworks

| Framework | Requirements | Implementation |
|-----------|--------------|----------------|
| **SOX** | Change controls, segregation of duties | Approval workflows, role-based permissions |
| **GDPR** | Data portability, right to erasure | Data export, deletion workflows |
| **SOC2** | Security, availability, confidentiality | Encryption, access controls, monitoring |
| **ISO 27001** | Risk management, asset protection | Risk assessment, asset inventory |

### 8.3 Evidence Collection

```typescript
// Automatic evidence collection
const EvidenceCollectionRules = {
  'workspace:artifact:created': {
    collect: true,
    sign: true,
    retention: '7-years'
  },
  'human:approval:completed': {
    collect: true,
    sign: true,
    retention: '10-years'
  },
  'security:finding:critical': {
    collect: true,
    sign: true,
    retention: '10-years'
  },
  'agent:spawned': {
    collect: true,
    sign: false,
    retention: '90-days'
  }
};
```

---

## 9. Human-in-the-Loop Design

### 9.1 Interaction Patterns

```
┌─────────────────────────────────────────────────────────────────────┐
│                     HUMAN INTERACTION PATTERNS                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  PATTERN 1: Approval Gate                                           │
│  ────────────────────────                                           │
│  Agent ──▶ Task Complete ──▶ Needs Approval ──▶ Human Notified     │
│    ▲                                              │                  │
│    └──────────────── Approved ────────────────────┘                  │
│                     Rejected ───▶ Task Revised                       │
│                                                                      │
│  PATTERN 2: Conflict Resolution                                      │
│  ─────────────────────────────                                       │
│  Agent A ──┐                                                         │
│             ├──▶ Conflict Detected ──▶ Human Resolves ──▶ Both Updated│
│  Agent B ──┘                                                         │
│                                                                      │
│  PATTERN 3: Escalation                                               │
│  ─────────────────────                                               │
│  Monitor ──▶ Critical Finding ──▶ Immediate Alert ──▶ Human Reviews  │
│                                                                      │
│  PATTERN 4: Consultation                                             │
│  ───────────────────────                                             │
│  Agent ──▶ Uncertain ──▶ Request Clarification ──▶ Human Responds  │
│                                                                      │
│  PATTERN 5: Chat Collaboration                                       │
│  ─────────────────────────                                           │
│  Human ◀──▶ Real-time Chat ◀──▶ Multiple Agents                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.2 Notification Priority Matrix

| Event | Priority | Channels | Response Required | SLA |
|-------|----------|----------|-------------------|-----|
| Security Critical Finding | Urgent | All | Yes (immediate) | 15 min |
| Approval Required | High | Email, Slack | Yes | 24 hours |
| Conflict Detected | High | Slack, In-app | Yes | 4 hours |
| Team Health Degraded | Normal | Email, In-app | No | - |
| Task Completed | Low | In-app | No | - |

### 9.3 Human Override Capabilities

```typescript
interface HumanOverride {
  // Emergency stop
  emergencyStop(projectId: string, reason: string): Promise<void>;
  
  // Task reassignment
  reassignTask(taskId: string, fromAgent: string, toAgent: string): Promise<void>;
  
  // Direct command
  sendCommand(agentId: string, command: string, args: unknown[]): Promise<unknown>;
  
  // Force state change
  forceWorkflowState(workflowId: string, newState: string): Promise<void>;
  
  // Manual approval
  overrideApproval(requestId: string, decision: 'approve' | 'reject'): Promise<void>;
}
```

---

## 10. Implementation Commands

### 10.1 Quick Start

```bash
# 1. Initialize development environment
npm install
npm run build

# 2. Start development services
npm run dev:services  # Starts PostgreSQL, Redis, etc.

# 3. Run database migrations
npm run migrate

# 4. Start development server
npm run dev

# 5. Run tests
npm run test:unit
npm run test:integration
npm run test:e2e
```

### 10.2 Implementation Checklist

```markdown
## Pre-Implementation
- [ ] Review this COWORK_PLAN.md thoroughly
- [ ] Understand current codebase state
- [ ] Set up development environment
- [ ] Run existing tests to establish baseline

## Phase 0: Foundation
- [ ] Create persistence layer interfaces
- [ ] Implement PostgreSQL adapter
- [ ] Create migration system
- [ ] Add configuration management
- [ ] Set up stricter lint rules
- [ ] Write ADRs for key decisions

## Phase 1: Runtime Hardening
- [ ] Implement sandboxed agent runner
- [ ] Add checkpoint/resume capability
- [ ] Create workflow engine foundation
- [ ] Implement persistent event bus
- [ ] Add OpenTelemetry instrumentation
- [ ] Write comprehensive tests

## Phase 2: Advanced Collaboration
- [ ] Implement OT/CRDT for real-time editing
- [ ] Add semantic conflict resolution
- [ ] Create negotiation protocol
- [ ] Implement skill learning
- [ ] Add team rebalancing
- [ ] Write integration tests

## Phase 3: Human-in-the-Loop
- [ ] Implement approval workflow engine
- [ ] Create notification service
- [ ] Add human task management
- [ ] Implement chat interface
- [ ] Set up SLA monitoring
- [ ] Write E2E tests

## Phase 4: External Integrations
- [ ] Implement Git provider integration
- [ ] Add issue tracker integration
- [ ] Create CI/CD integration
- [ ] Implement communication integration
- [ ] Add webhook handling
- [ ] Write integration tests

## Phase 5: Production Hardening
- [ ] Implement multi-tenancy
- [ ] Add full RBAC
- [ ] Implement secret rotation
- [ ] Add horizontal scaling support
- [ ] Set up automated backups
- [ ] Write chaos tests

## Final Validation
- [ ] Run full test suite
- [ ] Perform security audit
- [ ] Load test the system
- [ ] Document all APIs
- [ ] Create runbooks
- [ ] Update all documentation
```

### 10.3 Validation Commands

```bash
# Full validation
npm run validate

# Individual validations
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:security
npm run test:performance

# Coverage
npm run test:coverage

# Security scan
npm run security:audit
npm run security:scan

# Build verification
npm run build
npm run build:production

# Docker build
docker build -t opencode-tools .
docker run -p 3000:3000 opencode-tools
```

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Agent** | An autonomous AI entity with specific capabilities and responsibilities |
| **Artifact** | Any work product created by agents (code, docs, designs, etc.) |
| **Blackboard** | Shared state storage for inter-agent communication |
| **Checkpoint** | Saved state of an agent execution for resume capability |
| **Cowork** | The collaborative agent workspace runtime |
| **CRDT** | Conflict-free Replicated Data Type for real-time collaboration |
| **Event Bus** | Pub/sub messaging system for inter-agent communication |
| **Foundry** | The orchestration layer that coordinates agent teams |
| **OT** | Operational Transform for real-time collaborative editing |
| **RBAC** | Role-Based Access Control |
| **Saga** | Pattern for managing distributed transactions |
| **Tenant** | Isolated organizational unit with its own resources |
| **Workflow** | Defined sequence of steps executed by agents |
| **Workspace** | Project-scoped container for artifacts and collaboration |

## Appendix B: References

- [Foundry-Cowork Integration Guide](./FOUNDRY_COWORK_INTEGRATION_GUIDE.md)
- [Enterprise Gap Backlog](./ENTERPRISE_GAP_BACKLOG.md)
- [Phase 1 Implementation Summary](./PHASE1_IMPLEMENTATION_SUMMARY.md)
- [API Reference](./API_REFERENCE.md)
- [AGENTS.md](../AGENTS.md)

---

## Document Information

- **Author**: Foundry Orchestrator Agent
- **Created**: 2026-02-16
- **Version**: 1.0.0
- **Status**: Implementation Plan
- **Reviewers**: TBD
- **Approval**: TBD

---

*End of COWORK_PLAN.md*
