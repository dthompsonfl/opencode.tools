/**
 * Foundry TUI - Layout Components
 * Header, Footer, Navigation, and MainLayout
 */

import React from 'react';
import { Box, Text } from 'ink';
import { useStore } from '../../store/store';
import { selectDashboardMetrics } from '../../store/selectors';
import { COLORS, THEME, TEXT_STYLES } from '../../theme';
import { FoundryScreen, SCREEN_ORDER, SCREEN_LABELS, SCREEN_SHORTCUTS } from '../../types';
import { Badge, StatusIndicator } from '../../components/common';

// =============================================================================
// Header Component
// =============================================================================

export function Header(): React.ReactElement {
  const { state } = useStore();
  const metrics = selectDashboardMetrics(state);
  const activeProject = state.projects.find((p: typeof state.projects[0]) => p.id === state.activeProjectId);

  return React.createElement(Box, { ...THEME.header },
    React.createElement(Box, null,
      React.createElement(Text, { bold: true, color: COLORS.primaryBright }, '> Foundry'),
      React.createElement(Text, null, ' | '),
      React.createElement(Text, { bold: true }, activeProject?.name || 'No Active Project'),
      React.createElement(Text, null, ' | '),
      React.createElement(Text, { color: COLORS.warning }, state.phase)
    ),
    React.createElement(Box, null,
      React.createElement(StatusIndicator, {
        connected: state.connection === 'connected',
        label: state.connection
      }),
      React.createElement(Text, null, ' | Agents: '),
      React.createElement(Text, { bold: true, color: COLORS.primary }, metrics.activeAgents.toString()),
      React.createElement(Text, null, '/'),
      React.createElement(Text, null, metrics.totalAgents.toString())
    )
  );
}

// =============================================================================
// Navigation Component
// =============================================================================

export function Navigation(): React.ReactElement {
  const { state, dispatch } = useStore();

  const handleSelect = (screen: FoundryScreen) => {
    dispatch({ type: 'SET_SCREEN', screen });
  };

  return React.createElement(Box, { ...THEME.navigation, marginBottom: 1 },
    SCREEN_ORDER.map((screen: FoundryScreen) => {
      const isActive = state.screen === screen;
      const shortcut = SCREEN_SHORTCUTS[screen];
      return React.createElement(Box, {
        key: screen,
        marginRight: 2,
      },
        React.createElement(Text, {
          color: isActive ? COLORS.highlight : COLORS.muted,
          bold: isActive,
        }, `${shortcut}:${SCREEN_LABELS[screen]}`)
      );
    })
  );
}

// =============================================================================
// Footer Component
// =============================================================================

export function Footer(): React.ReactElement {
  const { state } = useStore();

  return React.createElement(Box, { ...THEME.footer, marginTop: 1 },
    React.createElement(Box, null,
      React.createElement(Text, { color: COLORS.muted },
        'Ctrl+H: Help | Ctrl+N: New Project | 1-6: Screens | Tab: Focus | Esc: Back'
      )
    ),
    React.createElement(Box, null,
      React.createElement(Text, { color: COLORS.muted }, 'Focus: '),
      React.createElement(Text, { bold: true, color: COLORS.primaryBright }, state.navigation.focusedPanel)
    )
  );
}

// =============================================================================
// Breadcrumbs Component
// =============================================================================

export function Breadcrumbs(): React.ReactElement {
  const { state } = useStore();
  const { breadcrumbs } = state.navigation;

  if (breadcrumbs.length <= 1) {
    return React.createElement(Box, { height: 0 });
  }

  return React.createElement(Box, { marginBottom: 1 },
    breadcrumbs.map((crumb: typeof breadcrumbs[0], index: number) =>
      React.createElement(Box, { key: crumb.screen },
        React.createElement(Text, {
          color: index === breadcrumbs.length - 1 ? COLORS.primaryBright : COLORS.muted,
          bold: index === breadcrumbs.length - 1,
        }, crumb.label),
        index < breadcrumbs.length - 1 && React.createElement(Text, { color: COLORS.muted }, ' > ')
      )
    )
  );
}

// =============================================================================
// MainLayout Component
// =============================================================================

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps): React.ReactElement {
  const { state } = useStore();

  return React.createElement(Box, {
    flexDirection: 'column',
    height: process.stdout.rows || 40,
  },
    React.createElement(Header),
    React.createElement(Navigation),
    React.createElement(Breadcrumbs),
    React.createElement(Box, {
      flexDirection: 'row',
      flexGrow: 1,
    },
      React.createElement(Box, {
        flexDirection: 'column',
        flexGrow: 1,
        padding: 1,
      }, children)
    ),
    React.createElement(Footer)
  );
}
