import * as React from 'react';
import { Box, Text } from 'ink';
import { TeamMember } from '../types';
import { FOUNDRY_COLORS, FOUNDRY_THEME } from '../theme';

export function TeamRoster(props: { members: TeamMember[] }): JSX.Element {
  return (
    <Box {...FOUNDRY_THEME.panel}>
      <Text color={FOUNDRY_COLORS.primary}>Team Roster</Text>
      {props.members.length === 0 ? <Text color={FOUNDRY_COLORS.muted}>No team members online</Text> : null}
      {props.members.map((member) => {
        const color =
          member.status === 'available'
            ? FOUNDRY_COLORS.success
            : member.status === 'busy'
              ? FOUNDRY_COLORS.warning
              : member.status === 'blocked'
                ? FOUNDRY_COLORS.error
                : FOUNDRY_COLORS.muted;

        return (
          <Box key={member.id}>
            <Text color={color}>{member.status.padEnd(9, ' ')}</Text>
            <Text> {member.name} - {member.role}</Text>
          </Box>
        );
      })}
    </Box>
  );
}
