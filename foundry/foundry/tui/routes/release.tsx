import { useTheme } from "@tui/context/theme"
import { Box } from "@tui/component/box"
import { Text } from "@tui/component/text"
import { Button } from "@tui/component/button"
import { createMemo, createResource, createSignal } from "solid-js"
import { createFoundryTuiRuntimeBridge, type FoundryReleaseReadiness, type FoundryTuiRuntimeBridge } from "./runtime-bridge"

export interface ReleaseViewProps {
  projectId?: string
  runtime?: FoundryTuiRuntimeBridge
}

export function ReleaseView(props: ReleaseViewProps) {
  const { theme } = useTheme()
  const runtime = props.runtime || createFoundryTuiRuntimeBridge()
  const projectId = props.projectId || "default-project"
  const [snapshot, { refetch }] = createResource(() => runtime.getSnapshot(projectId))
  const [statusMessage, setStatusMessage] = createSignal("")
  const readiness = createMemo(() => snapshot()?.releaseReadiness || defaultReadiness())

  const canRelease = () =>
    readiness().allGatesPassed &&
    readiness().noHighRiskItems &&
    readiness().runbookComplete &&
    readiness().securitySignoff &&
    readiness().qaSignoff

  const requestRelease = async () => {
    const result = await runtime.requestRelease(projectId)
    setStatusMessage(result.approved ? "Release approved" : "Release blocked: unmet readiness checks")
    await refetch()
  }

  return (
    <Box flexDirection="column" gap={2}>
      <Text bold color={theme().colors().primary}>
        Release Readiness
      </Text>
      <Text color={theme().colors().muted}>Go/No-Go decision with role-based veto</Text>

      <Box flexDirection="column" gap={1} marginTop={1}>
        <ReadinessItem label="All gates passed" status={readiness().allGatesPassed} />
        <ReadinessItem label="No high-risk items open" status={readiness().noHighRiskItems} />
        <ReadinessItem label="Runbook complete" status={readiness().runbookComplete} />
        <ReadinessItem label="Security sign-off" status={readiness().securitySignoff} requiredRole="SECURITY_LEAD" />
        <ReadinessItem label="QA sign-off" status={readiness().qaSignoff} requiredRole="QA_LEAD" />
      </Box>

      <Box marginTop={2} gap={2}>
        <Button onClick={requestRelease} variant={canRelease() ? "primary" : "disabled"} disabled={!canRelease()}>
          {canRelease() ? "Request Release Approval" : "Not Ready for Release"}
        </Button>
        <Text color={theme().colors().muted}>{statusMessage()}</Text>
      </Box>
    </Box>
  )
}

function defaultReadiness(): FoundryReleaseReadiness {
  return {
    allGatesPassed: false,
    noHighRiskItems: false,
    runbookComplete: false,
    securitySignoff: false,
    qaSignoff: false,
  }
}

function ReadinessItem(props: { label: string; status: boolean; requiredRole?: string }) {
  const { theme } = useTheme()

  return (
    <Box flexDirection="row" gap={2} padding={1}>
      <Text color={props.status ? theme().colors().success : theme().colors().error}>{props.status ? "✓" : "✗"}</Text>
      <Text>{props.label}</Text>
      {props.requiredRole && <Text color={theme().colors().muted}>({props.requiredRole})</Text>}
    </Box>
  )
}
