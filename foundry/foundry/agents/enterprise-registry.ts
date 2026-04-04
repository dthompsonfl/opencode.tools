import type { Role } from "@/foundry/core/rbac";

export const ENTERPRISE_AGENT_ROLES: Role[] = [
  {
    id: "CTO_ORCHESTRATOR",
    name: "CTO Orchestrator",
    description: "Overall technical leadership and decision making",
    permissions: [
      { resource: "phase", action: "approve", scope: "project" },
      { resource: "deployment", action: "approve", scope: "project" },
      {
        resource: "deployment",
        action: "execute",
        scope: "project",
        conditions: { requireSecondaryApproval: ["SECURITY_LEAD"] },
      },
      { resource: "task", action: "assign", scope: "project" },
      { resource: "task", action: "block", scope: "project" },
    ],
    vetoGates: ["release_readiness"],
    conditions: { requireHumanOversight: true },
  },
  {
    id: "SECURITY_LEAD",
    name: "Security Lead",
    description: "Security architecture and vulnerability management",
    permissions: [
      { resource: "gate", action: "execute", scope: "project" },
      { resource: "artifact", action: "create", scope: "project" },
      { resource: "task", action: "veto", scope: "project" },
    ],
    vetoGates: ["security_gate", "security_validation"],
  },
  {
    id: "COMPLIANCE_OFFICER",
    name: "Compliance Officer",
    description: "Regulatory compliance and audit management",
    permissions: [
      { resource: "gate", action: "execute", scope: "project" },
      { resource: "artifact", action: "create", scope: "project" },
      { resource: "evidence", action: "view", scope: "organization" },
    ],
    vetoGates: ["compliance_gate", "compliance_validation"],
  },
  {
    id: "PRODUCT_MANAGER",
    name: "Product Manager",
    description: "Requirements validation and stakeholder communication",
    permissions: [
      { resource: "artifact", action: "create", scope: "project" },
      { resource: "backlog", action: "modify", scope: "project" },
      { resource: "task", action: "approve", scope: "project" },
    ],
  },
  {
    id: "STAFF_BACKEND_ENGINEER",
    name: "Staff Backend Engineer",
    description: "Backend architecture and implementation",
    permissions: [
      { resource: "artifact", action: "create", scope: "project" },
      { resource: "task", action: "execute", scope: "project" },
    ],
  },
  {
    id: "STAFF_FRONTEND_ENGINEER",
    name: "Staff Frontend Engineer",
    description: "Frontend architecture and implementation",
    permissions: [
      { resource: "artifact", action: "create", scope: "project" },
      { resource: "task", action: "execute", scope: "project" },
    ],
  },
  {
    id: "DATA_ENGINEER",
    name: "Data Engineer",
    description: "Data modeling and pipeline architecture",
    permissions: [
      { resource: "artifact", action: "create", scope: "project" },
      { resource: "task", action: "execute", scope: "project" },
    ],
    vetoGates: ["data_gate"],
  },
  {
    id: "SRE_DEVOPS",
    name: "SRE / DevOps",
    description: "Infrastructure and deployment automation",
    permissions: [
      { resource: "deployment", action: "execute", scope: "project" },
      { resource: "infrastructure", action: "modify", scope: "project" },
      { resource: "observability", action: "configure", scope: "project" },
    ],
    vetoGates: ["deployment_gate"],
  },
  {
    id: "QA_LEAD",
    name: "QA Automation Lead",
    description: "Test strategy and quality validation",
    permissions: [
      { resource: "gate", action: "execute", scope: "project" },
      { resource: "task", action: "approve", scope: "project" },
    ],
    vetoGates: ["quality_gate"],
  },
  {
    id: "UX_RESEARCHER",
    name: "UX Researcher",
    description: "User experience and accessibility validation",
    permissions: [
      { resource: "artifact", action: "create", scope: "project" },
      { resource: "task", action: "validate", scope: "project" },
    ],
    vetoGates: ["a11y_gate"],
  },
  {
    id: "TECH_WRITER",
    name: "Technical Writer",
    description: "Documentation and runbook creation",
    permissions: [
      { resource: "artifact", action: "create", scope: "project" },
    ],
  },
  {
    id: "INCIDENT_COMMANDER",
    name: "Incident Commander",
    description: "Emergency response and rollback decisions",
    permissions: [
      { resource: "deployment", action: "execute", scope: "project" },
      { resource: "task", action: "veto", scope: "project" },
    ],
    vetoGates: ["emergency_veto"],
  },
];

import { RBACManager } from "@/foundry/core/rbac";

export function initializeEnterpriseRoles(rbac: RBACManager): void {
  for (const role of ENTERPRISE_AGENT_ROLES) {
    rbac.registerRole(role);
  }
}
