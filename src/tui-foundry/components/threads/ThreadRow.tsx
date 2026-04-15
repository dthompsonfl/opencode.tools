import React from 'react';
import { Box, Text } from 'ink';
import { Badge } from '../../components/common';
import type { ChatThread } from '../../types';

export function ThreadRow({ thread, isActive }: { thread: ChatThread; isActive?: boolean }) {
  return (
    <Box>
      <Text>{isActive ? '▶ ' : '  '}{thread.title}</Text>
      <Box marginLeft={1}><Badge status={thread.isActive ? 'available' : 'offline'} /></Box>
    </Box>
  );
}

export default ThreadRow;
