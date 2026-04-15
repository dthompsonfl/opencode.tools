import * as React from 'react';
import { Box, Text } from 'ink';
import { useFoundryStore } from '../store/store';
import { CollaborationFeed } from '../components/CollaborationFeed';
import { PhaseIndicator } from '../components/PhaseIndicator';
import { ProgressTracker } from '../components/ProgressTracker';
import { QualityGatesPanel } from '../components/QualityGatesPanel';
import { FOUNDRY_COLORS, FOUNDRY_THEME } from '../theme';

export function DashboardScreen(): JSX.Element {
  const { state } = useFoundryStore();
  const activeAgents = state.agents.filter((agent) => agent.status === 'busy').length;
  const passedGates = state.qualityGates.filter((gate) => gate.status === 'passed').length;

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box marginBottom={1}>
        <Box {...FOUNDRY_THEME.panel} marginRight={1}>
          <Text color={FOUNDRY_COLORS.primary}>Projects</Text>
          <Text>{state.projects.length}</Text>
        </Box>
        <Box {...FOUNDRY_THEME.panel} marginRight={1}>
          <Text color={FOUNDRY_COLORS.primary}>Active Agents</Text>
          <Text>{activeAgents}</Text>
        </Box>
        <Box {...FOUNDRY_THEME.panel}>
          <Text color={FOUNDRY_COLORS.primary}>Passed Gates</Text>
          <Text>
            {passedGates}/{state.qualityGates.length}
          </Text>
        </Box>
      </Box>

      <Box marginBottom={1}>
        <Box {...FOUNDRY_THEME.panel} marginRight={1} width={76}>
          <PhaseIndicator phase={state.phase} />
        </Box>
        <Box width={64}>
          <ProgressTracker agents={state.agents} />
        </Box>
      </Box>

      <Box marginBottom={1}>
        <Box width={76} marginRight={1}>
          <CollaborationFeed entries={state.feed} limit={7} title="Recent Activity" />
        </Box>
        <Box width={64}>
          <QualityGatesPanel gates={state.qualityGates} />
        </Box>
      </Box>

      <Box {...FOUNDRY_THEME.panel}>
        <Text color={FOUNDRY_COLORS.primary}>Quick Actions</Text>
        <Text>1 Dashboard | 2 Project Intake | 3 Agent Hub | 4 Execution | 5 Conversations</Text>
        <Text>Tab and Arrow keys also navigate between screens.</Text>
      </Box>
    </Box>
  );
}
