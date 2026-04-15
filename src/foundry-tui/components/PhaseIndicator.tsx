import * as React from 'react';
import { Box, Text } from 'ink';
import { FoundryPhase } from '../types';
import { FOUNDRY_COLORS } from '../theme';

const PHASE_ORDER: FoundryPhase[] = ['intake', 'planning', 'delegation', 'execution', 'quality', 'release'];

export function PhaseIndicator(props: { phase: FoundryPhase }): JSX.Element {
  return (
    <Box flexDirection="column">
      <Text color={FOUNDRY_COLORS.primary}>Workflow Phase</Text>
      <Box>
        {PHASE_ORDER.map((phase, index) => {
          const active = phase === props.phase;
          const complete = PHASE_ORDER.indexOf(props.phase) > index;
          const color = active ? FOUNDRY_COLORS.highlight : complete ? FOUNDRY_COLORS.success : FOUNDRY_COLORS.muted;

          return (
            <React.Fragment key={phase}>
              <Text color={color}>{active ? `[${phase}]` : phase}</Text>
              {index < PHASE_ORDER.length - 1 ? <Text color={FOUNDRY_COLORS.muted}>{' -> '}</Text> : null}
            </React.Fragment>
          );
        })}
      </Box>
    </Box>
  );
}
