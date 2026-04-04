import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface SecurityFinding {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: string;
  title: string;
  description: string;
  location: {
    file: string;
    line: number;
    column: number;
  };
  remediation?: string;
  cwe?: string;
  cvss?: number;
}

export interface ScanResult {
  findings: SecurityFinding[];
  summary?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface SecurityScanner {
  name: string;
  type: "sast" | "sca" | "secrets" | "iac" | "container";
  scan(options: { target: string; rules?: string[] }): Promise<ScanResult>;
}

export class SemgrepScanner implements SecurityScanner {
  name = "Semgrep";
  type = "sast" as const;

  async scan(options: { target: string }): Promise<ScanResult> {
    let stdoutData = "";
    try {
      const { stdout } = await execFileAsync("semgrep", ["scan", options.target, "--json", "--config=auto"]);
      stdoutData = stdout;
    } catch (error: any) {
      if (error.stdout) {
        stdoutData = error.stdout;
      } else {
        throw error;
      }
    }

    try {
      const results = JSON.parse(stdoutData);
      return {
        findings: results.results?.map((r: any) => ({
          id: `${r.check_id}-${r.start?.line || 0}`,
          severity: this.mapSeverity(r.extra?.severity),
          category: r.check_id,
          title: r.extra?.message || "Unknown",
          description: r.extra?.lines || "",
          location: {
            file: r.path,
            line: r.start?.line || 0,
            column: r.start?.col || 0,
          },
          remediation: r.extra?.fix,
          cwe: r.extra?.metadata?.cwe?.[0],
        })) || [],
      };
    } catch {
      return { findings: [] };
    }
  }

  private mapSeverity(severity: string): SecurityFinding["severity"] {
    const mapping: Record<string, SecurityFinding["severity"]> = {
      critical: "critical",
      high: "high",
      medium: "medium",
      low: "low",
      info: "info",
    };
    return mapping[severity?.toLowerCase()] || "medium";
  }
}

export class GitLeaksScanner implements SecurityScanner {
  name = "GitLeaks";
  type = "secrets" as const;

  async scan(options: { target: string }): Promise<ScanResult> {
    let stdoutData = "";
    try {
      const { stdout } = await execFileAsync("gitleaks", ["detect", options.target, "--verbose", "--json"]);
      stdoutData = stdout;
    } catch (error: any) {
      if (error.stdout) {
        stdoutData = error.stdout;
      } else {
        throw error;
      }
    }

    try {
      const results = JSON.parse(stdoutData);
      return {
        findings: results?.map((f: any) => ({
          id: `${f.RuleID}-${f.StartLine}`,
          severity: "critical" as const,
          category: "secret_exposure",
          title: `Secret detected: ${f.RuleID}`,
          description: f.Match,
          location: {
            file: f.File,
            line: f.StartLine,
            column: f.StartColumn,
          },
          remediation: "Remove secret and rotate credentials",
        })) || [],
      };
    } catch {
      return { findings: [] };
    }
  }
}

export class SnykScanner implements SecurityScanner {
  name = "Snyk";
  type = "sca" as const;

  async scan(options: { target: string }): Promise<ScanResult> {
    let stdoutData = "";
    try {
      const { stdout } = await execFileAsync("snyk", ["test", options.target, "--json"]);
      stdoutData = stdout;
    } catch (error: any) {
      if (error.stdout) {
        stdoutData = error.stdout;
      } else {
        throw error;
      }
    }

    try {
      const results = JSON.parse(stdoutData);
      const findings = results.vulnerabilities?.map((v: any) => ({
        id: v.id,
        severity: v.severity?.toLowerCase() as SecurityFinding["severity"],
        category: "dependency_vulnerability",
        title: v.title,
        description: v.description,
        location: { file: "package.json", line: 0, column: 0 },
        remediation: v.upgradePath?.join(" -> "),
        cwe: v.identifiers?.CWE?.[0],
        cvss: v.cvssScore,
      })) || [];

      return {
        findings,
        summary: {
          critical: findings.filter((f: any) => f.severity === "critical").length,
          high: findings.filter((f: any) => f.severity === "high").length,
          medium: findings.filter((f: any) => f.severity === "medium").length,
          low: findings.filter((f: any) => f.severity === "low").length,
        },
      };
    } catch {
      return { findings: [] };
    }
  }
}

export class CheckovScanner implements SecurityScanner {
  name = "Checkov";
  type = "iac" as const;

  async scan(options: { target: string }): Promise<ScanResult> {
    let stdoutData = "";
    try {
      const { stdout } = await execFileAsync("checkov", ["-d", options.target, "--output", "json"]);
      stdoutData = stdout;
    } catch (error: any) {
      if (error.stdout) {
        stdoutData = error.stdout;
      } else {
        throw error;
      }
    }

    try {
      const results = JSON.parse(stdoutData);
      const findings: SecurityFinding[] = [];

      for (const [framework, checks] of Object.entries(results)) {
        if (Array.isArray(checks)) {
          for (const check of checks) {
            if (check.check_result?.result === "FAILED") {
              findings.push({
                id: check.check_id,
                severity: (check.severity?.toLowerCase() || "medium") as SecurityFinding["severity"],
                category: "infrastructure",
                title: check.check_name,
                description: check.check_id,
                location: {
                  file: check.file_path,
                  line: check.file_line_range?.[0] || 0,
                  column: 0,
                },
                remediation: check.guideline,
              });
            }
          }
        }
      }

      return { findings };
    } catch {
      return { findings: [] };
    }
  }
}

export class TrivyScanner implements SecurityScanner {
  name = "Trivy";
  type = "container" as const;

  async scan(options: { target: string }): Promise<ScanResult> {
    let stdoutData = "";
    try {
      const { stdout } = await execFileAsync("trivy", ["image", options.target, "--format", "json"]);
      stdoutData = stdout;
    } catch (error: any) {
      if (error.stdout) {
        stdoutData = error.stdout;
      } else {
        throw error;
      }
    }

    try {
      const results = JSON.parse(stdoutData);
      const findings: SecurityFinding[] = [];

      for (const result of results.Results || []) {
        for (const vuln of result.Vulnerabilities || []) {
          findings.push({
            id: vuln.VulnerabilityID,
            severity: vuln.Severity?.toLowerCase() as SecurityFinding["severity"],
            category: "container_vulnerability",
            title: vuln.Title,
            description: vuln.Description,
            location: {
              file: result.Target,
              line: 0,
              column: 0,
            },
            remediation: vuln.FixedVersion
              ? `Upgrade to ${vuln.FixedVersion}`
              : "No fix available",
            cwe: vuln.CweIDs?.[0],
            cvss: vuln.CVSS?.nvd?.V3Score,
          });
        }
      }

      return { findings };
    } catch {
      return { findings: [] };
    }
  }
}
