import React from 'react';
import { Box, Text } from 'ink';
import { useSelector } from '../../store/store.js';
import { ArtifactType } from '../../types/index.js';

export function ArtifactPanel(): React.ReactElement {
  const artifacts = useSelector((state) => state.artifacts);

  const getTypeIcon = (type: ArtifactType): string => {
    switch (type) {
      case 'document':
        return '📄';
      case 'code':
        return '💻';
      case 'config':
        return '⚙️';
      case 'diagram':
        return '📊';
      case 'report':
        return '📈';
      default:
        return '📦';
    }
  };

  return (
    <Box flexDirection="column">
      <Text bold>Artifacts ({artifacts.length})</Text>
      <Box marginTop={1} flexDirection="column">
        {artifacts.length === 0 ? (
          <Text color="gray">No artifacts created</Text>
        ) : (
          artifacts.map((artifact) => (
            <Box
              key={artifact.id}
              borderStyle="single"
              borderColor="blue"
              padding={1}
              marginBottom={1}
            >
              <Box flexDirection="row">
                <Text>{getTypeIcon(artifact.type)}{' '}</Text>
                <Text bold>{artifact.name}</Text>
              </Box>
              <Text color="gray">Path: {artifact.path}</Text>
              <Text color="gray">Type: {artifact.type} | Version: v{artifact.version}</Text>
              <Text color="gray">Created by: {artifact.createdBy}</Text>
              <Text color="gray">Modified: {artifact.updatedAt.toLocaleDateString()}</Text>
              {artifact.tags.length > 0 && (
                <Text color="gray">Tags: {artifact.tags.join(', ')}</Text>
              )}
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}
