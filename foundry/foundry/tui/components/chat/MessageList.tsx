import React from 'react';
import { Box, Text } from 'ink';
import { Message } from '../../types/index.js';

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps): React.ReactElement {
  return (
    <Box flexDirection="column" flexGrow={1}>
      {messages.length === 0 ? (
        <Box justifyContent="center" alignItems="center" flexGrow={1}>
          <Text color="gray">No messages yet. Start a conversation!</Text>
        </Box>
      ) : (
        messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))
      )}
    </Box>
  );
}

interface MessageItemProps {
  message: Message;
}

function MessageItem({ message }: MessageItemProps): React.ReactElement {
  const { role, content, agentName, timestamp } = message;
  
  const roleColors: Record<typeof role, string> = {
    user: 'green',
    cto: 'cyan',
    agent: 'blue',
    system: 'gray',
  };

  const roleLabels: Record<typeof role, string> = {
    user: 'You',
    cto: agentName ?? 'CTO',
    agent: agentName ?? 'Agent',
    system: 'System',
  };

  const time = new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Box flexDirection="column" marginY={1}>
      <Box flexDirection="row">
        <Text bold color={roleColors[role]}>{roleLabels[role]}</Text>
        <Text color="gray">{'  '}{time}</Text>
      </Box>
      <Box marginLeft={2}>
        <Text>{content}</Text>
      </Box>
    </Box>
  );
}
