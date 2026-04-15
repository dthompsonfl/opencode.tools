import React from 'react';
import { Box, Text } from 'ink';
import { Panel } from '../../components/common';

export function ConflictList(): React.ReactElement {
  return (
    <Panel title="Conflicts">
      <Box><Text>No conflicts detected</Text></Box>
    </Panel>
  );
}

export default ConflictList;
