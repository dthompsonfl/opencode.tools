import React from 'react';
import { Box } from 'ink';
import { ChatPanel } from '../components/chat';
import ThreadSidebar from '../components/threads/ThreadSidebar';
import TelemetryPane from '../components/telemetry/TelemetryPane';

export function ConversationScreen(): React.ReactElement {
  return (
    <Box flexDirection="row" flexGrow={1}>
      <Box width={28} marginRight={1}><ThreadSidebar /></Box>
      <Box flexGrow={1} marginRight={1}><ChatPanel /></Box>
      <Box width={40}><TelemetryPane /></Box>
    </Box>
  );
}
