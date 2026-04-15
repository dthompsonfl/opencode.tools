/**
 * Foundry TUI - Real-Time Multi-Agent Collaboration Chat Interface
 * 
 * A comprehensive chat interface supporting multi-agent participation,
 * real-time updates via EventBus, message threading, agent mentions,
 * and artifact sharing.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { EventBus } from '../../../cowork/orchestrator/event-bus';
import { CollaborationProtocol } from '../../../cowork/team/collaboration-protocol';
import { logger } from '../../../runtime/logger';
import type { TeamMember } from '../../../cowork/team/team-types';
import type { Message, MessageRole, AgentRole } from '../../types';
import { COLORS, getRoleColor } from '../../theme';
import { Panel, Timestamp, Divider } from '../common';

// =============================================================================
// Types & Interfaces
// =============================================================================

export interface RealTimeChatProps {
  projectId: string;
  team: TeamMember[];
  onSendMessage?: (content: string) => void;
  onMentionAgent?: (agentId: string, message: string) => void;
  maxHeight?: number;
  showTimestamps?: boolean;
  compactMode?: boolean;
}

export interface ChatMessage extends Message {
  isGrouped?: boolean;
  threadDepth?: number;
  reactions?: string[];
  edited?: boolean;
  editedAt?: number;
}

// =============================================================================
// Constants
// =============================================================================

const TYPING_INDICATOR_DELAY = 3000;
const MESSAGE_GROUP_THRESHOLD = 60000; // 1 minute
const MAX_MESSAGE_HISTORY = 100;

const AGENT_COMMANDS = [
  { command: '/help', description: 'Show available commands' },
  { command: '/status', description: 'Show project status' },
  { command: '/agents', description: 'List active agents' },
  { command: '/clear', description: 'Clear chat history' },
  { command: '/thread', description: 'Start a new thread', args: '<title>' },
  { command: '/assign', description: 'Assign task to agent', args: '@agent <task>' },
  { command: '/review', description: 'Request code review', args: '<artifact>' },
  { command: '/escalate', description: 'Escalate to team lead', args: '<issue>' },
];

// =============================================================================
// Utility Functions
// =============================================================================

function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function extractMentions(text: string): string[] {
  const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
  const mentions: string[] = [];
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1].toLowerCase());
  }
  return [...new Set(mentions)];
}

function getAgentInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getRoleIcon(role: AgentRole): string {
  const icons: Record<AgentRole, string> = {
    cto: '◆',
    pm: '◈',
    architect: '△',
    implementer: '◉',
    qa: '□',
    security: '◊',
    docs: '○',
    performance: '◇',
    reviewer: '▽',
  };
  return icons[role] || '●';
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function groupMessages(messages: ChatMessage[]): ChatMessage[] {
  const grouped: ChatMessage[] = [];
  let lastSender: string | undefined;
  let lastTimestamp = 0;

  for (const message of messages) {
    const sender = message.agentId || message.role;
    const timeDiff = message.timestamp - lastTimestamp;
    const shouldGroup = sender === lastSender && timeDiff < MESSAGE_GROUP_THRESHOLD;

    grouped.push({
      ...message,
      isGrouped: shouldGroup,
    });

    lastSender = sender;
    lastTimestamp = message.timestamp;
  }

  return grouped;
}

// =============================================================================
// MessageBubble Component
// =============================================================================

export interface MessageBubbleProps {
  message: ChatMessage;
  team: TeamMember[];
  isCompact?: boolean;
  showTimestamp?: boolean;
  onReply?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
}

function MessageBubble({
  message,
  team,
  isCompact = false,
  showTimestamp = true,
}: MessageBubbleProps): React.ReactElement {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const agent = message.agentId 
    ? team.find(m => m.agentId === message.agentId || m.name.toLowerCase() === message.agentId?.toLowerCase()) 
    : undefined;
  
  const roleColor = isUser ? COLORS.success : isSystem ? COLORS.muted : getRoleColor(message.role);
  const roleLabel = message.agentName || (isUser ? 'You' : isSystem ? 'System' : message.role.toUpperCase());
  
  const initials = isUser ? 'ME' : isSystem ? 'SYS' : agent ? getAgentInitials(agent.name) : getAgentInitials(roleLabel);
  const icon = isUser ? '>' : isSystem ? '!' : getRoleIcon(message.role as AgentRole);

  const renderContent = () => {
    if (message.attachments && message.attachments.length > 0) {
      return React.createElement(Box, { flexDirection: 'column' },
        React.createElement(Text, null, message.content),
        message.attachments.map(attach => 
          React.createElement(Box, { 
            key: attach.id, 
            flexDirection: 'column', 
            marginTop: 1, 
            borderStyle: 'single', 
            borderColor: COLORS.borderDim, 
            paddingX: 1 
          },
            React.createElement(Box, { flexDirection: 'row' },
              React.createElement(Text, { color: COLORS.primaryBright }, '📎'),
              React.createElement(Text, { bold: true }, ` ${attach.name}`)
            ),
            React.createElement(Text, { color: COLORS.muted, dimColor: true },
              `${attach.type.toUpperCase()}${attach.size ? ` • ${formatFileSize(attach.size)}` : ''}`
            )
          )
        )
      );
    }

    const parts = message.content.split(/(@[a-zA-Z0-9_-]+)/g);
    
    return React.createElement(Text, null,
      parts.map((part, i) => {
        if (part.startsWith('@')) {
          return React.createElement(Text, { key: i, color: COLORS.warning, bold: true }, part);
        }
        return React.createElement(Text, { key: i }, part);
      }),
      message.edited && React.createElement(Text, { color: COLORS.muted, dimColor: true }, ' (edited)')
    );
  };

  if (isCompact || message.isGrouped) {
    return React.createElement(Box, { flexDirection: 'row', marginY: 0 },
      React.createElement(Box, { width: 3 }),
      React.createElement(Box, { flexDirection: 'column', flexGrow: 1 },
        renderContent(),
        message.reactions && message.reactions.length > 0 && 
          React.createElement(Box, { flexDirection: 'row', marginTop: 1 },
            message.reactions.map((emoji, i) => 
              React.createElement(Text, { key: i, color: COLORS.highlight }, `${emoji} `)
            )
          )
      ),
      showTimestamp && React.createElement(Box, { marginLeft: 1 },
        React.createElement(Timestamp, { timestamp: message.timestamp, format: 'relative' })
      )
    );
  }

  return React.createElement(Box, { flexDirection: 'row', marginY: 1 },
    React.createElement(Box, { width: 3, height: 1, justifyContent: 'center', alignItems: 'center' },
      React.createElement(Text, { bold: true, color: isSystem ? roleColor : roleColor },
        isSystem ? icon : initials
      )
    ),
    React.createElement(Box, { flexDirection: 'column', marginLeft: 1, flexGrow: 1 },
      React.createElement(Box, { flexDirection: 'row', justifyContent: 'space-between' },
        React.createElement(Box, { flexDirection: 'row' },
          React.createElement(Text, { bold: true, color: roleColor }, roleLabel),
          message.mentions && message.mentions.length > 0 &&
            React.createElement(Text, { color: COLORS.warning }, ` → @${message.mentions.join(' @')}`)
        ),
        showTimestamp && React.createElement(Timestamp, { timestamp: message.timestamp, format: 'time' })
      ),
      React.createElement(Box, { marginLeft: 0 }, renderContent()),
      message.reactions && message.reactions.length > 0 && 
        React.createElement(Box, { flexDirection: 'row', marginTop: 1 },
          message.reactions.map((emoji, i) => 
            React.createElement(Text, { key: i, color: COLORS.highlight }, `${emoji} `)
          )
        )
    )
  );
}

// =============================================================================
// TypingIndicator Component
// =============================================================================

interface TypingIndicatorProps {
  agentName: string;
  role: AgentRole;
}

function TypingIndicator({ agentName, role }: TypingIndicatorProps): React.ReactElement {
  const [frame, setFrame] = useState(0);
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const color = getRoleColor(role);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame(prev => (prev + 1) % frames.length);
    }, 80);
    return () => clearInterval(timer);
  }, []);

  return React.createElement(Box, { flexDirection: 'row', marginY: 1 },
    React.createElement(Box, { width: 3, justifyContent: 'center' },
      React.createElement(Text, { color }, frames[frame])
    ),
    React.createElement(Box, { marginLeft: 1 },
      React.createElement(Text, { color: COLORS.muted }, `${agentName} is typing...`)
    )
  );
}

// =============================================================================
// MentionAutocomplete Component
// =============================================================================

export interface MentionAutocompleteProps {
  query: string;
  team: TeamMember[];
  onSelect: (agentName: string) => void;
  selectedIndex: number;
}

function MentionAutocomplete({ query, team, selectedIndex }: MentionAutocompleteProps): React.ReactElement {
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return team
      .filter(m => 
        m.name.toLowerCase().includes(q) || 
        m.roleId.toLowerCase().includes(q) ||
        m.agentId.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [query, team]);

  if (filtered.length === 0) {
    return React.createElement(Box, { borderStyle: 'single', borderColor: COLORS.borderDim, paddingX: 1, marginTop: 1 },
      React.createElement(Text, { color: COLORS.muted }, `No agents found matching "${query}"`)
    );
  }

  return React.createElement(Box, { flexDirection: 'column', borderStyle: 'single', borderColor: COLORS.border, paddingX: 1, marginTop: 1 },
    React.createElement(Text, { color: COLORS.muted, dimColor: true, bold: true }, 'Mention agent:'),
    filtered.map((member, i) => React.createElement(Box, { key: member.agentId, flexDirection: 'row' },
      React.createElement(Text, { color: getRoleColor(member.roleId as AgentRole) },
        `${getRoleIcon(member.roleId as AgentRole)} `
      ),
      React.createElement(Text, { bold: i === selectedIndex, color: i === selectedIndex ? COLORS.primary : undefined },
        `@${member.name}`
      ),
      React.createElement(Text, { color: COLORS.muted },
        ` - ${member.roleId}`
      ),
      React.createElement(Box, { flexGrow: 1 }),
      React.createElement(Text, { color: COLORS.muted, dimColor: true },
        member.status === 'idle' ? '●' : member.status === 'busy' ? '○' : '⊘'
      )
    ))
  );
}

// =============================================================================
// CommandPalette Component
// =============================================================================

export interface CommandPaletteProps {
  onSelect: (command: string) => void;
  selectedIndex: number;
}

function CommandPalette({ selectedIndex }: CommandPaletteProps): React.ReactElement {
  return React.createElement(Box, { flexDirection: 'column', borderStyle: 'single', borderColor: COLORS.primary, paddingX: 1, marginTop: 1 },
    React.createElement(Text, { color: COLORS.primary, bold: true }, 'Commands:'),
    AGENT_COMMANDS.map((cmd, i) => React.createElement(Box, { key: cmd.command, flexDirection: 'row' },
      React.createElement(Text, { bold: true, color: i === selectedIndex ? COLORS.primary : COLORS.highlight },
        cmd.command
      ),
      React.createElement(Text, { color: COLORS.muted },
        cmd.args ? ` ${cmd.args}` : ''
      ),
      React.createElement(Box, { flexGrow: 1 }),
      React.createElement(Text, { color: COLORS.muted, dimColor: true },
        cmd.description
      )
    ))
  );
}

// =============================================================================
// ChatInput Component
// =============================================================================

export interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onMentionStart?: (query: string) => void;
  placeholder?: string;
  disabled?: boolean;
  multiline?: boolean;
  team?: TeamMember[];
}

function ChatInput({
  value,
  onChange,
  onSubmit,
  onMentionStart,
  placeholder = 'Type a message... (use @ to mention, / for commands)',
  disabled = false,
  multiline = true,
  team = [],
}: ChatInputProps): React.ReactElement {
  const [cursorPos, setCursorPos] = useState(value.length);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [showCommands, setShowCommands] = useState(false);
  const [commandIndex, setCommandIndex] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useInput((input, key) => {
    if (disabled) return;

    if (showMentions) {
      const filtered = team.filter(m => m.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 5);
      if (key.upArrow) {
        setMentionIndex(prev => (prev > 0 ? prev - 1 : filtered.length - 1));
        return;
      }
      if (key.downArrow) {
        setMentionIndex(prev => (prev < filtered.length - 1 ? prev + 1 : 0));
        return;
      }
      if (key.return && filtered[mentionIndex]) {
        const beforeMention = value.slice(0, value.lastIndexOf('@'));
        const newValue = `${beforeMention}@${filtered[mentionIndex].name} `;
        onChange(newValue);
        setCursorPos(newValue.length);
        setShowMentions(false);
        return;
      }
      if (key.escape) {
        setShowMentions(false);
        return;
      }
    }

    if (showCommands) {
      if (key.upArrow) {
        setCommandIndex(prev => (prev > 0 ? prev - 1 : AGENT_COMMANDS.length - 1));
        return;
      }
      if (key.downArrow) {
        setCommandIndex(prev => (prev < AGENT_COMMANDS.length - 1 ? prev + 1 : 0));
        return;
      }
      if (key.return) {
        const cmd = AGENT_COMMANDS[commandIndex];
        if (cmd) {
          onSubmit(cmd.command);
          setShowCommands(false);
          setHistory(prev => [cmd.command, ...prev].slice(0, 50));
        }
        return;
      }
      if (key.escape) {
        setShowCommands(false);
        return;
      }
    }

    if (key.upArrow && !showMentions && !showCommands && history.length > 0) {
      const newIndex = Math.min(historyIndex + 1, history.length - 1);
      setHistoryIndex(newIndex);
      onChange(history[newIndex] || '');
      setCursorPos((history[newIndex] || '').length);
      return;
    }
    if (key.downArrow && !showMentions && !showCommands && historyIndex >= 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      onChange(newIndex >= 0 ? history[newIndex] : '');
      setCursorPos(newIndex >= 0 ? history[newIndex].length : 0);
      return;
    }

    if (key.return && !key.shift && value.trim()) {
      onSubmit(value.trim());
      setHistory(prev => [value.trim(), ...prev].slice(0, 50));
      setHistoryIndex(-1);
      onChange('');
      setCursorPos(0);
      setShowMentions(false);
      setShowCommands(false);
      return;
    }

    if (input && !key.ctrl && !key.meta) {
      const newValue = value.slice(0, cursorPos) + input + value.slice(cursorPos);
      onChange(newValue);
      setCursorPos(prev => prev + input.length);

      const mentionMatch = newValue.match(/@([a-zA-Z0-9_]*)$/);
      if (mentionMatch) {
        setShowMentions(true);
        setMentionQuery(mentionMatch[1]);
        setMentionIndex(0);
        onMentionStart?.(mentionMatch[1]);
      } else {
        setShowMentions(false);
      }

      if (newValue === '/') {
        setShowCommands(true);
        setCommandIndex(0);
      } else if (!newValue.startsWith('/')) {
        setShowCommands(false);
      }
      return;
    }

    if (key.backspace) {
      if (cursorPos > 0) {
        const newValue = value.slice(0, cursorPos - 1) + value.slice(cursorPos);
        onChange(newValue);
        setCursorPos(prev => prev - 1);
        const mentionMatch = newValue.match(/@([a-zA-Z0-9_]*)$/);
        if (mentionMatch) {
          setShowMentions(true);
          setMentionQuery(mentionMatch[1]);
        } else {
          setShowMentions(false);
        }
      }
      return;
    }

    if (key.delete) {
      if (cursorPos < value.length) {
        const newValue = value.slice(0, cursorPos) + value.slice(cursorPos + 1);
        onChange(newValue);
      }
      return;
    }

    if (key.leftArrow && cursorPos > 0) {
      setCursorPos(prev => prev - 1);
      return;
    }

    if (key.rightArrow && cursorPos < value.length) {
      setCursorPos(prev => prev + 1);
      return;
    }

    if (key.return && key.shift && multiline) {
      const newValue = value.slice(0, cursorPos) + '\n' + value.slice(cursorPos);
      onChange(newValue);
      setCursorPos(prev => prev + 1);
      return;
    }
  });

  const lines = value.split('\n');
  const displayValue = lines[lines.length - 1] || '';
  const linePrefix = lines.length > 1 ? '... ' : '> ';

  return React.createElement(Box, { flexDirection: 'column' },
    showMentions && React.createElement(MentionAutocomplete, {
      query: mentionQuery,
      team,
      onSelect: (name) => {
        const beforeMention = value.slice(0, value.lastIndexOf('@'));
        onChange(`${beforeMention}@${name} `);
        setShowMentions(false);
      },
      selectedIndex: mentionIndex
    }),
    showCommands && React.createElement(CommandPalette, {
      onSelect: (cmd) => {
        onSubmit(cmd);
        setShowCommands(false);
      },
      selectedIndex: commandIndex
    }),
    React.createElement(Box, { borderStyle: 'single', borderColor: disabled ? COLORS.muted : COLORS.primary, paddingX: 1, marginTop: 1 },
      React.createElement(Text, { color: COLORS.primary }, linePrefix),
      React.createElement(Text, null, displayValue),
      !disabled && React.createElement(Text, { color: COLORS.primary }, ' '),
      value.length === 0 && !disabled && React.createElement(Text, { color: COLORS.muted, dimColor: true }, ` ${placeholder}`)
    ),
    value.length > 0 && React.createElement(Box, { flexDirection: 'row', justifyContent: 'space-between', marginTop: 0 },
      React.createElement(Text, { color: COLORS.muted, dimColor: true },
        `${value.length} chars${lines.length > 1 ? ` • ${lines.length} lines` : ''}${multiline ? ' • Shift+Enter for new line' : ''}`
      ),
      React.createElement(Text, { color: COLORS.muted, dimColor: true }, 'Enter to send')
    )
  );
}

// =============================================================================
// MessageList Component
// =============================================================================

export interface MessageListProps {
  messages: ChatMessage[];
  team: TeamMember[];
  typingAgents: Array<{ agentId: string; name: string; role: AgentRole }>;
  maxHeight?: number;
  showTimestamps?: boolean;
  compactMode?: boolean;
  onReply?: (messageId: string) => void;
}

function MessageList({
  messages,
  team,
  typingAgents,
  maxHeight,
  showTimestamps = true,
  compactMode = false,
  onReply,
}: MessageListProps): React.ReactElement {
  const groupedMessages = useMemo(() => groupMessages(messages), [messages]);

  if (messages.length === 0 && typingAgents.length === 0) {
    return React.createElement(Box, { flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flexGrow: 1, minHeight: 5 },
      React.createElement(Text, { color: COLORS.muted, dimColor: true }, 'No messages yet. Start the conversation!'),
      React.createElement(Text, { color: COLORS.muted, dimColor: true }, 'Use @ to mention agents, / for commands')
    );
  }

  const visibleMessages = maxHeight ? groupedMessages.slice(-maxHeight) : groupedMessages;

  return React.createElement(Box, { flexDirection: 'column', flexGrow: 1 },
    visibleMessages.map((message) => React.createElement(MessageBubble, {
      key: message.id,
      message,
      team,
      isCompact: compactMode,
      showTimestamp: showTimestamps,
      onReply
    })),
    typingAgents.map(agent => React.createElement(TypingIndicator, {
      key: agent.agentId,
      agentName: agent.name,
      role: agent.role
    }))
  );
}

// =============================================================================
// Main RealTimeChat Component
// =============================================================================

export function RealTimeChat({
  projectId,
  team,
  onSendMessage,
  onMentionAgent,
  maxHeight = 20,
  showTimestamps = true,
  compactMode = false,
}: RealTimeChatProps): React.ReactElement {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [typingAgents, setTypingAgents] = useState<Array<{ agentId: string; name: string; role: AgentRole }>>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [activeThread, setActiveThread] = useState<string | undefined>(undefined);
  
  const eventBus = useMemo(() => EventBus.getInstance(), []);
  const collaborationProtocol = useMemo(() => CollaborationProtocol.getInstance(), []);
  
  const unsubscribers = useRef<Array<() => void>>([]);
  const typingTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    setIsConnected(true);

    const unsubChat = eventBus.subscribe('chat:message', (payload: unknown) => {
      const data = payload as {
        id?: string;
        content: string;
        role?: MessageRole;
        agentId?: string;
        agentName?: string;
        threadId?: string;
        replyTo?: string;
        mentions?: string[];
        timestamp?: number;
        attachments?: Array<{ id: string; name: string; type: string; size?: number }>;
      };

      const newMessage: ChatMessage = {
        id: data.id || generateMessageId(),
        role: data.role || 'agent',
        content: data.content,
        timestamp: data.timestamp || Date.now(),
        agentId: data.agentId,
        agentName: data.agentName,
        threadId: data.threadId,
        replyTo: data.replyTo,
        mentions: data.mentions,
        attachments: data.attachments?.map(a => ({ ...a, size: a.size ?? 0 })),
      };

      setMessages(prev => [...prev, newMessage].slice(-MAX_MESSAGE_HISTORY));

      if (data.agentId) {
        setTypingAgents(prev => prev.filter(a => a.agentId !== data.agentId));
        clearTypingTimeout(data.agentId);
      }
    });
    unsubscribers.current.push(unsubChat);

    const unsubTypingStart = eventBus.subscribe('agent:typing:start', (payload: unknown) => {
      const data = payload as { agentId: string; agentName?: string; role?: AgentRole };
      const agent = team.find(m => m.agentId === data.agentId);
      if (agent) {
        setTypingAgents(prev => {
          const exists = prev.find(a => a.agentId === data.agentId);
          if (exists) return prev;
          return [...prev, { agentId: data.agentId, name: data.agentName || agent.name, role: (data.role || agent.roleId) as AgentRole }];
        });
        setTypingTimeout(data.agentId);
      }
    });
    unsubscribers.current.push(unsubTypingStart);

    const unsubTypingStop = eventBus.subscribe('agent:typing:stop', (payload: unknown) => {
      const data = payload as { agentId: string };
      setTypingAgents(prev => prev.filter(a => a.agentId !== data.agentId));
      clearTypingTimeout(data.agentId);
    });
    unsubscribers.current.push(unsubTypingStop);

    return () => {
      for (const unsub of unsubscribers.current) unsub();
      unsubscribers.current = [];
      for (const timeout of typingTimeouts.current.values()) clearTimeout(timeout);
      typingTimeouts.current.clear();
      setIsConnected(false);
    };
  }, [eventBus, team, projectId]);

  const setTypingTimeout = useCallback((agentId: string) => {
    const existing = typingTimeouts.current.get(agentId);
    if (existing) clearTimeout(existing);
    const timeout = setTimeout(() => {
      setTypingAgents(prev => prev.filter(a => a.agentId !== agentId));
      typingTimeouts.current.delete(agentId);
    }, TYPING_INDICATOR_DELAY);
    typingTimeouts.current.set(agentId, timeout);
  }, []);

  const clearTypingTimeout = useCallback((agentId: string) => {
    const existing = typingTimeouts.current.get(agentId);
    if (existing) {
      clearTimeout(existing);
      typingTimeouts.current.delete(agentId);
    }
  }, []);

  const handleCommand = useCallback((command: string) => {
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');

    const createSystemMessage = (content: string): ChatMessage => ({
      id: generateMessageId(),
      role: 'system',
      content,
      timestamp: Date.now(),
    });

    switch (cmd) {
      case '/clear':
        setMessages([]);
        break;
      case '/status':
        eventBus.publish('chat:command:status', { projectId });
        setMessages(prev => [...prev, createSystemMessage(`Project: ${projectId} | Team: ${team.length} agents | Messages: ${messages.length}`)].slice(-MAX_MESSAGE_HISTORY));
        break;
      case '/agents': {
        const agentList = team.map(m => `${m.name} (${m.status})`).join(', ');
        setMessages(prev => [...prev, createSystemMessage(`Active agents: ${agentList || 'None'}`)].slice(-MAX_MESSAGE_HISTORY));
        break;
      }
      case '/help':
        setMessages(prev => [...prev, createSystemMessage('Available commands: /clear, /status, /agents, /help, /assign @agent <task>, /review <artifact>')].slice(-MAX_MESSAGE_HISTORY));
        break;
      default:
        setMessages(prev => [...prev, createSystemMessage(`Unknown command: ${cmd}. Type /help for available commands.`)].slice(-MAX_MESSAGE_HISTORY));
    }
  }, [eventBus, projectId, team, messages.length]);

  const handleSendMessage = useCallback((content: string) => {
    if (!content.trim()) return;
    if (content.startsWith('/')) {
      handleCommand(content);
      return;
    }
    const mentions = extractMentions(content);
    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
      mentions: mentions.length > 0 ? mentions : undefined,
    };
    setMessages(prev => [...prev, userMessage].slice(-MAX_MESSAGE_HISTORY));
    eventBus.publish('chat:message:sent', { projectId, message: userMessage, mentions });

    for (const mention of mentions) {
      const agent = team.find(m => m.name.toLowerCase() === mention.toLowerCase() || m.agentId.toLowerCase() === mention.toLowerCase() || m.roleId.toLowerCase() === mention.toLowerCase());
      if (agent) {
        collaborationProtocol.requestHelp('user', agent.agentId, `Mentioned in chat: ${content}`, { projectId, messageId: userMessage.id, content }, 'normal', 30000)
          .then(response => { logger.debug(`[RealTimeChat] Agent ${agent.agentId} responded to mention:`, response.accepted); })
          .catch(err => { logger.error(`[RealTimeChat] Failed to notify agent ${agent.agentId}:`, err); });
        onMentionAgent?.(agent.agentId, content);
      }
    }
    onSendMessage?.(content);
  }, [eventBus, projectId, team, collaborationProtocol, onSendMessage, onMentionAgent, handleCommand]);

  const handleReply = useCallback((messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      setInputValue(`> Replying to ${message.agentName || message.role}: `);
      setActiveThread(message.threadId || messageId);
    }
  }, [messages]);

  return React.createElement(Panel, { title: `Team Chat - ${projectId}` },
    React.createElement(Box, { flexDirection: 'column' },
      React.createElement(Box, { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1 },
        React.createElement(Box, { flexDirection: 'row' },
          React.createElement(Text, { color: isConnected ? COLORS.success : COLORS.error }, isConnected ? '●' : '○'),
          React.createElement(Text, { color: COLORS.muted }, ` ${isConnected ? 'Connected' : 'Disconnected'}`)
        ),
        React.createElement(Box, { flexDirection: 'row' },
          React.createElement(Text, { color: COLORS.muted }, `${team.length} agents • ${messages.length} messages`)
        )
      ),
      React.createElement(Box, { flexDirection: 'column', flexGrow: 1 },
        React.createElement(MessageList, { messages, team, typingAgents, maxHeight, showTimestamps, compactMode, onReply: handleReply })
      ),
      React.createElement(Divider, { width: 40 }),
      React.createElement(ChatInput, { value: inputValue, onChange: setInputValue, onSubmit: handleSendMessage, placeholder: 'Type a message... (use @ to mention, / for commands)', team })
    )
  );
}

export {
  MessageBubble,
  MentionAutocomplete,
  CommandPalette,
  ChatInput,
  MessageList,
  TypingIndicator,
};

export default RealTimeChat;
