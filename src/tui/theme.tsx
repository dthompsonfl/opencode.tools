import { BoxProps } from 'ink';

export const COLORS = {
  primary: '#00BFFF',     // DeepSkyBlue - Main brand
  secondary: '#FF00FF',   // Magenta - Accents
  success: '#00FF00',     // Lime - Success
  warning: '#FFFF00',     // Yellow - Warnings
  error: '#FF0000',       // Red - Errors
  info: '#00FFFF',        // Cyan - Info
  text: '#E0E0E0',        // Light Gray - Main Text
  muted: '#666666',       // Dark Gray - Muted Text
  border: '#444444',      // Gray - Borders
  highlight: '#FFFFFF',   // White - Highlights
  background: '#1a1a1a',  // Dark Background (simulated)
};

export const THEME = {
  box: {
    borderStyle: 'round',
    borderColor: COLORS.border,
    paddingX: 1,
  } as BoxProps,
  panel: {
    borderStyle: 'single',
    borderColor: COLORS.border,
    flexDirection: 'column',
    padding: 1,
  } as BoxProps,
};
