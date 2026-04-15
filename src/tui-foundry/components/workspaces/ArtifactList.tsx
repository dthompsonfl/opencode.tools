import React from 'react';
import { Box, Text } from 'ink';
import { useSelector } from '../../store/store';
import { selectArtifacts } from '../../store/selectors';

export function ArtifactList(): React.ReactElement {
  const artifacts = useSelector(selectArtifacts);

  return (
    <Box flexDirection="column">
      {artifacts.length === 0 ? <Text color="gray">No artifacts</Text> : artifacts.map(a => (
        <Box key={a.id}><Text>{a.name} — {a.createdBy}</Text></Box>
      ))}
    </Box>
  );
}

export default ArtifactList;
