import React from 'react';
import { Box, Text } from 'ink';
import { Panel } from '../../components/common';

export function CheckpointList(): React.ReactElement {
  return (
    <Panel title="Checkpoints">
      <Box><Text>No checkpoints</Text></Box>
    </Panel>
  );
}

export default CheckpointList;
