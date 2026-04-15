import type { StatePhase } from "@/foundry/types"

export type FoundryRoute = {
  type: "foundry"
  view?: FoundryView
  projectId?: string
}

export type FoundryView =
  | "setup" // Project setup wizard
  | "intake" // Doc intake & gap scanner
  | "backlog" // Backlog viewer
  | "gates" // Gate dashboard
  | "evidence" // Evidence viewer
  | "release" // Release readiness

export interface FoundryRouteData {
  currentPhase: StatePhase
  projectName: string | null
  lastGateResults: Record<string, "passed" | "failed" | "pending">
  evidenceCount: number
  taskCount: number
}
