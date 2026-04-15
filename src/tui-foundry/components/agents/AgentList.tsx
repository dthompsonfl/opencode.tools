import React from 'react';
import { Box, Text } from 'ink';
import { useSelector } from '../../store/store';
import { selectAgents } from '../../store/selectors';

export function AgentList() {
  const agents = useSelector(selectAgents);
  return (
    <Box flexDirection="column">
      {agents.length === 0 ? <Text>No agents</Text> : agents.map(a => (
        <Box key={a.id}><Text>{a.name} — {a.roleLabel} [{a.status}]</Text></Box>
      ))}
    </Box>
  );
}

export default AgentList;
