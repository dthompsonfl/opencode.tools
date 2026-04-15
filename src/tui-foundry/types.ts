/**
 * Foundry TUI - Consolidated Type Definitions
 * Production-ready types for enterprise Foundry TUI
 */

import { z } from 'zod';

// =============================================================================
// Screen Navigation Types
// =============================================================================

export const FoundryScreenSchema = z.enum([
  'dashboard',
  'project',
  'agentHub',
  'execution',
  'chat',
  'settings',
  'workspaces',
  'workspace',
  'audit',
]);
export type FoundryScreen = z.infer<typeof FoundryScreenSchema>;

export const SCREEN_ORDER: readonly FoundryScreen[] = [
  'dashboard',
  'project',
  'agentHub',
  'execution',
  'chat',
  'settings',
  'workspaces',
  'workspace',
  'audit',
];

export const SCREEN_LABELS: Record<FoundryScreen, string> = {
  dashboard: 'Dashboard',
  project: 'Project Intake',
  agentHub: 'Agent Hub',
  execution: 'Execution',
  chat: 'Chat',
  settings: 'Settings',
  workspaces: 'Workspaces',
  workspace: 'Workspace Detail',
  audit: 'Audit & Evidence',
};

export const SCREEN_SHORTCUTS: Record<FoundryScreen, string> = {
  dashboard: '1',
  project: '2',
  agentHub: '3',
  execution: '4',
  chat: '5',
  settings: '6',
  workspaces: '7',
  workspace: '8',
  audit: '9',
};

// =============================================================================
// Phase Types
// =============================================================================

export const FoundryPhaseSchema = z.enum([
  'intake',
  'planning',
  'delegation',
  'execution',
  'quality',
  'release',
]);
export type FoundryPhase = z.infer<typeof FoundryPhaseSchema>;

export const PHASE_LABELS: Record<FoundryPhase, string> = {
  intake: 'Project Intake',
  planning: 'Planning',
  delegation: 'Delegation',
  execution: 'Execution',
  quality: 'Quality Gates',
  release: 'Release',
};

// =============================================================================
// Connection Status
// =============================================================================

export const ConnectionStatusSchema = z.enum(['connected', 'connecting', 'disconnected', 'error']);
export type ConnectionStatus = z.infer<typeof ConnectionStatusSchema>;

// =============================================================================
// Message Types (Chat)
// =============================================================================

export const MessageRoleSchema = z.enum(['user', 'agent', 'system', 'cto']);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

export const MessageSchema = z.object({
  id: z.string(),
  role: MessageRoleSchema,
  content: z.string(),
  timestamp: z.number(),
  agentId: z.string().optional(),
  agentName: z.string().optional(),
  threadId: z.string().optional(),
  replyTo: z.string().optional(),
  mentions: z.array(z.string()).optional(),
  attachments: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    size: z.number(),
  })).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type Message = z.infer<typeof MessageSchema>;

export const ChatThreadSchema = z.object({
  id: z.string(),
  title: z.string(),
  participants: z.array(z.string()),
  messageCount: z.number(),
  lastActivity: z.number(),
  isActive: z.boolean(),
});
export type ChatThread = z.infer<typeof ChatThreadSchema>;

// =============================================================================
// Agent Types
// =============================================================================

export const AgentStatusSchema = z.enum(['idle', 'busy', 'blocked', 'completed', 'failed', 'paused']);
export type AgentStatus = z.infer<typeof AgentStatusSchema>;

export const AgentRoleSchema = z.enum([
  'cto',
  'pm',
  'architect',
  'implementer',
  'qa',
  'security',
  'docs',
  'performance',
  'reviewer',
]);
export type AgentRole = z.infer<typeof AgentRoleSchema>;

export const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: AgentRoleSchema,
  roleLabel: z.string(),
  status: AgentStatusSchema,
  progress: z.number().min(0).max(100),
  task: z.string().optional(),
  description: z.string().optional(),
  capabilities: z.array(z.string()),
  startTime: z.number().optional(),
  endTime: z.number().optional(),
  parentId: z.string().optional(),
  dependencies: z.array(z.string()),
  outputs: z.array(z.string()),
  metrics: z.object({
    tasksCompleted: z.number(),
    tasksFailed: z.number(),
    avgDuration: z.number(),
  }).optional(),
  updatedAt: z.number(),
});
export type Agent = z.infer<typeof AgentSchema>;

export interface AgentRuntime extends Agent {
  logs: string[];
  errors: string[];
}

// =============================================================================
// Team Types
// =============================================================================

export const TeamStatusSchema = z.enum(['available', 'busy', 'blocked', 'offline']);
export type TeamStatus = z.infer<typeof TeamStatusSchema>;

export const TeamMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: AgentRoleSchema,
  roleLabel: z.string(),
  status: TeamStatusSchema,
  availability: z.number().min(0).max(100),
  currentTask: z.string().optional(),
  isActive: z.boolean(),
  joinedAt: z.number(),
  lastActivity: z.number(),
});
export type TeamMember = z.infer<typeof TeamMemberSchema>;

// =============================================================================
// Project Types
// =============================================================================

export const ProjectStatusSchema = z.enum(['draft', 'active', 'paused', 'complete', 'failed']);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

export const ProjectIntakeSchema = z.object({
  name: z.string(),
  industry: z.string(),
  description: z.string(),
  completionCriteria: z.string(),
  stakeholders: z.array(z.string()),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  targetDate: z.string().optional(),
});
export type ProjectIntake = z.infer<typeof ProjectIntakeSchema>;

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  industry: z.string(),
  description: z.string(),
  status: ProjectStatusSchema,
  phase: FoundryPhaseSchema,
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  createdAt: z.number(),
  updatedAt: z.number(),
  targetDate: z.number().optional(),
  completionCriteria: z.string(),
  stakeholders: z.array(z.string()),
  agentIds: z.array(z.string()),
  metrics: z.object({
    tasksTotal: z.number(),
    tasksCompleted: z.number(),
    tasksFailed: z.number(),
    artifactsCreated: z.number(),
    gatesPassed: z.number(),
    gatesFailed: z.number(),
  }),
});
export type Project = z.infer<typeof ProjectSchema>;

// =============================================================================
// Quality Gate Types
// =============================================================================

export const QualityGateStatusSchema = z.enum(['pending', 'running', 'passed', 'failed', 'blocked']);
export type QualityGateStatus = z.infer<typeof QualityGateStatusSchema>;

export const QualityGateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  status: QualityGateStatusSchema,
  order: z.number(),
  detail: z.string(),
  checks: z.array(z.object({
    id: z.string(),
    name: z.string(),
    passed: z.boolean().optional(),
    message: z.string().optional(),
    duration: z.number().optional(),
  })),
  updatedAt: z.number(),
  startedAt: z.number().optional(),
  completedAt: z.number().optional(),
});
export type QualityGate = z.infer<typeof QualityGateSchema>;

// =============================================================================
// Artifact Types
// =============================================================================

export const ArtifactTypeSchema = z.enum(['document', 'code', 'config', 'diagram', 'report', 'test']);
export type ArtifactType = z.infer<typeof ArtifactTypeSchema>;

export const ArtifactSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: ArtifactTypeSchema,
  path: z.string(),
  content: z.string().optional(),
  version: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  createdBy: z.string(),
  source: z.string(),
  tags: z.array(z.string()),
  size: z.number().optional(),
});
export type Artifact = z.infer<typeof ArtifactSchema>;

// =============================================================================
// Collaboration & Activity Types
// =============================================================================

export const ActivityTypeSchema = z.enum([
  'agent:start',
  'agent:progress',
  'agent:complete',
  'agent:error',
  'artifact:create',
  'artifact:update',
  'gate:pass',
  'gate:fail',
  'project:start',
  'project:complete',
  'message:received',
  'system:notification',
]);
export type ActivityType = z.infer<typeof ActivityTypeSchema>;

export const CollaborationEntrySchema = z.object({
  id: z.string(),
  type: ActivityTypeSchema,
  event: z.string(),
  actor: z.string(),
  actorRole: AgentRoleSchema.optional(),
  message: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.number(),
});
export type CollaborationEntry = z.infer<typeof CollaborationEntrySchema>;

// =============================================================================
// Execution Types
// =============================================================================

export const ExecutionLogSchema = z.object({
  id: z.string(),
  level: z.enum(['debug', 'info', 'warn', 'error', 'fatal']),
  message: z.string(),
  source: z.string(),
  timestamp: z.number(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type ExecutionLog = z.infer<typeof ExecutionLogSchema>;

export const ExecutionStreamSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['pending', 'running', 'paused', 'completed', 'failed']),
  progress: z.number(),
  logs: z.array(ExecutionLogSchema),
  startTime: z.number().optional(),
  endTime: z.number().optional(),
});
export type ExecutionStream = z.infer<typeof ExecutionStreamSchema>;

// =============================================================================
// LLM Provider Types
// =============================================================================

export const LLMProviderSchema = z.enum([
  'openai',
  'anthropic',
  'google',
  'azure',
  'local',
  'custom',
]);
export type LLMProvider = z.infer<typeof LLMProviderSchema>;

export const LLMConfigSchema = z.object({
  provider: LLMProviderSchema,
  model: z.string(),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().optional(),
  topP: z.number().min(0).max(1).optional(),
  enabled: z.boolean().default(true),
});
export type LLMConfig = z.infer<typeof LLMConfigSchema>;

// =============================================================================
// UI State Types
// =============================================================================

export const ChatUIStateSchema = z.object({
  messages: z.array(MessageSchema),
  threads: z.array(ChatThreadSchema),
  activeThreadId: z.string().optional(),
  inputValue: z.string(),
  isTyping: z.boolean(),
  typingAgentId: z.string().optional(),
  suggestions: z.array(z.string()),
  commandHistory: z.array(z.string()),
  historyIndex: z.number(),
  showMentions: z.boolean(),
  mentionQuery: z.string(),
});
export type ChatUIState = z.infer<typeof ChatUIStateSchema>;

export const NavigationStateSchema = z.object({
  currentScreen: FoundryScreenSchema,
  previousScreen: FoundryScreenSchema.optional(),
  breadcrumbs: z.array(z.object({
    label: z.string(),
    screen: FoundryScreenSchema,
  })),
  focusedPanel: z.enum(['nav', 'main', 'sidebar', 'input']),
});
export type NavigationState = z.infer<typeof NavigationStateSchema>;

// =============================================================================
// Main Application State
// =============================================================================

export const FoundryStateSchema = z.object({
  // Navigation
  screen: FoundryScreenSchema,
  phase: FoundryPhaseSchema,
  connection: ConnectionStatusSchema,
  
  // Navigation state
  navigation: NavigationStateSchema,
  
  // Projects
  projects: z.array(ProjectSchema),
  activeProjectId: z.string().optional(),
  projectIntake: ProjectIntakeSchema,
  
  // Agents & Team
  agents: z.array(AgentSchema),
  team: z.array(TeamMemberSchema),
  
  // Chat & Collaboration
  chat: ChatUIStateSchema,
  feed: z.array(CollaborationEntrySchema),
  
  // Artifacts & Gates
  artifacts: z.array(ArtifactSchema),
  qualityGates: z.array(QualityGateSchema),
  
  // Execution
  executionStreams: z.array(ExecutionStreamSchema),
  executionErrors: z.array(z.string()),
  
  // Settings
  llmConfig: LLMConfigSchema,
  providers: z.record(z.string(), LLMConfigSchema),
  settings: z.object({
    showNotifications: z.boolean(),
    autoScroll: z.boolean(),
    compactMode: z.boolean(),
    theme: z.enum(['dark', 'light', 'system']),
  }),
  
  // UI State
  isHelpVisible: z.boolean(),
  isLoading: z.boolean(),
  error: z.string().optional(),
});
export type FoundryState = z.infer<typeof FoundryStateSchema>;

// =============================================================================
// Action Types
// =============================================================================

export type FoundryAction =
  // Navigation
  | { type: 'SET_SCREEN'; screen: FoundryScreen }
  | { type: 'NAVIGATE_BACK' }
  | { type: 'SET_FOCUSED_PANEL'; panel: NavigationState['focusedPanel'] }
  
  // Connection
  | { type: 'SET_CONNECTION_STATUS'; connection: ConnectionStatus }
  | { type: 'SET_ERROR'; error: string | undefined }
  
  // Phase
  | { type: 'SET_PHASE'; phase: FoundryPhase }
  | { type: 'ADVANCE_PHASE' }
  
  // Projects
  | { type: 'UPDATE_INTAKE_FIELD'; field: keyof ProjectIntake; value: string }
  | { type: 'SUBMIT_INTAKE' }
  | { type: 'SET_ACTIVE_PROJECT'; projectId: string }
  | { type: 'UPDATE_PROJECT'; projectId: string; updates: Partial<Project> }
  | { type: 'DELETE_PROJECT'; projectId: string }
  
  // Agents
  | { type: 'UPSERT_AGENT'; agent: Agent }
  | { type: 'UPDATE_AGENT_STATUS'; agentId: string; status: AgentStatus; progress?: number }
  | { type: 'REMOVE_AGENT'; agentId: string }
  | { type: 'DELEGATE_TASK'; agentId: string; task: string; context?: Record<string, unknown> }
  
  // Team
  | { type: 'UPSERT_TEAM_MEMBER'; member: TeamMember }
  | { type: 'UPDATE_MEMBER_STATUS'; memberId: string; status: TeamStatus }
  
  // Chat
  | { type: 'CHAT_SEND_MESSAGE'; content: string; role?: MessageRole }
  | { type: 'CHAT_RECEIVE_MESSAGE'; message: Message }
  | { type: 'CHAT_SET_INPUT'; value: string }
  | { type: 'CHAT_SET_TYPING'; isTyping: boolean; agentId?: string }
  | { type: 'CHAT_ADD_SUGGESTION'; suggestion: string }
  | { type: 'CHAT_CLEAR_SUGGESTIONS' }
  | { type: 'CHAT_SET_ACTIVE_THREAD'; threadId: string }
  | { type: 'CHAT_CREATE_THREAD'; title: string; participants: string[] }
  
  // Feed
  | { type: 'ADD_FEED_ENTRY'; entry: CollaborationEntry }
  | { type: 'CLEAR_FEED' }
  
  // Artifacts
  | { type: 'UPSERT_ARTIFACT'; artifact: Artifact }
  | { type: 'DELETE_ARTIFACT'; artifactId: string }
  
  // Quality Gates
  | { type: 'UPSERT_QUALITY_GATE'; gate: QualityGate }
  | { type: 'RUN_GATE'; gateId: string }
  | { type: 'RESET_GATE'; gateId: string }
  
  // Execution
  | { type: 'ADD_EXECUTION_LOG'; streamId: string; log: ExecutionLog }
  | { type: 'APPEND_EXECUTION_ERROR'; message: string }
  | { type: 'CLEAR_EXECUTION_ERRORS' }
  
  // Settings
  | { type: 'UPDATE_LLM_CONFIG'; config: Partial<LLMConfig> }
  | { type: 'UPDATE_PROVIDER_CONFIG'; provider: string; config: Partial<LLMConfig> }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<FoundryState['settings']> }
  
  // UI
  | { type: 'TOGGLE_HELP' }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'RESET_STATE' };

export type FoundryDispatch = (action: FoundryAction) => void;

// =============================================================================
// Utility Types
// =============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// Default Constants
// =============================================================================

export const DEFAULT_LLM_CONFIG: LLMConfig = {
  provider: 'openai',
  model: 'gpt-4',
  temperature: 0.7,
  enabled: true,
};

export const DEFAULT_SETTINGS: FoundryState['settings'] = {
  showNotifications: true,
  autoScroll: true,
  compactMode: false,
  theme: 'dark',
};

export interface HealthStatus {
  healthy: boolean;
  initialized: boolean;
  pluginCount: number;
  agentCount: number;
  commandCount: number;
  availableRoles: string[];
  missingRoles: string[];
  errors: string[];
  timestamp: string;
}

export interface DashboardMetrics {
  totalProjects: number;
  activeProjects: number;
  totalAgents: number;
  activeAgents: number;
  completedTasks: number;
  failedTasks: number;
  passedGates: number;
  failedGates: number;
  recentActivity: CollaborationEntry[];
}
