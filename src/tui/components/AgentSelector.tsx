import * as React from 'react';
import SelectInput from 'ink-select-input';
import { Box, Text } from 'ink';
import { AgentDefinition } from '../types';
import { COLORS } from '../styles';

interface Props {
  agents: AgentDefinition[];
  onSelect: (agentId: string) => void;
}

export const AgentSelector: React.FC<Props> = ({ agents, onSelect }) => {
  const items = agents.map(a => ({
    label: a.name,
    value: a.id,
  }));

  return (
    <Box flexDirection="column" borderStyle="single" borderColor={COLORS.secondary} padding={1}>
      <Box marginBottom={1}>
        <Text bold color={COLORS.secondary}>Start New Chat:</Text>
      </Box>
      <SelectInput
        items={items}
        onSelect={(item: any) => onSelect(item.value)}
      />
    </Box>
  );
};
