import React from 'react';
import { Box } from 'ink';
import { Header } from './Header.js';
import { ChatPanel } from '../chat/ChatPanel.js';
import { OverviewPanel } from '../overview/OverviewPanel.js';
import { Footer } from './Footer.js';
import { useStore } from '../../store/store.js';

export function MainLayout(): React.ReactElement {
  const { state } = useStore();
  const { rows } = process.stdout;

  return (
    <Box flexDirection="column" height={rows}>
      <Header project={state.project} runtime={state.runtime} />
      <Box flexDirection="row" flexGrow={1}>
        <Box width="60%" borderStyle="single" borderColor="blue">
          <ChatPanel />
        </Box>
        <Box width="40%" borderStyle="single" borderColor="green">
          <OverviewPanel focus={state.focus} />
        </Box>
      </Box>
      <Footer focus={state.focus} />
    </Box>
  );
}
