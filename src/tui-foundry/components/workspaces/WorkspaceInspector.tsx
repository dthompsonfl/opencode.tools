import React from 'react';
import { Box, Text } from 'ink';
import ArtifactList from './ArtifactList';
import ConflictList from './ConflictList';
import CheckpointList from './CheckpointList';
import FeedbackThreadList from './FeedbackThreadList';

export function WorkspaceInspector({ workspaceId }: { workspaceId?: string }) {
  return (
    <Box flexDirection="column">
      <Box><Text bold>Workspace: {workspaceId ?? 'none'}</Text></Box>
      <Box marginTop={1}>
        <ArtifactList />
      </Box>
      <Box marginTop={1}>
        <FeedbackThreadList />
      </Box>
      <Box marginTop={1}>
        <ConflictList />
      </Box>
      <Box marginTop={1}>
        <CheckpointList />
      </Box>
    </Box>
  );
}

export default WorkspaceInspector;
