import React from 'react';
import { Box, Text } from 'ink';
import { useAgents } from '../../store/store.js';
import { AgentStatus } from '../../types/index.js';

export function AgentPanel(): React.ReactElement {
  const { agents } = useAgents();

  const getStatusColor = (status: AgentStatus): string => {
    switch (status) {
      case 'running':
        return 'yellow';
      case 'completed':
        return 'green';
      case 'failed':
        return 'red';
      case 'blocked':
        return 'magenta';
      default:
        return 'gray';
    }
  };

  const renderProgressBar = (progress: number): string => {
    const filled = Math.floor(progress / 10);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty) + ` ${progress}%`;
  };

  return (
    <Box flexDirection="column">
      <Text bold>Active Agents ({agents.length})</Text>
      <Box marginTop={1} flexDirection="column">
        {agents.length === 0 ? (
          <Text color="gray">No active agents</Text>
        ) : (
          agents.map((agent) => (
            <Box
              key={agent.id}
              borderStyle="single"
              borderColor={getStatusColor(agent.status)}
              padding={1}
              marginBottom={1}
            >
              <Box flexDirection="row" justifyContent="space-between">
                <Text bold>{agent.name}</Text>
                <Text color={getStatusColor(agent.status)}>{agent.status}</Text>
              </Box>
              <Text>Role: {agent.role}</Text>
              {agent.task && <Text>Task: {agent.task}</Text>}
              {agent.status === 'running' && (
                <Text>Progress: {renderProgressBar(agent.progress)}</Text>
              )}
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}
