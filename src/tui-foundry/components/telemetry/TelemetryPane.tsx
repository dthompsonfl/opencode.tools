import React from 'react';
import { Box, Text } from 'ink';
import { Panel } from '../../components/common';
import ExecutionLogList from './ExecutionLogList';

export function TelemetryPane() {
  return (
    <Panel title="Telemetry">
      <Box>
        <ExecutionLogList />
      </Box>
    </Panel>
  );
}

export default TelemetryPane;
