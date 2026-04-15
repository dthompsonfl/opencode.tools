import React from 'react';
import { Box, Text } from 'ink';
import { useSelector } from '../../store/store.js';
import { TeamRole } from '../../types/index.js';

export function TeamPanel(): React.ReactElement {
  const team = useSelector((state) => state.team);

  const getRoleIcon = (role: TeamRole): string => {
    switch (role) {
      case 'cto':
        return '👔';
      case 'architect':
        return '🏗️';
      case 'developer':
        return '💻';
      case 'reviewer':
        return '👁️';
      case 'qa':
        return '🧪';
      case 'security':
        return '🔒';
      case 'devops':
        return '🚀';
      default:
        return '👤';
    }
  };

  const renderAvailabilityBar = (availability: number): string => {
    const filled = Math.floor(availability / 10);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty) + ` ${availability}%`;
  };

  return (
    <Box flexDirection="column">
      <Text bold>Team Members ({team.length})</Text>
      <Box marginTop={1} flexDirection="column">
        {team.length === 0 ? (
          <Text color="gray">No team members</Text>
        ) : (
          team.map((member) => (
            <Box
              key={member.id}
              borderStyle="single"
              borderColor={member.isActive ? 'green' : 'gray'}
              padding={1}
              marginBottom={1}
            >
              <Box flexDirection="row" justifyContent="space-between">
                <Box flexDirection="row">
                  <Text>{getRoleIcon(member.role)}{' '}</Text>
                  <Text bold>{member.name}</Text>
                </Box>
                <Text color={member.isActive ? 'green' : 'gray'}>
                  {member.isActive ? '● Active' : '○ Inactive'}
                </Text>
              </Box>
              <Text color="gray">Role: {member.role}</Text>
              {member.currentTask && (
                <Text>Task: {member.currentTask}</Text>
              )}
              <Text>Availability: {renderAvailabilityBar(member.availability)}</Text>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}
