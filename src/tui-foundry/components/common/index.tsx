/**
 * Foundry TUI - Common Components
 * Reusable UI components
 */

import React from 'react';
import { Box, Text } from 'ink';
import { COLORS, TEXT_STYLES } from '../../theme';

// =============================================================================
// Panel Component
// =============================================================================

interface PanelProps {
  title?: string;
  children?: React.ReactNode;
  width?: number | string;
  height?: number;
  compact?: boolean;
  borderColor?: string;
}

export function Panel({
  title,
  children,
  width,
  height,
  compact = false,
  borderColor = COLORS.border,
}: PanelProps): React.ReactElement {
  return (
    React.createElement(Box, {
      flexDirection: 'column',
      borderStyle: compact ? 'single' : 'round',
      borderColor,
      width,
      height,
      paddingX: 1,
    },
      title && React.createElement(Box, { marginBottom: 1 }, React.createElement(Text, { ...TEXT_STYLES.h2 }, title)),
      children || React.createElement(Box)
    )
  );
}

// =============================================================================
// Badge Component
// =============================================================================

interface BadgeProps {
  status: string;
  text?: string;
  showIcon?: boolean;
}

export function Badge({ status, text, showIcon = true }: BadgeProps): React.ReactElement {
  const getColor = (s: string): string => {
    switch (s.toLowerCase()) {
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
  };

  const getIcon = (s: string): string => {
    switch (s.toLowerCase()) {
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
  };

  const color = getColor(status);
  const icon = getIcon(status);
  const displayText = text || status;

  return React.createElement(Text, { color },
    showIcon ? `${icon} ${displayText}` : displayText
  );
}

// =============================================================================
// ProgressBar Component
// =============================================================================

interface ProgressBarProps {
  percent: number;
  width?: number;
  showPercent?: boolean;
  color?: string;
}

export function ProgressBar({
  percent,
  width = 24,
  showPercent = true,
  color = COLORS.primary,
}: ProgressBarProps): React.ReactElement {
  const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
  const filled = Math.round((safePercent / 100) * width);
  const empty = Math.max(0, width - filled);

  return React.createElement(Text, null,
    '[',
    React.createElement(Text, { color }, '#'.repeat(filled)),
    '-'.repeat(empty),
    ']',
    showPercent ? ` ${safePercent}%` : ''
  );
}

// =============================================================================
// Spinner Component
// =============================================================================

interface SpinnerProps {
  text?: string;
  color?: string;
}

export function Spinner({ text = 'Loading...', color = COLORS.primaryBright }: SpinnerProps): React.ReactElement {
  const [frame, setFrame] = React.useState(0);
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

  React.useEffect(() => {
    const timer = setInterval(() => {
      setFrame((prev) => (prev + 1) % frames.length);
    }, 80);
    return () => clearInterval(timer);
  }, []);

  return React.createElement(Text, { color },
    `${frames[frame]} ${text}`
  );
}

// =============================================================================
// StatusIndicator Component
// =============================================================================

interface StatusIndicatorProps {
  connected: boolean;
  label?: string;
}

export function StatusIndicator({ connected, label }: StatusIndicatorProps): React.ReactElement {
  return React.createElement(Text, null,
    React.createElement(Text, { color: connected ? COLORS.success : COLORS.error },
      connected ? '●' : '○'
    ),
    label ? ` ${label}` : ''
  );
}

// =============================================================================
// Divider Component
// =============================================================================

interface DividerProps {
  width?: number;
  char?: string;
}

export function Divider({ width = 40, char = '─' }: DividerProps): React.ReactElement {
  return React.createElement(Text, { color: COLORS.muted }, char.repeat(width));
}

// =============================================================================
// KeyValue Component
// =============================================================================

interface KeyValueProps {
  label: string;
  value: string | number;
  labelWidth?: number;
}

export function KeyValue({ label, value, labelWidth = 12 }: KeyValueProps): React.ReactElement {
  return React.createElement(Box, null,
    React.createElement(Text, { color: COLORS.muted }, label.padEnd(labelWidth)),
    React.createElement(Text, null, value)
  );
}

// =============================================================================
// Timestamp Component
// =============================================================================

interface TimestampProps {
  timestamp: number;
  format?: 'time' | 'date' | 'relative';
}

export function Timestamp({ timestamp, format = 'time' }: TimestampProps): React.ReactElement {
  const formatTime = (ts: number): string => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts: number): string => {
    const date = new Date(ts);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatRelative = (ts: number): string => {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  let text: string;
  switch (format) {
    case 'date':
      text = formatDate(timestamp);
      break;
    case 'relative':
      text = formatRelative(timestamp);
      break;
    case 'time':
    default:
      text = formatTime(timestamp);
  }

  return React.createElement(Text, { color: COLORS.muted }, text);
}
