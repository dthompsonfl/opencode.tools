import * as React from 'react';
import { Box, Text } from 'ink';
import { CollaborationEntry } from '../types';
import { FOUNDRY_COLORS, FOUNDRY_THEME } from '../theme';

export function CollaborationFeed(props: { entries: CollaborationEntry[]; title?: string; limit?: number }): JSX.Element {
  const title = props.title ?? 'Collaboration Feed';
  const limit = props.limit ?? 8;
  const visibleEntries = props.entries.slice(0, limit);

  return (
    <Box {...FOUNDRY_THEME.panel}>
      <Text color={FOUNDRY_COLORS.primary}>{title}</Text>
      {visibleEntries.length === 0 ? <Text color={FOUNDRY_COLORS.muted}>No activity yet</Text> : null}
      {visibleEntries.map((entry) => (
        <Box key={entry.id}>
          <Text color={FOUNDRY_COLORS.muted}>{formatTimestamp(entry.timestamp)} </Text>
          <Text color={FOUNDRY_COLORS.secondary}>{entry.actor}</Text>
          <Text>: {entry.message}</Text>
        </Box>
      ))}
    </Box>
  );
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const hh = `${date.getHours()}`.padStart(2, '0');
  const mm = `${date.getMinutes()}`.padStart(2, '0');
  const ss = `${date.getSeconds()}`.padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}
