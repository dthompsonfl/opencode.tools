import * as React from 'react';
import { Box, Text, BoxProps } from 'ink';
import { COLORS } from '../theme';

interface PanelProps extends BoxProps {
  title?: string;
  borderColor?: string;
  children: React.ReactNode;
}

export const Panel: React.FC<PanelProps> = ({ title, borderColor = COLORS.border, children, ...props }) => {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      paddingX={1}
      {...props}
    >
      {title && (
        <Box marginTop={-1} paddingX={1}>
          <Text bold color={borderColor} backgroundColor="black"> {title} </Text>
        </Box>
      )}
      {children}
    </Box>
  );
};
