import React from 'react';
import { Box, Text } from 'ink';
import { useSelector } from '../../store/store';
import { selectAgentById } from '../../store/selectors';

export function AgentInspector({ agentId }: { agentId?: string }) {
  const agent = useSelector(state => agentId ? selectAgentById(state, agentId) : undefined);
  if (!agent) return <Text>No agent selected</Text>;
  return (
    <Box flexDirection="column">
      <Text bold>{agent.name} ({agent.roleLabel})</Text>
      <Text>Status: {agent.status} | Progress: {agent.progress}%</Text>
      <Text>Task: {agent.task ?? 'idle'}</Text>
    </Box>
  );
}

export default AgentInspector;
