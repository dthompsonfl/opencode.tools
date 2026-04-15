import { useTheme } from "@tui/context/theme"
import { Box } from "@tui/component/box"
import { Text } from "@tui/component/text"
import { createMemo, createResource, For } from "solid-js"
import { createFoundryTuiRuntimeBridge, type FoundryTuiRuntimeBridge } from "./runtime-bridge"

export interface EvidenceViewProps {
  projectId?: string
  runtime?: FoundryTuiRuntimeBridge
}

export function EvidenceView(props: EvidenceViewProps) {
  const { theme } = useTheme()
  const runtime = props.runtime || createFoundryTuiRuntimeBridge()
  const projectId = props.projectId || "default-project"
  const [snapshot] = createResource(() => runtime.getSnapshot(projectId))
  const evidence = createMemo(() => snapshot()?.evidence || [])

  return (
    <Box flexDirection="column" gap={2}>
      <Text bold color={theme().colors().primary}>
        Evidence Viewer
      </Text>
      <Text color={theme().colors().muted}>Collected evidence for audit and traceability</Text>

      <Box flexDirection="column" gap={1} marginTop={1}>
        <Box flexDirection="row" gap={2} padding={1} backgroundColor={theme().colors().bgSecondary}>
          <Text bold flex={2}>
            Name
          </Text>
          <Text bold flex={1}>
            Type
          </Text>
          <Text bold flex={1}>
            Phase
          </Text>
          <Text bold flex={1}>
            Gate
          </Text>
          <Text bold flex={1}>
            Date
          </Text>
        </Box>

        <For each={evidence()}>
          {(item) => (
            <Box flexDirection="row" gap={2} padding={1}>
              <Text flex={2}>{item.name}</Text>
              <Text flex={1} color={theme().colors().muted}>
                {item.type}
              </Text>
              <Text flex={1} color={theme().colors().muted}>
                {item.phase}
              </Text>
              <Text flex={1} color={theme().colors().muted}>
                {item.gate || "-"}
              </Text>
              <Text flex={1} color={theme().colors().muted}>
                {new Date(item.created_at).toISOString().slice(0, 10)}
              </Text>
            </Box>
          )}
        </For>
      </Box>
    </Box>
  )
}
