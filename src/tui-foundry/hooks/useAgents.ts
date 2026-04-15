/**
 * Foundry TUI - Agent Management Hook
 * Handles agent operations and delegation
 */

import { useState, useCallback } from 'react';
import { useStore } from '../store/store';
import type { Agent, AgentStatus, AgentRole, TeamMember } from '../types';
import { getRoleLabel } from '../theme';

export function useAgents() {
  const { state, dispatch } = useStore();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isDelegating, setIsDelegating] = useState(false);

  const agents = state.agents;
  const team = state.team;

  const getAgent = useCallback((agentId: string): Agent | undefined => {
    return agents.find(a => a.id === agentId);
  }, [agents]);

  const getTeamMember = useCallback((memberId: string): TeamMember | undefined => {
    return team.find(m => m.id === memberId);
  }, [team]);

  const getAvailableAgents = useCallback((): Agent[] => {
    return agents.filter(a => a.status === 'idle');
  }, [agents]);

  const getActiveAgents = useCallback((): Agent[] => {
    return agents.filter(a => a.status === 'busy');
  }, [agents]);

  const getAgentsByRole = useCallback((role: AgentRole): Agent[] => {
    return agents.filter(a => a.role === role);
  }, [agents]);

  const getTeamByRole = useCallback((role: AgentRole): TeamMember[] => {
    return team.filter(m => m.role === role);
  }, [team]);

  const selectAgent = useCallback((agentId: string | null) => {
    setSelectedAgentId(agentId);
  }, []);

  const delegateTask = useCallback(async (
    agentId: string,
    task: string,
    context?: Record<string, unknown>
  ): Promise<boolean> => {
    setIsDelegating(true);
    
    try {
      // Dispatch the delegation action
      dispatch({
        type: 'DELEGATE_TASK',
        agentId,
        task,
        context,
      });

      // Update agent status
      dispatch({
        type: 'UPDATE_AGENT_STATUS',
        agentId,
        status: 'busy',
        progress: 0,
      });

      // Simulate async delegation (in real implementation, this would call the orchestrator)
      await new Promise((resolve) => setTimeout(resolve, 500));

      return true;
    } catch (error) {
      dispatch({
        type: 'UPDATE_AGENT_STATUS',
        agentId,
        status: 'failed',
      });
      return false;
    } finally {
      setIsDelegating(false);
    }
  }, [dispatch]);

  const cancelAgent = useCallback((agentId: string) => {
    dispatch({
      type: 'UPDATE_AGENT_STATUS',
      agentId,
      status: 'paused',
    });
  }, [dispatch]);

  const resumeAgent = useCallback((agentId: string) => {
    dispatch({
      type: 'UPDATE_AGENT_STATUS',
      agentId,
      status: 'busy',
    });
  }, [dispatch]);

  const removeAgent = useCallback((agentId: string) => {
    dispatch({
      type: 'REMOVE_AGENT',
      agentId,
    });
  }, [dispatch]);

  const getAgentMetrics = useCallback(() => {
    const total = agents.length;
    const active = agents.filter(a => a.status === 'busy').length;
    const idle = agents.filter(a => a.status === 'idle').length;
    const completed = agents.filter(a => a.status === 'completed').length;
    const failed = agents.filter(a => a.status === 'failed').length;

    return {
      total,
      active,
      idle,
      completed,
      failed,
      utilization: total > 0 ? (active / total) * 100 : 0,
    };
  }, [agents]);

  const getTeamMetrics = useCallback(() => {
    const total = team.length;
    const available = team.filter(m => m.status === 'available').length;
    const busy = team.filter(m => m.status === 'busy').length;
    const blocked = team.filter(m => m.status === 'blocked').length;

    return {
      total,
      available,
      busy,
      blocked,
      availability: total > 0 ? (available / total) * 100 : 0,
    };
  }, [team]);

  return {
    // State
    agents,
    team,
    selectedAgentId,
    isDelegating,

    // Getters
    getAgent,
    getTeamMember,
    getAvailableAgents,
    getActiveAgents,
    getAgentsByRole,
    getTeamByRole,

    // Actions
    selectAgent,
    delegateTask,
    cancelAgent,
    resumeAgent,
    removeAgent,

    // Metrics
    getAgentMetrics,
    getTeamMetrics,
  };
}

/**
 * Hook for agent role management
 */
export function useAgentRoles() {
  const roles: { id: AgentRole; label: string; description: string }[] = [
    { id: 'cto', label: 'CTO Orchestrator', description: 'Technical leadership and orchestration' },
    { id: 'pm', label: 'Product Manager', description: 'Project planning and requirements' },
    { id: 'architect', label: 'System Architect', description: 'System design and architecture' },
    { id: 'implementer', label: 'Implementer', description: 'Code implementation and development' },
    { id: 'qa', label: 'QA Lead', description: 'Quality assurance and testing' },
    { id: 'security', label: 'Security Lead', description: 'Security analysis and compliance' },
    { id: 'docs', label: 'Tech Writer', description: 'Documentation and technical writing' },
    { id: 'performance', label: 'Performance', description: 'Performance optimization' },
    { id: 'reviewer', label: 'Reviewer', description: 'Code review and quality gates' },
  ];

  const getRoleLabel = useCallback((roleId: AgentRole): string => {
    return roles.find(r => r.id === roleId)?.label || roleId;
  }, []);

  const getRoleDescription = useCallback((roleId: AgentRole): string => {
    return roles.find(r => r.id === roleId)?.description || '';
  }, []);

  return {
    roles,
    getRoleLabel,
    getRoleDescription,
  };
}
