import type { Evidence, GateResult, GateCheck, Gate } from "@/foundry/types";

interface GateDefinition extends Gate {
  phase: string;
  name: string;
}

export const SECURITY_GATES: GateDefinition[] = [
  {
    id: "sast_gate",
    name: "SAST Quality Gate",
    description: "Static application security testing",
    phase: "phase_4_feature_loop",
    required: true,
    checks: [
      {
        id: "sast_scan",
        evidenceType: "test_report",
        validator: "no_critical_high_findings",
      },
    ],
  },
  {
    id: "secrets_gate",
    name: "Secrets Detection Gate",
    description: "Detects exposed secrets in code",
    phase: "phase_4_feature_loop",
    required: true,
    checks: [
      {
        id: "secrets_scan",
        evidenceType: "vuln_report",
        validator: "no_secrets_found",
      },
    ],
  },
  {
    id: "sca_gate",
    name: "Dependency Security Gate",
    description: "Software composition analysis",
    phase: "phase_4_feature_loop",
    required: true,
    checks: [
      {
        id: "sca_scan",
        evidenceType: "vuln_report",
        validator: "no_critical_high_vulns",
      },
    ],
  },
];

export class SecurityGateEvaluator {
  evaluateGate(gateId: string, evidence: Evidence[]): GateResult {
    const gate = SECURITY_GATES.find((g) => g.id === gateId);
    if (!gate) {
      return {
        gate: gateId,
        phase: "unknown",
        status: "error",
        timestamp: Date.now(),
        checks: [],
        evidenceIds: [],
      };
    }

    const checks: GateCheck[] = [];
    let overallStatus: "passed" | "failed" | "error" = "passed";

    for (const check of gate.checks) {
      const matchingEvidence = evidence.find((e) => e.type === check.evidenceType);

      if (!matchingEvidence) {
        checks.push({
          id: check.id,
          status: "missing",
          message: `Missing evidence: ${check.evidenceType}`,
        });
        overallStatus = "failed";
        continue;
      }

      const checkResult = this.runValidator(check.validator, matchingEvidence);
      checks.push({
        id: check.id,
        status: checkResult.status,
        evidenceId: matchingEvidence.id,
        message: checkResult.message,
      });

      if (checkResult.status === "failed") {
        overallStatus = "failed";
      }
    }

    return {
      gate: gateId,
      phase: gate.phase,
      status: overallStatus,
      timestamp: Date.now(),
      checks,
      evidenceIds: evidence.map((e) => e.id),
    };
  }

  private runValidator(
    validator: string | undefined,
    evidence: Evidence
  ): { status: "passed" | "failed" | "error"; message: string } {
    if (!validator) {
      return { status: "passed", message: "No validator required" };
    }

    switch (validator) {
      case "no_critical_high_findings":
        return this.validateNoCriticalFindings(evidence);
      case "no_secrets_found":
        return this.validateNoSecrets(evidence);
      case "no_critical_high_vulns":
        return this.validateNoCriticalVulns(evidence);
      default:
        return { status: "error", message: `Unknown validator: ${validator}` };
    }
  }

  private validateNoCriticalFindings(
    evidence: Evidence
  ): { status: "passed" | "failed"; message: string } {
    try {
      const content = JSON.parse(evidence.content_json || "{}");
      const critical = content.summary?.critical || 0;
      const high = content.summary?.high || 0;

      if (critical > 0 || high > 0) {
        return {
          status: "failed",
          message: `${critical} critical, ${high} high findings detected`,
        };
      }

      return { status: "passed", message: "No critical/high findings" };
    } catch {
      return { status: "failed", message: "Invalid evidence format" };
    }
  }

  private validateNoSecrets(evidence: Evidence): { status: "passed" | "failed"; message: string } {
    try {
      const content = JSON.parse(evidence.content_json || "{}");
      const findings = content.findings || [];

      if (findings.length > 0) {
        return {
          status: "failed",
          message: `${findings.length} secrets detected`,
        };
      }

      return { status: "passed", message: "No secrets found" };
    } catch {
      return { status: "failed", message: "Invalid evidence format" };
    }
  }

  private validateNoCriticalVulns(
    evidence: Evidence
  ): { status: "passed" | "failed"; message: string } {
    try {
      const content = JSON.parse(evidence.content_json || "{}");
      const vulns = content.vulnerabilities || [];
      const criticalHigh = vulns.filter(
        (v: any) => v.severity === "critical" || v.severity === "high"
      );

      if (criticalHigh.length > 0) {
        return {
          status: "failed",
          message: `${criticalHigh.length} critical/high vulnerabilities`,
        };
      }

      return { status: "passed", message: "No critical/high vulnerabilities" };
    } catch {
      return { status: "failed", message: "Invalid evidence format" };
    }
  }
}
