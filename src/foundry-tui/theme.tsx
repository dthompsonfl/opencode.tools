import { BoxProps } from 'ink';

export const FOUNDRY_COLORS = {
  primary: 'cyan',
  secondary: 'blue',
  success: 'green',
  warning: 'yellow',
  error: 'red',
  muted: 'gray',
  border: 'white',
  highlight: 'magenta',
};

export const FOUNDRY_THEME = {
  appFrame: {
    flexDirection: 'column',
    borderStyle: 'double',
    borderColor: FOUNDRY_COLORS.border,
    paddingX: 1,
    paddingY: 0,
  } as BoxProps,
  panel: {
    flexDirection: 'column',
    borderStyle: 'round',
    borderColor: FOUNDRY_COLORS.border,
    paddingX: 1,
    paddingY: 0,
  } as BoxProps,
};

export function buildProgressBar(percent: number, width = 24): string {
  const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
  const filled = Math.round((safePercent / 100) * width);
  const empty = Math.max(0, width - filled);
  return `[${'#'.repeat(filled)}${'-'.repeat(empty)}] ${safePercent}%`;
}
