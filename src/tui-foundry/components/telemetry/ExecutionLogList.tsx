import React from 'react';
import { Box, Text } from 'ink';
import { useSelector } from '../../store/store';
import { selectExecutionStreams } from '../../store/selectors';
import ExecutionLogRow from './ExecutionLogRow';

export function ExecutionLogList() {
  const streams = useSelector(selectExecutionStreams);
  return (
    <Box flexDirection="column">
      {streams.length === 0 ? <Text>No telemetry</Text> : streams.map(s => (
        <Box key={s.id} flexDirection="column">
          <Text bold>{s.name}</Text>
          {s.logs.map((l: any) => <ExecutionLogRow key={l.id} log={l} />)}
        </Box>
      ))}
    </Box>
  );
}

export default ExecutionLogList;
