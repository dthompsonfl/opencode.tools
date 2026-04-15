import React from 'react';
import { Box, Text } from 'ink';
import { Panel } from '../../components/common';
import { useSelector } from '../../store/store';
import { selectArtifacts } from '../../store/selectors';

export function WorkspaceList(): React.ReactElement {
  const artifacts = useSelector(selectArtifacts);

  return (
    <Panel title="Workspace Artifacts">
      <Box flexDirection="column">
        {artifacts.length === 0 ? <Text>No artifacts</Text> : artifacts.map(a => (
          <Box key={a.id}><Text>{a.name} (v{a.version})</Text></Box>
        ))}
      </Box>
    </Panel>
  );
}

export default WorkspaceList;
