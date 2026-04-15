import React from 'react';
import { Box, Text } from 'ink';
import { FocusArea } from '../../types/index.js';
import { AgentPanel } from './AgentPanel.js';
import { GatePanel } from './GatePanel.js';
import { ArtifactPanel } from './ArtifactPanel.js';
import { TeamPanel } from './TeamPanel.js';
import { ProjectPanel } from './ProjectPanel.js';

interface OverviewPanelProps {
  focus: FocusArea;
}

export function OverviewPanel({ focus }: OverviewPanelProps): React.ReactElement {
  return (
    <Box flexDirection="column" height="100%" padding={1}>
      <Text bold color="green">Overview: {focus.charAt(0).toUpperCase() + focus.slice(1)}</Text>
      <Box marginTop={1} flexGrow={1}>
        {focus === 'chat' && <ProjectPanel />}
        {focus === 'agents' && <AgentPanel />}
        {focus === 'gates' && <GatePanel />}
        {focus === 'artifacts' && <ArtifactPanel />}
        {focus === 'team' && <TeamPanel />}
      </Box>
    </Box>
  );
}
