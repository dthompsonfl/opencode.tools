import * as React from 'react';
import { Box, Text } from 'ink';
import { useFoundryStore } from '../store/store';
import { AgentPanel } from '../components/AgentPanel';
import { CollaborationFeed } from '../components/CollaborationFeed';
import { TeamRoster } from '../components/TeamRoster';
import { FOUNDRY_COLORS, FOUNDRY_THEME } from '../theme';

export function AgentHubScreen(): JSX.Element {
  const { state } = useFoundryStore();
  const activePanels = state.agents.slice(0, 3);

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box marginBottom={1}>
        <Box width={64} marginRight={1}>
          <TeamRoster members={state.team} />
        </Box>
        <Box width={76}>
          <CollaborationFeed entries={state.feed} limit={10} title="Agent Collaboration" />
        </Box>
      </Box>

      <Box marginBottom={1}>
        {activePanels.length === 0 ? (
          <Box {...FOUNDRY_THEME.panel} width={140}>
            <Text color={FOUNDRY_COLORS.muted}>No active agents yet. Agent cards will appear when runtime events arrive.</Text>
          </Box>
        ) : (
          activePanels.map((agent) => <AgentPanel key={agent.id} agent={agent} />)
        )}
      </Box>

      <Box {...FOUNDRY_THEME.panel}>
        <Text color={FOUNDRY_COLORS.primary}>Office Floor</Text>
        {state.team.map((member, index) => (
          <Text key={member.id}>
            Desk {`${index + 1}`.padStart(2, '0')}: {member.name} [{member.status}]
          </Text>
        ))}
        <Text color={FOUNDRY_COLORS.muted}>Direct message placeholder: /dm &lt;agent&gt; &lt;message&gt;</Text>
      </Box>
    </Box>
  );
}
