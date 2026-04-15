import { z } from 'zod';

// Message Types
export const MessageRoles = ['user', 'cto', 'agent', 'system'] as const;
export type MessageRole = (typeof MessageRoles)[number];
export const MessageRoleSchema = z.enum(MessageRoles);

export const MessageSchema = z.object({
  id: z.string(),
  role: MessageRoleSchema,
  content: z.string(),
  timestamp: z.date(),
  agentId: z.string().optional(),
  agentName: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type Message = z.infer<typeof MessageSchema>;

// Chat State
export const ChatStateSchema = z.object({
  messages: z.array(MessageSchema),
  inputValue: z.string(),
  isTyping: z.boolean(),
  typingAgentId: z.string().optional(),
  suggestions: z.array(z.string()),
  commandHistory: z.array(z.string()),
  historyIndex: z.number(),
});
export type ChatState = z.infer<typeof ChatStateSchema>;

// Agent Types
export const AgentStatuses = ['idle', 'running', 'completed', 'failed', 'blocked'] as const;
export type AgentStatus = (typeof AgentStatuses)[number];
export const AgentStatusSchema = z.enum(AgentStatuses);

export const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  status: AgentStatusSchema,
  task: z.string().optional(),
  progress: z.number().min(0).max(100).default(0),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  parentId: z.string().optional(),
  dependencies: z.array(z.string()).default([]).optional(),
});
export type Agent = z.infer<typeof AgentSchema>;

// Gate Types
export const GateStatuses = ['pending', 'in_progress', 'passed', 'failed'] as const;
export type GateStatus = (typeof GateStatuses)[number];
export const GateStatusSchema = z.enum(GateStatuses);

export const GateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  status: GateStatusSchema,
  order: z.number(),
  checks: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      passed: z.boolean().optional(),
      message: z.string().optional(),
    })
  ),
});
export type Gate = z.infer<typeof GateSchema>;

// Artifact Types
export const ArtifactTypes = ['document', 'code', 'config', 'diagram', 'report'] as const;
export type ArtifactType = (typeof ArtifactTypes)[number];
export const ArtifactTypeSchema = z.enum(ArtifactTypes);

export const ArtifactSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: ArtifactTypeSchema,
  path: z.string(),
  content: z.string().optional(),
  version: z.number().default(1),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string(),
  tags: z.array(z.string()).default([]),
});
export type Artifact = z.infer<typeof ArtifactSchema>;

// Team Member Types
export const TeamRoles = ['cto', 'architect', 'developer', 'reviewer', 'qa', 'security', 'devops'] as const;
export type TeamRole = (typeof TeamRoles)[number];
export const TeamRoleSchema = z.enum(TeamRoles);

export const TeamMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: TeamRoleSchema,
  isActive: z.boolean(),
  currentTask: z.string().optional(),
  availability: z.number().min(0).max(100).default(100),
});
export type TeamMember = z.infer<typeof TeamMemberSchema>;

// Project Context
export const ProjectPhases = [
  'discovery',
  'planning',
  'design',
  'implementation',
  'review',
  'deployment',
  'maintenance',
] as const;
export type ProjectPhase = (typeof ProjectPhases)[number];
export const ProjectPhaseSchema = z.enum(ProjectPhases);

export const ProjectContextSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  phase: ProjectPhaseSchema,
  status: z.enum(['active', 'paused', 'completed', 'failed']),
  startDate: z.date(),
  targetDate: z.date().optional(),
  goals: z.array(z.string()),
  constraints: z.array(z.string()),
});
export type ProjectContext = z.infer<typeof ProjectContextSchema>;

// Runtime State
export const RuntimeStateSchema = z.object({
  isConnected: z.boolean(),
  lastSyncAt: z.date().optional(),
  activeAgents: z.number().default(0),
  pendingTasks: z.number().default(0),
  completedTasks: z.number().default(0),
  errors: z.array(z.string()).default([]),
});
export type RuntimeState = z.infer<typeof RuntimeStateSchema>;

// CTO Types
export const CTOIntents = [
  'command',
  'question',
  'delegate',
  'review',
  'status',
  'escalate',
  'greeting',
  'unknown',
] as const;
export type CTOIntent = (typeof CTOIntents)[number];
export const CTOIntentSchema = z.enum(CTOIntents);

export const CTOPersonalitySchema = z.object({
  name: z.string(),
  style: z.enum(['formal', 'casual', 'technical', 'strategic']),
  verbosity: z.enum(['concise', 'balanced', 'detailed']),
  proactivity: z.number().min(0).max(100).default(50),
});
export type CTOPersonality = z.infer<typeof CTOPersonalitySchema>;

// Focus Areas
export const FocusAreas = ['chat', 'agents', 'gates', 'artifacts', 'team'] as const;
export type FocusArea = (typeof FocusAreas)[number];
export const FocusAreaSchema = z.enum(FocusAreas);

// Application State
export const FoundryTUIStateSchema = z.object({
  chat: ChatStateSchema,
  project: ProjectContextSchema,
  runtime: RuntimeStateSchema,
  agents: z.array(AgentSchema),
  gates: z.array(GateSchema),
  artifacts: z.array(ArtifactSchema),
  team: z.array(TeamMemberSchema),
  focus: FocusAreaSchema,
  ctoPersonality: CTOPersonalitySchema,
  isHelpVisible: z.boolean(),
  isProjectSelectorVisible: z.boolean(),
  error: z.string().optional(),
});
export type FoundryTUIState = z.infer<typeof FoundryTUIStateSchema>;

// Event Types
export interface EventEnvelope {
  eventId: string;
  event: string;
  payload: unknown;
  metadata: Record<string, unknown>;
  occurredAt: string;
}

export type EventCallback = (payload: unknown, envelope?: EventEnvelope) => void | Promise<void>;

// LLM Types
export interface LLMResponse {
  content: string;
  intent?: CTOIntent;
  confidence?: number;
  suggestedCommands?: string[];
  contextNeeded?: string[];
}

export interface LLMClient {
  complete(prompt: string, context?: Record<string, unknown>): Promise<LLMResponse>;
}

// Command Types
export interface Command {
  name: string;
  description: string;
  args: string[];
  handler: (args: string[]) => void | Promise<void>;
}

// Action Types (for reducer)
export type Action =
  | { type: 'CHAT_SEND_MESSAGE'; payload: { content: string; role?: 'user' | 'system' } }
  | { type: 'CHAT_RECEIVE_MESSAGE'; payload: Message }
  | { type: 'CHAT_SET_INPUT'; payload: string }
  | { type: 'CHAT_SET_TYPING'; payload: { isTyping: boolean; agentId?: string } }
  | { type: 'CHAT_ADD_SUGGESTION'; payload: string }
  | { type: 'CHAT_CLEAR_SUGGESTIONS' }
  | { type: 'CHAT_ADD_COMMAND_HISTORY'; payload: string }
  | { type: 'PROJECT_SET_PHASE'; payload: ProjectPhase }
  | { type: 'PROJECT_UPDATE'; payload: Partial<ProjectContext> }
  | { type: 'RUNTIME_UPDATE'; payload: Partial<RuntimeState> }
  | { type: 'AGENT_ADD'; payload: Agent }
  | { type: 'AGENT_UPDATE'; payload: { id: string; updates: Partial<Agent> } }
  | { type: 'AGENT_REMOVE'; payload: string }
  | { type: 'AGENT_SET_STATUS'; payload: { id: string; status: AgentStatus } }
  | { type: 'AGENT_SET_PROGRESS'; payload: { id: string; progress: number } }
  | { type: 'GATE_ADD'; payload: Gate }
  | { type: 'GATE_UPDATE'; payload: { id: string; updates: Partial<Gate> } }
  | { type: 'GATE_SET_STATUS'; payload: { id: string; status: GateStatus } }
  | { type: 'ARTIFACT_ADD'; payload: Artifact }
  | { type: 'ARTIFACT_UPDATE'; payload: { id: string; updates: Partial<Artifact> } }
  | { type: 'TEAM_ADD'; payload: TeamMember }
  | { type: 'TEAM_UPDATE'; payload: { id: string; updates: Partial<TeamMember> } }
  | { type: 'SET_FOCUS'; payload: FocusArea }
  | { type: 'SET_CTO_PERSONALITY'; payload: CTOPersonality }
  | { type: 'TOGGLE_HELP' }
  | { type: 'TOGGLE_PROJECT_SELECTOR' }
  | { type: 'SET_ERROR'; payload: string | undefined }
  | { type: 'RESET_STATE' };
