import React from 'react';
import { Box } from 'ink';
import WorkspaceList from '../components/workspaces/WorkspaceList';
import WorkspaceInspector from '../components/workspaces/WorkspaceInspector';

export function WorkspacesScreen(): React.ReactElement {
  return (
    <Box flexDirection="row" flexGrow={1}>
      <Box width={40} marginRight={1}><WorkspaceList /></Box>
      <Box flexGrow={1}><WorkspaceInspector /></Box>
    </Box>
  );
}
