/**
 * Foundry TUI - Action Types
 * Centralized action definitions for the reducer
 */

import type {
  FoundryScreen,
  FoundryPhase,
  ConnectionStatus,
  Project,
  ProjectIntake,
  Agent,
  AgentStatus,
  TeamMember,
  TeamStatus,
  Message,
  ChatThread,
  CollaborationEntry,
  Artifact,
  QualityGate,
  ExecutionLog,
  LLMConfig,
  NavigationState,
} from '../types';

// Navigation Actions
export type SetScreenAction = { type: 'SET_SCREEN'; screen: FoundryScreen };
export type NavigateBackAction = { type: 'NAVIGATE_BACK' };
export type SetFocusedPanelAction = { type: 'SET_FOCUSED_PANEL'; panel: NavigationState['focusedPanel'] };

// Connection Actions
export type SetConnectionStatusAction = { type: 'SET_CONNECTION_STATUS'; connection: ConnectionStatus };
export type SetErrorAction = { type: 'SET_ERROR'; error: string | undefined };

// Phase Actions
export type SetPhaseAction = { type: 'SET_PHASE'; phase: FoundryPhase };
export type AdvancePhaseAction = { type: 'ADVANCE_PHASE' };

// Project Actions
export type UpdateIntakeFieldAction = { type: 'UPDATE_INTAKE_FIELD'; field: keyof ProjectIntake; value: string };
export type SubmitIntakeAction = { type: 'SUBMIT_INTAKE' };
export type SetActiveProjectAction = { type: 'SET_ACTIVE_PROJECT'; projectId: string };
export type UpdateProjectAction = { type: 'UPDATE_PROJECT'; projectId: string; updates: Partial<Project> };
export type DeleteProjectAction = { type: 'DELETE_PROJECT'; projectId: string };

// Agent Actions
export type UpsertAgentAction = { type: 'UPSERT_AGENT'; agent: Agent };
export type UpdateAgentStatusAction = { type: 'UPDATE_AGENT_STATUS'; agentId: string; status: AgentStatus; progress?: number };
export type RemoveAgentAction = { type: 'REMOVE_AGENT'; agentId: string };
export type DelegateTaskAction = { type: 'DELEGATE_TASK'; agentId: string; task: string; context?: Record<string, unknown> };

// Team Actions
export type UpsertTeamMemberAction = { type: 'UPSERT_TEAM_MEMBER'; member: TeamMember };
export type UpdateMemberStatusAction = { type: 'UPDATE_MEMBER_STATUS'; memberId: string; status: TeamStatus };

// Chat Actions
export type ChatSendMessageAction = { type: 'CHAT_SEND_MESSAGE'; content: string; role?: Message['role'] };
export type ChatReceiveMessageAction = { type: 'CHAT_RECEIVE_MESSAGE'; message: Message };
export type ChatSetInputAction = { type: 'CHAT_SET_INPUT'; value: string };
export type ChatSetTypingAction = { type: 'CHAT_SET_TYPING'; isTyping: boolean; agentId?: string };
export type ChatAddSuggestionAction = { type: 'CHAT_ADD_SUGGESTION'; suggestion: string };
export type ChatClearSuggestionsAction = { type: 'CHAT_CLEAR_SUGGESTIONS' };
export type ChatSetActiveThreadAction = { type: 'CHAT_SET_ACTIVE_THREAD'; threadId: string };
export type ChatCreateThreadAction = { type: 'CHAT_CREATE_THREAD'; title: string; participants: string[] };
// Inspector & Telemetry actions
export type SetInspectorAction = { type: 'SET_INSPECTOR'; payload: { type: string; id?: string } };
export type AddTelemetryEntryAction = { type: 'ADD_TELEMETRY_ENTRY'; entry: { id: string; message: string; source?: string; timestamp: number } };

// Feed Actions
export type AddFeedEntryAction = { type: 'ADD_FEED_ENTRY'; entry: CollaborationEntry };
export type ClearFeedAction = { type: 'CLEAR_FEED' };

// Artifact Actions
export type UpsertArtifactAction = { type: 'UPSERT_ARTIFACT'; artifact: Artifact };
export type DeleteArtifactAction = { type: 'DELETE_ARTIFACT'; artifactId: string };

// Quality Gate Actions
export type UpsertQualityGateAction = { type: 'UPSERT_QUALITY_GATE'; gate: QualityGate };
export type RunGateAction = { type: 'RUN_GATE'; gateId: string };
export type ResetGateAction = { type: 'RESET_GATE'; gateId: string };

// Execution Actions
export type AddExecutionLogAction = { type: 'ADD_EXECUTION_LOG'; streamId: string; log: ExecutionLog };
export type AppendExecutionErrorAction = { type: 'APPEND_EXECUTION_ERROR'; message: string };
export type ClearExecutionErrorsAction = { type: 'CLEAR_EXECUTION_ERRORS' };

// Settings Actions
export type UpdateLLMConfigAction = { type: 'UPDATE_LLM_CONFIG'; config: Partial<LLMConfig> };
export type UpdateSettingsAction = { type: 'UPDATE_SETTINGS'; settings: Partial<{ showNotifications: boolean; autoScroll: boolean; compactMode: boolean; theme: 'dark' | 'light' | 'system' }> };

// UI Actions
export type ToggleHelpAction = { type: 'TOGGLE_HELP' };
export type SetLoadingAction = { type: 'SET_LOADING'; isLoading: boolean };
export type ResetStateAction = { type: 'RESET_STATE' };

// Union type of all actions
export type FoundryAction =
  | SetScreenAction
  | NavigateBackAction
  | SetFocusedPanelAction
  | SetConnectionStatusAction
  | SetErrorAction
  | SetPhaseAction
  | AdvancePhaseAction
  | UpdateIntakeFieldAction
  | SubmitIntakeAction
  | SetActiveProjectAction
  | UpdateProjectAction
  | DeleteProjectAction
  | UpsertAgentAction
  | UpdateAgentStatusAction
  | RemoveAgentAction
  | DelegateTaskAction
  | UpsertTeamMemberAction
  | UpdateMemberStatusAction
  | ChatSendMessageAction
  | ChatReceiveMessageAction
  | ChatSetInputAction
  | ChatSetTypingAction
  | ChatAddSuggestionAction
  | ChatClearSuggestionsAction
  | ChatSetActiveThreadAction
  | ChatCreateThreadAction
  | AddFeedEntryAction
  | ClearFeedAction
  | UpsertArtifactAction
  | DeleteArtifactAction
  | UpsertQualityGateAction
  | RunGateAction
  | ResetGateAction
  | AddExecutionLogAction
  | AppendExecutionErrorAction
  | ClearExecutionErrorsAction
  | UpdateLLMConfigAction
  | UpdateSettingsAction
  | ToggleHelpAction
  | SetLoadingAction
  | ResetStateAction;

export type FoundryDispatch = (action: FoundryAction) => void;
