import { useTheme } from "@tui/context/theme"
import { Box } from "@tui/component/box"
import { Text } from "@tui/component/text"
import { Input } from "@tui/component/input"
import { Button } from "@tui/component/button"
import { createSignal } from "solid-js"
import { createFoundryTuiRuntimeBridge, type FoundryTuiRuntimeBridge } from "./runtime-bridge"

export interface SetupViewProps {
  projectId?: string
  runtime?: FoundryTuiRuntimeBridge
}

export function SetupView(props: SetupViewProps) {
  const { theme } = useTheme()
  const runtime = props.runtime || createFoundryTuiRuntimeBridge()
  const projectId = props.projectId || "default-project"
  const [projectName, setProjectName] = createSignal("")
  const [repoPath, setRepoPath] = createSignal(".")
  const [complianceTargets, setComplianceTargets] = createSignal("")
  const [status, setStatus] = createSignal("")

  const handleInit = async () => {
    await runtime.dispatch(projectId, "INIT_PROJECT", {
      projectName: projectName() || "Untitled Project",
      repoPath: repoPath(),
      complianceTargets: complianceTargets()
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    })
    setStatus("Project initialized")
  }

  return (
    <Box flexDirection="column" gap={2}>
      <Text bold color={theme().colors().primary}>
        Project Setup
      </Text>
      <Text color={theme().colors().muted}>Initialize a new project for Aegis Foundry governance</Text>

      <Box flexDirection="column" gap={1} marginTop={1}>
        <Text>Project Name:</Text>
        <Input value={projectName()} onChange={setProjectName} placeholder="my-project" />
      </Box>

      <Box flexDirection="column" gap={1}>
        <Text>Repository Path:</Text>
        <Input value={repoPath()} onChange={setRepoPath} placeholder="." />
      </Box>

      <Box flexDirection="column" gap={1}>
        <Text>Compliance Targets (comma-separated):</Text>
        <Input value={complianceTargets()} onChange={setComplianceTargets} placeholder="SOC2, GDPR, HIPAA" />
      </Box>

      <Box marginTop={2} gap={2}>
        <Button onClick={handleInit} variant="primary">
          Initialize Project
        </Button>
        <Text color={theme().colors().muted}>{status()}</Text>
      </Box>
    </Box>
  )
}
