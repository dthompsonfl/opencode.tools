/**
 * Foundry TUI - Dashboard Screen
 * Comprehensive project management dashboard with corporate-level controls
 */

import React from 'react';
import { Box, Text, useInput } from 'ink';
import { useStore, useSelector } from '../store/store';
import { useTeam, useAgentActivity } from '../cowork/hooks';
import { Panel, Badge, ProgressBar, Spinner } from '../components/common';
import { COLORS, THEME, TEXT_STYLES, formatTime, formatRelativeTime, getStatusColor } from '../theme';
import type {
  FoundryScreen,
  TeamMember,
  TeamStatus,
  QualityGate,
  QualityGateStatus,
  Agent,
  CollaborationEntry,
  ActivityType,
} from '../types';
import { PHASE_LABELS, SCREEN_SHORTCUTS } from '../types';

// =============================================================================
// Types
// =============================================================================

type PanelId = 'header' | 'team' | 'gates' | 'work' | 'activity' | 'footer';
type QuickActionId = 'chat' | 'details' | 'gates' | 'release' | 'settings';

interface QuickAction {
  id: QuickActionId;
  key: string;
  label: string;
  shortcut: string;
}

// =============================================================================
// Constants
// =============================================================================

const STATUS_ICONS: Record<TeamStatus, string> = {
  available: '🟢',
  busy: '🟡',
  blocked: '🔴',
  offline: '⚪',
};

const GATE_ICONS: Record<QualityGateStatus, string> = {
  pending: '⏳',
  running: '🔄',
  passed: '✅',
  failed: '❌',
  blocked: '🚫',
};

const ACTIVITY_ICONS: Record<ActivityType, string> = {
  'agent:start': '🚀',
  'agent:progress': '📊',
  'agent:complete': '✅',
  'agent:error': '❌',
  'artifact:create': '📝',
  'artifact:update': '📄',
  'gate:pass': '🚦',
  'gate:fail': '🚫',
  'project:start': '🏢',
  'project:complete': '🎉',
  'message:received': '💬',
  'system:notification': '🔔',
};

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'chat', key: 'c', label: 'Chat', shortcut: '[C]' },
  { id: 'details', key: 'd', label: 'Details', shortcut: '[D]' },
  { id: 'gates', key: 'g', label: 'Run Gates', shortcut: '[G]' },
  { id: 'release', key: 'r', label: 'Release', shortcut: '[R]' },
  { id: 'settings', key: 's', label: 'Settings', shortcut: '[S]' },
];

// =============================================================================
// Main Dashboard Screen Component
// =============================================================================

export function DashboardScreen(): React.ReactElement {
  const { state, dispatch } = useStore();
  const team = useTeam();
  const agentActivity = useAgentActivity();
  const [focusedPanel, setFocusedPanel] = React.useState<PanelId>('team');
  const [selectedTeamIndex, setSelectedTeamIndex] = React.useState(0);
  const [selectedGateIndex, setSelectedGateIndex] = React.useState(0);
  const [selectedWorkIndex, setSelectedWorkIndex] = React.useState(0);
  const [selectedActivityIndex, setSelectedActivityIndex] = React.useState(0);
  const [activityFilter, setActivityFilter] = React.useState<ActivityType | 'all'>('all');
  const [showFilterMenu, setShowFilterMenu] = React.useState(false);

  // Get active project
  const activeProject = React.useMemo(() => {
    return state.projects.find(p => p.id === state.activeProjectId);
  }, [state.projects, state.activeProjectId]);

  // Filter activities
  const filteredActivities = React.useMemo(() => {
    if (activityFilter === 'all') return state.feed;
    return state.feed.filter(entry => entry.type === activityFilter);
  }, [state.feed, activityFilter]);

  // Get active agents with tasks
  const activeAgents = React.useMemo(() => {
    return agentActivity.activeAgents.filter(agent => agent.task);
  }, [agentActivity.activeAgents]);

  // Keyboard navigation
  useInput((input, key) => {
    // Number keys to jump to sections
    if (!key.ctrl && !key.meta && !showFilterMenu) {
      switch (input) {
        case '1':
          setFocusedPanel('header');
          return;
        case '2':
          setFocusedPanel('team');
          setSelectedTeamIndex(0);
          return;
        case '3':
          setFocusedPanel('gates');
          setSelectedGateIndex(0);
          return;
        case '4':
          setFocusedPanel('work');
          setSelectedWorkIndex(0);
          return;
        case '5':
          setFocusedPanel('activity');
          setSelectedActivityIndex(0);
          return;
      }
    }

    // Tab navigation between panels
    if (key.tab && !showFilterMenu) {
      const panels: PanelId[] = ['team', 'gates', 'work', 'activity'];
      const currentIdx = panels.indexOf(focusedPanel);
      const nextIdx = key.shift
        ? (currentIdx - 1 + panels.length) % panels.length
        : (currentIdx + 1) % panels.length;
      setFocusedPanel(panels[nextIdx]);
      return;
    }

    // Arrow keys for panel navigation
    if (!showFilterMenu) {
      switch (focusedPanel) {
        case 'team':
          if (key.upArrow) {
            setSelectedTeamIndex(prev => (prev > 0 ? prev - 1 : state.team.length - 1));
          } else if (key.downArrow) {
            setSelectedTeamIndex(prev => (prev < state.team.length - 1 ? prev + 1 : 0));
          }
          break;
        case 'gates':
          if (key.upArrow) {
            setSelectedGateIndex(prev => (prev > 0 ? prev - 1 : state.qualityGates.length - 1));
          } else if (key.downArrow) {
            setSelectedGateIndex(prev => (prev < state.qualityGates.length - 1 ? prev + 1 : 0));
          }
          break;
        case 'work':
          if (key.upArrow) {
            setSelectedWorkIndex(prev => (prev > 0 ? prev - 1 : activeAgents.length - 1));
          } else if (key.downArrow) {
            setSelectedWorkIndex(prev => (prev < activeAgents.length - 1 ? prev + 1 : 0));
          }
          break;
        case 'activity':
          if (key.upArrow) {
            setSelectedActivityIndex(prev => (prev > 0 ? prev - 1 : filteredActivities.length - 1));
          } else if (key.downArrow) {
            setSelectedActivityIndex(prev => (prev < filteredActivities.length - 1 ? prev + 1 : 0));
          }
          break;
      }
    }

    // Quick actions
    if (!key.ctrl && !key.meta && !showFilterMenu) {
      switch (input.toLowerCase()) {
        case 'c':
          dispatch({ type: 'SET_SCREEN', screen: 'chat' });
          return;
        case 'd':
          if (focusedPanel === 'team' && state.team[selectedTeamIndex]) {
            // View agent details - could dispatch to open agent detail modal
            dispatch({
              type: 'ADD_FEED_ENTRY',
              entry: {
                id: `feed-${Date.now()}`,
                type: 'system:notification',
                event: 'dashboard:view_details',
                actor: 'user',
                message: `Viewing details for ${state.team[selectedTeamIndex].name}`,
                timestamp: Date.now(),
              },
            });
          }
          return;
        case 'g':
          // Run all pending gates
          state.qualityGates
            .filter(g => g.status === 'pending')
            .forEach(g => dispatch({ type: 'RUN_GATE', gateId: g.id }));
          return;
        case 'r':
          if (state.phase === 'quality') {
            dispatch({ type: 'ADVANCE_PHASE' });
          }
          return;
        case 's':
          dispatch({ type: 'SET_SCREEN', screen: 'settings' });
          return;
        case 'f':
          setShowFilterMenu(true);
          return;
      }
    }

    // Filter menu navigation
    if (showFilterMenu) {
      const activityTypes: (ActivityType | 'all')[] = [
        'all',
        'agent:start',
        'agent:complete',
        'agent:error',
        'artifact:create',
        'gate:pass',
        'gate:fail',
        'project:start',
      ];
      
      if (key.upArrow) {
        const currentIdx = activityTypes.indexOf(activityFilter);
        const newIdx = currentIdx > 0 ? currentIdx - 1 : activityTypes.length - 1;
        setActivityFilter(activityTypes[newIdx]);
      } else if (key.downArrow) {
        const currentIdx = activityTypes.indexOf(activityFilter);
        const newIdx = currentIdx < activityTypes.length - 1 ? currentIdx + 1 : 0;
        setActivityFilter(activityTypes[newIdx]);
      } else if (key.return || key.escape) {
        setShowFilterMenu(false);
      }
      return;
    }

    // Enter key for selection
    if (key.return && !showFilterMenu) {
      switch (focusedPanel) {
        case 'team':
          if (state.team[selectedTeamIndex]) {
            const member = state.team[selectedTeamIndex];
            if (member.status === 'available') {
              dispatch({
                type: 'ADD_FEED_ENTRY',
                entry: {
                  id: `feed-${Date.now()}`,
                  type: 'system:notification',
                  event: 'dashboard:delegate',
                  actor: 'user',
                  message: `Opened delegation dialog for ${member.name}`,
                  timestamp: Date.now(),
                },
              });
            }
          }
          break;
        case 'gates':
          if (state.qualityGates[selectedGateIndex]) {
            const gate = state.qualityGates[selectedGateIndex];
            if (gate.status === 'pending') {
              dispatch({ type: 'RUN_GATE', gateId: gate.id });
            }
          }
          break;
      }
    }

    // Escape to close filter menu
    if (key.escape && showFilterMenu) {
      setShowFilterMenu(false);
    }
  });

  return React.createElement(Box, {
    flexDirection: 'column',
    flexGrow: 1,
    height: '100%',
  },
    // Header Section
    React.createElement(ProjectHeader, {
      project: activeProject,
      phase: state.phase,
      connection: state.connection,
      onPause: () => dispatch({ type: 'SET_PHASE', phase: state.phase }),
      onExport: () => dispatch({
        type: 'ADD_FEED_ENTRY',
        entry: {
          id: `feed-${Date.now()}`,
          type: 'system:notification',
          event: 'dashboard:export',
          actor: 'user',
          message: 'Exporting project report...',
          timestamp: Date.now(),
        },
      }),
      onSettings: () => dispatch({ type: 'SET_SCREEN', screen: 'settings' }),
      isFocused: focusedPanel === 'header',
    }),

    // Main Content Area
    React.createElement(Box, {
      flexDirection: 'row',
      flexGrow: 1,
      marginY: 1,
    },
      // Left Column: Team Status
      React.createElement(TeamStatusPanel, {
        members: state.team,
        selectedIndex: selectedTeamIndex,
        isFocused: focusedPanel === 'team',
      }),

      // Middle Column: Quality Gates
      React.createElement(QualityGatesPanel, {
        gates: state.qualityGates,
        selectedIndex: selectedGateIndex,
        isFocused: focusedPanel === 'gates',
      }),

      // Right Column: Active Work
      React.createElement(ActiveWorkPanel, {
        agents: activeAgents,
        selectedIndex: selectedWorkIndex,
        isFocused: focusedPanel === 'work',
      }),
    ),

    // Activity Feed
    React.createElement(ActivityFeedPanel, {
      activities: filteredActivities,
      selectedIndex: selectedActivityIndex,
      isFocused: focusedPanel === 'activity',
      filter: activityFilter,
      showFilterMenu,
    }),

    // Quick Actions Footer
    React.createElement(QuickActionsFooter, {
      actions: QUICK_ACTIONS,
      isFocused: focusedPanel === 'footer',
    }),

    // Help Bar
    React.createElement(Box, {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 1,
      borderStyle: 'single',
      borderColor: COLORS.muted,
      paddingX: 1,
    },
      React.createElement(Box, { flexDirection: 'row' },
        React.createElement(Text, { color: COLORS.muted }, '[Tab] Navigate  '),
        React.createElement(Text, { color: COLORS.muted }, '[1-5] Sections  '),
        React.createElement(Text, { color: COLORS.muted }, '[Enter] Select  '),
        React.createElement(Text, { color: COLORS.muted }, '[F] Filter Feed'),
      ),
      React.createElement(Box, { flexDirection: 'row' },
        React.createElement(Text, { color: COLORS.muted }, '[C] Chat  '),
        React.createElement(Text, { color: COLORS.muted }, '[D] Details  '),
        React.createElement(Text, { color: COLORS.muted }, '[G] Gates  '),
        React.createElement(Text, { color: COLORS.muted }, '[S] Settings  '),
        React.createElement(Text, { color: COLORS.muted }, '[Q] Quit'),
      ),
    ),
  );
}

// =============================================================================
// Project Header Component
// =============================================================================

interface ProjectHeaderProps {
  project?: { name: string; phase: string };
  phase: string;
  connection: 'connected' | 'connecting' | 'disconnected' | 'error';
  onPause: () => void;
  onExport: () => void;
  onSettings: () => void;
  isFocused: boolean;
}

function ProjectHeader({
  project,
  phase,
  connection,
  onPause,
  onExport,
  onSettings,
  isFocused,
}: ProjectHeaderProps): React.ReactElement {
  const connectionColor = {
    connected: COLORS.success,
    connecting: COLORS.warning,
    disconnected: COLORS.error,
    error: COLORS.error,
  }[connection];

  const connectionIcon = {
    connected: '🟢',
    connecting: '🟡',
    disconnected: '🔴',
    error: '❌',
  }[connection];

  return React.createElement(Box, {
    flexDirection: 'row',
    borderStyle: isFocused ? 'double' : 'single',
    borderColor: isFocused ? COLORS.highlight : COLORS.border,
    paddingX: 1,
    paddingY: 0,
    height: 3,
  },
    // Left: Project Info
    React.createElement(Box, { flexDirection: 'row', alignItems: 'center', width: '50%' },
      React.createElement(Text, { bold: true, color: COLORS.primaryBright }, '🏢 '),
      React.createElement(Text, { bold: true }, project?.name || 'No Project'),
      React.createElement(Text, { color: COLORS.muted }, ' v2.0  |  '),
      React.createElement(Text, { color: COLORS.warning }, PHASE_LABELS[phase as keyof typeof PHASE_LABELS] || phase),
    ),

    // Right: Status and Controls
    React.createElement(Box, { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', width: '50%' },
      React.createElement(Text, { color: connectionColor }, `${connectionIcon} ${connection.toUpperCase()}  `),
      React.createElement(Text, { color: COLORS.muted }, '|  '),
      React.createElement(Box, { flexDirection: 'row', marginLeft: 1 },
        React.createElement(QuickActionButton, { label: 'Pause', onPress: onPause }),
        React.createElement(QuickActionButton, { label: 'Export', onPress: onExport }),
        React.createElement(QuickActionButton, { label: 'Settings', onPress: onSettings }),
      ),
    ),
  );
}

function QuickActionButton({ label, onPress }: { label: string; onPress: () => void }): React.ReactElement {
  return React.createElement(Box, {
    borderStyle: 'single',
    borderColor: COLORS.borderDim,
    paddingX: 1,
    marginLeft: 1,
  },
    React.createElement(Text, { color: COLORS.primaryBright }, label),
  );
}

// =============================================================================
// Team Status Panel Component
// =============================================================================

interface TeamStatusPanelProps {
  members: TeamMember[];
  selectedIndex: number;
  isFocused: boolean;
}

function TeamStatusPanel({ members, selectedIndex, isFocused }: TeamStatusPanelProps): React.ReactElement {
  return React.createElement(Box, {
    flexDirection: 'column',
    width: '30%',
    marginRight: 1,
    borderStyle: isFocused ? 'double' : 'round',
    borderColor: isFocused ? COLORS.highlight : COLORS.border,
    paddingX: 1,
  },
    // Panel Header
    React.createElement(Box, { marginBottom: 1 },
      React.createElement(Text, { ...TEXT_STYLES.h2 }, 'Team Status'),
    ),

    // Team Members List
    React.createElement(Box, { flexDirection: 'column', flexGrow: 1 },
      members.length === 0 && React.createElement(Text, { color: COLORS.muted }, 'No team members'),
      members.map((member, index) =>
        React.createElement(TeamMemberRow, {
          key: member.id,
          member,
          isSelected: isFocused && index === selectedIndex,
        })
      ),
    ),

    // Legend
    React.createElement(Box, { flexDirection: 'row', marginTop: 1, borderStyle: 'single', borderColor: COLORS.borderDim, paddingX: 1 },
      React.createElement(Text, { color: COLORS.muted, wrap: 'truncate' },
        '🟢 Available  🟡 Busy  🔴 Blocked  ⚪ Offline'
      ),
    ),
  );
}

interface TeamMemberRowProps {
  member: TeamMember;
  isSelected: boolean;
}

function TeamMemberRow({ member, isSelected }: TeamMemberRowProps): React.ReactElement {
  const statusIcon = STATUS_ICONS[member.status];
  const statusColor = getStatusColor(member.status);

  return React.createElement(Box, {
    flexDirection: 'column',
    borderStyle: isSelected ? 'single' : undefined,
    borderColor: isSelected ? COLORS.highlight : undefined,
    paddingX: isSelected ? 0 : 1,
    marginY: 0,
    height: 3,
  },
    // Name and Status
    React.createElement(Box, { flexDirection: 'row', justifyContent: 'space-between' },
      React.createElement(Text, { bold: true }, `${statusIcon} ${member.name}`),
      React.createElement(Text, { color: statusColor }, member.roleLabel),
    ),
    // Current Task
    React.createElement(Text, {
      color: COLORS.muted,
      wrap: 'truncate-end',
    }, member.currentTask || 'No active task'),
  );
}

// =============================================================================
// Quality Gates Panel Component
// =============================================================================

interface QualityGatesPanelProps {
  gates: QualityGate[];
  selectedIndex: number;
  isFocused: boolean;
}

function QualityGatesPanel({ gates, selectedIndex, isFocused }: QualityGatesPanelProps): React.ReactElement {
  const sortedGates = React.useMemo(() => {
    return [...gates].sort((a, b) => a.order - b.order);
  }, [gates]);

  return React.createElement(Box, {
    flexDirection: 'column',
    width: '30%',
    marginRight: 1,
    borderStyle: isFocused ? 'double' : 'round',
    borderColor: isFocused ? COLORS.highlight : COLORS.border,
    paddingX: 1,
  },
    // Panel Header
    React.createElement(Box, { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1 },
      React.createElement(Text, { ...TEXT_STYLES.h2 }, 'Quality Gates'),
      React.createElement(GateSummary, { gates: sortedGates }),
    ),

    // Gates List
    React.createElement(Box, { flexDirection: 'column', flexGrow: 1 },
      sortedGates.length === 0 && React.createElement(Text, { color: COLORS.muted }, 'No quality gates'),
      sortedGates.map((gate, index) =>
        React.createElement(GateRow, {
          key: gate.id,
          gate,
          isSelected: isFocused && index === selectedIndex,
        })
      ),
    ),
  );
}

function GateSummary({ gates }: { gates: QualityGate[] }): React.ReactElement {
  const passed = gates.filter(g => g.status === 'passed').length;
  const total = gates.length;

  return React.createElement(Text, { color: COLORS.muted },
    `${passed}/${total} passed`
  );
}

interface GateRowProps {
  gate: QualityGate;
  isSelected: boolean;
}

function GateRow({ gate, isSelected }: GateRowProps): React.ReactElement {
  const icon = GATE_ICONS[gate.status];
  const statusColor = getStatusColor(gate.status);

  return React.createElement(Box, {
    flexDirection: 'column',
    borderStyle: isSelected ? 'single' : undefined,
    borderColor: isSelected ? COLORS.highlight : undefined,
    paddingX: isSelected ? 0 : 1,
    marginY: 0,
    height: 3,
  },
    // Gate Name and Status
    React.createElement(Box, { flexDirection: 'row', justifyContent: 'space-between' },
      React.createElement(Text, { bold: true }, `${icon} ${gate.name}`),
      React.createElement(Text, { color: statusColor }, gate.status),
    ),
    // Detail
    React.createElement(Text, {
      color: COLORS.muted,
      wrap: 'truncate-end',
    }, gate.detail),
  );
}

// =============================================================================
// Active Work Panel Component
// =============================================================================

interface ActiveWorkPanelProps {
  agents: (Agent & { activity?: { progress?: number; status?: string } })[];
  selectedIndex: number;
  isFocused: boolean;
}

function ActiveWorkPanel({ agents, selectedIndex, isFocused }: ActiveWorkPanelProps): React.ReactElement {
  return React.createElement(Box, {
    flexDirection: 'column',
    width: '40%',
    borderStyle: isFocused ? 'double' : 'round',
    borderColor: isFocused ? COLORS.highlight : COLORS.border,
    paddingX: 1,
  },
    // Panel Header
    React.createElement(Box, { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1 },
      React.createElement(Text, { ...TEXT_STYLES.h2 }, 'Active Work'),
      React.createElement(Text, { color: COLORS.muted }, `${agents.length} tasks running`),
    ),

    // Active Tasks List
    React.createElement(Box, { flexDirection: 'column', flexGrow: 1 },
      agents.length === 0 && React.createElement(Box, { flexDirection: 'column', alignItems: 'center', marginY: 2 },
        React.createElement(Text, { color: COLORS.muted }, 'No active tasks'),
        React.createElement(Text, { color: COLORS.muted, wrap: 'truncate' }, 'Team is idle or offline'),
      ),
      agents.map((agent, index) =>
        React.createElement(ActiveWorkRow, {
          key: agent.id,
          agent,
          isSelected: isFocused && index === selectedIndex,
        })
      ),
    ),
  );
}

interface ActiveWorkRowProps {
  agent: Agent & { activity?: { progress?: number; status?: string } };
  isSelected: boolean;
}

function ActiveWorkRow({ agent, isSelected }: ActiveWorkRowProps): React.ReactElement {
  const progress = agent.progress || agent.activity?.progress || 0;
  const elapsed = agent.startTime
    ? formatTime(Date.now() - agent.startTime)
    : 'N/A';

  return React.createElement(Box, {
    flexDirection: 'column',
    borderStyle: isSelected ? 'single' : undefined,
    borderColor: isSelected ? COLORS.highlight : undefined,
    paddingX: isSelected ? 0 : 1,
    marginY: 0,
    height: 4,
  },
    // Task and Agent
    React.createElement(Box, { flexDirection: 'row', justifyContent: 'space-between' },
      React.createElement(Text, { bold: true, wrap: 'truncate' }, `• ${agent.task || 'Unknown task'}`),
      React.createElement(Text, { color: COLORS.muted }, agent.name),
    ),
    // Progress Bar
    React.createElement(Box, { marginY: 0 },
      React.createElement(ProgressBar, { percent: progress, width: 30 }),
    ),
    // Time Elapsed
    React.createElement(Text, { color: COLORS.muted, wrap: 'truncate' },
      `  Time: ${elapsed}`
    ),
  );
}

// =============================================================================
// Activity Feed Panel Component
// =============================================================================

interface ActivityFeedPanelProps {
  activities: CollaborationEntry[];
  selectedIndex: number;
  isFocused: boolean;
  filter: ActivityType | 'all';
  showFilterMenu: boolean;
}

function ActivityFeedPanel({
  activities,
  selectedIndex,
  isFocused,
  filter,
  showFilterMenu,
}: ActivityFeedPanelProps): React.ReactElement {
  const displayActivities = activities.slice(0, 6);

  return React.createElement(Box, {
    flexDirection: 'column',
    marginTop: 1,
    borderStyle: isFocused ? 'double' : 'round',
    borderColor: isFocused ? COLORS.highlight : COLORS.border,
    paddingX: 1,
    height: 10,
  },
    // Panel Header
    React.createElement(Box, { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1 },
        React.createElement(Box, { flexDirection: 'row' },
        React.createElement(Text, { ...TEXT_STYLES.h2 }, 'Recent Activity'),
        filter !== 'all' && React.createElement(Box, { marginLeft: 1 },
          React.createElement(Text, { color: COLORS.muted }, `(Filtered: ${filter})`)
        ),
      ),
      React.createElement(Text, { color: COLORS.muted }, `${activities.length} events`),
    ),

    // Filter Menu
    showFilterMenu && React.createElement(Box, {
      flexDirection: 'column',
      borderStyle: 'single',
      borderColor: COLORS.highlight,
      paddingX: 1,
      marginBottom: 1,
    },
      React.createElement(Text, { bold: true, color: COLORS.highlight }, 'Filter by Type:'),
      React.createElement(FilterOption, { label: 'All Events', isSelected: filter === 'all' }),
      React.createElement(FilterOption, { label: 'Agent Events', isSelected: filter === 'agent:start' }),
      React.createElement(FilterOption, { label: 'Gate Events', isSelected: filter === 'gate:pass' }),
      React.createElement(FilterOption, { label: 'Project Events', isSelected: filter === 'project:start' }),
    ),

    // Activity List
    !showFilterMenu && React.createElement(Box, { flexDirection: 'column', flexGrow: 1 },
      displayActivities.length === 0 && React.createElement(Text, { color: COLORS.muted }, 'No recent activity'),
      displayActivities.map((entry, index) =>
        React.createElement(ActivityRow, {
          key: entry.id,
          entry,
          isSelected: isFocused && index === selectedIndex,
        })
      ),
    ),
  );
}

interface FilterOptionProps {
  label: string;
  isSelected: boolean;
}

function FilterOption({ label, isSelected }: FilterOptionProps): React.ReactElement {
  return React.createElement(Box, { flexDirection: 'row' },
    React.createElement(Text, { color: isSelected ? COLORS.highlight : COLORS.muted },
      isSelected ? '> ' : '  '
    ),
    React.createElement(Text, { color: isSelected ? COLORS.highlight : undefined }, label),
  );
}

interface ActivityRowProps {
  entry: CollaborationEntry;
  isSelected: boolean;
}

function ActivityRow({ entry, isSelected }: ActivityRowProps): React.ReactElement {
  const icon = ACTIVITY_ICONS[entry.type] || '📝';
  const time = formatTime(entry.timestamp);

  return React.createElement(Box, {
    flexDirection: 'row',
    borderStyle: isSelected ? 'single' : undefined,
    borderColor: isSelected ? COLORS.highlight : undefined,
    paddingX: isSelected ? 0 : 1,
    marginY: 0,
    height: 1,
  },
    React.createElement(Text, { color: COLORS.muted }, `[${time}] `),
    React.createElement(Text, null, `${icon} `),
    React.createElement(Text, { color: COLORS.primary, bold: true }, `${entry.actor} `),
    React.createElement(Text, { wrap: 'truncate-end' }, entry.message),
  );
}

// =============================================================================
// Quick Actions Footer Component
// =============================================================================

interface QuickActionsFooterProps {
  actions: QuickAction[];
  isFocused: boolean;
}

function QuickActionsFooter({ actions, isFocused }: QuickActionsFooterProps): React.ReactElement {
  return React.createElement(Box, {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 1,
    borderStyle: isFocused ? 'double' : 'single',
    borderColor: isFocused ? COLORS.highlight : COLORS.border,
    paddingX: 1,
    paddingY: 0,
  },
    actions.map((action, index) =>
      React.createElement(Box, {
        key: action.id,
        flexDirection: 'row',
        marginX: 2,
      },
        React.createElement(Text, { color: COLORS.highlight, bold: true }, action.shortcut),
        React.createElement(Box, { marginLeft: 1 },
          React.createElement(Text, { color: COLORS.muted }, action.label)
        ),
      )
    ),
  );
}

// =============================================================================
// Export
// =============================================================================

export default DashboardScreen;
