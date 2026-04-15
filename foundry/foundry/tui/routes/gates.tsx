import { useTheme } from "@tui/context/theme"
import { Box } from "@tui/component/box"
import { Text } from "@tui/component/text"
import { Button } from "@tui/component/button"
import { createMemo, createResource, For } from "solid-js"
import { createFoundryTuiRuntimeBridge, type FoundryGateStatus, type FoundryTuiRuntimeBridge } from "./runtime-bridge"

export interface GatesViewProps {
  projectId?: string
  runtime?: FoundryTuiRuntimeBridge
}

export function GatesView(props: GatesViewProps) {
  const { theme } = useTheme()
  const runtime = props.runtime || createFoundryTuiRuntimeBridge()
  const projectId = props.projectId || "default-project"
  const [snapshot, { refetch }] = createResource(() => runtime.getSnapshot(projectId))
  const gates = createMemo(() => snapshot()?.gates || [])

  const runGates = async () => {
    await runtime.runGates(projectId)
    await refetch()
  }

  return (
    <Box flexDirection="column" gap={2}>
      <Box flexDirection="row" justifyContent="space-between">
        <Text bold color={theme().colors().primary}>
          Gate Dashboard
        </Text>
        <Button onClick={runGates} variant="primary">
          Run All Gates
        </Button>
      </Box>

      <Text color={theme().colors().muted}>Quality gates and their evaluation status</Text>

      <For each={gates()}>{(gate) => <GateCard gate={gate} />}</For>
    </Box>
  )
}

function GateCard(props: { gate: FoundryGateStatus }) {
  const { theme } = useTheme()
  return (
    <Box flexDirection="column" gap={1} padding={1} backgroundColor={theme().colors().bgSecondary}>
      <Box flexDirection="row" justifyContent="space-between">
        <Text bold>{props.gate.name}</Text>
        <Text
          color={
            props.gate.status === "passed"
              ? theme().colors().success
              : props.gate.status === "failed"
                ? theme().colors().error
                : theme().colors().muted
          }
        >
          {props.gate.status.toUpperCase()}
        </Text>
      </Box>

      <For each={props.gate.checks}>
        {(check) => (
          <Box flexDirection="row" gap={2} paddingLeft={2}>
            <Text
              color={
                check.status === "passed"
                  ? theme().colors().success
                  : check.status === "failed"
                    ? theme().colors().error
                    : theme().colors().muted
              }
            >
              {check.status === "passed" ? "✓" : check.status === "failed" ? "✗" : "○"}
            </Text>
            <Text color={theme().colors().muted}>{check.name}</Text>
          </Box>
        )}
      </For>
    </Box>
  )
}
