import * as React from 'react';
import { Box, Text } from 'ink';
import { Message } from '../types';
import { COLORS } from '../styles';

interface Props {
  messages: Message[];
}

export const MessageList: React.FC<Props> = ({ messages }) => {
  // Show last 20 messages to keep UI clean
  const visibleMessages = messages.slice(-15);

  return (
    <Box flexDirection="column" flexGrow={1} borderStyle="single" borderColor={COLORS.border} paddingX={1} marginBottom={1}>
      {visibleMessages.length === 0 ? (
        <Text color={COLORS.muted} italic>No messages yet. Start a conversation!</Text>
      ) : (
        visibleMessages.map((msg) => (
          <Box key={msg.id} flexDirection="column" marginBottom={1}>
            <Text color={msg.role === 'user' ? COLORS.success : msg.role === 'agent' ? COLORS.secondary : msg.role === 'log' ? COLORS.muted : COLORS.warning}>
              {msg.role.toUpperCase()}:
            </Text>
            <Text color={msg.role === 'log' ? COLORS.muted : COLORS.text}>
              {msg.content}
            </Text>
          </Box>
        ))
      )}
    </Box>
  );
};
