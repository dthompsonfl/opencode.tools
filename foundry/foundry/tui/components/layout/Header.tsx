import React from 'react';
import { Box, Text } from 'ink';
import { ProjectContext, RuntimeState } from '../../types/index.js';

interface HeaderProps {
  project: ProjectContext;
  runtime: RuntimeState;
}

export function Header({ project, runtime }: HeaderProps): React.ReactElement {
  return (
    <Box
      height={3}
      borderStyle="single"
      borderColor="cyan"
      flexDirection="row"
      justifyContent="space-between"
      paddingX={1}
    >
      <Box>
        <Text bold color="cyan">{'>'} Foundry Interactive</Text>
        <Text>{' '}| Project:{' '}</Text>
        <Text bold>{project.name}</Text>
        <Text>{' '}| Phase:{' '}</Text>
        <Text color="yellow">{project.phase}</Text>
      </Box>
      <Box>
        <Text>{runtime.isConnected ? (
          <><Text color="green">{'●'} Connected</Text></>
        ) : (
          <><Text color="red">{'●'} Disconnected</Text></>
        )}</Text>
        <Text>{' '}| Agents:{' '}</Text>
        <Text bold color="blue">{runtime.activeAgents}</Text>
      </Box>
    </Box>
  );
}
