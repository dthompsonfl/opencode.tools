/**
 * Foundry TUI - Agent Delegation Panel
 * Task delegation interface with agent selection, priority, and context
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { COLORS, TEXT_STYLES, getStatusIcon, getStatusColor, getRoleColor, getRoleLabel } from '../../theme';
import type { TeamMember, AgentRole } from '../../types';

// =============================================================================
// Type Definitions
// =============================================================================

export interface DelegationRequest {
  agentId: string;
  task: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  context?: string;
}

export interface DelegationPanelProps {
  projectId: string;
  teamId?: string;
  onDelegate: (request: DelegationRequest) => void;
  onCancel: () => void;
  defaultAgentId?: string;
}

type FocusArea = 'agent' | 'task' | 'priority' | 'context' | 'actions';
type PriorityLevel = 'low' | 'normal' | 'high' | 'critical';

interface AgentWithDetails extends TeamMember {
  status: 'available' | 'busy' | 'offline';
}

// =============================================================================
// Constants
// =============================================================================

const PRIORITIES: PriorityLevel[] = ['low', 'normal', 'high', 'critical'];

const PRIORITY_COLORS: Record<PriorityLevel, string> = {
  low: COLORS.muted,
  normal: COLORS.primary,
  high: COLORS.warning,
  critical: COLORS.error,
};

// =============================================================================
// Mock Data - In production, this would come from props or context
// =============================================================================

const MOCK_AGENTS: AgentWithDetails[] = [
  { id: 'arch-1', name: 'Architect Alpha', role: 'architect', roleLabel: 'Architect', status: 'available', availability: 100, isActive: true, joinedAt: Date.now(), lastActivity: Date.now() },
  { id: 'impl-1', name: 'Implementer Beta', role: 'implementer', roleLabel: 'Implementer', status: 'busy', availability: 25, currentTask: 'Refactoring auth module', isActive: true, joinedAt: Date.now(), lastActivity: Date.now() },
  { id: 'qa-1', name: 'QA Lead Gamma', role: 'qa', roleLabel: 'QA Lead', status: 'available', availability: 80, isActive: true, joinedAt: Date.now(), lastActivity: Date.now() },
  { id: 'sec-1', name: 'Security Lead', role: 'security', roleLabel: 'Security Lead', status: 'offline', availability: 0, isActive: false, joinedAt: Date.now(), lastActivity: Date.now() - 3600000 },
  { id: 'pm-1', name: 'Product Manager', role: 'pm', roleLabel: 'Product Manager', status: 'available', availability: 90, isActive: true, joinedAt: Date.now(), lastActivity: Date.now() },
  { id: 'perf-1', name: 'Performance Expert', role: 'performance', roleLabel: 'Performance', status: 'busy', availability: 50, currentTask: 'Benchmarking queries', isActive: true, joinedAt: Date.now(), lastActivity: Date.now() },
];

// =============================================================================
// Helper Components
// =============================================================================

interface AgentListItemProps {
  agent: AgentWithDetails;
  isSelected: boolean;
  isHighlighted: boolean;
  index: number;
}

function AgentListItem({ agent, isSelected, isHighlighted, index }: AgentListItemProps): React.ReactElement {
  const statusIcon = getStatusIcon(agent.status === 'available' ? 'idle' : agent.status === 'busy' ? 'busy' : 'offline');
  const statusColor = getStatusColor(agent.status === 'available' ? 'idle' : agent.status === 'busy' ? 'busy' : 'offline');
  const roleColor = getRoleColor(agent.role);

  return (
    <Box
      paddingX={1}
      paddingY={0}
      borderStyle={isSelected ? 'single' : undefined}
      borderColor={isSelected ? COLORS.highlight : undefined}
    >
      <Text>
        <Text color={isSelected ? COLORS.highlight : COLORS.muted}>{isSelected ? '› ' : '  '}</Text>
        <Text color={statusColor}>{statusIcon}</Text>
        <Text> </Text>
        <Text color={roleColor}>{getRoleLabel(agent.role)}</Text>
        <Text color={COLORS.muted}> | </Text>
        <Text {...(isSelected ? TEXT_STYLES.selected : {})}>{agent.name}</Text>
        {agent.status === 'busy' && agent.currentTask && (
          <Text color={COLORS.muted}> ({agent.currentTask})</Text>
        )}
      </Text>
    </Box>
  );
}

interface PriorityButtonProps {
  priority: PriorityLevel;
  isSelected: boolean;
  isFocused: boolean;
  onClick: () => void;
}

function PriorityButton({ priority, isSelected, isFocused }: PriorityButtonProps): React.ReactElement {
  const color = PRIORITY_COLORS[priority];

  return (
    <Box
      paddingX={1}
      paddingY={0}
      borderStyle={isSelected || isFocused ? 'single' : undefined}
      borderColor={isSelected ? color : isFocused ? COLORS.highlight : undefined}
    >
      <Text>
        {isSelected && <Text color={color}>● </Text>}
        <Text color={isFocused ? COLORS.highlight : color} {...(isSelected ? TEXT_STYLES.selected : {})}>
          {priority.charAt(0).toUpperCase() + priority.slice(1)}
        </Text>
      </Text>
    </Box>
  );
}

interface ActionButtonProps {
  label: string;
  shortcut: string;
  isPrimary?: boolean;
  isFocused?: boolean;
}

function ActionButton({ label, shortcut, isPrimary = false, isFocused = false }: ActionButtonProps): React.ReactElement {
  return (
    <Box
      paddingX={2}
      paddingY={0}
      borderStyle={isFocused ? 'double' : 'single'}
      borderColor={isPrimary ? COLORS.success : isFocused ? COLORS.highlight : COLORS.muted}
    >
      <Text>
        <Text color={isFocused ? COLORS.highlight : COLORS.muted}>{`[${shortcut}] `}</Text>
        <Text
          color={isPrimary ? COLORS.success : undefined}
          {...(isPrimary || isFocused ? TEXT_STYLES.selected : {})}
        >
          {label}
        </Text>
      </Text>
    </Box>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function DelegationPanel({
  projectId,
  teamId,
  onDelegate,
  onCancel,
  defaultAgentId,
}: DelegationPanelProps): React.ReactElement {
  const { exit } = useApp();

  // Form state
  const [selectedAgentId, setSelectedAgentId] = useState<string>(defaultAgentId || '');
  const [taskDescription, setTaskDescription] = useState<string>('');
  const [priority, setPriority] = useState<PriorityLevel>('normal');
  const [context, setContext] = useState<string>('');

  // Navigation state
  const [focusArea, setFocusArea] = useState<FocusArea>('agent');
  const [agentIndex, setAgentIndex] = useState<number>(0);
  const [priorityIndex, setPriorityIndex] = useState<number>(1); // Default to 'normal'
  const [actionIndex, setActionIndex] = useState<number>(0);

  // Filter available agents
  const availableAgents = MOCK_AGENTS.filter(a => a.status !== 'offline');

  // Initialize with default agent
  useEffect(() => {
    if (defaultAgentId) {
      const index = availableAgents.findIndex(a => a.id === defaultAgentId);
      if (index >= 0) {
        setAgentIndex(index);
        setSelectedAgentId(defaultAgentId);
      }
    }
  }, [defaultAgentId, availableAgents]);

  // Handle keyboard input
  useInput((input, key) => {
    // Escape always cancels
    if (key.escape) {
      onCancel();
      return;
    }

    // Tab to navigate between focus areas
    if (key.tab) {
      const areas: FocusArea[] = ['agent', 'task', 'priority', 'context', 'actions'];
      const currentIndex = areas.indexOf(focusArea);
      const nextIndex = key.shift ? 
        (currentIndex - 1 + areas.length) % areas.length : 
        (currentIndex + 1) % areas.length;
      setFocusArea(areas[nextIndex]);
      return;
    }

    // Handle based on focus area
    switch (focusArea) {
      case 'agent':
        if (key.upArrow) {
          setAgentIndex(prev => {
            const newIndex = prev > 0 ? prev - 1 : availableAgents.length - 1;
            setSelectedAgentId(availableAgents[newIndex]?.id || '');
            return newIndex;
          });
        } else if (key.downArrow) {
          setAgentIndex(prev => {
            const newIndex = prev < availableAgents.length - 1 ? prev + 1 : 0;
            setSelectedAgentId(availableAgents[newIndex]?.id || '');
            return newIndex;
          });
        } else if (key.return) {
          setFocusArea('task');
        }
        break;

      case 'task':
        if (key.return) {
          setFocusArea('priority');
        } else if (key.backspace || key.delete) {
          setTaskDescription(prev => prev.slice(0, -1));
        } else if (input && !key.ctrl && !key.meta) {
          setTaskDescription(prev => prev + input);
        }
        break;

      case 'priority':
        if (key.leftArrow) {
          setPriorityIndex(prev => {
            const newIndex = prev > 0 ? prev - 1 : PRIORITIES.length - 1;
            setPriority(PRIORITIES[newIndex]);
            return newIndex;
          });
        } else if (key.rightArrow) {
          setPriorityIndex(prev => {
            const newIndex = prev < PRIORITIES.length - 1 ? prev + 1 : 0;
            setPriority(PRIORITIES[newIndex]);
            return newIndex;
          });
        } else if (key.return) {
          setFocusArea('context');
        }
        break;

      case 'context':
        if (key.return && !key.shift) {
          setFocusArea('actions');
        } else if (key.backspace || key.delete) {
          setContext(prev => prev.slice(0, -1));
        } else if (input && !key.ctrl && !key.meta) {
          setContext(prev => prev + input);
        }
        break;

      case 'actions':
        if (key.leftArrow || key.rightArrow) {
          setActionIndex(prev => prev === 0 ? 1 : 0);
        } else if (key.return) {
          if (actionIndex === 0) {
            // Cancel
            onCancel();
          } else {
            // Delegate
            if (selectedAgentId && taskDescription.trim()) {
              onDelegate({
                agentId: selectedAgentId,
                task: taskDescription.trim(),
                priority,
                context: context.trim() || undefined,
              });
            }
          }
        }
        break;
    }
  });

  // Get selected agent
  const selectedAgent = availableAgents.find(a => a.id === selectedAgentId);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={COLORS.border}
      paddingX={1}
      paddingY={0}
    >
      {/* Header */}
      <Box marginBottom={1}>
        <Text {...TEXT_STYLES.h2}>Delegate Task</Text>
        <Text color={COLORS.muted}> | Project: </Text>
        <Text color={COLORS.primaryBright}>{projectId}</Text>
        {teamId && (
          <>
            <Text color={COLORS.muted}> | Team: </Text>
            <Text color={COLORS.primary}>{teamId}</Text>
          </>
        )}
      </Box>

      {/* Agent Selection */}
      <Box flexDirection="column" marginBottom={1}>
        <Text {...TEXT_STYLES.label} color={focusArea === 'agent' ? COLORS.highlight : COLORS.muted}>
          {focusArea === 'agent' ? '› ' : '  '}Select Agent:
        </Text>
        <Box flexDirection="column" marginLeft={2}>
          {availableAgents.map((agent, index) => (
            <AgentListItem
              key={agent.id}
              agent={agent}
              isSelected={agent.id === selectedAgentId}
              isHighlighted={focusArea === 'agent' && index === agentIndex}
              index={index}
            />
          ))}
        </Box>
        {selectedAgent && (
          <Box marginLeft={2} marginTop={0}>
            <Text color={COLORS.muted}>Selected: </Text>
            <Text color={getRoleColor(selectedAgent.role)}>{selectedAgent.name}</Text>
          </Box>
        )}
      </Box>

      {/* Task Description */}
      <Box flexDirection="column" marginBottom={1}>
        <Text {...TEXT_STYLES.label} color={focusArea === 'task' ? COLORS.highlight : COLORS.muted}>
          {focusArea === 'task' ? '› ' : '  '}Task Description:
        </Text>
        <Box
          borderStyle={focusArea === 'task' ? 'double' : 'single'}
          borderColor={focusArea === 'task' ? COLORS.highlight : COLORS.borderDim}
          paddingX={1}
          minHeight={3}
        >
          <Text>{taskDescription || (focusArea === 'task' ? '' : <Text color={COLORS.muted}>Enter task description...</Text>)}</Text>
          {focusArea === 'task' && <Text color={COLORS.highlight}>▌</Text>}
        </Box>
      </Box>

      {/* Priority Selection */}
      <Box flexDirection="column" marginBottom={1}>
        <Text {...TEXT_STYLES.label} color={focusArea === 'priority' ? COLORS.highlight : COLORS.muted}>
          {focusArea === 'priority' ? '› ' : '  '}Priority:
        </Text>
        <Box flexDirection="row" marginLeft={2}>
          {PRIORITIES.map((p, index) => (
            <Box key={p} marginRight={1}>
              <PriorityButton
                priority={p}
                isSelected={priority === p}
                isFocused={focusArea === 'priority' && priorityIndex === index}
                onClick={() => { setPriority(p); setPriorityIndex(index); }}
              />
            </Box>
          ))}
        </Box>
      </Box>

      {/* Context/Attachments */}
      <Box flexDirection="column" marginBottom={1}>
        <Text {...TEXT_STYLES.label} color={focusArea === 'context' ? COLORS.highlight : COLORS.muted}>
          {focusArea === 'context' ? '› ' : '  '}Context / Attachments (optional):
        </Text>
        <Box
          borderStyle={focusArea === 'context' ? 'double' : 'single'}
          borderColor={focusArea === 'context' ? COLORS.highlight : COLORS.borderDim}
          paddingX={1}
          minHeight={2}
        >
          <Text>{context || (focusArea === 'context' ? '' : <Text color={COLORS.muted}>Additional context...</Text>)}</Text>
          {focusArea === 'context' && <Text color={COLORS.highlight}>▌</Text>}
        </Box>
      </Box>

      {/* Action Buttons */}
      <Box flexDirection="row" justifyContent="flex-end" marginTop={1}>
        <Box marginRight={2}>
          <ActionButton
            label="Cancel"
            shortcut="Esc"
            isFocused={focusArea === 'actions' && actionIndex === 0}
          />
        </Box>
        <ActionButton
          label="Delegate"
          shortcut="Enter"
          isPrimary={true}
          isFocused={focusArea === 'actions' && actionIndex === 1}
        />
      </Box>

      {/* Help Footer */}
      <Box marginTop={1} borderStyle="single" borderColor={COLORS.borderDim} paddingX={1}>
        <Text color={COLORS.muted}>
          Navigation: <Text color={COLORS.highlight}>Tab</Text> to move • 
          <Text color={COLORS.highlight}>↑↓</Text> agent list • 
          <Text color={COLORS.highlight}>←→</Text> priority/actions • 
          <Text color={COLORS.highlight}>Enter</Text> to select • 
          <Text color={COLORS.highlight}>Esc</Text> to cancel
        </Text>
      </Box>
    </Box>
  );
}

// =============================================================================
// Default Export
// =============================================================================

export default DelegationPanel;
