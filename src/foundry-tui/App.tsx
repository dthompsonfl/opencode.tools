import * as React from 'react';
import { Box, Text, useInput } from 'ink';
import { FoundryStoreProvider, useFoundryStore } from './store/store';
import { DashboardScreen } from './screens/DashboardScreen';
import { ProjectScreen } from './screens/ProjectScreen';
import { AgentHubScreen } from './screens/AgentHubScreen';
import { ExecutionScreen } from './screens/ExecutionScreen';
import { ConversationScreen } from './screens/ConversationScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { FoundryScreen, SCREEN_ORDER } from './types';
import { FOUNDRY_COLORS, FOUNDRY_THEME } from './theme';

const SCREEN_LABELS: Record<FoundryScreen, string> = {
  dashboard: 'Dashboard',
  project: 'Project Intake',
  agentHub: 'Agent Hub',
  execution: 'Execution',
  conversation: 'Conversations',
  settings: 'Settings',
};

function FoundryAppMain(): JSX.Element {
  const { state, dispatch } = useFoundryStore();

  useInput((input, key) => {
    if (key.leftArrow || (key.shift && key.tab)) {
      const currentIndex = SCREEN_ORDER.indexOf(state.screen);
      const previousIndex = (currentIndex - 1 + SCREEN_ORDER.length) % SCREEN_ORDER.length;
      dispatch({ type: 'SET_SCREEN', screen: SCREEN_ORDER[previousIndex] });
      return;
    }

    if (key.rightArrow || key.tab) {
      const currentIndex = SCREEN_ORDER.indexOf(state.screen);
      const nextIndex = (currentIndex + 1) % SCREEN_ORDER.length;
      dispatch({ type: 'SET_SCREEN', screen: SCREEN_ORDER[nextIndex] });
      return;
    }

    if (input >= '1' && input <= '6') {
      const target = SCREEN_ORDER[Number(input) - 1];
      if (target) {
        dispatch({ type: 'SET_SCREEN', screen: target });
      }
    }
  });

  const activeAgents = state.agents.filter((agent) => agent.status === 'busy').length;

  return (
    <Box {...FOUNDRY_THEME.appFrame}>
      <Box justifyContent="space-between" marginBottom={1}>
        <Text color={FOUNDRY_COLORS.primary}>Foundry TUI | Enterprise Delegation Workspace</Text>
        <Text color={state.connection === 'connected' ? FOUNDRY_COLORS.success : FOUNDRY_COLORS.error}>
          {state.connection}
        </Text>
      </Box>

      <Box justifyContent="space-between" marginBottom={1}>
        <Text>
          Phase: <Text color={FOUNDRY_COLORS.highlight}>{state.phase}</Text>
        </Text>
        <Text>Active Agents: {activeAgents}</Text>
      </Box>

      <Box marginBottom={1}>
        {SCREEN_ORDER.map((screen, index) => {
          const selected = state.screen === screen;
          return (
            <Box key={screen} marginRight={2}>
              <Text color={selected ? FOUNDRY_COLORS.highlight : FOUNDRY_COLORS.muted}>
                {index + 1}:{SCREEN_LABELS[screen]}
              </Text>
            </Box>
          );
        })}
      </Box>

      <Box flexGrow={1} flexDirection="column" minHeight={28}>
        {state.screen === 'dashboard' ? <DashboardScreen /> : null}
        {state.screen === 'project' ? <ProjectScreen /> : null}
        {state.screen === 'agentHub' ? <AgentHubScreen /> : null}
        {state.screen === 'execution' ? <ExecutionScreen /> : null}
        {state.screen === 'conversation' ? <ConversationScreen /> : null}
        {state.screen === 'settings' ? <SettingsScreen /> : null}
      </Box>

      <Box marginTop={1}>
        <Text color={FOUNDRY_COLORS.muted}>Shortcuts: 1-6 screens | Tab/Arrows cycle | Ctrl+S submit intake | Ctrl+E export placeholder</Text>
      </Box>
    </Box>
  );
}

export function FoundryTuiApp(): JSX.Element {
  return (
    <FoundryStoreProvider>
      <FoundryAppMain />
    </FoundryStoreProvider>
  );
}
