import React from 'react';
import { Box, Text, useInput } from 'ink';
import { Badge, Panel, ProgressBar } from '../components/common';
import { useTuiRuntime } from '../runtime/context';
import { useStore } from '../store/store';
import type { TeamMember } from '../types';
import AgentList from '../components/agents/AgentList';
import AgentInspector from '../components/agents/AgentInspector';

type CommandMode = 'idle' | 'group' | 'individual' | 'review';

export function AgentHubScreen(): React.ReactElement {
  const { state, dispatch } = useStore();
  const runtime = useTuiRuntime();
  const [teamCursor, setTeamCursor] = React.useState(0);
  const [commandMode, setCommandMode] = React.useState<CommandMode>('idle');
  const [commandBuffer, setCommandBuffer] = React.useState('');
  const [isRunning, setIsRunning] = React.useState(false);

  const selectedMember = state.team[teamCursor];
  const activeWorkspaceId = React.useMemo(() => {
    if (!state.activeProjectId) {
      return undefined;
    }

    return runtime.coworkController
      .listWorkspaces()
      .find((workspace) => workspace.projectId === state.activeProjectId)?.id;
  }, [runtime.coworkController, state.activeProjectId]);

  const appendFeed = (message: string, event: string, type: TeamMember['status'] extends never ? never : 'system:notification' | 'agent:start'): void => {
    dispatch({
      type: 'ADD_FEED_ENTRY',
      entry: {
        id: `feed-agenthub-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
        type,
        event,
        actor: 'cto',
        message,
        timestamp: Date.now(),
      },
    });
  };

  const appendError = (message: string): void => {
    dispatch({ type: 'APPEND_EXECUTION_ERROR', message });
  };

  const executeGroupDirective = React.useCallback(async (directive: string): Promise<void> => {
    const projectId = state.activeProjectId;
    if (!projectId) {
      appendError('No active project selected for team directive.');
      return;
    }

    const workspaceId = activeWorkspaceId ?? 'global';
    await Promise.all(
      state.team.map(async (member) => {
        await runtime.coworkController.spawnAgent(
          member.id,
          `Project ${projectId} team directive: ${directive}`,
          workspaceId,
        );
      }),
    );

    appendFeed(
      `Group directive sent to ${state.team.length} agents for project ${projectId}: ${directive}`,
      'agenthub:team:directive',
      'system:notification',
    );
  }, [activeWorkspaceId, runtime.coworkController, state.activeProjectId, state.team]);

  const executeIndividualDirective = React.useCallback(async (member: TeamMember, directive: string): Promise<void> => {
    const projectId = state.activeProjectId ?? 'global';
    const workspaceId = activeWorkspaceId ?? 'global';

    await runtime.coworkController.spawnAgent(
      member.id,
      `Project ${projectId} directive for ${member.roleLabel}: ${directive}`,
      workspaceId,
    );

    appendFeed(
      `Directive sent to ${member.name}: ${directive}`,
      'agenthub:individual:directive',
      'agent:start',
    );
  }, [activeWorkspaceId, runtime.coworkController, state.activeProjectId]);

  const executeReviewRequest = React.useCallback(async (member: TeamMember, artifactKey: string): Promise<void> => {
    await runtime.coworkController.requestReview('cto', member.id, artifactKey);
    appendFeed(
      `Review requested from ${member.name} for artifact: ${artifactKey}`,
      'agenthub:review:requested',
      'system:notification',
    );
  }, [runtime.coworkController]);

  const runCommandBuffer = React.useCallback(async (): Promise<void> => {
    if (!selectedMember && commandMode !== 'group') {
      return;
    }

    const value = commandBuffer.trim();
    if (!value) {
      return;
    }

    setIsRunning(true);
    try {
      if (commandMode === 'group') {
        await executeGroupDirective(value);
      } else if (commandMode === 'individual' && selectedMember) {
        await executeIndividualDirective(selectedMember, value);
      } else if (commandMode === 'review' && selectedMember) {
        await executeReviewRequest(selectedMember, value);
      }
    } catch (error) {
      appendError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsRunning(false);
      setCommandMode('idle');
      setCommandBuffer('');
    }
  }, [commandBuffer, commandMode, executeGroupDirective, executeIndividualDirective, executeReviewRequest, selectedMember]);

  useInput((input, key) => {
    if (commandMode !== 'idle') {
      if (key.escape) {
        setCommandMode('idle');
        setCommandBuffer('');
        return;
      }

      if (key.return) {
        void runCommandBuffer();
        return;
      }

      if (key.backspace || key.delete) {
        setCommandBuffer((current) => current.slice(0, -1));
        return;
      }

      if (!key.ctrl && !key.meta && !key.upArrow && !key.downArrow && input.length === 1) {
        setCommandBuffer((current) => `${current}${input}`);
      }
      return;
    }

    if (state.team.length > 0 && key.upArrow) {
      setTeamCursor((current) => (current - 1 + state.team.length) % state.team.length);
      return;
    }

    if (state.team.length > 0 && key.downArrow) {
      setTeamCursor((current) => (current + 1) % state.team.length);
      return;
    }

    const lower = input.toLowerCase();

    if (lower === 'g') {
      setCommandMode('group');
      setCommandBuffer('');
      return;
    }

    if (lower === 'i' && selectedMember) {
      setCommandMode('individual');
      setCommandBuffer('');
      return;
    }

    if (lower === 'r' && selectedMember) {
      setCommandMode('review');
      setCommandBuffer('project-deliverable');
    }
  });

  const commandPrompt = commandMode === 'group'
    ? 'Group directive'
    : commandMode === 'individual'
      ? `Directive for ${selectedMember?.name ?? 'agent'}`
      : commandMode === 'review'
        ? `Artifact key for review by ${selectedMember?.name ?? 'agent'}`
        : null;

  return React.createElement(
    Box,
    { flexDirection: 'column', flexGrow: 1 },
    React.createElement(
      Box,
      { marginBottom: 1, flexDirection: 'column' },
      React.createElement(Text, { bold: true }, 'Agent Command Center (CTO + Cowork Control)'),
      React.createElement(Text, null, '[↑/↓] select agent | [G] group command | [I] individual command | [R] request review | [Enter] submit | [Esc] cancel'),
      isRunning ? React.createElement(Text, { color: 'yellow' }, 'Executing command...') : null,
      commandPrompt
        ? React.createElement(Text, { color: 'cyan' }, `${commandPrompt}: ${commandBuffer}_`)
        : null,
    ),
      React.createElement(
        Box,
        { flexDirection: 'row', flexGrow: 1 },
        React.createElement(Box, { width: '50%', marginRight: 1 }, React.createElement(Panel, { title: 'Project Team (select target agent)' }, React.createElement(AgentList, {}))),
        React.createElement(Box, { width: '50%' }, React.createElement(Panel, { title: 'Agent Inspector' }, React.createElement(AgentInspector, { agentId: selectedMember?.id })) ),
      ),
  );
}
