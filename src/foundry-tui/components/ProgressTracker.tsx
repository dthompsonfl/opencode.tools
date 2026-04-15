import * as React from 'react';
import { Box, Text } from 'ink';
import { AgentRuntime } from '../types';
import { buildProgressBar, FOUNDRY_COLORS, FOUNDRY_THEME } from '../theme';

export function ProgressTracker(props: { agents: AgentRuntime[] }): JSX.Element {
  const overall =
    props.agents.length === 0
      ? 0
      : Math.round(props.agents.reduce((sum, agent) => sum + agent.progress, 0) / props.agents.length);

  return (
    <Box {...FOUNDRY_THEME.panel}>
      <Text color={FOUNDRY_COLORS.primary}>Execution Progress</Text>
      <Text>{buildProgressBar(overall)}</Text>
      {props.agents.length === 0 ? <Text color={FOUNDRY_COLORS.muted}>No active agents</Text> : null}
      {props.agents.map((agent) => (
        <Text key={agent.id}>
          {agent.name.padEnd(16, ' ')} {buildProgressBar(agent.progress, 12)}
        </Text>
      ))}
    </Box>
  );
}
