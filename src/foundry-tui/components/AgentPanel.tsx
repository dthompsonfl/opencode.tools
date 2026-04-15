import * as React from 'react';
import { Box, Text } from 'ink';
import { AgentRuntime } from '../types';
import { buildProgressBar, FOUNDRY_COLORS, FOUNDRY_THEME } from '../theme';

export function AgentPanel(props: { agent: AgentRuntime }): JSX.Element {
  const color =
    props.agent.status === 'completed'
      ? FOUNDRY_COLORS.success
      : props.agent.status === 'blocked'
        ? FOUNDRY_COLORS.error
        : props.agent.status === 'busy'
          ? FOUNDRY_COLORS.warning
          : FOUNDRY_COLORS.muted;

  return (
    <Box {...FOUNDRY_THEME.panel} width={44} marginRight={1}>
      <Text color={FOUNDRY_COLORS.primary}>{props.agent.name}</Text>
      <Text color={FOUNDRY_COLORS.muted}>{props.agent.role}</Text>
      <Text color={color}>Status: {props.agent.status}</Text>
      <Text color={FOUNDRY_COLORS.secondary}>Task: {props.agent.task}</Text>
      <Text>{buildProgressBar(props.agent.progress, 18)}</Text>
    </Box>
  );
}
