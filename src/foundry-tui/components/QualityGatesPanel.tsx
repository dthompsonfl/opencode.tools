import * as React from 'react';
import { Box, Text } from 'ink';
import { QualityGate } from '../types';
import { FOUNDRY_COLORS, FOUNDRY_THEME } from '../theme';

export function QualityGatesPanel(props: { gates: QualityGate[] }): JSX.Element {
  return (
    <Box {...FOUNDRY_THEME.panel}>
      <Text color={FOUNDRY_COLORS.primary}>Quality Gates</Text>
      {props.gates.map((gate) => {
        const color =
          gate.status === 'passed'
            ? FOUNDRY_COLORS.success
            : gate.status === 'failed'
              ? FOUNDRY_COLORS.error
              : gate.status === 'running'
                ? FOUNDRY_COLORS.warning
                : FOUNDRY_COLORS.muted;

        return (
          <Box key={gate.id} flexDirection="column" marginBottom={1}>
            <Text color={color}>
              {gate.name}: {gate.status}
            </Text>
            <Text color={FOUNDRY_COLORS.muted}>{gate.detail}</Text>
          </Box>
        );
      })}
    </Box>
  );
}
