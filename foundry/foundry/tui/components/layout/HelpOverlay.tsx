import React from 'react';
import { Box, Text, useInput } from 'ink';

interface HelpOverlayProps {
  onClose: () => void;
}

export function HelpOverlay({ onClose }: HelpOverlayProps): React.ReactElement {
  useInput((input, key) => {
    if (key.escape || input === 'q' || input === 'Q') {
      onClose();
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="yellow"
      padding={1}
    >
      <Text bold color="yellow">⌨️ Keyboard Shortcuts</Text>
      <Box marginTop={1}>
        <Text bold>Global:</Text>
        <Text>{'  '}Ctrl+K{'    '}- Toggle this help</Text>
        <Text>{'  '}Ctrl+N{'    '}- Create new project</Text>
        <Text>{'  '}Ctrl+P{'    '}- Project selector</Text>
        <Text>{'  '}Tab{'       '}- Cycle focus areas</Text>
        <Text>{'  '}Shift+Tab{' '}- Cycle focus areas (reverse)</Text>
        <Text>{'  '}Esc{'      '}- Close overlays</Text>
        <Text>{'  '}Ctrl+C{'   '}- Exit application</Text>
      </Box>
      <Box marginTop={1}>
        <Text bold>Commands:</Text>
        <Text>{'  '}/status{'        '}- Show project status</Text>
        <Text>{'  '}/agents{'        '}- View agents panel</Text>
        <Text>{'  '}/gates{'         '}- View quality gates</Text>
        <Text>{'  '}/artifacts{'     '}- View artifacts</Text>
        <Text>{'  '}/team{'          '}- View team members</Text>
        <Text>{'  '}/phase {'<name>'}{' '}- Set project phase</Text>
        <Text>{'  '}/spawn {'<role>'}{' '}{'<task>'} - Spawn new agent</Text>
        <Text>{'  '}/help{'          '}- Show this help</Text>
      </Box>
      <Box marginTop={1}>
        <Text color="gray">Press Esc or Q to close</Text>
      </Box>
    </Box>
  );
}
