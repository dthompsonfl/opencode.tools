import * as React from 'react';
import { Box, Text } from 'ink';
import { useFoundryStore } from '../store/store';
import { PhaseIndicator } from '../components/PhaseIndicator';
import { ProgressTracker } from '../components/ProgressTracker';
import { QualityGatesPanel } from '../components/QualityGatesPanel';
import { FOUNDRY_COLORS, FOUNDRY_THEME } from '../theme';

export function ExecutionScreen(): JSX.Element {
  const { state } = useFoundryStore();
  const busyAgents = state.agents.filter((agent) => agent.status === 'busy');

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box marginBottom={1}>
        <Box {...FOUNDRY_THEME.panel} width={76} marginRight={1}>
          <PhaseIndicator phase={state.phase} />
          <Text color={FOUNDRY_COLORS.muted}>Phase transitions are updated from EventBus workflow events.</Text>
        </Box>
        <Box width={64}>
          <ProgressTracker agents={state.agents} />
        </Box>
      </Box>

      <Box marginBottom={1}>
        <Box {...FOUNDRY_THEME.panel} width={76} marginRight={1}>
          <Text color={FOUNDRY_COLORS.primary}>Task Stream</Text>
          {busyAgents.length === 0 ? <Text color={FOUNDRY_COLORS.muted}>No active execution tasks</Text> : null}
          {busyAgents.map((agent) => (
            <Text key={agent.id}>
              {agent.name}: {agent.task} ({agent.progress}%)
            </Text>
          ))}
        </Box>

        <Box width={64}>
          <QualityGatesPanel gates={state.qualityGates} />
        </Box>
      </Box>

      <Box {...FOUNDRY_THEME.panel}>
        <Text color={FOUNDRY_COLORS.primary}>Execution Errors</Text>
        {state.executionErrors.length === 0 ? (
          <Text color={FOUNDRY_COLORS.success}>No execution errors reported</Text>
        ) : (
          state.executionErrors.map((error, index) => (
            <Text color={FOUNDRY_COLORS.error} key={`${index}-${error}`}>
              {error}
            </Text>
          ))
        )}
      </Box>
    </Box>
  );
}
