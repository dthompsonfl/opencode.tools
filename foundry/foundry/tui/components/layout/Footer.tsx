import React from 'react';
import { Box, Text, Spacer } from 'ink';
import { FocusArea } from '../../types/index.js';

interface FooterProps {
  focus: FocusArea;
}

export function Footer({ focus }: FooterProps): React.ReactElement {
  return (
    <Box
      height={2}
      borderStyle="single"
      borderColor="gray"
      flexDirection="row"
      justifyContent="space-between"
      paddingX={1}
    >
      <Box>
        <Text color="gray">Ctrl+K: Help | Ctrl+N: New Project | Ctrl+P: Projects | Tab: Focus | Esc: Close</Text>
      </Box>
      <Box>
        <Text color="gray">Focus: </Text>
        <Text bold color="cyan">{focus}</Text>
      </Box>
    </Box>
  );
}
