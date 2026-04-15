import React from 'react';
import { Box, Text } from 'ink';
import { useStore } from '../store/store';
import { Panel, Badge, ProgressBar } from '../components/common';

export function ExecutionScreen(): React.ReactElement {
  const { state } = useStore();

  return React.createElement(Panel, { title: 'Execution Monitor' },
    React.createElement(Box, { flexDirection: 'column' },
      state.executionStreams.map(stream => React.createElement(Box, { key: stream.id, marginBottom: 1 },
        React.createElement(Text, { bold: true }, stream.name),
        React.createElement(Badge, { status: stream.status }),
        React.createElement(ProgressBar, { percent: stream.progress }),
      )),
      state.executionErrors.slice(0, 5).map((e, idx) => React.createElement(Text, { key: `${e}-${idx}`, color: 'red' }, e)),
    ),
  );
}
