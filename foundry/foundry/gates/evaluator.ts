import type { Evidence, GateResult, GateCheck, Gate } from "@/foundry/types"
import { Log } from "@/util/log"

interface Validator {
  name: string
  validate: (
    evidence: Evidence | null,
    params?: Record<string, unknown>,
  ) => Promise<{
    status: "passed" | "failed" | "error"
    message: string
  }>
}

interface GateEvaluator {
  registerValidator: (name: string, validator: Validator["validate"]) => void
  evaluate: (gate: Gate, evidenceList: Evidence[]) => Promise<GateResult>
}

const validators = new Map<string, Validator["validate"]>()

export function createGateEvaluator(): GateEvaluator {
  const registerValidator = (name: string, validator: Validator["validate"]): void => {
    validators.set(name, validator)
  }

  const evaluate = async (gate: Gate, evidenceList: Evidence[]): Promise<GateResult> => {
    Log.Default.info("gate_evaluator:evaluate", { gate: gate.id })

    const checks: GateCheck[] = []
    const evidenceIds: string[] = []

    for (const check of gate.checks) {
      // Find matching evidence
      const matchingEvidence = evidenceList.find(
        (e) => e.type === check.evidenceType && (!check.mustMatch || check.mustMatch.includes(e.name)),
      )

      if (!matchingEvidence) {
        checks.push({
          id: check.id,
          status: "missing",
          message: `Missing evidence: ${check.evidenceType}`,
        })
        continue
      }

      evidenceIds.push(matchingEvidence.id)

      // Run validator if specified
      if (check.validator) {
        const validator = validators.get(check.validator)
        if (validator) {
          const result = await validator(matchingEvidence, check.params)
          checks.push({
            id: check.id,
            status: result.status,
            evidenceId: matchingEvidence.id,
            message: result.message,
          })
        } else {
          checks.push({
            id: check.id,
            status: "error",
            evidenceId: matchingEvidence.id,
            message: `Unknown validator: ${check.validator}`,
          })
        }
      } else {
        // No validator, just check evidence exists
        checks.push({
          id: check.id,
          status: "passed",
          evidenceId: matchingEvidence.id,
          message: `Evidence found: ${matchingEvidence.name}`,
        })
      }
    }

    const failedChecks = checks.filter((c) => c.status === "failed" || c.status === "missing")
    const status = failedChecks.length > 0 ? "failed" : "passed"

    return {
      gate: gate.id,
      phase: "unknown", // Should be passed from context
      status,
      timestamp: Date.now(),
      checks,
      evidenceIds,
    }
  }

  return { registerValidator, evaluate }
}

// Register built-in validators
export function registerBuiltInValidators(): void {
  createGateEvaluator().registerValidator("file_exists", async (evidence) => {
    if (!evidence?.file_path) {
      return { status: "failed", message: "No file path in evidence" }
    }
    // In production, actually check file existence
    return { status: "passed", message: `File exists: ${evidence.file_path}` }
  })

  createGateEvaluator().registerValidator("tests_passed", async (evidence) => {
    if (!evidence?.content_json) {
      return { status: "failed", message: "No test report in evidence" }
    }
    try {
      const report = JSON.parse(evidence.content_json)
      const passed = report.failed === 0
      return {
        status: passed ? "passed" : "failed",
        message: passed ? `All ${report.passed} tests passed` : `${report.failed} tests failed`,
      }
    } catch {
      return { status: "error", message: "Invalid test report format" }
    }
  })

  createGateEvaluator().registerValidator("no_vulns", async (evidence, params) => {
    if (!evidence?.content_json) {
      return { status: "failed", message: "No vulnerability report in evidence" }
    }
    try {
      const report = JSON.parse(evidence.content_json)
      const severities = (params?.severity as string[]) ?? ["critical", "high"]
      const found = report.vulnerabilities?.filter((v: any) => severities.includes(v.severity))
      const passed = !found || found.length === 0
      return {
        status: passed ? "passed" : "failed",
        message: passed
          ? "No critical/high vulnerabilities found"
          : `${found.length} ${severities.join("/")} vulnerabilities found`,
      }
    } catch {
      return { status: "error", message: "Invalid vulnerability report format" }
    }
  })
}
