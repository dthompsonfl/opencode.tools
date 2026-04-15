/**
 * Foundry TUI - Selectors
 * Memoized state selectors for common data access patterns
 */

import type { FoundryState, Project, Agent, TeamMember, QualityGate, CollaborationEntry } from '../types';

// =============================================================================
// Navigation Selectors
// =============================================================================

export function selectCurrentScreen(state: FoundryState): FoundryState['screen'] {
  return state.screen;
}

export function selectCurrentPhase(state: FoundryState): FoundryState['phase'] {
  return state.phase;
}

export function selectConnectionStatus(state: FoundryState): FoundryState['connection'] {
  return state.connection;
}

export function selectBreadcrumbs(state: FoundryState): FoundryState['navigation']['breadcrumbs'] {
  return state.navigation.breadcrumbs;
}

export function selectFocusedPanel(state: FoundryState): FoundryState['navigation']['focusedPanel'] {
  return state.navigation.focusedPanel;
}

// =============================================================================
// Project Selectors
// =============================================================================

export function selectProjects(state: FoundryState): Project[] {
  return state.projects;
}

export function selectActiveProject(state: FoundryState): Project | undefined {
  if (!state.activeProjectId) return undefined;
  return state.projects.find(p => p.id === state.activeProjectId);
}

export function selectActiveProjectId(state: FoundryState): string | undefined {
  return state.activeProjectId;
}

export function selectProjectIntake(state: FoundryState): FoundryState['projectIntake'] {
  return state.projectIntake;
}

export function selectProjectCount(state: FoundryState): number {
  return state.projects.length;
}

export function selectActiveProjectCount(state: FoundryState): number {
  return state.projects.filter(p => p.status === 'active').length;
}

// =============================================================================
// Agent Selectors
// =============================================================================

export function selectAgents(state: FoundryState): Agent[] {
  return state.agents;
}

export function selectActiveAgents(state: FoundryState): Agent[] {
  return state.agents.filter(a => a.status === 'busy');
}

export function selectActiveAgentCount(state: FoundryState): number {
  return state.agents.filter(a => a.status === 'busy').length;
}

export function selectIdleAgents(state: FoundryState): Agent[] {
  return state.agents.filter(a => a.status === 'idle');
}

export function selectAgentById(state: FoundryState, agentId: string): Agent | undefined {
  return state.agents.find(a => a.id === agentId);
}

export function selectAgentsByRole(state: FoundryState, role: string): Agent[] {
  return state.agents.filter(a => a.role === role);
}

// =============================================================================
// Team Selectors
// =============================================================================

export function selectTeam(state: FoundryState): TeamMember[] {
  return state.team;
}

export function selectActiveTeamMembers(state: FoundryState): TeamMember[] {
  return state.team.filter(m => m.isActive);
}

export function selectAvailableTeamMembers(state: FoundryState): TeamMember[] {
  return state.team.filter(m => m.status === 'available' && m.isActive);
}

export function selectBusyTeamMembers(state: FoundryState): TeamMember[] {
  return state.team.filter(m => m.status === 'busy');
}

export function selectTeamMemberById(state: FoundryState, memberId: string): TeamMember | undefined {
  return state.team.find(m => m.id === memberId);
}

// =============================================================================
// Chat Selectors
// =============================================================================

export function selectChatMessages(state: FoundryState) {
  return state.chat.messages;
}

export function selectChatThreads(state: FoundryState) {
  return state.chat.threads;
}

export function selectActiveThreadId(state: FoundryState) {
  return state.chat.activeThreadId;
}

export function selectActiveThread(state: FoundryState) {
  return state.chat.threads.find(t => t.id === state.chat.activeThreadId);
}

export function selectChatInput(state: FoundryState) {
  return state.chat.inputValue;
}

export function selectIsTyping(state: FoundryState) {
  return state.chat.isTyping;
}

export function selectTypingAgentId(state: FoundryState) {
  return state.chat.typingAgentId;
}

export function selectChatSuggestions(state: FoundryState) {
  return state.chat.suggestions;
}

export function selectShowMentions(state: FoundryState) {
  return state.chat.showMentions;
}

export function selectMentionQuery(state: FoundryState) {
  return state.chat.mentionQuery;
}

// =============================================================================
// Feed Selectors
// =============================================================================

export function selectFeed(state: FoundryState): CollaborationEntry[] {
  return state.feed;
}

export function selectRecentFeed(state: FoundryState, limit = 10): CollaborationEntry[] {
  return state.feed.slice(0, limit);
}

// =============================================================================
// Artifact Selectors
// =============================================================================

export function selectArtifacts(state: FoundryState) {
  return state.artifacts;
}

export function selectRecentArtifacts(state: FoundryState, limit = 10) {
  return state.artifacts.slice(0, limit);
}

// =============================================================================
// Quality Gate Selectors
// =============================================================================

export function selectQualityGates(state: FoundryState): QualityGate[] {
  return state.qualityGates;
}

export function selectPassedGates(state: FoundryState): QualityGate[] {
  return state.qualityGates.filter(g => g.status === 'passed');
}

export function selectPassedGateCount(state: FoundryState): number {
  return state.qualityGates.filter(g => g.status === 'passed').length;
}

export function selectFailedGates(state: FoundryState): QualityGate[] {
  return state.qualityGates.filter(g => g.status === 'failed');
}

export function selectFailedGateCount(state: FoundryState): number {
  return state.qualityGates.filter(g => g.status === 'failed').length;
}

export function selectPendingGates(state: FoundryState): QualityGate[] {
  return state.qualityGates.filter(g => g.status === 'pending');
}

export function selectRunningGates(state: FoundryState): QualityGate[] {
  return state.qualityGates.filter(g => g.status === 'running');
}

// =============================================================================
// Execution Selectors
// =============================================================================

export function selectExecutionStreams(state: FoundryState) {
  return state.executionStreams;
}

export function selectTelemetryEntries(state: FoundryState) {
  // Flatten logs into telemetry entries
  return state.executionStreams.flatMap(s => s.logs.map(l => ({ id: l.id, message: l.message, source: l.source, timestamp: l.timestamp })));
}

export function selectExecutionErrors(state: FoundryState) {
  return state.executionErrors;
}

// =============================================================================
// Settings Selectors
// =============================================================================

export function selectLLMConfig(state: FoundryState) {
  return state.llmConfig;
}

export function selectSettings(state: FoundryState) {
  return state.settings;
}

// =============================================================================
// UI State Selectors
// =============================================================================

export function selectIsHelpVisible(state: FoundryState): boolean {
  return state.isHelpVisible;
}

export function selectIsLoading(state: FoundryState): boolean {
  return state.isLoading;
}

export function selectError(state: FoundryState): string | undefined {
  return state.error;
}

// =============================================================================
// Dashboard Metrics Selectors
// =============================================================================

export interface DashboardMetrics {
  totalProjects: number;
  activeProjects: number;
  totalAgents: number;
  activeAgents: number;
  completedTasks: number;
  failedTasks: number;
  passedGates: number;
  failedGates: number;
  totalGates: number;
  recentActivity: CollaborationEntry[];
}

export function selectDashboardMetrics(state: FoundryState): DashboardMetrics {
  return {
    totalProjects: state.projects.length,
    activeProjects: state.projects.filter(p => p.status === 'active').length,
    totalAgents: state.agents.length,
    activeAgents: state.agents.filter(a => a.status === 'busy').length,
    completedTasks: state.agents.filter(a => a.status === 'completed').length,
    failedTasks: state.agents.filter(a => a.status === 'failed').length,
    passedGates: state.qualityGates.filter(g => g.status === 'passed').length,
    failedGates: state.qualityGates.filter(g => g.status === 'failed').length,
    totalGates: state.qualityGates.length,
    recentActivity: state.feed.slice(0, 10),
  };
}
