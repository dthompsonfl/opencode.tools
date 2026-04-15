import React from 'react';
import { Box, Text } from 'ink';
import type { ExecutionLog } from '../../types';

export function ExecutionLogRow({ log }: { log: ExecutionLog }) {
  return (
    <Box>
      <Text>{new Date(log.timestamp).toLocaleTimeString()} </Text>
      <Text color={log.level === 'error' ? 'red' : log.level === 'warn' ? 'yellow' : undefined}>{log.level.toUpperCase()}</Text>
      <Text> {log.source} - {log.message}</Text>
    </Box>
  );
}

export default ExecutionLogRow;
