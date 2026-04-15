import * as React from 'react';
import { Box, Text } from 'ink';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';
import { COLORS } from '../theme';

export const Header: React.FC = () => (
  <Box flexDirection="column" alignItems="center" marginBottom={1}>
    <Box marginBottom={-1}>
        <Gradient name="retro">
            <BigText text="OPENCODE" font="tiny" />
        </Gradient>
    </Box>
    <Box width="100%" justifyContent="space-between" borderStyle="single" borderColor={COLORS.primary} paddingX={1} marginTop={0}>
      <Text bold color={COLORS.primary}> ENTERPRISE AI OS v2.0 </Text>
      <Box>
        <Text color={COLORS.muted}>STATUS: </Text>
        <Text color={COLORS.success}>OPERATIONAL</Text>
      </Box>
    </Box>
  </Box>
);
