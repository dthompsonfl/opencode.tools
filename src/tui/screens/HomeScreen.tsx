import * as React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import { useStore } from '../store/store';
import { AGENTS } from '../agents';
import { COLORS } from '../theme';
import { Panel } from '../components/Panel';

export const HomeScreen: React.FC = () => {
  const { state, dispatch } = useStore();
  const [showAgentList, setShowAgentList] = React.useState(false);

  if (showAgentList) {
    const items = [
        ...AGENTS.map(a => ({ label: `🚀 ${a.name} - ${a.description}`, value: a.id })),
        { label: '⬅️  Back to Main Menu', value: 'back' }
    ];

    return (
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        <Panel title=" SELECT AN AGENT " borderColor={COLORS.secondary}>
            <SelectInput
            items={items}
            onSelect={(item: any) => {
                if (item.value === 'back') {
                    setShowAgentList(false);
                } else {
                    dispatch({ type: 'CREATE_SESSION', agentId: item.value, agentName: (item.label.split('-')[0] || item.label).trim().replace('🚀 ', '') });
                }
            }}
            />
        </Panel>
      </Box>
    );
  }

  const sessionItems = state.sessions.map(s => {
      const statusIcon = s.status === 'completed' ? '✅' : s.status === 'running' ? '⏳' : '💬';
      return {
          label: `${statusIcon}  ${s.name} (${new Date(s.updatedAt).toLocaleTimeString()})`,
          value: s.id,
      };
  });

  const items = [
    { label: '✨  New Interactive Session', value: 'new_chat' },
    ...sessionItems,
    { label: '📊  System Dashboard', value: 'dashboard' },
    { label: '❌  Exit', value: 'exit' }
  ];

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Panel title=" MAIN MENU " borderColor={COLORS.primary}>
        <SelectInput
            items={items}
            onSelect={(item: any) => {
                if (item.value === 'new_chat') {
                    setShowAgentList(true);
                } else if (item.value === 'dashboard') {
                    dispatch({ type: 'SET_VIEW', view: 'dashboard' });
                } else if (item.value === 'exit') {
                    process.exit(0);
                } else {
                    dispatch({ type: 'SELECT_SESSION', sessionId: item.value });
                }
            }}
        />
      </Panel>

      <Box marginTop={1} justifyContent="center">
          <Text color={COLORS.muted}>Controls: [Arrow Keys] Navigate | [Enter] Select | [Esc] Back</Text>
      </Box>
    </Box>
  );
};
