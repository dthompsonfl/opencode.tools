import { useTheme } from "@tui/context/theme"
import { useKeybind } from "@tui/context/keybind"
import { createMemo, Match, Switch } from "solid-js"
import { Box } from "@tui/component/box"
import { Text } from "@tui/component/text"
import { useRoute } from "@tui/context/route"
import type { FoundryRoute, FoundryView } from "../types"
import { SetupView } from "./setup"
import { IntakeView } from "./intake"
import { BacklogView } from "./backlog"
import { GatesView } from "./gates"
import { EvidenceView } from "./evidence"
import { ReleaseView } from "./release"
import { createFoundryTuiRuntimeBridge } from "./runtime-bridge"

export function Foundry() {
  const { theme } = useTheme()
  const route = useRoute()
  const runtime = createFoundryTuiRuntimeBridge()
  const currentRoute = createMemo(() => route.data as FoundryRoute)
  const currentView = createMemo(() => currentRoute().view || "setup")
  const projectId = createMemo(() => currentRoute().projectId || "default-project")

  const navigate = (view: FoundryView) => {
    route.navigate({
      type: "foundry",
      view,
      projectId: currentRoute().projectId,
    })
  }

  useKeybind("foundry", () => {
    return {
      setup: () => navigate("setup"),
      intake: () => navigate("intake"),
      backlog: () => navigate("backlog"),
      gates: () => navigate("gates"),
      evidence: () => navigate("evidence"),
      release: () => navigate("release"),
      help: () => {
        // Show help overlay
      },
    }
  })

  return (
    <Box flexDirection="column" flexGrow={1} backgroundColor={theme().colors().bg} gap={1}>
      {/* Header */}
      <Box padding={{ x: 2, y: 1 }} gap={2}>
        <Text bold color={theme().colors().primary}>
          Aegis Foundry
        </Text>
        <Text color={theme().colors().muted}>/</Text>
        <Text color={theme().colors().fg}>{currentRoute().projectId || "No Project"}</Text>
      </Box>

      {/* Navigation */}
      <Box padding={{ x: 2 }} gap={2}>
        <NavItem label="Setup" view="setup" current={currentView()} onClick={navigate} />
        <NavItem label="Intake" view="intake" current={currentView()} onClick={navigate} />
        <NavItem label="Backlog" view="backlog" current={currentView()} onClick={navigate} />
        <NavItem label="Gates" view="gates" current={currentView()} onClick={navigate} />
        <NavItem label="Evidence" view="evidence" current={currentView()} onClick={navigate} />
        <NavItem label="Release" view="release" current={currentView()} onClick={navigate} />
      </Box>

      {/* Content */}
      <Box flexGrow={1} padding={2}>
        <Switch>
          <Match when={currentView() === "setup"}>
            <SetupView projectId={projectId()} runtime={runtime} />
          </Match>
          <Match when={currentView() === "intake"}>
            <IntakeView projectId={projectId()} runtime={runtime} />
          </Match>
          <Match when={currentView() === "backlog"}>
            <BacklogView projectId={projectId()} runtime={runtime} />
          </Match>
          <Match when={currentView() === "gates"}>
            <GatesView projectId={projectId()} runtime={runtime} />
          </Match>
          <Match when={currentView() === "evidence"}>
            <EvidenceView projectId={projectId()} runtime={runtime} />
          </Match>
          <Match when={currentView() === "release"}>
            <ReleaseView projectId={projectId()} runtime={runtime} />
          </Match>
        </Switch>
      </Box>
    </Box>
  )
}

function NavItem(props: {
  label: string
  view: FoundryView
  current: FoundryView
  onClick: (view: FoundryView) => void
}) {
  const { theme } = useTheme()
  const isActive = createMemo(() => props.view === props.current)

  return (
    <Box
      onClick={() => props.onClick(props.view)}
      padding={{ x: 2, y: 1 }}
      backgroundColor={isActive() ? theme().colors().primary : undefined}
    >
      <Text color={isActive() ? theme().colors().bg : theme().colors().fg}>{props.label}</Text>
    </Box>
  )
}
