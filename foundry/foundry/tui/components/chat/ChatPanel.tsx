import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useChat, useDispatch } from '../../store/store.js';
import { MessageList } from './MessageList.js';
import { SuggestionBar } from './SuggestionBar.js';

export function ChatPanel(): React.ReactElement {
  const { messages, inputValue, isTyping, suggestions, setInput, sendMessage } = useChat();
  const dispatch = useDispatch();
  const [showSuggestions, setShowSuggestions] = useState(true);

  useInput((input, key) => {
    if (key.return) {
      if (inputValue.trim()) {
        sendMessage(inputValue.trim());
        dispatch({ type: 'CHAT_ADD_COMMAND_HISTORY', payload: inputValue.trim() });
        setShowSuggestions(true);
      }
    }
  });

  const handleSuggestionSelect = (suggestion: string) => {
    setInput(suggestion);
    setShowSuggestions(false);
  };

  return (
    <Box flexDirection="column" height="100%" padding={1}>
      <Box flexGrow={1} flexDirection="column">
        <MessageList messages={messages} />
        {isTyping && (
          <Box marginTop={1}>
            <Text color="gray">CTO is typing...</Text>
          </Box>
        )}
      </Box>
      
      {showSuggestions && suggestions.length > 0 && (
        <SuggestionBar
          suggestions={suggestions}
          input={inputValue}
          onSelect={handleSuggestionSelect}
        />
      )}
      
      <Box marginTop={1} borderStyle="single" borderColor="blue" paddingX={1}>
        <Text color="gray">{'> '}</Text>
        <Text color="white">{inputValue}</Text>
        <Text color="gray">{'_'}</Text>
      </Box>
    </Box>
  );
}
