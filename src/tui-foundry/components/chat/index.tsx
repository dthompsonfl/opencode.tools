/**
 * Foundry TUI - Chat Components
 * Multi-agent chat interface with threading and mentions
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useStore } from '../../store/store';
import { COLORS, TEXT_STYLES, getRoleColor } from '../../theme';
import type { Message, TeamMember } from '../../types';
import { Panel, Badge, Timestamp, Spinner } from '../../components/common';
import { ChatBridge } from '../../cowork';

// =============================================================================
// MessageList Component
// =============================================================================

interface MessageListProps {
  messages: Message[];
  maxHeight?: number;
}

export function MessageList({ messages, maxHeight }: MessageListProps): React.ReactElement {
  const visibleMessages = maxHeight ? messages.slice(-maxHeight) : messages;

  if (messages.length === 0) {
    return React.createElement(Box, {
      justifyContent: 'center',
      alignItems: 'center',
      flexGrow: 1,
    },
      React.createElement(Text, { color: COLORS.muted }, 'No messages yet. Start a conversation!')
    );
  }

  return React.createElement(Box, {
    flexDirection: 'column',
    flexGrow: 1,
  },
    visibleMessages.map((message: Message, index: number) =>
      React.createElement(MessageBubble, { key: message.id || index, message })
    )
  );
}

// =============================================================================
// MessageBubble Component
// =============================================================================

interface MessageBubbleProps {
  message: Message;
}

function MessageBubble({ message }: MessageBubbleProps): React.ReactElement {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  
  const getRoleColor = (role: string): string => {
    switch (role) {
      case 'user': return COLORS.success;
      case 'cto': return COLORS.primaryBright;
      case 'agent': return COLORS.primary;
      case 'system': return COLORS.muted;
      default: return COLORS.muted;
    }
  };

  const getRoleLabel = (role: string, agentName?: string): string => {
    if (agentName) return agentName;
    switch (role) {
      case 'user': return 'You';
      case 'cto': return 'CTO';
      case 'agent': return 'Agent';
      case 'system': return 'System';
      default: return role;
    }
  };

  const color = getRoleColor(message.role);
  const label = getRoleLabel(message.role, message.agentName);

  return React.createElement(Box, {
    flexDirection: 'column',
    marginY: 1,
  },
    React.createElement(Box, { flexDirection: 'row' },
      React.createElement(Text, { bold: true, color }, label),
      message.mentions && message.mentions.length > 0 &&
        React.createElement(Text, { color: COLORS.warning }, ` @${message.mentions.join(' @')}`),
      React.createElement(Box, { flexGrow: 1 }),
      React.createElement(Timestamp, { timestamp: message.timestamp })
    ),
    React.createElement(Box, { marginLeft: 2 },
      React.createElement(Text, null, message.content)
    )
  );
}

// =============================================================================
// MessageInput Component
// =============================================================================

interface MessageInputProps {
  onSubmit: (message: string) => void;
  placeholder?: string;
}

export function MessageInput({ onSubmit, placeholder = 'Type a message...' }: MessageInputProps): React.ReactElement {
  const { state, dispatch } = useStore();
  const [input, setInput] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);

  useInput((value, key) => {
    if (key.return && input.trim()) {
      onSubmit(input.trim());
      dispatch({ type: 'CHAT_RECEIVE_MESSAGE', message: { id: `cmd-${Date.now()}`, role: 'system', content: `Command: ${input.trim()}`, timestamp: Date.now() } });
      setInput('');
      setHistoryIndex(-1);
    } else if (key.upArrow && state.chat.commandHistory.length > 0) {
      const newIndex = Math.min(historyIndex + 1, state.chat.commandHistory.length - 1);
      setHistoryIndex(newIndex);
      setInput(state.chat.commandHistory[newIndex] || '');
    } else if (key.downArrow && historyIndex >= 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setInput(newIndex >= 0 ? state.chat.commandHistory[newIndex] : '');
    } else if (!key.ctrl && !key.meta && value) {
      setInput((prev) => prev + value);
      dispatch({ type: 'CHAT_SET_INPUT', value: input + value });
    } else if (key.backspace) {
      setInput((prev) => prev.slice(0, -1));
      dispatch({ type: 'CHAT_SET_INPUT', value: input.slice(0, -1) });
    }
  });

  const suggestions = state.team || [];

  return React.createElement(Box, {
    borderStyle: 'single',
    borderColor: COLORS.border,
    paddingX: 1,
    marginTop: 1,
  },
    React.createElement(Text, { color: COLORS.muted, bold: true }, 'Mentions:'),
    suggestions.map((member: TeamMember, idx: number) =>
      React.createElement(Box, { key: member.id || idx },
        React.createElement(Text, { color: getRoleColor(member.role) }, `@${member.name}`),
        React.createElement(Text, { color: COLORS.muted }, ` - ${member.role}`)
      )
    )
  );
}

// =============================================================================
// ChatPanel Component
// =============================================================================

export function ChatPanel(): React.ReactElement {
  const { state, dispatch } = useStore();
  const { messages, isTyping, typingAgentId, showMentions, mentionQuery } = state.chat;

  const handleSendMessage = (content: string) => {
    // Clear input in store
    dispatch({ type: 'CHAT_SET_INPUT', value: '' });

    // Send via bridge to trigger agent interactions
    const workspaceId = state.activeProjectId;
    const threadId = state.chat.activeThreadId;

    void ChatBridge.getInstance().sendUserMessage(content, {
      workspaceId,
      threadId,
    });
  };

  const activeAgent = typingAgentId 
    ? state.team.find((m: typeof state.team[0]) => m.id === typingAgentId) 
    : null;

  return React.createElement(Panel, { title: 'Collaboration Chat' },
    React.createElement(Box, { flexDirection: 'column', flexGrow: 1 },
      React.createElement(MessageList, { messages, maxHeight: 20 }),
      
      isTyping && React.createElement(Box, { marginTop: 1 },
        React.createElement(Spinner, { 
          text: `${activeAgent?.name || 'Someone'} is typing...`,
          color: COLORS.muted 
        })
      ),
      
      // TODO: Implement MentionSuggestions component
      // showMentions && React.createElement(MentionSuggestions, {
      //   query: mentionQuery,
      //   onSelect: (name: string) => {
      //     // Handle mention selection
      //   }
      // }),

      React.createElement(MessageInput, { onSubmit: handleSendMessage })
    )
  );
}

// Components are already exported above via 'export function'

// RealTimeChat Component Exports
export { RealTimeChat } from './RealTimeChat';
export type { 
  RealTimeChatProps,
  ChatMessage,
  MessageBubbleProps,
  MentionAutocompleteProps,
  CommandPaletteProps,
  ChatInputProps,
  MessageListProps
} from './RealTimeChat';
