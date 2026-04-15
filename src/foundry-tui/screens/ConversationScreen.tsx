import * as React from 'react';
import { Box, Text, useInput } from 'ink';
import { useFoundryStore } from '../store/store';
import { CollaborationFeed } from '../components/CollaborationFeed';
import { FOUNDRY_COLORS, FOUNDRY_THEME } from '../theme';

export function ConversationScreen(): JSX.Element {
  const { state, dispatch } = useFoundryStore();

  useInput((input, key) => {
    if (key.ctrl && input.toLowerCase() === 'e') {
      dispatch({
        type: 'REQUEST_CONVERSATION_EXPORT',
        note: `Export placeholder requested at ${new Date().toISOString()}`,
      });
      return;
    }

    if (key.backspace || key.delete) {
      dispatch({
        type: 'SET_CONVERSATION_QUERY',
        query: state.conversation.query.slice(0, Math.max(0, state.conversation.query.length - 1)),
      });
      return;
    }

    if (!key.ctrl && !key.meta && input.length === 1) {
      dispatch({
        type: 'SET_CONVERSATION_QUERY',
        query: `${state.conversation.query}${input}`,
      });
    }
  });

  const query = state.conversation.query.trim().toLowerCase();
  const entries = query
    ? state.feed.filter((entry) => {
        const haystack = `${entry.actor} ${entry.event} ${entry.message}`.toLowerCase();
        return haystack.includes(query);
      })
    : state.feed;

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box {...FOUNDRY_THEME.panel} marginBottom={1}>
        <Text color={FOUNDRY_COLORS.primary}>Conversation Search</Text>
        <Text>Query: {state.conversation.query || '-'}</Text>
        <Text color={FOUNDRY_COLORS.muted}>Type to search feed. Ctrl+E triggers export placeholder.</Text>
        <Text color={FOUNDRY_COLORS.secondary}>{state.conversation.exportNote}</Text>
      </Box>

      <CollaborationFeed entries={entries} title="Conversation Threads" limit={14} />
    </Box>
  );
}
