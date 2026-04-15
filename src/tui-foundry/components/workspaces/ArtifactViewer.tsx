import React from 'react';
import { Box, Text } from 'ink';
import type { Artifact } from '../../types';

export function ArtifactViewer({ artifact }: { artifact?: Artifact }) {
  if (!artifact) return <Text>No artifact selected</Text>;
  return (
    <Box flexDirection="column">
      <Text bold>{artifact.name} (v{artifact.version})</Text>
      <Text>{artifact.path}</Text>
      <Box marginTop={1}><Text>{artifact.content ? artifact.content.slice(0, 800) : '<binary content>'}</Text></Box>
    </Box>
  );
}

export default ArtifactViewer;
