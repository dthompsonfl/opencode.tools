import React from 'react';
import { Box, Text } from 'ink';
import { Panel } from '../../components/common';

export function FeedbackThreadList(): React.ReactElement {
  return (
    <Panel title="Feedback Threads">
      <Box><Text>No feedback threads</Text></Box>
    </Panel>
  );
}

export default FeedbackThreadList;
