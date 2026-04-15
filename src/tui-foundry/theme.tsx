/**
 * Foundry TUI - Theme and Styling
 * Corporate-level professional theme for terminal UI
 */

import { BoxProps, TextProps } from 'ink';

// =============================================================================
// Color Palette
// =============================================================================

export const COLORS = {
  // Primary palette
  primary: 'blue',
  primaryBright: 'cyan',
  secondary: 'magenta',
  
  // Status colors
  success: 'green',
  successBright: 'greenBright',
  warning: 'yellow',
  warningBright: 'yellowBright',
  error: 'red',
  errorBright: 'redBright',
  
  // Neutral colors
  muted: 'gray',
  mutedBright: 'gray',
  border: 'white',
  borderDim: 'gray',
  background: 'black',
  
  // Highlight colors
  highlight: 'cyan',
  highlightBright: 'cyanBright',
  accent: 'magenta',
} as const;

// =============================================================================
// Theme Configuration
// =============================================================================

export const THEME = {
  // App frame
  appFrame: {
    flexDirection: 'column',
    borderStyle: 'double',
    borderColor: COLORS.border,
    paddingX: 1,
    paddingY: 0,
  } as BoxProps,
  
  // Panel styling
  panel: {
    flexDirection: 'column',
    borderStyle: 'round',
    borderColor: COLORS.border,
    paddingX: 1,
    paddingY: 0,
  } as BoxProps,
  
  panelCompact: {
    flexDirection: 'column',
    borderStyle: 'single',
    borderColor: COLORS.borderDim,
    paddingX: 1,
    paddingY: 0,
  } as BoxProps,
  
  // Header styling
  header: {
    height: 3,
    borderStyle: 'single',
    borderColor: COLORS.primaryBright,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingX: 1,
  } as BoxProps,
  
  // Footer styling
  footer: {
    height: 2,
    borderStyle: 'single',
    borderColor: COLORS.muted,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingX: 1,
  } as BoxProps,
  
  // Navigation styling
  navigation: {
    flexDirection: 'row',
    borderStyle: 'single',
    borderColor: COLORS.borderDim,
    paddingX: 1,
    paddingY: 0,
  } as BoxProps,
  
  // Input styling
  input: {
    borderStyle: 'single',
    borderColor: COLORS.primary,
    paddingX: 1,
  } as BoxProps,
  
  inputFocused: {
    borderStyle: 'double',
    borderColor: COLORS.highlightBright,
    paddingX: 1,
  } as BoxProps,
  
  // Card styling
  card: {
    flexDirection: 'column',
    borderStyle: 'round',
    borderColor: COLORS.border,
    paddingX: 1,
    paddingY: 0,
    marginY: 0,
    marginX: 0,
  } as BoxProps,
  
  cardSelected: {
    flexDirection: 'column',
    borderStyle: 'double',
    borderColor: COLORS.highlight,
    paddingX: 1,
    paddingY: 0,
  } as BoxProps,
  
  // Message styling
  messageBubble: {
    paddingX: 1,
    paddingY: 0,
    marginY: 0,
  } as BoxProps,
  
  // List styling
  list: {
    flexDirection: 'column',
    flexGrow: 1,
  } as BoxProps,
  
  listItem: {
    paddingX: 1,
    paddingY: 0,
  } as BoxProps,
  
  listItemSelected: {
    paddingX: 1,
    paddingY: 0,
  } as BoxProps,
} as const;

// =============================================================================
// Text Styles
// =============================================================================

export const TEXT_STYLES = {
  // Headers
  h1: {
    bold: true,
    color: COLORS.primaryBright,
  } as TextProps,
  
  h2: {
    bold: true,
    color: COLORS.primary,
  } as TextProps,
  
  h3: {
    bold: false,
    color: COLORS.primary,
  } as TextProps,
  
  // Body text
  body: {
    color: undefined,
  } as TextProps,
  
  bodyMuted: {
    color: COLORS.muted,
  } as TextProps,
  
  // Labels
  label: {
    bold: true,
    color: COLORS.muted,
  } as TextProps,
  
  labelHighlight: {
    bold: true,
    color: COLORS.highlight,
  } as TextProps,
  
  // Status text
  success: {
    color: COLORS.success,
  } as TextProps,
  
  warning: {
    color: COLORS.warning,
  } as TextProps,
  
  error: {
    color: COLORS.error,
  } as TextProps,
  
  // Interactive
  link: {
    color: COLORS.primaryBright,
  } as TextProps,
  
  selected: {
    bold: true,
    color: COLORS.highlight,
  } as TextProps,
  
  disabled: {
    color: COLORS.muted,
  } as TextProps,
} as const;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Build a progress bar string
 */
export function buildProgressBar(percent: number, width = 24): string {
  const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
  const filled = Math.round((safePercent / 100) * width);
  const empty = Math.max(0, width - filled);
  return `[${'#'.repeat(filled)}${'-'.repeat(empty)}] ${safePercent}%`;
}

/**
 * Get color based on status
 */
export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'passed':
    case 'success':
    case 'completed':
    case 'idle':
    case 'available':
      return COLORS.success;
    case 'failed':
    case 'error':
    case 'blocked':
      return COLORS.error;
    case 'running':
    case 'busy':
    case 'in_progress':
    case 'warning':
      return COLORS.warning;
    case 'pending':
    case 'connecting':
    case 'paused':
      return COLORS.muted;
    default:
      return COLORS.muted;
  }
}

/**
 * Get icon for status
 */
export function getStatusIcon(status: string): string {
  switch (status.toLowerCase()) {
    case 'passed':
    case 'success':
    case 'completed':
      return '✓';
    case 'failed':
    case 'error':
      return '✗';
    case 'blocked':
      return '⊘';
    case 'running':
    case 'busy':
      return '●';
    case 'pending':
      return '○';
    case 'idle':
    case 'available':
      return '◌';
    default:
      return '○';
  }
}

/**
 * Get color for agent role
 */
export function getRoleColor(role: string): string {
  switch (role.toLowerCase()) {
    case 'cto':
      return COLORS.primaryBright;
    case 'pm':
      return COLORS.secondary;
    case 'architect':
      return COLORS.accent;
    case 'implementer':
      return COLORS.primary;
    case 'qa':
      return COLORS.warning;
    case 'security':
      return COLORS.error;
    case 'docs':
      return COLORS.success;
    case 'performance':
      return COLORS.highlight;
    case 'reviewer':
      return COLORS.muted;
    default:
      return COLORS.muted;
  }
}

/**
 * Get label for agent role
 */
export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    cto: 'CTO Orchestrator',
    pm: 'Product Manager',
    architect: 'Architect',
    implementer: 'Implementer',
    qa: 'QA Lead',
    security: 'Security Lead',
    docs: 'Tech Writer',
    performance: 'Performance',
    reviewer: 'Reviewer',
  };
  return labels[role.toLowerCase()] || role;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format duration in ms to human readable
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}

/**
 * Format timestamp to time string
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * Format timestamp to date string
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Format timestamp to relative time
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}
