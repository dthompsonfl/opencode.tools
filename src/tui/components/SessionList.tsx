import * as React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import { Session } from '../types';
import { COLORS } from '../styles';

interface Props {
  sessions: Session[];
  onSelect: (sessionId: string) => void;
}

export const SessionList: React.FC<Props> = ({ sessions, onSelect }) => {
  if (sessions.length === 0) {
    return <Text color={COLORS.muted}>No active sessions.</Text>;
  }

  const items = sessions.map(s => ({
    label: `${s.name} (${new Date(s.updatedAt).toLocaleTimeString()})`,
    value: s.id,
  }));

  return (
    <Box flexDirection="column" borderStyle="single" borderColor={COLORS.border} padding={1}>
      <Box marginBottom={1}>
        <Text bold color={COLORS.primary}>Recent Chats:</Text>
      </Box>
      <SelectInput
        items={items}
        onSelect={(item: any) => onSelect(item.value)}
      />
    </Box>
  );
};
