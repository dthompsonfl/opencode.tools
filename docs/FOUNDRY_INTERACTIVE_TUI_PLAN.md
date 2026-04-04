# Foundry Interactive TUI Architecture Plan
## Complete Chat-Based CTO Orchestration & Project Management System

---

## Executive Summary

This document outlines the complete architecture for an interactive Terminal User Interface (TUI) that combines:
1. **Chat-based interface** (like OpenCode CLI, Codex CLI, Claude CLI, Gemini CLI)
2. **Complete Foundry Overview** for enterprise project management
3. **CTO Orchestration Agent** - one CTO per project with dedicated Cowork space

The system will provide real-time visibility into autonomous development workflows while enabling natural language interaction with the CTO orchestrator.

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              FOUNDRY INTERACTIVE TUI                                         │
│                                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                           MAIN TUI LAYOUT                                            │   │
│  │                                                                                      │   │
│  │   ┌──────────────────────────────────────────────────────────────────────────┐      │   │
│  │   │ HEADER: Project Name | Phase | Connection | Active Agents | Quick Nav    │      │   │
│  │   └──────────────────────────────────────────────────────────────────────────┘      │   │
│  │                                                                                      │   │
│  │   ┌──────────────────────────────┬─────────────────────────────────────────────┐    │   │
│  │   │                              │                                              │    │   │
│  │   │    CHAT PANEL                │     PROJECT OVERVIEW PANEL                   │    │   │
│  │   │    (Left 60%)                │     (Right 40%)                              │    │   │
│  │   │                              │                                              │    │   │
│  │   │  ┌────────────────────────┐  │  ┌──────────────────────────────────────┐   │    │   │
│  │   │  │ Chat History           │  │  │ Project Dashboard                    │   │    │   │
│  │   │  │ - User messages        │  │  │ - Project status & health            │   │    │   │
│  │   │  │ - CTO responses        │  │  │ - Active phases & gates              │   │    │   │
│  │   │  │ - Agent notifications  │  │  │ - Team roster                        │   │    │   │
│  │   │  │ - System events        │  │  │ - Artifacts list                     │   │    │   │
│  │   │  │ - Progress updates     │  │  │ - Evidence collection                │   │    │   │
│  │   │  └────────────────────────┘  │  └──────────────────────────────────────┘   │    │   │
│  │   │                              │                                              │    │   │
│  │   │  ┌────────────────────────┐  │  ┌──────────────────────────────────────┐   │    │   │
│  │   │  │ Input Area             │  │  │ Sub-Panels (Tabbed)                  │   │    │   │
│  │   │  │ - Message input        │  │  │ □ Agents □ Gates □ Artifacts □ Team  │   │    │   │
│  │   │  │ - Command suggestions  │  │  │                                      │   │    │   │
│  │   │  │ - Quick actions        │  │  │ Detailed view of selected category   │   │    │   │
│  │   │  └────────────────────────┘  │  └──────────────────────────────────────┘   │    │   │
│  │   │                              │                                              │    │   │
│  │   └──────────────────────────────┴─────────────────────────────────────────────┘    │   │
│  │                                                                                      │   │
│  │   ┌──────────────────────────────────────────────────────────────────────────┐      │   │
│  │   │ FOOTER: Keyboard Shortcuts | Status Messages | Current Context           │      │   │
│  │   └──────────────────────────────────────────────────────────────────────────┘      │   │
│  │                                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          │ EventBus
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              ORCHESTRATION LAYER                                            │
│                                                                                              │
│  ┌────────────────────────────┐    ┌────────────────────────────┐    ┌──────────────────┐  │
│  │  FoundryOrchestrator       │◄──►│  FoundryCollaborationBridge │◄──►│  CoworkRuntime   │  │
│  │  - State machine mgmt      │    │  - Team coordination        │    │  - Agent spawning│  │
│  │  - Phase transitions       │    │  - Event routing            │    │  - Task execution│  │
│  │  - Quality gates           │    │  - Workspace management     │    │  - Progress cb   │  │
│  └────────────────────────────┘    └────────────────────────────┘    └──────────────────┘  │
│                                          │                                                   │
│                                          ▼                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐    │
│  │                         CTO ORCHESTRATOR AGENT                                       │    │
│  │                                                                                       │    │
│  │  - Natural language understanding via LLM                                            │    │
│  │  - Project context awareness                                                         │    │
│  │  - Multi-agent coordination                                                          │    │
│  │  - Strategic decision making                                                         │    │
│  │  - Human escalation handling                                                         │    │
│  └─────────────────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Models & State Architecture

### 2.1 Core State Structure

```typescript
// src/foundry-tui-v2/types.ts

export interface FoundryTUIState {
  // Navigation & UI
  activeView: 'chat' | 'overview' | 'agents' | 'gates' | 'artifacts' | 'team';
  sidebarExpanded: boolean;
  
  // Project Context
  currentProject: ProjectContext | null;
  projects: ProjectSummary[];
  
  // Chat State
  chat: ChatState;
  
  // Real-time Runtime State
  runtime: RuntimeState;
  
  // Connection
  connection: ConnectionStatus;
}

export interface ProjectContext {
  id: string;
  name: string;
  industry: string;
  description: string;
  status: ProjectStatus;
  phase: FoundryPhase;
  
  // Team
  ctoAgent: CTOAgent;
  team: TeamMember[];
  
  // Workspace
  workspaceId: string;
  coworkSpaceId: string;
  
  // Progress
  progress: ProjectProgress;
  
  // Metadata
  createdAt: number;
  updatedAt: number;
}

export interface ChatState {
  messages: ChatMessage[];
  inputValue: string;
  isTyping: boolean;
  threadId: string;
  
  // Message history for context
  contextWindow: number; // Max messages to include in LLM context
  
  // Command suggestions
  suggestions: CommandSuggestion[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'cto' | 'agent' | 'system' | 'event';
  content: string;
  timestamp: number;
  
  // Metadata
  agentId?: string;
  agentName?: string;
  phase?: string;
  messageType?: 'text' | 'code' | 'artifact' | 'status' | 'error' | 'suggestion';
  
  // For artifact references
  artifactRef?: ArtifactReference;
  
  // For agent actions
  action?: AgentAction;
}

export interface RuntimeState {
  agents: AgentRuntime[];
  qualityGates: QualityGate[];
  artifacts: ArtifactRecord[];
  teamActivities: TeamActivity[];
  activeTasks: ActiveTask[];
  
  // Event feed
  recentEvents: FoundryEvent[];
}

export interface CTOAgent {
  id: string;
  name: string;
  status: 'idle' | 'thinking' | 'working' | 'reviewing';
  currentFocus: string;
  personality: CTOPersonality;
  
  // Capabilities
  canDelegate: boolean;
  canApprove: boolean;
  canEscalate: boolean;
  
  // Context
  projectUnderstanding: ProjectUnderstanding;
  recentDecisions: Decision[];
}

export interface CTOPersonality {
  style: 'analytical' | 'collaborative' | 'directive' | 'mentor';
  communicationTone: 'formal' | 'conversational' | 'technical';
  verbosity: 'concise' | 'balanced' | 'detailed';
}
```

### 2.2 Event System Architecture

```typescript
// Events flowing through EventBus for real-time updates

// Chat-related events
'chat:message:received'    // New message from CTO or agent
'chat:message:sent'        // User sent message
'chat:typing:start'        // CTO is typing
'chat:typing:stop'         // CTO stopped typing
'chat:suggestion:update'   // Command suggestions updated

// CTO-specific events
'cto:thinking:start'       // CTO is analyzing request
'cto:thinking:complete'    // CTO finished analysis
'cto:action:proposed'      // CTO proposes an action
'cto:decision:made'        // CTO made a decision
'cto:escalation:required'  // CTO needs human input

// Project lifecycle events
'project:created'          // New project initialized
'project:phase:changed'    // Phase transition occurred
'project:status:updated'   // Project status change
'project:milestone:reached' // Milestone achieved

// Agent runtime events
'agent:spawned'            // New agent started
'agent:progress'           // Agent progress update
'agent:completed'          // Agent finished task
'agent:blocked'            // Agent needs help
'agent:error'              // Agent encountered error

// Workspace/Collaboration events
'workspace:updated'        // Workspace state changed
'artifact:created'         // New artifact generated
'artifact:updated'         // Artifact modified
'feedback:added'           // New feedback thread
'team:activity'            // Team member activity
```

---

## 3. Component Architecture

### 3.1 Main Application Structure

```
src/foundry-tui-v2/
├── App.tsx                    # Root application component
├── main.tsx                   # Entry point
│
├── components/
│   ├── layout/
│   │   ├── Header.tsx         # Top navigation bar
│   │   ├── Sidebar.tsx        # Collapsible project navigation
│   │   ├── Footer.tsx         # Status bar & shortcuts
│   │   ├── SplitPane.tsx      # Resizable panel layout
│   │   └── TabBar.tsx         # View switching tabs
│   │
│   ├── chat/
│   │   ├── ChatPanel.tsx      # Main chat container
│   │   ├── MessageList.tsx    # Scrollable message history
│   │   ├── MessageItem.tsx    # Individual message display
│   │   ├── ChatInput.tsx      # Message input with autocomplete
│   │   ├── TypingIndicator.tsx # CTO "is typing" animation
│   │   ├── SuggestionBar.tsx  # Command suggestions
│   │   └── CodeBlock.tsx      # Syntax highlighted code display
│   │
│   ├── overview/
│   │   ├── ProjectCard.tsx    # Project summary card
│   │   ├── PhaseIndicator.tsx # Current phase visualization
│   │   ├── ProgressRing.tsx   # Circular progress indicator
│   │   ├── HealthStatus.tsx   # Project health dashboard
│   │   └── QuickStats.tsx     # Key metrics display
│   │
│   ├── agents/
│   │   ├── AgentGrid.tsx      # Grid of active agents
│   │   ├── AgentCard.tsx      # Individual agent status card
│   │   ├── AgentDetail.tsx    # Detailed agent view
│   │   ├── TaskQueue.tsx      # Pending tasks list
│   │   └── ActivityLog.tsx    # Agent activity timeline
│   │
│   ├── gates/
│   │   ├── GateList.tsx       # Quality gates list
│   │   ├── GateCard.tsx       # Individual gate status
│   │   ├── GateDetail.tsx     # Detailed gate results
│   │   └── EvidenceViewer.tsx # Evidence documentation
│   │
│   ├── artifacts/
│   │   ├── ArtifactList.tsx   # Scrollable artifact list
│   │   ├── ArtifactCard.tsx   # Artifact preview card
│   │   ├── VersionHistory.tsx # Version timeline
│   │   ├── DiffViewer.tsx     # Diff visualization
│   │   └── FeedbackThreads.tsx # Artifact feedback
│   │
│   ├── team/
│   │   ├── TeamRoster.tsx     # Team members list
│   │   ├── MemberCard.tsx     # Individual member card
│   │   ├── CollaborationFeed.tsx # Real-time activity feed
│   │   └── HandoffPanel.tsx   # Task handoff interface
│   │
│   └── shared/
│       ├── LoadingSpinner.tsx
│       ├── ErrorBoundary.tsx
│       ├── ConfirmDialog.tsx
│       ├── Tooltip.tsx
│       └── Badge.tsx
│
├── screens/
│   ├── MainScreen.tsx         # Primary split-view layout
│   ├── ProjectSetupScreen.tsx # New project wizard
│   ├── ProjectSelector.tsx    # Project list/selector
│   └── SettingsScreen.tsx     # TUI configuration
│
├── hooks/
│   ├── useChat.ts             # Chat state management
│   ├── useProject.ts          # Project context hooks
│   ├── useCTO.ts              # CTO interaction hooks
│   ├── useEventBus.ts         # Event subscription hooks
│   ├── useAgents.ts           # Agent monitoring hooks
│   ├── useGates.ts            # Quality gate hooks
│   └── useKeyboard.ts         # Keyboard navigation
│
├── store/
│   ├── store.tsx              # Global state management
│   ├── chatSlice.ts           # Chat state reducer
│   ├── projectSlice.ts        # Project state reducer
│   ├── runtimeSlice.ts        # Runtime state reducer
│   └── selectors.ts           # Memoized selectors
│
├── services/
│   ├── ChatService.ts         # Chat message handling
│   ├── CTOService.ts          # CTO agent communication
│   ├── ProjectService.ts      # Project CRUD operations
│   ├── EventBusService.ts     # Event bus integration
│   └── AIService.ts           # LLM integration for CTO
│
├── agents/
│   └── CTOAgent.ts            # CTO Agent implementation
│
├── types/
│   ├── index.ts               # Main type exports
│   ├── chat.ts                # Chat-specific types
│   ├── project.ts             # Project types
│   └── runtime.ts             # Runtime types
│
├── utils/
│   ├── formatters.ts          # Text/formatting utilities
│   ├── validators.ts          # Input validation
│   ├── keyboard.ts            # Key binding definitions
│   └── constants.ts           # App constants
│
└── theme/
    ├── theme.ts               # Theme configuration
    ├── colors.ts              # Color palette
    └── components.ts          # Styled components
```

---

## 4. CTO Agent Implementation

### 4.1 CTO Agent Architecture

```typescript
// src/foundry-tui-v2/agents/CTOAgent.ts

export class CTOAgent {
  private projectId: string;
  private context: ProjectContext;
  private llmClient: LLMClient;
  private eventBus: EventBus;
  private personality: CTOPersonality;
  
  // Memory & Context
  private conversationHistory: ChatMessage[] = [];
  private projectUnderstanding: ProjectUnderstanding;
  private decisionLog: Decision[] = [];
  
  constructor(config: CTOAgentConfig) {
    this.projectId = config.projectId;
    this.llmClient = config.llmClient;
    this.eventBus = EventBus.getInstance();
    this.personality = config.personality || DEFAULT_CTO_PERSONALITY;
    
    this.setupEventHandlers();
  }
  
  /**
   * Main entry point for user messages
   */
  async handleMessage(userMessage: string): Promise<CTOResponse> {
    // 1. Analyze intent
    const intent = await this.analyzeIntent(userMessage);
    
    // 2. Gather relevant context
    const context = await this.gatherContext(intent);
    
    // 3. Generate response based on intent type
    switch (intent.type) {
      case 'question':
        return this.answerQuestion(intent, context);
      
      case 'command':
        return this.executeCommand(intent, context);
      
      case 'delegation':
        return this.delegateTask(intent, context);
      
      case 'review':
        return this.provideReview(intent, context);
      
      case 'status':
        return this.provideStatus(context);
      
      case 'escalation':
        return this.handleEscalation(intent, context);
      
      default:
        return this.engageConversation(userMessage, context);
    }
  }
  
  /**
   * Intent analysis using LLM
   */
  private async analyzeIntent(message: string): Promise<Intent> {
    const systemPrompt = `You are analyzing user intent for a CTO Orchestrator Agent.
    Categorize the user's message into one of:
    - question: asking about project, code, architecture, etc.
    - command: direct instruction (e.g., "run tests", "deploy to staging")
    - delegation: asking to assign work (e.g., "have someone refactor this")
    - review: requesting code/artifact review
    - status: asking about current state/progress
    - escalation: reporting issue or requesting human help
    - conversation: general chat
    
    Also extract:
    - entities: projects, files, agents, phases mentioned
    - urgency: low, normal, high, critical
    - expected_response: what the user wants back`;
    
    const response = await this.llmClient.complete({
      system: systemPrompt,
      user: message,
      response_format: { type: 'json_object' }
    });
    
    return JSON.parse(response.content);
  }
  
  /**
   * Gather relevant project context
   */
  private async gatherContext(intent: Intent): Promise<Context> {
    const context: Context = {
      project: await this.getProjectState(),
      phase: await this.getCurrentPhase(),
      recentEvents: await this.getRecentEvents(10),
      activeAgents: await this.getActiveAgents(),
      pendingTasks: await this.getPendingTasks(),
      recentArtifacts: await this.getRecentArtifacts(5),
      gateStatus: await this.getGateStatus(),
    };
    
    // Add intent-specific context
    if (intent.entities?.files) {
      context.referencedFiles = await this.getFileContext(intent.entities.files);
    }
    
    if (intent.entities?.agents) {
      context.referencedAgents = await this.getAgentContext(intent.entities.agents);
    }
    
    return context;
  }
  
  /**
   * Execute a command intent
   */
  private async executeCommand(intent: Intent, context: Context): Promise<CTOResponse> {
    // Map command to action
    const action = this.mapIntentToAction(intent);
    
    // Validate action is appropriate
    if (!this.validateAction(action, context)) {
      return {
        type: 'response',
        content: `I'm not able to ${intent.action} at this time. ${this.explainWhyNot(action, context)}`,
        suggestions: this.suggestAlternatives(intent, context)
      };
    }
    
    // Execute through FoundryOrchestrator
    const result = await this.executeThroughFoundry(action);
    
    // Format response based on personality
    return this.formatCommandResponse(action, result, context);
  }
  
  /**
   * Delegate task to appropriate agent
   */
  private async delegateTask(intent: Intent, context: Context): Promise<CTOResponse> {
    // Determine best agent for task
    const agentSelection = await this.selectBestAgent(intent, context);
    
    // Create task specification
    const task = await this.createTaskSpec(intent, agentSelection);
    
    // Spawn agent through CoworkRuntime
    const spawned = await this.spawnAgent(agentSelection.agentId, task);
    
    // Return delegation confirmation
    return {
      type: 'delegation',
      content: this.formatDelegationMessage(agentSelection, task, context),
      action: {
        type: 'spawn_agent',
        agentId: agentSelection.agentId,
        taskId: spawned.taskId
      },
      tracking: {
        taskId: spawned.taskId,
        agentId: spawned.agentId,
        estimatedDuration: agentSelection.estimatedDuration
      }
    };
  }
  
  /**
   * Select best agent for a task
   */
  private async selectBestAgent(intent: Intent, context: Context): Promise<AgentSelection> {
    const agents = await this.getAvailableAgents();
    
    const systemPrompt = `Given the task "${intent.description}" and available agents:
    ${agents.map(a => `- ${a.id}: ${a.role} - skills: ${a.skills.join(', ')}`).join('\n')}
    
    Select the best agent and explain why.
    Consider: skills match, current workload, past performance on similar tasks.`;
    
    const response = await this.llmClient.complete({
      system: systemPrompt,
      user: 'Select the best agent for this task',
      response_format: { type: 'json_object' }
    });
    
    return JSON.parse(response.content);
  }
  
  /**
   * Set up event handlers for real-time updates
   */
  private setupEventHandlers(): void {
    // Subscribe to agent events
    this.eventBus.subscribe('agent:*', (payload, envelope) => {
      this.handleAgentEvent(envelope.event, payload);
    });
    
    // Subscribe to phase changes
    this.eventBus.subscribe('foundry:phase:complete', (payload) => {
      this.handlePhaseComplete(payload);
    });
    
    // Subscribe to gate results
    this.eventBus.subscribe('security:gate:evaluated', (payload) => {
      this.handleGateResult('security', payload);
    });
    
    // Subscribe to artifact updates
    this.eventBus.subscribe('artifact:version:created', (payload) => {
      this.handleNewArtifact(payload);
    });
  }
  
  /**
   * Handle agent progress events - proactively inform user
   */
  private handleAgentEvent(event: string, payload: unknown): void {
    // Proactively notify user of significant events
    if (event === 'agent:complete' || event === 'agent:error' || event === 'agent:blocked') {
      const typedPayload = payload as AgentEventPayload;
      
      this.eventBus.publish('chat:message:system', {
        projectId: this.projectId,
        message: {
          id: generateId(),
          role: 'agent',
          agentId: typedPayload.agentId,
          agentName: typedPayload.agentName,
          content: this.formatAgentStatusUpdate(event, typedPayload),
          timestamp: Date.now(),
          messageType: 'status'
        }
      });
    }
  }
}
```

### 4.2 CTO System Prompt Template

```typescript
const CTO_SYSTEM_PROMPT = `You are the CTO Orchestrator for an enterprise software development project.

## Your Role
You act as a real-world CTO - providing technical leadership, making architectural decisions, coordinating the development team, and ensuring quality deliverables.

## Project Context
Project: {{projectName}}
Industry: {{industry}}
Current Phase: {{currentPhase}}
Team Size: {{teamSize}} agents
Active Tasks: {{activeTasks}}

## Your Personality
Style: {{personality.style}}
Tone: {{personality.communicationTone}}
Verbosity: {{personality.verbosity}}

## Available Actions
You can:
1. Answer questions about the project, architecture, code, or process
2. Delegate tasks to specialized agents (Security Lead, Backend Engineer, etc.)
3. Request code/artifact reviews
4. Approve or reject quality gates
5. Escalate to human when needed
6. Provide strategic guidance

## Response Guidelines
- Be helpful but maintain CTO authority
- When delegating, explain WHY you chose that agent
- When asking for clarification, be specific about what you need
- For technical questions, provide depth appropriate to the query
- Always consider security, scalability, and maintainability
- If you don't know something, say so and offer to find out

## Current Team Roster
{{teamRoster}}

## Recent Activity
{{recentActivity}}

## Active Quality Gates
{{gateStatus}}`;
```

---

## 5. Chat Interface Implementation

### 5.1 Chat Panel Component

```typescript
// src/foundry-tui-v2/components/chat/ChatPanel.tsx

import React, { useRef, useEffect } from 'react';
import { Box, useInput } from 'ink';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { SuggestionBar } from './SuggestionBar';
import { TypingIndicator } from './TypingIndicator';
import { useChat } from '../../hooks/useChat';
import { useCTO } from '../../hooks/useCTO';

interface Props {
  projectId: string;
  width: number;
  height: number;
}

export const ChatPanel: React.FC<Props> = ({ projectId, width, height }) => {
  const { 
    messages, 
    isTyping, 
    suggestions, 
    sendMessage, 
    inputValue, 
    setInputValue 
  } = useChat(projectId);
  
  const { cto, isCTOAvailable } = useCTO(projectId);
  
  const messagesEndRef = useRef<null>(null);
  
  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView();
  }, [messages]);
  
  // Keyboard shortcuts
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      // Copy last message
      return;
    }
    
    if (key.tab && suggestions.length > 0) {
      // Accept first suggestion
      setInputValue(suggestions[0].command);
      return;
    }
  });
  
  const handleSend = async () => {
    if (!inputValue.trim() || !isCTOAvailable) return;
    
    const message = inputValue.trim();
    setInputValue('');
    
    await sendMessage(message);
  };
  
  return (
    <Box 
      flexDirection="column" 
      width={width} 
      height={height}
      borderStyle="round"
      borderColor="cyan"
    >
      {/* Header */}
      <Box paddingX={1} borderBottom>
        <Text color="cyan" bold>
          💬 Chat with {cto?.name || 'CTO'}
        </Text>
        <Text color="gray"> | </Text>
        <Text color={isCTOAvailable ? 'green' : 'yellow'}>
          {isCTOAvailable ? '● Available' : '○ Busy'}
        </Text>
      </Box>
      
      {/* Message List */}
      <Box flexGrow={1} flexDirection="column" overflow="hidden">
        <MessageList 
          messages={messages} 
          maxHeight={height - 6}
        />
        <div ref={messagesEndRef} />
      </Box>
      
      {/* Typing Indicator */}
      {isTyping && (
        <Box paddingX={1}>
          <TypingIndicator agentName={cto?.name} />
        </Box>
      )}
      
      {/* Suggestions */}
      {suggestions.length > 0 && (
        <SuggestionBar 
          suggestions={suggestions}
          onSelect={(s) => setInputValue(s.command)}
        />
      )}
      
      {/* Input Area */}
      <Box paddingX={1} borderTop>
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSend}
          placeholder={isCTOAvailable 
            ? "Message your CTO... (Tab for suggestions)" 
            : "CTO is busy, please wait..."
          }
          disabled={!isCTOAvailable}
        />
      </Box>
    </Box>
  );
};
```

### 5.2 Smart Input with Autocomplete

```typescript
// src/foundry-tui-v2/components/chat/ChatInput.tsx

import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export const ChatInput: React.FC<Props> = ({
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled
}) => {
  const [cursorPosition, setCursorPosition] = useState(value.length);
  
  useInput((input, key) => {
    if (disabled) return;
    
    if (key.return) {
      onSubmit();
      onChange('');
      setCursorPosition(0);
      return;
    }
    
    if (key.backspace || key.delete) {
      if (cursorPosition > 0) {
        const newValue = value.slice(0, cursorPosition - 1) + value.slice(cursorPosition);
        onChange(newValue);
        setCursorPosition(cursorPosition - 1);
      }
      return;
    }
    
    if (key.leftArrow) {
      setCursorPosition(Math.max(0, cursorPosition - 1));
      return;
    }
    
    if (key.rightArrow) {
      setCursorPosition(Math.min(value.length, cursorPosition + 1));
      return;
    }
    
    if (key.home) {
      setCursorPosition(0);
      return;
    }
    
    if (key.end) {
      setCursorPosition(value.length);
      return;
    }
    
    if (input && !key.ctrl && !key.meta) {
      const newValue = value.slice(0, cursorPosition) + input + value.slice(cursorPosition);
      onChange(newValue);
      setCursorPosition(cursorPosition + input.length);
    }
  });
  
  return (
    <Box>
      <Text color="cyan">{`CTO> `}</Text>
      <Box>
        {value.length === 0 ? (
          <Text color="gray">{placeholder}</Text>
        ) : (
          <>
            <Text>{value.slice(0, cursorPosition)}</Text>
            <Text color="cyan" backgroundColor="cyan">
              {value[cursorPosition] || ' '}
            </Text>
            <Text>{value.slice(cursorPosition + 1)}</Text>
          </>
        )}
      </Box>
    </Box>
  );
};
```

---

## 6. Project Overview Panel

### 6.1 Dynamic Sub-Panel System

```typescript
// src/foundry-tui-v2/components/overview/ProjectOverview.tsx

import React from 'react';
import { Box } from 'ink';
import { TabBar } from '../layout/TabBar';
import { ProjectDashboard } from './ProjectDashboard';
import { AgentOverview } from '../agents/AgentOverview';
import { GateOverview } from '../gates/GateOverview';
import { ArtifactOverview } from '../artifacts/ArtifactOverview';
import { TeamOverview } from '../team/TeamOverview';

const TABS = [
  { id: 'dashboard', label: '📊 Dashboard', shortcut: '1' },
  { id: 'agents', label: '🤖 Agents', shortcut: '2' },
  { id: 'gates', label: '🔒 Gates', shortcut: '3' },
  { id: 'artifacts', label: '📦 Artifacts', shortcut: '4' },
  { id: 'team', label: '👥 Team', shortcut: '5' },
] as const;

type TabId = typeof TABS[number]['id'];

interface Props {
  projectId: string;
  width: number;
  height: number;
}

export const ProjectOverview: React.FC<Props> = ({ projectId, width, height }) => {
  const [activeTab, setActiveTab] = React.useState<TabId>('dashboard');
  
  const renderContent = () => {
    const contentHeight = height - 3; // Account for tab bar
    
    switch (activeTab) {
      case 'dashboard':
        return <ProjectDashboard projectId={projectId} width={width} height={contentHeight} />;
      case 'agents':
        return <AgentOverview projectId={projectId} width={width} height={contentHeight} />;
      case 'gates':
        return <GateOverview projectId={projectId} width={width} height={contentHeight} />;
      case 'artifacts':
        return <ArtifactOverview projectId={projectId} width={width} height={contentHeight} />;
      case 'team':
        return <TeamOverview projectId={projectId} width={width} height={contentHeight} />;
      default:
        return null;
    }
  };
  
  return (
    <Box 
      flexDirection="column" 
      width={width} 
      height={height}
      borderStyle="round"
      borderColor="blue"
    >
      <TabBar
        tabs={TABS}
        activeTab={activeTab}
        onSelect={(tab) => setActiveTab(tab as TabId)}
      />
      <Box flexGrow={1}>
        {renderContent()}
      </Box>
    </Box>
  );
};
```

### 6.2 Agent Overview Panel

```typescript
// src/foundry-tui-v2/components/agents/AgentOverview.tsx

import React from 'react';
import { Box, Text } from 'ink';
import { useAgents } from '../../hooks/useAgents';
import { AgentCard } from './AgentCard';
import { TaskQueue } from './TaskQueue';
import { ActivityLog } from './ActivityLog';

interface Props {
  projectId: string;
  width: number;
  height: number;
}

export const AgentOverview: React.FC<Props> = ({ projectId, width, height }) => {
  const { agents, activeTasks, recentActivities, isLoading } = useAgents(projectId);
  
  if (isLoading) {
    return (
      <Box justifyContent="center" alignItems="center" height={height}>
        <Text color="yellow">Loading agents...</Text>
      </Box>
    );
  }
  
  const activeAgents = agents.filter(a => a.status === 'busy' || a.status === 'thinking');
  const idleAgents = agents.filter(a => a.status === 'idle');
  const blockedAgents = agents.filter(a => a.status === 'blocked');
  
  return (
    <Box flexDirection="column" padding={1}>
      {/* Stats Header */}
      <Box marginBottom={1}>
        <Text>
          <Text color="green" bold>{activeAgents.length}</Text> active |{' '}
          <Text color="gray">{idleAgents.length}</Text> idle |{' '}
          <Text color="red">{blockedAgents.length}</Text> blocked |{' '}
          <Text color="cyan">{activeTasks.length}</Text> tasks
        </Text>
      </Box>
      
      {/* Active Agents Grid */}
      <Box flexDirection="column" marginBottom={1}>
        <Text color="cyan" bold>Active Agents</Text>
        <Box flexWrap="wrap" gap={1}>
          {activeAgents.map(agent => (
            <AgentCard 
              key={agent.id} 
              agent={agent} 
              width={Math.floor(width / 2) - 2}
            />
          ))}
          {activeAgents.length === 0 && (
            <Text color="gray" italic>No active agents</Text>
          )}
        </Box>
      </Box>
      
      {/* Task Queue */}
      <Box marginBottom={1}>
        <TaskQueue 
          tasks={activeTasks} 
          maxHeight={Math.floor(height / 3)}
        />
      </Box>
      
      {/* Recent Activity */}
      <Box flexGrow={1}>
        <ActivityLog 
          activities={recentActivities}
          maxHeight={Math.floor(height / 3)}
        />
      </Box>
    </Box>
  );
};
```

---

## 7. Event Bus Integration

### 7.1 Real-time Event Flow

```typescript
// src/foundry-tui-v2/hooks/useEventBus.ts

import { useEffect, useCallback } from 'react';
import { EventBus } from '../../cowork/orchestrator/event-bus';
import type { EventCallback, EventEnvelope } from '../../cowork/orchestrator/event-bus';

export function useEventBus(projectId: string, handlers: EventHandlers) {
  const eventBus = EventBus.getInstance();
  
  useEffect(() => {
    const unsubscribers: Array<() => void> = [];
    
    // Subscribe to chat events
    if (handlers.onChatMessage) {
      const unsub = eventBus.subscribe('chat:message:*', (payload, envelope) => {
        if (isForProject(payload, projectId)) {
          handlers.onChatMessage!(payload, envelope);
        }
      });
      unsubscribers.push(unsub);
    }
    
    // Subscribe to agent events
    if (handlers.onAgentEvent) {
      const agentEvents = [
        'agent:start',
        'agent:progress', 
        'agent:complete',
        'agent:error',
        'agent:blocked'
      ];
      
      agentEvents.forEach(event => {
        const unsub = eventBus.subscribe(event, (payload, envelope) => {
          if (isForProject(payload, projectId)) {
            handlers.onAgentEvent!(event, payload, envelope);
          }
        });
        unsubscribers.push(unsub);
      });
    }
    
    // Subscribe to phase events
    if (handlers.onPhaseChange) {
      const unsub = eventBus.subscribe('foundry:phase:complete', (payload) => {
        if (isForProject(payload, projectId)) {
          handlers.onPhaseChange!(payload);
        }
      });
      unsubscribers.push(unsub);
    }
    
    // Subscribe to gate events
    if (handlers.onGateUpdate) {
      const unsub = eventBus.subscribe('*:gate:*', (payload, envelope) => {
        if (isForProject(payload, projectId)) {
          handlers.onGateUpdate!(envelope.event, payload);
        }
      });
      unsubscribers.push(unsub);
    }
    
    // Subscribe to artifact events
    if (handlers.onArtifactUpdate) {
      const unsub = eventBus.subscribe('artifact:*', (payload, envelope) => {
        if (isForProject(payload, projectId)) {
          handlers.onArtifactUpdate!(envelope.event, payload);
        }
      });
      unsubscribers.push(unsub);
    }
    
    // Subscribe to workspace events
    if (handlers.onWorkspaceUpdate) {
      const unsub = eventBus.subscribe('workspace:*', (payload, envelope) => {
        if (isForProject(payload, projectId)) {
          handlers.onWorkspaceUpdate!(envelope.event, payload);
        }
      });
      unsubscribers.push(unsub);
    }
    
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [projectId, handlers, eventBus]);
}

function isForProject(payload: unknown, projectId: string): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Record<string, unknown>;
  return p.projectId === projectId || p.sessionId === projectId;
}
```

---

## 8. State Management Architecture

### 8.1 Combined Store with Slices

```typescript
// src/foundry-tui-v2/store/store.tsx

import React, { createContext, useContext, useReducer, useMemo } from 'react';
import { chatReducer, initialChatState } from './chatSlice';
import { projectReducer, initialProjectState } from './projectSlice';
import { runtimeReducer, initialRuntimeState } from './runtimeSlice';
import type { FoundryTUIState, Action } from '../types';

const initialState: FoundryTUIState = {
  activeView: 'chat',
  sidebarExpanded: true,
  currentProject: null,
  projects: [],
  chat: initialChatState,
  runtime: initialRuntimeState,
  connection: 'disconnected',
};

function rootReducer(state: FoundryTUIState, action: Action): FoundryTUIState {
  // Route to appropriate slice reducer
  switch (action.type) {
    // UI Actions
    case 'UI_SET_VIEW':
      return { ...state, activeView: action.view };
    case 'UI_TOGGLE_SIDEBAR':
      return { ...state, sidebarExpanded: !state.sidebarExpanded };
    
    // Project Actions
    case 'PROJECT_SET_CURRENT':
    case 'PROJECT_UPDATE':
    case 'PROJECT_CREATE':
    case 'PROJECT_DELETE':
      return {
        ...state,
        ...projectReducer(state, action)
      };
    
    // Chat Actions
    case 'CHAT_MESSAGE_ADD':
    case 'CHAT_MESSAGE_UPDATE':
    case 'CHAT_SET_TYPING':
    case 'CHAT_SET_INPUT':
    case 'CHAT_SUGGESTIONS_SET':
      return {
        ...state,
        chat: chatReducer(state.chat, action)
      };
    
    // Runtime Actions
    case 'RUNTIME_AGENT_UPDATE':
    case 'RUNTIME_GATE_UPDATE':
    case 'RUNTIME_ARTIFACT_UPDATE':
    case 'RUNTIME_ACTIVITY_ADD':
    case 'RUNTIME_TASK_UPDATE':
      return {
        ...state,
        runtime: runtimeReducer(state.runtime, action)
      };
    
    // Connection Actions
    case 'CONNECTION_SET':
      return { ...state, connection: action.status };
    
    default:
      return state;
  }
}

const StoreContext = createContext<{
  state: FoundryTUIState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export const StoreProvider: React.FC = ({ children }) => {
  const [state, dispatch] = useReducer(rootReducer, initialState);
  
  const value = useMemo(() => ({ state, dispatch }), [state]);
  
  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within StoreProvider');
  }
  return context;
};
```

---

## 9. Integration Points

### 9.1 FoundryOrchestrator Integration

```typescript
// src/foundry-tui-v2/services/FoundryService.ts

import { FoundryOrchestrator } from '../../foundry/orchestrator';
import { FoundryCollaborationBridge } from '../../foundry/integration/collaboration-bridge';
import { EventBus } from '../../cowork/orchestrator/event-bus';

export class FoundryService {
  private orchestrator: FoundryOrchestrator;
  private collaborationBridge: FoundryCollaborationBridge;
  private eventBus: EventBus;
  
  constructor() {
    this.orchestrator = new FoundryOrchestrator();
    this.collaborationBridge = new FoundryCollaborationBridge(this.orchestrator);
    this.eventBus = EventBus.getInstance();
  }
  
  async initializeProject(request: ProjectInitRequest): Promise<ProjectContext> {
    // Start project through collaboration bridge
    const context = await this.collaborationBridge.startProject({
      projectId: request.id,
      projectName: request.name,
      description: request.description,
      industry: request.industry,
      completionCriteria: request.completionCriteria,
    });
    
    // Initialize CTO agent
    await this.initializeCTOAgent(context.projectId);
    
    return {
      id: context.projectId,
      name: request.name,
      industry: request.industry,
      description: request.description,
      status: 'active',
      phase: 'intake',
      ctoAgent: await this.getCTOAgent(context.projectId),
      team: [],
      workspaceId: context.workspaceId,
      coworkSpaceId: context.team.id,
      progress: { overall: 0, phases: {} },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }
  
  async executePhase(projectId: string, phase: string): Promise<PhaseResult> {
    const team = await this.collaborationBridge.getTeamForProject(projectId);
    
    return this.collaborationBridge.runPhaseWithCollaboration(phase, team);
  }
  
  async spawnAgent(
    projectId: string, 
    roleId: string, 
    task: TaskDefinition
  ): Promise<SpawnedAgent> {
    // Use CoworkRuntime through the bridge
    const result = await this.collaborationBridge.spawnAgentForTask(
      projectId,
      roleId,
      task
    );
    
    return {
      agentId: result.agentId,
      taskId: result.taskId,
      status: 'spawned',
    };
  }
  
  async getProjectStatus(projectId: string): Promise<ProjectStatus> {
    // Gather status from all subsystems
    const [
      phase,
      gateStatus,
      activeAgents,
      artifacts,
    ] = await Promise.all([
      this.orchestrator.getCurrentPhase(projectId),
      this.orchestrator.getGateStatus(projectId),
      this.collaborationBridge.getActiveAgents(projectId),
      this.collaborationBridge.getArtifacts(projectId),
    ]);
    
    return {
      phase,
      gateStatus,
      activeAgents: activeAgents.length,
      artifactCount: artifacts.length,
      health: this.calculateHealth(gateStatus, activeAgents),
    };
  }
  
  private async initializeCTOAgent(projectId: string): Promise<void> {
    // Publish event to trigger CTO agent initialization
    this.eventBus.publish('foundry:cto:initialize', {
      projectId,
      roleId: 'CTO_ORCHESTRATOR',
      timestamp: Date.now(),
    });
  }
  
  private calculateHealth(
    gateStatus: GateStatus[], 
    agents: AgentRuntime[]
  ): ProjectHealth {
    const failedGates = gateStatus.filter(g => g.status === 'failed').length;
    const blockedAgents = agents.filter(a => a.status === 'blocked').length;
    
    if (failedGates > 0 || blockedAgents > 0) {
      return 'degraded';
    }
    if (gateStatus.every(g => g.status === 'passed')) {
      return 'excellent';
    }
    return 'healthy';
  }
}
```

### 9.2 CoworkRuntime Integration

```typescript
// src/foundry-tui-v2/services/CoworkService.ts

import { CoworkOrchestrator } from '../../cowork/orchestrator/cowork-orchestrator';
import { CollaborativeWorkspace } from '../../cowork/collaboration/collaborative-workspace';

export class CoworkService {
  private coworkOrchestrator: CoworkOrchestrator;
  private workspace: CollaborativeWorkspace;
  
  constructor() {
    this.coworkOrchestrator = new CoworkOrchestrator();
    this.workspace = CollaborativeWorkspace.getInstance();
  }
  
  async createWorkspace(
    projectId: string, 
    projectName: string,
    leadRoleId: string
  ): Promise<Workspace> {
    // Create workspace for the project
    const workspace = this.workspace.createWorkspace(
      projectId,
      projectName,
      leadRoleId
    );
    
    return {
      id: workspace.id,
      projectId,
      name: projectName,
      members: [],
      artifacts: [],
      createdAt: Date.now(),
    };
  }
  
  async executeCommand(
    projectId: string,
    command: string,
    args: string[]
  ): Promise<CommandResult> {
    // Execute through CoworkOrchestrator
    return this.coworkOrchestrator.execute(command, args, {
      projectId,
      timeout: 300000, // 5 minutes
    });
  }
  
  async getTeamMembers(projectId: string): Promise<TeamMember[]> {
    const workspaces = this.workspace.getWorkspacesForProject(projectId);
    if (workspaces.length === 0) return [];
    
    const members: TeamMember[] = [];
    for (const ws of workspaces) {
      const workspaceMembers = this.workspace.getWorkspaceMembers(ws.id);
      members.push(...workspaceMembers);
    }
    
    return members;
  }
  
  async getArtifacts(projectId: string): Promise<Artifact[]> {
    const workspaces = this.workspace.getWorkspacesForProject(projectId);
    const artifacts: Artifact[] = [];
    
    for (const ws of workspaces) {
      const workspaceArtifacts = this.workspace.getArtifacts(ws.id);
      artifacts.push(...workspaceArtifacts);
    }
    
    return artifacts;
  }
  
  async addFeedback(
    projectId: string,
    artifactId: string,
    feedback: FeedbackInput
  ): Promise<Feedback> {
    const workspaces = this.workspace.getWorkspacesForProject(projectId);
    if (workspaces.length === 0) {
      throw new Error(`No workspace found for project ${projectId}`);
    }
    
    return this.workspace.addFeedback(
      workspaces[0].id,
      artifactId,
      feedback.authorId,
      feedback.title,
      feedback.description,
      feedback.severity
    );
  }
}
```

---

## 10. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Create `foundry-tui-v2` directory structure
- [ ] Implement core type definitions
- [ ] Set up state management with slices
- [ ] Create basic layout components (Header, Sidebar, Footer)
- [ ] Implement keyboard navigation
- [ ] Set up EventBus integration

### Phase 2: Chat Interface (Week 2-3)
- [ ] Implement ChatPanel component
- [ ] Create MessageList and MessageItem components
- [ ] Build ChatInput with autocomplete
- [ ] Add typing indicator animation
- [ ] Implement suggestion bar
- [ ] Create CTOAgent stub
- [ ] Connect chat to EventBus

### Phase 3: Project Overview (Week 3-4)
- [ ] Build ProjectDashboard component
- [ ] Implement AgentOverview with AgentCards
- [ ] Create GateOverview panel
- [ ] Build ArtifactOverview
- [ ] Implement TeamOverview
- [ ] Add tab navigation system
- [ ] Connect all panels to runtime state

### Phase 4: CTO Agent Intelligence (Week 4-5)
- [ ] Implement CTOAgent class
- [ ] Create intent analysis system
- [ ] Build context gathering functions
- [ ] Implement delegation logic
- [ ] Add response formatting based on personality
- [ ] Create system prompt templates
- [ ] Integrate with LLM client

### Phase 5: Integration & Polish (Week 5-6)
- [ ] Integrate with FoundryOrchestrator
- [ ] Connect to CoworkRuntime
- [ ] Add project initialization flow
- [ ] Implement real-time event streaming
- [ ] Add error handling and recovery
- [ ] Create loading states and animations
- [ ] Add keyboard shortcuts help

### Phase 6: Testing & Documentation (Week 6-7)
- [ ] Write unit tests for components
- [ ] Add integration tests for services
- [ ] Create E2E tests for workflows
- [ ] Document keyboard shortcuts
- [ ] Write user guide
- [ ] Create architecture documentation

---

## 11. Key Design Decisions

### 11.1 Why Split-Pane Layout?
- **Chat always visible**: Users can monitor conversation while viewing project details
- **Context switching eliminated**: No need to navigate away from chat to check status
- **Efficient screen real estate**: 60/40 split optimized for both reading chat and scanning data

### 11.2 Why Natural Language CTO Interface?
- **Familiar mental model**: Users already interact with ChatGPT, Claude, etc.
- **Low learning curve**: No need to memorize commands
- **Flexible interaction**: Same interface works for questions, commands, and delegations
- **Future-proof**: Easy to add new capabilities without UI changes

### 11.3 Why EventBus for Real-time Updates?
- **Decoupled architecture**: Components don't need to know about each other
- **Scalable**: Easy to add new event types without modifying existing code
- **Testable**: Events can be mocked and replayed
- **Observable**: Easy to add logging, analytics, debugging

### 11.4 Why One CTO Per Project?
- **Clear ownership**: Single point of accountability for project decisions
- **Consistent context**: CTO maintains full project understanding
- **Natural workflow**: Mirrors real-world CTO role
- **Simplified coordination**: No need to resolve conflicts between multiple CTOs

---

## 12. Example User Interactions

### Example 1: Starting a New Project
```
User: "Create a new e-commerce project called 'ShopMaster'"

CTO: "I'll help you set up the ShopMaster project. Let me initialize the workspace and gather the team.

📋 Project Initialization
• Creating project context for ShopMaster
• Setting up collaborative workspace
• Assigning team roles

What industry is this for? (e.g., retail, B2B, marketplace)"

User: "It's a B2B wholesale platform"

CTO: "Perfect. I'm initializing ShopMaster as a B2B wholesale platform.

✅ Project Initialized
• Project ID: shopmaster-2024
• Workspace: Created and configured
• CTO (me): Assigned and ready

The team is assembling:
• Security Lead: Initializing security baseline
• Product Manager: Preparing requirements framework
• Backend Engineer: Standing by for architecture

Next, I recommend we move to the Discovery phase to define your requirements. 
Would you like to:
1. Describe your key features
2. Upload existing documentation
3. Start with a template"
```

### Example 2: Delegating Tasks
```
User: "I need authentication implemented"

CTO: "I'll delegate the authentication implementation to our Security Lead and Backend Engineer.

🔍 Analyzing requirements...
Based on your B2B wholesale context, I'm assuming:
• Multi-tenant authentication (organizations)
• Role-based access control
• API key management for integrations
• SSO support (SAML/OAuth2)

👥 Task Delegation
• Security Lead: Threat modeling and auth architecture
• Backend Engineer: JWT implementation and middleware

The Security Lead will start with a threat model. You can monitor progress in the Agents panel.

Estimated completion: 2-3 hours
Shall I proceed with this approach?"

User: "Yes, but also add social login"

CTO: "Noted! I'll add social login to the requirements.

Updated delegation:
• Security Lead: Threat model + OAuth2 flow design
• Backend Engineer: JWT + OAuth2 providers (Google, Microsoft)

Spawning agents now..."
```

### Example 3: Checking Status
```
User: "What's the status?"

CTO: "Here's the current status of ShopMaster:

📊 Project Health: Healthy

🔄 Current Phase: Feature Development
• Active tasks: 3
• Pending review: 1
• Recently completed: 2

🤖 Active Agents
• Security Lead (busy): Reviewing authentication implementation
• Backend Engineer (busy): Writing API tests
• Frontend Engineer (idle): Awaiting API documentation

🔒 Quality Gates
• Security: ✅ Passed (no critical vulnerabilities)
• Tests: ⚠️ Running (85% coverage, targeting 90%)
• Lint: ✅ Passed

📦 Recent Artifacts
• auth-middleware.ts (v3) - Security Lead
• user-model.ts (v2) - Backend Engineer
• api-contracts.md (v1) - Product Manager

The authentication feature is 80% complete. We're waiting on API documentation 
before the Frontend Engineer can integrate. Would you like me to prioritize that?"
```

---

## 13. Technical Stack

### Core Technologies
- **React + Ink**: Terminal UI framework
- **TypeScript**: Type safety
- **EventBus**: Real-time event streaming
- **Zod**: Runtime validation

### Integration Points
- **FoundryOrchestrator**: Project lifecycle management
- **FoundryCollaborationBridge**: Team coordination
- **CoworkOrchestrator**: Agent spawning and task execution
- **CollaborativeWorkspace**: Artifact and feedback management
- **LLM Client**: GPT-4/Claude for CTO intelligence

### Development Tools
- **Vitest**: Unit testing
- **ESLint + Prettier**: Code quality
- **Husky**: Git hooks
- **GitHub Actions**: CI/CD

---

## 14. Success Metrics

### User Experience
- Time to first successful project: < 2 minutes
- Average chat response time: < 3 seconds
- Task delegation accuracy: > 90%
- User satisfaction (qualitative): "Natural", "Intuitive", "Powerful"

### System Performance
- Event latency: < 100ms
- UI render time: < 16ms
- Memory usage: < 200MB
- Startup time: < 2 seconds

### Integration Quality
- Event coverage: 100% of Foundry events visible
- State synchronization: Real-time (< 1s delay)
- Error recovery: Automatic retry with exponential backoff
- Uptime: > 99.9%

---

## Conclusion

This architecture provides a comprehensive, production-ready foundation for an interactive Foundry TUI that combines the best aspects of modern CLI chat interfaces (OpenCode, Codex, Claude, Gemini) with complete project management capabilities.

The key innovations are:
1. **Natural language CTO interface** - Users interact naturally, not through commands
2. **Split-pane design** - Chat and project data always visible
3. **One CTO per project** - Clear ownership and consistent context
4. **Real-time event streaming** - Always up-to-date state
5. **Intelligent delegation** - CTO understands context and delegates appropriately

This system will enable users to manage complex software development projects through natural conversation while maintaining complete visibility into the autonomous development process.

---

*Document Version: 1.0*
*Created: 2024*
*Status: Architecture Plan - Ready for Implementation*
