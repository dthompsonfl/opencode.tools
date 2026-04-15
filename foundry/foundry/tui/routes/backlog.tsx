import { useTheme } from "@tui/context/theme"
import { Box } from "@tui/component/box"
import { Text } from "@tui/component/text"
import { createMemo, createResource, For } from "solid-js"
import { createFoundryTuiRuntimeBridge, type FoundryBacklogItem, type FoundryTuiRuntimeBridge } from "./runtime-bridge"

export interface BacklogViewProps {
  projectId?: string
  runtime?: FoundryTuiRuntimeBridge
}

export function BacklogView(props: BacklogViewProps) {
  const { theme } = useTheme()
  const runtime = props.runtime || createFoundryTuiRuntimeBridge()
  const projectId = props.projectId || "default-project"
  const [snapshot] = createResource(() => runtime.getSnapshot(projectId))
  const items = createMemo(() => snapshot()?.backlog || [])

  return (
    <Box flexDirection="column" gap={2}>
      <Text bold color={theme().colors().primary}>
        Backlog & Assignments
      </Text>
      <Text color={theme().colors().muted}>Tasks assigned to virtual company agents</Text>

      <Box flexDirection="column" gap={1} marginTop={1}>
        <For each={items()}>{(item) => <BacklogRow item={item} />}</For>
      </Box>
    </Box>
  )
}

function BacklogRow(props: { item: FoundryBacklogItem }) {
  const { theme } = useTheme()
  const { item } = props
  return (
    <Box
      flexDirection="row"
      gap={2}
      padding={1}
      backgroundColor={
        item.status === "done"
          ? theme().colors().successBg
          : item.status === "in_progress"
            ? theme().colors().warningBg
            : theme().colors().bg
      }
    >
      <Text
        color={
          item.status === "done"
            ? theme().colors().success
            : item.status === "in_progress"
              ? theme().colors().warning
              : theme().colors().muted
        }
      >
        {item.status === "done" ? "✓" : item.status === "in_progress" ? "◐" : "○"}
      </Text>
      <Text flexGrow={1}>{item.title}</Text>
      <Text color={theme().colors().muted}>{item.role}</Text>
      <Text
        color={
          item.priority === "high"
            ? theme().colors().error
            : item.priority === "medium"
              ? theme().colors().warning
              : theme().colors().muted
        }
      >
        {item.priority}
      </Text>
    </Box>
  )
}
