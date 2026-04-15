import * as React from 'react';
import { Box } from 'ink';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import { Message } from '../types';

interface Props {
  messages: Message[];
  onSendMessage: (content: string) => void;
  prompt?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const ChatInterface: React.FC<Props> = ({ messages, onSendMessage, prompt, placeholder, disabled }) => {
  return (
    <Box flexDirection="column" flexGrow={1} borderStyle="round" borderColor="cyan" padding={1}>
      <MessageList messages={messages} />
      <InputArea onSubmit={onSendMessage} prompt={prompt} placeholder={placeholder} disabled={disabled} />
    </Box>
  );
};
