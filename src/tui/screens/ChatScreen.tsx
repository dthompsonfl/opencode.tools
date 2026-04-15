import * as React from 'react';
import { Box, Text } from 'ink';
import { useStore } from '../store/store';
import { ChatInterface } from '../components/ChatInterface';
import { AGENTS } from '../agents';
import { createLogMessage, createUserMessage, createAgentMessage } from '../utils/logger';
import { Panel } from '../components/Panel';
import { COLORS } from '../theme';

export const ChatScreen: React.FC = () => {
  const { state, dispatch } = useStore();
  const session = state.sessions.find(s => s.id === state.activeSessionId);

  if (!session) return <Text>No session selected</Text>;

  const agent = AGENTS.find(a => a.id === session.agentId);
  const currentStatus = session.status;

  const runAgentExecution = async (sessionId: string, input: any) => {
      // Simulate execution (Replace with actual Orchestrator calls)
      // The actual logic is in the 'execute' handler of the agent usually
      // But here we might just trigger the agent's execute method again if needed
      // Or relies on the agent's internal state.
      // For now, this is a placeholder to restart or continue.
  };

  const handleSendMessage = async (content: string) => {
    if (!agent) return;

    dispatch({ type: 'ADD_MESSAGE', sessionId: session.id, message: createUserMessage(content) });

    if (content.trim() === '/back') {
        dispatch({ type: 'GO_HOME' });
        return;
    }

    if (content.trim() === '/stop') {
        dispatch({ type: 'SET_STATUS', sessionId: session.id, status: 'idle' });
        dispatch({ type: 'ADD_MESSAGE', sessionId: session.id, message: createAgentMessage('Execution stopped by user.') });
        return;
    }

    // Pass input to agent if it supports REPL or onInput
    if (agent.onInput) {
        // Run in background to not block UI
        agent.onInput(content, (log: string) => {
             dispatch({ type: 'ADD_MESSAGE', sessionId: session.id, message: createLogMessage(log) });
        }).catch(err => {
             dispatch({ type: 'ADD_MESSAGE', sessionId: session.id, message: createLogMessage(`Error: ${err.message}`) });
        });
        return;
    }

    // Default handler if no onInput
    if (currentStatus === 'idle' || currentStatus === 'completed') {
        // Start new execution context if applicable
        if (agent.execute) {
             dispatch({ type: 'SET_STATUS', sessionId: session.id, status: 'running' });
             try {
                const answers = { ...session.answers, input: content };
                await agent.execute(answers, (log: string) => {
                    dispatch({ type: "ADD_MESSAGE", sessionId: session.id, message: createLogMessage(log) });
                });
                dispatch({ type: 'SET_STATUS', sessionId: session.id, status: 'completed' });
             } catch (e: any) {
                dispatch({ type: 'SET_STATUS', sessionId: session.id, status: 'failed' });
                dispatch({ type: 'ADD_MESSAGE', sessionId: session.id, message: createLogMessage(`Error: ${e.message}`) });
             }
        }
    } else {
        // If running and no onInput, just log
        dispatch({ type: 'ADD_MESSAGE', sessionId: session.id, message: createLogMessage('Agent is busy. Type /stop to cancel.') });
    }
  };

  return (
    <Box flexDirection="column" flexGrow={1} height="100%" paddingX={2}>
        <Panel title={` ${session.name} `} borderColor={COLORS.primary} flexGrow={1}>
            <ChatInterface
                messages={session.messages}
                onSendMessage={handleSendMessage}
                prompt={`${agent?.name || 'User'} > `}
                placeholder="Type a message or command..."
                disabled={false} // Always allow input for commands
            />
        </Panel>
    </Box>
  );
};
