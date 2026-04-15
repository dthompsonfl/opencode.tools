import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';

interface SuggestionBarProps {
  suggestions: string[];
  input: string;
  onSelect: (suggestion: string) => void;
}

export function SuggestionBar({ suggestions, input, onSelect }: SuggestionBarProps): React.ReactElement {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter suggestions based on input
  const filteredSuggestions = suggestions.filter((suggestion) =>
    suggestion.toLowerCase().includes(input.toLowerCase())
  );

  if (filteredSuggestions.length === 0) {
    return <></>;
  }

  const items = filteredSuggestions.slice(0, 5).map((suggestion, index) => ({
    label: suggestion,
    value: suggestion,
  }));

  useInput((_, key) => {
    if (key.upArrow) {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedIndex((prev) => Math.min(filteredSuggestions.length - 1, prev + 1));
    } else if (key.return) {
      onSelect(filteredSuggestions[selectedIndex]!);
    }
  });

  return (
    <Box flexDirection="column" marginY={1}>
      <Text color="gray">Suggestions (use ↑↓ to navigate, Enter to select):</Text>
      {items.map((item, index) => (
        <Box key={item.value}>
          <Text color={index === selectedIndex ? 'cyan' : 'gray'}>
            {index === selectedIndex ? '> ' : '  '}
            {item.label}
          </Text>
        </Box>
      ))}
    </Box>
  );
}
