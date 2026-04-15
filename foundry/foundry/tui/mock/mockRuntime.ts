import { EventBus } from '../services/eventBus.js';
import {
  FoundryTUIState,
  ProjectContext,
  Agent,
  Gate,
  Artifact,
  TeamMember,
  AgentStatus,
  GateStatus,
  ProjectPhase,
} from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

interface MockRuntimeConfig {
  demoMode?: boolean;
  autoProgress?: boolean;
  progressIntervalMs?: number;
}

export class MockRuntime {
  private eventBus: EventBus;
  private config: MockRuntimeConfig;
  private intervals: NodeJS.Timeout[] = [];
  private state: FoundryTUIState | null = null;
  private dispatch: ((action: unknown) => void) | null = null;

  constructor(eventBus: EventBus, config: MockRuntimeConfig = {}) {
    this.eventBus = eventBus;
    this.config = {
      demoMode: true,
      autoProgress: true,
      progressIntervalMs: 2000,
      ...config,
    };
  }

  public initialize(
    state: FoundryTUIState,
    dispatch: (action: unknown) => void
  ): void {
    this.state = state;
    this.dispatch = dispatch;

    // Seed initial demo data
    this.seedDemoData();

    // Start auto-progress if enabled
    if (this.config.autoProgress) {
      this.startAutoProgress();
    }

    // Subscribe to events
    this.setupEventHandlers();

    // Emit initialization event
    this.eventBus.publish('runtime:initialized', {
      timestamp: new Date().toISOString(),
    });
  }

  public destroy(): void {
    this.intervals.forEach((interval) => clearInterval(interval));
    this.intervals = [];
  }

  private seedDemoData(): void {
    // Create demo project
    const project: ProjectContext = {
      id: uuidv4(),
      name: 'Foundry Interactive v2',
      description: 'Chat-based CTO orchestration system with real-time project management',
      phase: 'implementation',
      status: 'active',
      startDate: new Date(),
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      goals: [
        'Build chat-based CTO interface',
        'Implement real-time project overview',
        'Create event-driven architecture',
      ],
      constraints: ['Production-ready', 'TypeScript strict mode', 'Comprehensive tests'],
    };

    this.dispatch?.({ type: 'PROJECT_UPDATE', payload: project });

    // Create demo agents
    this.createDemoAgents();

    // Create demo gates
    this.createDemoGates();

    // Create demo artifacts
    this.createDemoArtifacts();

    // Create demo team
    this.createDemoTeam();
  }

  private createDemoAgents(): void {
    const agents: Agent[] = [
      {
        id: uuidv4(),
        name: 'Architect-1',
        role: 'System Architect',
        status: 'running',
        task: 'Designing event bus architecture',
        progress: 65,
        startTime: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Dev-1',
        role: 'Senior Developer',
        status: 'running',
        task: 'Implementing chat components',
        progress: 40,
        startTime: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Review-1',
        role: 'Code Reviewer',
        status: 'idle',
        task: 'Waiting for PR',
        progress: 0,
      },
    ];

    agents.forEach((agent) => {
      this.dispatch?.({ type: 'AGENT_ADD', payload: agent });
    });
  }

  private createDemoGates(): void {
    const gates: Gate[] = [
      {
        id: uuidv4(),
        name: 'Architecture Review',
        description: 'Review system architecture and design',
        status: 'passed',
        order: 1,
        checks: [
          { id: uuidv4(), name: 'Component diagram', passed: true },
          { id: uuidv4(), name: 'API contracts', passed: true },
          { id: uuidv4(), name: 'Data flow', passed: true },
        ],
      },
      {
        id: uuidv4(),
        name: 'Code Quality',
        description: 'Ensure code meets quality standards',
        status: 'in_progress',
        order: 2,
        checks: [
          { id: uuidv4(), name: 'Linting', passed: true },
          { id: uuidv4(), name: 'Type checking', passed: true },
          { id: uuidv4(), name: 'Test coverage', passed: false, message: 'Below 80%' },
        ],
      },
      {
        id: uuidv4(),
        name: 'Security Review',
        description: 'Security compliance check',
        status: 'pending',
        order: 3,
        checks: [
          { id: uuidv4(), name: 'Dependency audit', passed: undefined },
          { id: uuidv4(), name: 'Secret scanning', passed: undefined },
        ],
      },
    ];

    gates.forEach((gate) => {
      this.dispatch?.({ type: 'GATE_ADD', payload: gate });
    });
  }

  private createDemoArtifacts(): void {
    const artifacts: Artifact[] = [
      {
        id: uuidv4(),
        name: 'ARCHITECTURE.md',
        type: 'document',
        path: '/docs/ARCHITECTURE.md',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'Architect-1',
        tags: ['docs', 'architecture'],
      },
      {
        id: uuidv4(),
        name: 'types.ts',
        type: 'code',
        path: '/src/types/index.ts',
        version: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'Dev-1',
        tags: ['code', 'types'],
      },
    ];

    artifacts.forEach((artifact) => {
      this.dispatch?.({ type: 'ARTIFACT_ADD', payload: artifact });
    });
  }

  private createDemoTeam(): void {
    const team: TeamMember[] = [
      {
        id: uuidv4(),
        name: 'CTO Orchestrator',
        role: 'cto',
        isActive: true,
        currentTask: 'Managing project',
        availability: 100,
      },
      {
        id: uuidv4(),
        name: 'Senior Architect',
        role: 'architect',
        isActive: true,
        currentTask: 'Design review',
        availability: 80,
      },
      {
        id: uuidv4(),
        name: 'Lead Developer',
        role: 'developer',
        isActive: true,
        currentTask: 'Feature implementation',
        availability: 90,
      },
    ];

    team.forEach((member) => {
      this.dispatch?.({ type: 'TEAM_ADD', payload: member });
    });
  }

  private startAutoProgress(): void {
    // Simulate agent progress updates
    const progressInterval = setInterval(() => {
      const runningAgents = this.state?.agents.filter((a) => a.status === 'running') ?? [];
      runningAgents.forEach((agent) => {
        const increment = Math.random() * 10;
        const newProgress = Math.min(100, agent.progress + increment);

        this.dispatch?.({
          type: 'AGENT_SET_PROGRESS',
          payload: { id: agent.id, progress: newProgress },
        });

        if (newProgress >= 100) {
          this.dispatch?.({
            type: 'AGENT_SET_STATUS',
            payload: { id: agent.id, status: 'completed' },
          });

          this.eventBus.publish('agent:completed', {
            agentId: agent.id,
            agentName: agent.name,
          });
        }
      });
    }, this.config.progressIntervalMs ?? 2000);

    this.intervals.push(progressInterval);
  }

  private setupEventHandlers(): void {
    // Handle chat messages
    this.eventBus.subscribe('chat:message:sent', (payload) => {
      const { content } = payload as { content: string };

      // Handle commands
      if (content.startsWith('/')) {
        this.handleCommand(content);
      }
    });

    // Handle CTO actions
    this.eventBus.subscribe('cto:delegate', (payload) => {
      const { task } = payload as { task: string };
      this.spawnMockAgent(task);
    });
  }

  private handleCommand(content: string): void {
    const parts = content.slice(1).split(' ');
    const command = parts[0];
    const args = parts.slice(1);

    switch (command) {
      case 'status':
        this.eventBus.publish('chat:message:received', {
          id: uuidv4(),
          role: 'system',
          content: `Project Status:\nPhase: ${this.state?.project.phase}\nActive Agents: ${this.state?.runtime.activeAgents}\nPending Tasks: ${this.state?.runtime.pendingTasks}`,
          timestamp: new Date().toISOString(),
        });
        break;

      case 'agents':
        this.eventBus.publish('SET_FOCUS', { payload: 'agents' });
        break;

      case 'gates':
        this.eventBus.publish('SET_FOCUS', { payload: 'gates' });
        break;

      case 'artifacts':
        this.eventBus.publish('SET_FOCUS', { payload: 'artifacts' });
        break;

      case 'team':
        this.eventBus.publish('SET_FOCUS', { payload: 'team' });
        break;

      case 'phase':
        if (args[0]) {
          this.dispatch?.({
            type: 'PROJECT_SET_PHASE',
            payload: args[0] as ProjectPhase,
          });
        }
        break;

      case 'spawn':
        if (args.length >= 2) {
          const [role, ...taskParts] = args;
          const task = taskParts.join(' ');
          this.spawnMockAgent(task, role);
        }
        break;

      case 'help':
        this.eventBus.publish('TOGGLE_HELP');
        break;
    }
  }

  private spawnMockAgent(task?: string, role?: string): void {
    const agent: Agent = {
      id: uuidv4(),
      name: `Agent-${Math.floor(Math.random() * 1000)}`,
      role: role ?? 'Worker',
      status: 'running',
      task: task ?? 'Processing task',
      progress: 0,
      startTime: new Date(),
    };

    this.dispatch?.({ type: 'AGENT_ADD', payload: agent });

    this.eventBus.publish('agent:spawned', {
      agentId: agent.id,
      agentName: agent.name,
      task: agent.task,
    });
  }
}
