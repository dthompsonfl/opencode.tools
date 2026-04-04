interface AgentRole {
  id: string
  name: string
  can: string[]
  vetoes: string[]
}

interface AgentRegistry {
  load: (yamlPath: string) => Promise<AgentRole[]>
  get: (id: string) => AgentRole | undefined
  list: () => AgentRole[]
  canVeto: (roleId: string, gate: string) => boolean
}

export function createAgentRegistry(): AgentRegistry {
  const agents = new Map<string, AgentRole>()

  const load = async (yamlPath: string): Promise<AgentRole[]> => {
    // In production, this would parse YAML files
    // For now, we'll use hardcoded agent definitions
    const defaultAgents: AgentRole[] = [
      {
        id: "CTO_ORCHESTRATOR",
        name: "CTO Orchestrator",
        can: ["plan", "assign", "block", "approve_phase", "approve_release"],
        vetoes: [],
      },
      {
        id: "SECURITY_LEAD",
        name: "Security Lead",
        can: ["threat_model", "security_review", "vuln_triage", "approve_security"],
        vetoes: ["security_gate"],
      },
      {
        id: "STAFF_BACKEND_ENGINEER",
        name: "Staff Backend Engineer",
        can: ["implement_backend", "migrations", "api_contracts"],
        vetoes: [],
      },
      {
        id: "STAFF_FRONTEND_ENGINEER",
        name: "Staff Frontend Engineer",
        can: ["implement_frontend", "a11y", "design_system"],
        vetoes: [],
      },
      {
        id: "SRE_DEVOPS",
        name: "SRE / DevOps",
        can: ["ci_cd", "infra", "observability", "deploy", "rollback"],
        vetoes: [],
      },
      {
        id: "QA_AUTOMATION_LEAD",
        name: "QA Automation Lead",
        can: ["test_strategy", "e2e", "acceptance_validation"],
        vetoes: ["quality_gate"],
      },
    ]

    for (const agent of defaultAgents) {
      agents.set(agent.id, agent)
    }

    return defaultAgents
  }

  const get = (id: string): AgentRole | undefined => agents.get(id)

  const list = (): AgentRole[] => Array.from(agents.values())

  const canVeto = (roleId: string, gate: string): boolean => {
    const agent = agents.get(roleId)
    return agent?.vetoes.includes(gate) ?? false
  }

  return { load, get, list, canVeto }
}
