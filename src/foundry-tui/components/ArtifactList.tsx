import * as React from 'react';
import { Box, Text } from 'ink';
import { ArtifactRecord } from '../types';
import { FOUNDRY_COLORS, FOUNDRY_THEME } from '../theme';

export function ArtifactList(props: { artifacts: ArtifactRecord[]; limit?: number }): JSX.Element {
  const limit = props.limit ?? 6;
  const artifacts = props.artifacts.slice(0, limit);

  return (
    <Box {...FOUNDRY_THEME.panel}>
      <Text color={FOUNDRY_COLORS.primary}>Artifacts</Text>
      {artifacts.length === 0 ? <Text color={FOUNDRY_COLORS.muted}>No shared artifacts yet</Text> : null}
      {artifacts.map((artifact) => (
        <Text key={artifact.id}>
          {artifact.name} v{artifact.version} ({artifact.source})
        </Text>
      ))}
    </Box>
  );
}
