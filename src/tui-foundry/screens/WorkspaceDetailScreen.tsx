import React from 'react';
import { Box } from 'ink';
import ArtifactList from '../components/workspaces/ArtifactList';
import FeedbackThreadList from '../components/workspaces/FeedbackThreadList';
import ConflictList from '../components/workspaces/ConflictList';
import CheckpointList from '../components/workspaces/CheckpointList';

export function WorkspaceDetailScreen(): React.ReactElement {
  return (
    <Box flexDirection="row" flexGrow={1}>
      <Box width="33%" marginRight={1}><ArtifactList /></Box>
      <Box width="33%" marginRight={1}><FeedbackThreadList /></Box>
      <Box width="34%"><ConflictList /><CheckpointList /></Box>
    </Box>
  );
}
