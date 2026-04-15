export type FoundryScreen = 'dashboard' | 'project' | 'agentHub' | 'execution' | 'conversation' | 'settings';

export type FoundryPhase = 'intake' | 'planning' | 'delegation' | 'execution' | 'quality' | 'release';

export type ConnectionStatus = 'connected' | 'disconnected';

export type AgentStatus = 'idle' | 'busy' | 'blocked' | 'completed';

export type TeamStatus = 'available' | 'busy' | 'blocked' | 'offline';

export type QualityGateStatus = 'pending' | 'running' | 'passed' | 'failed';

export interface ProjectIntake {
  name: string;
  industry: string;
  description: string;
  completionCriteria: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  industry: string;
  status: 'draft' | 'active' | 'complete';
  createdAt: number;
}

export interface AgentRuntime {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  progress: number;
  task: string;
  updatedAt: number;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  status: TeamStatus;
}

export interface CollaborationEntry {
  id: string;
  event: string;
  actor: string;
  message: string;
  timestamp: number;
}

export interface ArtifactRecord {
  id: string;
  name: string;
  source: string;
  version: number;
  updatedAt: number;
}

export interface QualityGate {
  id: string;
  name: string;
  status: QualityGateStatus;
  detail: string;
  updatedAt: number;
}

export interface ConversationState {
  query: string;
  lastExportAt: number | null;
  exportNote: string;
}

export interface FoundryState {
  screen: FoundryScreen;
  phase: FoundryPhase;
  connection: ConnectionStatus;
  projectIntake: ProjectIntake;
  projects: ProjectSummary[];
  agents: AgentRuntime[];
  team: TeamMember[];
  feed: CollaborationEntry[];
  artifacts: ArtifactRecord[];
  qualityGates: QualityGate[];
  conversation: ConversationState;
  executionErrors: string[];
}

export type FoundryAction =
  | { type: 'SET_SCREEN'; screen: FoundryScreen }
  | { type: 'SET_CONNECTION_STATUS'; connection: ConnectionStatus }
  | { type: 'SET_PHASE'; phase: FoundryPhase }
  | { type: 'UPDATE_INTAKE_FIELD'; field: keyof ProjectIntake; value: string }
  | { type: 'SUBMIT_INTAKE' }
  | { type: 'UPSERT_AGENT'; agent: AgentRuntime }
  | { type: 'UPSERT_TEAM_MEMBER'; member: TeamMember }
  | { type: 'ADD_FEED_ENTRY'; entry: CollaborationEntry }
  | { type: 'UPSERT_ARTIFACT'; artifact: ArtifactRecord }
  | { type: 'UPSERT_QUALITY_GATE'; gate: QualityGate }
  | { type: 'SET_CONVERSATION_QUERY'; query: string }
  | { type: 'REQUEST_CONVERSATION_EXPORT'; note: string }
  | { type: 'APPEND_EXECUTION_ERROR'; message: string };

export type FoundryDispatch = (action: FoundryAction) => void;

export const SCREEN_ORDER: readonly FoundryScreen[] = [
  'dashboard',
  'project',
  'agentHub',
  'execution',
  'conversation',
  'settings',
];
