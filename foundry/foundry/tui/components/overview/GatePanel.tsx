import React from 'react';
import { Box, Text } from 'ink';
import { useSelector } from '../../store/store.js';
import { GateStatus } from '../../types/index.js';

export function GatePanel(): React.ReactElement {
  const gates = useSelector((state) => state.gates);

  const getStatusColor = (status: GateStatus): string => {
    switch (status) {
      case 'passed':
        return 'green';
      case 'failed':
        return 'red';
      case 'in_progress':
        return 'yellow';
      default:
        return 'gray';
    }
  };

  const getStatusIcon = (status: GateStatus): string => {
    switch (status) {
      case 'passed':
        return '✓';
      case 'failed':
        return '✗';
      case 'in_progress':
        return '◐';
      default:
        return '○';
    }
  };

  return (
    <Box flexDirection="column">
      <Text bold>Quality Gates ({gates.length})</Text>
      <Box marginTop={1} flexDirection="column">
        {gates.length === 0 ? (
          <Text color="gray">No gates defined</Text>
        ) : (
          gates.map((gate) => (
            <Box
              key={gate.id}
              borderStyle="single"
              borderColor={getStatusColor(gate.status)}
              padding={1}
              marginBottom={1}
            >
              <Box flexDirection="row" justifyContent="space-between">
                <Text bold>{gate.name}</Text>
                <Text color={getStatusColor(gate.status)}>
                  {getStatusIcon(gate.status)} {gate.status}
                </Text>
              </Box>
              <Text color="gray">{gate.description}</Text>
              <Box marginTop={1}>
                {gate.checks.map((check) => (
                  <Box key={check.id} flexDirection="row">
                    <Text color={check.passed === true ? 'green' : check.passed === false ? 'red' : 'gray'}>
                      {check.passed === true ? '✓' : check.passed === false ? '✗' : '○'}{' '}
                    </Text>
                    <Text>{check.name}</Text>
                    {check.message && (
                      <Text color="gray">{' '}({check.message})</Text>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}
