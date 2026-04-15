import { COLORS as THEME_COLORS } from './theme';

export const COLORS = {
  ...THEME_COLORS,
  // Add any missing ones or aliases
  highlight: '#1E90FF',
};

export const STYLES = {
  header: {
    color: COLORS.primary,
    bold: true,
  },
  label: {
    color: COLORS.secondary,
    bold: true,
  },
  value: {
    color: COLORS.text,
  },
  border: {
    borderStyle: 'round',
    borderColor: COLORS.border,
  },
};
