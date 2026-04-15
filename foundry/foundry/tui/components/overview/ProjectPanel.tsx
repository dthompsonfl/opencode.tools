import React from 'react';
import { Box, Text } from 'ink';
import { useSelector } from '../../store/store.js';

export function ProjectPanel(): React.ReactElement {
  const project = useSelector((state) => state.project);
  const runtime = useSelector((state) => state.runtime);

  return (
    <Box flexDirection="column">
      <Box borderStyle="single" borderColor="cyan" padding={1} marginBottom={1}>
        <Text bold>Project Details</Text>
        <Text>Name: {project.name}</Text>
        <Text>Description: {project.description}</Text>
        <Text>Phase: {project.phase}</Text>
        <Text>Status: {project.status}</Text>
        <Text>Started: {project.startDate.toLocaleDateString()}</Text>
      </Box>

      <Box borderStyle="single" borderColor="yellow" padding={1} marginBottom={1}>
        <Text bold>Runtime Status</Text>
        <Text>Connection: {runtime.isConnected ? 'Connected' : 'Disconnected'}</Text>
        <Text>Active Agents: {runtime.activeAgents}</Text>
        <Text>Pending Tasks: {runtime.pendingTasks}</Text>
        <Text>Completed Tasks: {runtime.completedTasks}</Text>
      </Box>

      <Box borderStyle="single" borderColor="magenta" padding={1}>
        <Text bold>Goals</Text>
        {project.goals.map((goal: string, index: number) => (
          <Text key={index}>{'•'} {goal}</Text>
        ))}
      </Box>
    </Box>
  );
}
