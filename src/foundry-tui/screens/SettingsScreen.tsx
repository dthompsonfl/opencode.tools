import * as React from 'react';
import { Box, Text } from 'ink';
import { useFoundryStore } from '../store/store';
import { FOUNDRY_COLORS } from '../theme';

export function SettingsScreen(): JSX.Element {
  const { state } = useFoundryStore();

  return (
    <Box flexDirection="column">
      <Text color={FOUNDRY_COLORS.primary}>Operator Settings</Text>
      <Box marginTop={1} flexDirection="column">
        <Text>
          Connection: <Text color={state.connection === 'connected' ? FOUNDRY_COLORS.success : FOUNDRY_COLORS.error}>{state.connection}</Text>
        </Text>
        <Text>Feed retention: {state.feed.length}/120 events</Text>
        <Text>Artifact retention: {state.artifacts.length}/80 records</Text>
        <Text>Execution errors tracked: {state.executionErrors.length}/20</Text>
      </Box>
      <Box marginTop={1}>
        <Text color={FOUNDRY_COLORS.muted}>Settings controls are read-only in this phase. Planned controls include event subscriptions, retention windows, and export preferences.</Text>
      </Box>
    </Box>
  );
}
