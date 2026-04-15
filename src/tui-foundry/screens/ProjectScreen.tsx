import React from 'react';
import { Box, Text } from 'ink';
import { useStore } from '../store/store';
import { Panel, Badge } from '../components/common';
import { COLORS } from '../theme';

export function ProjectScreen(): React.ReactElement {
  const { state } = useStore();

  return React.createElement(Box, { flexDirection: 'row', flexGrow: 1 },
    React.createElement(Box, { flexDirection: 'column', width: '50%', marginRight: 1 },
      React.createElement(Panel, { title: 'Projects' },
        state.projects.map(project => React.createElement(Box, { key: project.id, marginBottom: 1 },
          React.createElement(Text, { bold: true }, project.name),
          React.createElement(Badge, { status: project.status }),
          React.createElement(Text, { color: COLORS.muted }, ` ${project.industry}`),
        )),
      ),
    ),
    React.createElement(Box, { flexDirection: 'column', width: '50%' },
      React.createElement(Panel, { title: 'Intake Snapshot' },
        React.createElement(Text, null, `Name: ${state.projectIntake.name || '-'}`),
        React.createElement(Text, null, `Industry: ${state.projectIntake.industry || '-'}`),
        React.createElement(Text, null, `Criteria: ${state.projectIntake.completionCriteria || '-'}`),
      ),
    ),
  );
}
