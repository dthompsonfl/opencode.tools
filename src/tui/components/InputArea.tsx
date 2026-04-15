import * as React from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { COLORS } from '../styles';

interface Props {
  onSubmit: (value: string) => void;
  prompt?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const InputArea: React.FC<Props> = ({ onSubmit, prompt = '> ', placeholder, disabled = false }) => {
  const [value, setValue] = React.useState('');

  return (
    <Box borderStyle="round" borderColor={disabled ? COLORS.muted : COLORS.highlight} flexDirection="row" width="100%">
      <Text color={disabled ? COLORS.muted : COLORS.success}>{prompt}</Text>
      {disabled ? (
        <Text color={COLORS.muted}>
          <Spinner type="dots" /> {placeholder || 'Processing...'}
        </Text>
      ) : (
        <TextInput
          value={value}
          onChange={setValue}
          onSubmit={(val: string) => {
            onSubmit(val);
            setValue('');
          }}
          placeholder={placeholder}
        />
      )}
    </Box>
  );
};
