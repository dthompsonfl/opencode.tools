import { useTheme } from "@tui/context/theme"
import { Box } from "@tui/component/box"
import { Text } from "@tui/component/text"
import { createMemo, createResource, For, Show } from "solid-js"
import { createFoundryTuiRuntimeBridge, type FoundryDocStatus, type FoundryTuiRuntimeBridge } from "./runtime-bridge"

export interface IntakeViewProps {
  projectId?: string
  runtime?: FoundryTuiRuntimeBridge
}

export function IntakeView(props: IntakeViewProps) {
  const { theme } = useTheme()
  const runtime = props.runtime || createFoundryTuiRuntimeBridge()
  const projectId = props.projectId || "default-project"
  const [snapshot] = createResource(() => runtime.getSnapshot(projectId))

  const docs = createMemo(() => snapshot()?.docs || [])
  const missingRequired = createMemo(() => docs().filter((doc) => doc.required && !doc.exists))

  return (
    <Box flexDirection="column" gap={2}>
      <Text bold color={theme().colors().primary}>
        Document Intake & Gap Scan
      </Text>
      <Text color={theme().colors().muted}>Scan for required documentation and identify gaps</Text>

      <Box flexDirection="column" gap={1} marginTop={1}>
        <Text bold>Documentation Status:</Text>
        <For each={docs()}>{(doc) => <DocRow doc={doc} />}</For>
      </Box>

      <Show when={missingRequired().length > 0}>
        <Box flexDirection="column" gap={1} marginTop={2} padding={1} backgroundColor={theme().colors().errorBg}>
          <Text bold color={theme().colors().error}>
            Missing Required Documents:
          </Text>
          <For each={missingRequired()}>{(doc) => <Text>- {doc.name}</Text>}</For>
        </Box>
      </Show>
    </Box>
  )
}

function DocRow(props: { doc: FoundryDocStatus }) {
  const { theme } = useTheme()
  return (
    <Box flexDirection="row" gap={2}>
      <Text
        color={
          props.doc.exists
            ? theme().colors().success
            : props.doc.required
              ? theme().colors().error
              : theme().colors().warning
        }
      >
        {props.doc.exists ? "✓" : "✗"}
      </Text>
      <Text>{props.doc.name}</Text>
      <Text color={theme().colors().muted}>{props.doc.path}</Text>
      {props.doc.required && <Text color={theme().colors().error}>(required)</Text>}
    </Box>
  )
}
