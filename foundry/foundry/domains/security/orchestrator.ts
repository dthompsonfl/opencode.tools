import type { EnterpriseStateMachine } from "@/foundry/core/state-machine";
import type { AuditTrail } from "@/foundry/core/audit-trail";
import type {
  SecurityScanner,
  SecurityFinding,
  ScanResult,
} from "@/foundry/security/scanners";
import type { SecurityGateEvaluator } from "@/foundry/security/gates";
import type { Evidence, GateResult } from "@/foundry/types";

export interface SecurityContext {
  projectId: string;
  assets: string[];
  dataFlows: DataFlow[];
  trustBoundaries: TrustBoundary[];
}

export interface DataFlow {
  source: string;
  target: string;
  dataType: string;
  protocol: string;
}

export interface TrustBoundary {
  name: string;
  components: string[];
}

export interface Threat {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
}

export interface ThreatModelResult {
  modelId: string;
  threats: Threat[];
  riskScore: number;
  evidence: Evidence[];
}

export interface SASTScanResult {
  scanId: string;
  findings: SecurityFinding[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  evidence: Evidence;
}

export class SecurityDomainOrchestrator {
  constructor(
    private stateMachine: EnterpriseStateMachine,
    private auditTrail: AuditTrail,
    private scanners: SecurityScanner[],
    private gateEvaluator: SecurityGateEvaluator
  ) {}

  async runSecurityScan(
    type: "sast" | "sca" | "secrets",
    target: string
  ): Promise<Evidence> {
    const scanner = this.scanners.find((s) => s.type === type);
    if (!scanner) {
      throw new Error(`No scanner found for type: ${type}`);
    }

    await this.auditTrail.record({
      type: "SECURITY_SCAN_START",
      actor: "SECURITY_LEAD",
      action: `${type}_scan`,
      resource: target,
      projectId: "", // From context
      phase: "phase_2_security_foundation",
      metadata: { scanner: scanner.name },
      timestamp: Date.now(),
    });

    const result = await scanner.scan({ target });

    const evidence: Evidence = {
      id: this.generateId(),
      project_id: "", // From context
      phase: "phase_2_security_foundation",
      gate: null,
      task_id: null,
      type: this.mapScannerTypeToEvidence(type),
      name: `${scanner.name} Scan ${new Date().toISOString()}`,
      description: `Security scan using ${scanner.name}`,
      file_path: null,
      file_hash: null,
      ci_run_id: null,
      ci_url: null,
      content_json: JSON.stringify(result),
      content_summary: `Found ${result.findings.length} issues`,
      created_at: Date.now(),
      created_by: "SECURITY_LEAD",
      signature: "",
    };

    await this.auditTrail.record({
      type: "SECURITY_SCAN_COMPLETE",
      actor: "SECURITY_LEAD",
      action: `${type}_scan_complete`,
      resource: target,
      projectId: "",
      phase: "phase_2_security_foundation",
      metadata: {
        findings: result.findings.length,
        critical: result.summary?.critical || 0,
      },
      timestamp: Date.now(),
    });

    return evidence;
  }

  async evaluateSecurityGate(gateId: string, evidence: Evidence[]): Promise<GateResult> {
    return this.gateEvaluator.evaluateGate(gateId, evidence);
  }

  private mapScannerTypeToEvidence(type: string): Evidence["type"] {
    const mapping: Record<string, Evidence["type"]> = {
      sast: "test_report",
      sca: "vuln_report",
      secrets: "vuln_report",
    };
    return mapping[type] || "file";
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
