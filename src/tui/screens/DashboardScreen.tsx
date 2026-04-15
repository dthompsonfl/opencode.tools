import * as React from 'react';
import { Box, Text } from 'ink';
import { useStore } from '../store/store';
import Spinner from 'ink-spinner';
import { AgentActivity } from '../types';
import { Panel } from '../components/Panel';
import { COLORS } from '../theme';

export const DashboardScreen: React.FC = () => {
  const { state } = useStore();
  const activeSession = state.sessions.find(s => s.id === state.activeSessionId);

  if (!activeSession) {
    return (
      <Box padding={2}>
        <Text color={COLORS.error}>No active session.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={2} flexGrow={1}>
      <Panel title={` MONITOR: ${activeSession.name} `} borderColor={COLORS.info}>
          <Box flexDirection="row" marginBottom={1}>
            <Box flexDirection="column" width="65%" paddingRight={1}>
                <Text bold color={COLORS.text}>Active Agents</Text>
                {activeSession.activities.length === 0 ? (
                    <Text color={COLORS.muted}>No agents currently active.</Text>
                ) : (
                    activeSession.activities.map((activity) => (
                        <AgentCard key={activity.agentId} activity={activity} />
                    ))
                )}
            </Box>

            <Box flexDirection="column" width="35%" paddingLeft={1} borderStyle="single" borderColor={COLORS.border} >
                <Text bold color={COLORS.text}>Session Stats</Text>
                <Box flexDirection="column" marginTop={1}>
                    <Text>Status: <StatusColor status={activeSession.status}>{activeSession.status.toUpperCase()}</StatusColor></Text>
                    <Text>Messages: <Text color={COLORS.highlight}>{activeSession.messages.length}</Text></Text>
                    <Text>Duration: <Text color={COLORS.highlight}>{(Date.now() - activeSession.createdAt) / 1000}s</Text></Text>
                </Box>
            </Box>
          </Box>
      </Panel>

      <Box marginTop={1} flexGrow={1}>
          <Panel title=" SYSTEM LOGS " borderColor={COLORS.muted}>
                {activeSession.messages
                    .filter(m => m.role === 'log' || m.role === 'system')
                    .slice(-8)
                    .map(m => (
                        <Box key={m.id}>
                            <Text color={COLORS.muted}>[{new Date(m.timestamp).toLocaleTimeString()}] </Text>
                            <Text color={COLORS.text}>{m.content}</Text>
                        </Box>
                    ))
                }
          </Panel>
      </Box>

      <Box marginTop={1} justifyContent="center">
          <Text color={COLORS.muted}>[C] Chat View | [H] Home | [Esc] Back</Text>
      </Box>
    </Box>
  );
};

const AgentCard: React.FC<{ activity: AgentActivity }> = ({ activity }) => {
    const isWorking = ['thinking', 'working', 'completing'].includes(activity.status);

    return (
        <Box padding={1} borderStyle="single" borderColor={isWorking ? COLORS.warning : COLORS.success} marginBottom={0}>
            <Box width={20}>
                <Text bold color={COLORS.highlight}>{activity.agentName}</Text>
            </Box>
            <Box width={12}>
                {isWorking && <Text color={COLORS.warning}><Spinner type="dots" /> </Text>}
                <StatusColor status={activity.status as any}>{activity.status.toUpperCase()}</StatusColor>
            </Box>
            <Box flexGrow={1}>
                <Text color={COLORS.muted} wrap="truncate-end">{activity.lastLog || 'Idle'}</Text>
            </Box>
        </Box>
    );
};

const StatusColor: React.FC<{ status: string }> = ({ status, children }) => {
    switch (status) {
        case 'idle': return <Text color={COLORS.muted}>{children}</Text>;
        case 'thinking':
        case 'working':
        case 'refining':
            return <Text color={COLORS.warning}>{children}</Text>;
        case 'success':
        case 'completed':
            return <Text color={COLORS.success}>{children}</Text>;
        case 'failed': return <Text color={COLORS.error}>{children}</Text>;
        default: return <Text color={COLORS.text}>{children}</Text>;
    }
};
