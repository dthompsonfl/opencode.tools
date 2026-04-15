import React from 'react';
import { Box, Text } from 'ink';
import { useStore } from '../store/store';
import { Panel } from '../components/common';

export function AuditScreen(): React.ReactElement {
  const { state } = useStore();

  return React.createElement(Panel, { title: 'Audit & Evidence' },
    React.createElement(Box, { flexDirection: 'column' },
      state.feed.slice(0, 10).map(entry => React.createElement(Text, { key: entry.id }, `${entry.event} :: ${entry.message}`)),
    ),
  );
}
