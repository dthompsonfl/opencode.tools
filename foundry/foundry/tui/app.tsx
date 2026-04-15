import React from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { StoreProvider } from './store/store.js';
import { MainLayout } from './components/layout/MainLayout.js';
import { HelpOverlay } from './components/layout/HelpOverlay.js';
import { useKeyboard } from './hooks/useKeyboard.js';
import { useEventBus } from './hooks/useEventBus.js';
import { CTOAgent } from './agents/CTOAgent.js';
import { MockLLMClient } from './mock/mockLLM.js';
import { MockRuntime } from './mock/mockRuntime.js';
import { eventBus } from './services/eventBus.js';
import { initialState } from './store/reducer.js';
import { FoundryTUIState } from './types/index.js';

interface AppProps {
  initialState?: FoundryTUIState;
  demoMode?: boolean;
}

function AppContent(): React.ReactElement {
  const { exit } = useApp();
  const { state, dispatch } = useKeyboard();

  // Setup event bus integration
  useEventBus(dispatch);

  // Setup CTO agent
  React.useEffect(() => {
    const ctoAgent = new CTOAgent(
      state.ctoPersonality.name,
      new MockLLMClient(),
      {
        state,
        eventBus,
      }
    );

    // Subscribe to chat messages for CTO
    const unsubscribe = eventBus.subscribe('chat:message:sent', (payload) => {
      const { content, role } = payload as { content: string; role?: string };
      if (role === 'user') {
        void ctoAgent.handleMessage(content);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Setup mock runtime in demo mode
  React.useEffect(() => {
    const runtime = new MockRuntime(eventBus, {
      demoMode: true,
      autoProgress: true,
    });

    runtime.initialize(state, dispatch);

    return () => {
      runtime.destroy();
    };
  }, []);

  // Handle exit
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit();
    }
  });

  return (
    <Box flexDirection="column" height="100%">
      <MainLayout />
      {state.isHelpVisible && <HelpOverlay onClose={() => dispatch({ type: 'TOGGLE_HELP' })} />}
      {state.error && (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          backgroundColor="red"
          justifyContent="center"
          alignItems="center"
        >
          <Text color="white">Error: {state.error}</Text>
        </Box>
      )}
    </Box>
  );
}

export default function App({ initialState: customInitialState, demoMode = true }: AppProps): React.ReactElement {
  return (
    <StoreProvider initialState={customInitialState}>
      <AppContent />
    </StoreProvider>
  );
}
