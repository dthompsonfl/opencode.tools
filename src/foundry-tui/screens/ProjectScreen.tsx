import * as React from 'react';
import { Box, Text, useInput } from 'ink';
import { useFoundryStore } from '../store/store';
import { ArtifactList } from '../components/ArtifactList';
import { FOUNDRY_COLORS, FOUNDRY_THEME } from '../theme';
import { ProjectIntake } from '../types';

const INTAKE_FIELDS: Array<{ key: keyof ProjectIntake; label: string; hint: string }> = [
  { key: 'name', label: 'Project Name', hint: 'Name used in planning and execution' },
  { key: 'industry', label: 'Industry', hint: 'e.g. fintech, healthcare, retail' },
  { key: 'description', label: 'Project Description', hint: 'Scope and business context' },
  { key: 'completionCriteria', label: 'Completion Criteria', hint: 'Measurable acceptance criteria' },
];

export function ProjectScreen(): JSX.Element {
  const { state, dispatch } = useFoundryStore();
  const [activeFieldIndex, setActiveFieldIndex] = React.useState(0);

  useInput((input, key) => {
    if (key.upArrow) {
      setActiveFieldIndex((index) => (index - 1 + INTAKE_FIELDS.length) % INTAKE_FIELDS.length);
      return;
    }

    if (key.downArrow || key.tab) {
      setActiveFieldIndex((index) => (index + 1) % INTAKE_FIELDS.length);
      return;
    }

    if (key.ctrl && input.toLowerCase() === 's') {
      dispatch({ type: 'SUBMIT_INTAKE' });
      return;
    }

    const field = INTAKE_FIELDS[activeFieldIndex];
    const currentValue = state.projectIntake[field.key];

    if (key.backspace || key.delete) {
      dispatch({
        type: 'UPDATE_INTAKE_FIELD',
        field: field.key,
        value: currentValue.slice(0, Math.max(0, currentValue.length - 1)),
      });
      return;
    }

    if (key.return) {
      if (activeFieldIndex === INTAKE_FIELDS.length - 1) {
        dispatch({ type: 'SUBMIT_INTAKE' });
      } else {
        setActiveFieldIndex((index) => (index + 1) % INTAKE_FIELDS.length);
      }
      return;
    }

    if (!key.ctrl && !key.meta && input.length === 1) {
      dispatch({
        type: 'UPDATE_INTAKE_FIELD',
        field: field.key,
        value: `${currentValue}${input}`,
      });
    }
  });

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box marginBottom={1}>
        <Box {...FOUNDRY_THEME.panel} width={88} marginRight={1}>
          <Text color={FOUNDRY_COLORS.primary}>Project Intake</Text>
          <Text color={FOUNDRY_COLORS.muted}>Use Up/Down to change field, type to edit, Enter to move, Ctrl+S to submit.</Text>

          {INTAKE_FIELDS.map((field, index) => {
            const active = index === activeFieldIndex;
            const value = state.projectIntake[field.key];

            return (
              <Box key={field.key} flexDirection="column" marginBottom={1}>
                <Text color={active ? FOUNDRY_COLORS.highlight : FOUNDRY_COLORS.secondary}>
                  {active ? '>' : ' '} {field.label}
                </Text>
                <Text>{value || '-'}</Text>
                <Text color={FOUNDRY_COLORS.muted}>{field.hint}</Text>
              </Box>
            );
          })}
        </Box>

        <Box width={52}>
          <ArtifactList artifacts={state.artifacts} limit={8} />
        </Box>
      </Box>

      <Box {...FOUNDRY_THEME.panel}>
        <Text color={FOUNDRY_COLORS.primary}>Project Queue</Text>
        {state.projects.length === 0 ? <Text color={FOUNDRY_COLORS.muted}>No submitted projects yet</Text> : null}
        {state.projects.map((project) => (
          <Text key={project.id}>
            {project.name} ({project.industry}) - {project.status}
          </Text>
        ))}
      </Box>
    </Box>
  );
}
