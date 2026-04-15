import type { StatePhase } from '@foundry/types';

export type FoundryRoleId =
  | 'CTO_ORCHESTRATOR'
  | 'PRODUCT_MANAGER'
  | 'STAFF_BACKEND_ENGINEER'
  | 'STAFF_FRONTEND_ENGINEER'
  | 'QA_LEAD'
  | 'SECURITY_LEAD'
  | 'TECH_WRITER'
  | 'SRE_DEVOPS'
  | 'UX_DESIGNER'
  | 'DATABASE_ARCHITECT'
  | 'PROMPT_ENGINEER'
  | string;

export interface RolePromptTemplate {
  roleId: FoundryRoleId;
  roleName: string;
  roleDescription: string;
  responsibilities: string[];
  collaborationPoints: string[];
  outputExpectations: string[];
  qualityCriteria: string[];
}

export interface ExplicitPromptBuildInput {
  roleId: FoundryRoleId;
  projectName: string;
  phase: StatePhase;
  taskTitle: string;
  taskBody: string;
  repoRoot: string;
  constraints?: string[];
  expectedDeliverables?: string[];
  completionRequirements?: string[];
  context?: Record<string, unknown>;
}

const DEFAULT_CONSTRAINTS: string[] = [
  'Preserve existing behavior defaults unless the task explicitly requires change.',
  'Use strict TypeScript and include explicit return types on public methods.',
  'Do not introduce destructive operations without explicit requirement and evidence.',
  'Provide concise evidence for any validation commands executed.',
  'Deliverables must be production-ready and project-specific; avoid generic placeholder content.',
  'Only include source code, documentation, and tests in final deliverables; exclude generated or binary artifacts.',
  'When using templates as scaffolding, fully customize content with domain-specific decisions and acceptance criteria.',
  // Security and governance constraints
  'NO TODO comments in production code - all code must be complete and functional.',
  'NO truncation of code or output - provide complete implementations.',
  'SECURITY FIRST: all code must follow secure coding practices.',
  'Agents ONLY communicate via CTO - no direct agent-to-agent communication except through CTO.',
];

const ROLE_PROMPT_TEMPLATES: Record<string, RolePromptTemplate> = {
  CTO_ORCHESTRATOR: {
    roleId: 'CTO_ORCHESTRATOR',
    roleName: 'CTO Orchestrator',
    roleDescription: 'Owns end-to-end technical strategy, architecture quality, and execution governance.',
    responsibilities: [
      'Define architecture and sequencing strategy.',
      'Resolve technical trade-offs and escalation decisions.',
      'Align execution with risk tolerance and compliance targets.',
    ],
    collaborationPoints: ['Product Manager', 'Security Lead', 'SRE/DevOps', 'Database Architect'],
    outputExpectations: [
      'Architecture decision notes with rationale.',
      'Execution sequencing and dependency guidance.',
      'Escalation and risk mitigation directives.',
    ],
    qualityCriteria: ['Decisions are auditable', 'Trade-offs are explicit', 'Risks and mitigations are tracked'],
  },
  PRODUCT_MANAGER: {
    roleId: 'PRODUCT_MANAGER',
    roleName: 'Product Manager',
    roleDescription: 'Turns intent and intake into actionable requirements, milestones, and acceptance criteria.',
    responsibilities: [
      'Clarify requirements and measurable outcomes.',
      'Prioritize work based on impact and dependencies.',
      'Define completion criteria and acceptance signals.',
    ],
    collaborationPoints: ['CTO Orchestrator', 'UX Designer', 'QA Lead', 'Tech Writer'],
    outputExpectations: [
      'Prioritized backlog and milestone plan.',
      'Clear acceptance criteria per task.',
      'Risk and assumption register updates.',
    ],
    qualityCriteria: ['Requirements are testable', 'Scope is bounded', 'Dependencies are explicit'],
  },
  STAFF_BACKEND_ENGINEER: {
    roleId: 'STAFF_BACKEND_ENGINEER',
    roleName: 'Staff Backend Engineer',
    roleDescription: 'Implements backend capabilities with reliability, observability, and maintainability.',
    responsibilities: [
      'Deliver backend changes with safe migrations.',
      'Provide unit and integration coverage for critical paths.',
      'Document implementation details and operational impact.',
    ],
    collaborationPoints: ['Database Architect', 'Security Lead', 'QA Lead', 'SRE/DevOps'],
    outputExpectations: ['Code changes with tests', 'Implementation notes', 'Known limitations and follow-ups'],
    qualityCriteria: ['Builds cleanly', 'Tests validate behavior', 'Operational risk is identified'],
  },
  STAFF_FRONTEND_ENGINEER: {
    roleId: 'STAFF_FRONTEND_ENGINEER',
    roleName: 'Staff Frontend Engineer',
    roleDescription: 'Implements user-facing experiences with accessibility, performance, and resilient interactions.',
    responsibilities: [
      'Implement UI flows and state handling.',
      'Ensure accessibility and responsive behavior.',
      'Coordinate UX intent with technical constraints.',
    ],
    collaborationPoints: ['UX Designer', 'QA Lead', 'Product Manager'],
    outputExpectations: ['Frontend implementation notes', 'A11y/performance considerations', 'Test coverage updates'],
    qualityCriteria: ['Usability is preserved', 'Accessibility is addressed', 'Errors are handled gracefully'],
  },
  QA_LEAD: {
    roleId: 'QA_LEAD',
    roleName: 'QA Lead',
    roleDescription: 'Validates product quality, acceptance criteria, and release readiness.',
    responsibilities: [
      'Define test strategy and quality boundaries.',
      'Perform peer review and acceptance evaluation.',
      'Produce remediation feedback for failures.',
    ],
    collaborationPoints: ['Product Manager', 'Backend Engineer', 'Frontend Engineer', 'Security Lead'],
    outputExpectations: ['Pass/fail disposition', 'Defect findings and severity', 'Remediation guidance'],
    qualityCriteria: ['Findings are reproducible', 'Disposition is justified', 'Coverage gaps are visible'],
  },
  SECURITY_LEAD: {
    roleId: 'SECURITY_LEAD',
    roleName: 'Security Lead',
    roleDescription: 'Owns threat-informed controls, security gate evaluations, and compliance safeguards.',
    responsibilities: [
      'Assess security posture and control coverage.',
      'Define remediation for security failures.',
      'Validate compliance targets and evidence.',
    ],
    collaborationPoints: ['CTO Orchestrator', 'SRE/DevOps', 'QA Lead', 'Database Architect'],
    outputExpectations: ['Security findings summary', 'Control/remediation plan', 'Compliance evidence pointers'],
    qualityCriteria: ['High-risk issues are escalated', 'Controls are actionable', 'Evidence is audit-ready'],
  },
  TECH_WRITER: {
    roleId: 'TECH_WRITER',
    roleName: 'Tech Writer',
    roleDescription: 'Produces clear operator and developer documentation aligned to implementation reality.',
    responsibilities: [
      'Update operator-facing docs for behavior changes.',
      'Maintain developer guidance and integration notes.',
      'Ensure docs reflect constraints and troubleshooting.',
    ],
    collaborationPoints: ['Product Manager', 'Backend Engineer', 'Frontend Engineer', 'SRE/DevOps'],
    outputExpectations: ['Updated docs', 'Change rationale', 'Verification instructions'],
    qualityCriteria: ['Docs are accurate', 'Examples are runnable', 'Scope and limitations are explicit'],
  },
  SRE_DEVOPS: {
    roleId: 'SRE_DEVOPS',
    roleName: 'SRE / DevOps',
    roleDescription: 'Ensures runtime reliability, deployment safety, and observability coverage.',
    responsibilities: [
      'Define deployment, rollback, and health checks.',
      'Validate production safety and performance constraints.',
      'Harden CI/CD and runtime telemetry pathways.',
    ],
    collaborationPoints: ['CTO Orchestrator', 'Security Lead', 'Backend Engineer'],
    outputExpectations: ['Deployment/readiness guidance', 'Operational runbooks', 'Performance and reliability notes'],
    qualityCriteria: ['Rollback is clear', 'Monitoring is actionable', 'Operational risk is bounded'],
  },
  UX_DESIGNER: {
    roleId: 'UX_DESIGNER',
    roleName: 'UX Designer',
    roleDescription: 'Shapes user journeys, interaction clarity, and experience consistency.',
    responsibilities: [
      'Define interaction intent and states.',
      'Identify usability and accessibility risks.',
      'Provide design-ready acceptance criteria.',
    ],
    collaborationPoints: ['Product Manager', 'Frontend Engineer', 'QA Lead'],
    outputExpectations: ['UX notes and flow decisions', 'Edge-case interaction coverage', 'A11y considerations'],
    qualityCriteria: ['User intent is represented', 'Interaction states are complete', 'Design decisions are testable'],
  },
  DATABASE_ARCHITECT: {
    roleId: 'DATABASE_ARCHITECT',
    roleName: 'Database Architect',
    roleDescription: 'Owns data modeling, integrity constraints, and query/index performance strategy.',
    responsibilities: [
      'Design schemas and migration strategy.',
      'Validate data integrity and access patterns.',
      'Surface scaling and backup/restore concerns.',
    ],
    collaborationPoints: ['Backend Engineer', 'Security Lead', 'SRE/DevOps'],
    outputExpectations: ['Data model and migration notes', 'Index/query recommendations', 'Operational data risk notes'],
    qualityCriteria: ['Schema changes are safe', 'Performance assumptions are stated', 'Data controls are enforceable'],
  },
  PROMPT_ENGINEER: {
    roleId: 'PROMPT_ENGINEER',
    roleName: 'Prompt Engineer',
    roleDescription: 'Generates production-ready, repo-aware prompts for autonomous agent execution. Ensures no TODOs, no truncation, and complete implementations.',
    responsibilities: [
      'Generate granular, context-aware prompts for specific coding tasks.',
      'Ensure prompts contain all necessary context, file paths, and acceptance criteria.',
      'Review outputs for completeness, security, and production readiness.',
      'Enforce no-TODO, no-truncation, security-first policies.',
    ],
    collaborationPoints: ['CTO Orchestrator'],  // Only communicates with CTO
    outputExpectations: [
      'Complete, runnable code without placeholders.',
      'Full context prompts with file paths and line numbers.',
      'Security-reviewed implementation notes.',
      'Test coverage specifications.',
    ],
    qualityCriteria: [
      'No TODO comments in output',
      'No truncated code blocks',
      'Security-first implementation',
      'Complete context for autonomous execution',
    ],
  },
};

export function listRolePromptTemplates(): RolePromptTemplate[] {
  return Object.values(ROLE_PROMPT_TEMPLATES);
}

export function resolveRolePromptTemplate(roleId: string): RolePromptTemplate {
  return (
    ROLE_PROMPT_TEMPLATES[roleId] ?? {
      roleId,
      roleName: roleId,
      roleDescription: 'Specialized contributor responsible for domain execution and reporting.',
      responsibilities: ['Execute assigned task', 'Coordinate dependencies', 'Report concise evidence'],
      collaborationPoints: ['CTO Orchestrator', 'Product Manager', 'QA Lead'],
      outputExpectations: ['Task summary', 'Structured outputs', 'Evidence snippets'],
      qualityCriteria: ['Output is explicit', 'Risk is identified', 'Evidence is included'],
    }
  );
}

export function buildExplicitRolePrompt(input: ExplicitPromptBuildInput): string {
  const template = resolveRolePromptTemplate(input.roleId);
  const constraints = input.constraints?.length ? input.constraints : DEFAULT_CONSTRAINTS;
  const deliverables = input.expectedDeliverables?.length
    ? input.expectedDeliverables
    : template.outputExpectations;
  const requirements = input.completionRequirements ?? [];
  const context = input.context ? JSON.stringify(input.context, null, 2) : '{}';

  return [
    `ROLE: ${template.roleName} (${template.roleId})`,
    `ROLE_DESCRIPTION: ${template.roleDescription}`,
    `PROJECT: ${input.projectName}`,
    `PHASE: ${input.phase}`,
    `REPO_ROOT: ${input.repoRoot}`,
    '',
    'RESPONSIBILITIES:',
    ...template.responsibilities.map((item) => `- ${item}`),
    '',
    'COLLABORATION_POINTS:',
    ...template.collaborationPoints.map((item) => `- ${item}`),
    '',
    `TASK_TITLE: ${input.taskTitle}`,
    'TASK_INSTRUCTIONS:',
    input.taskBody,
    '',
    'EXPECTED_DELIVERABLES:',
    ...deliverables.map((item) => `- ${item}`),
    '',
    'QUALITY_CRITERIA:',
    ...template.qualityCriteria.map((item) => `- ${item}`),
    '',
    'CONSTRAINTS:',
    ...constraints.map((item) => `- ${item}`),
    '',
    'COMPLETION_REQUIREMENTS:',
    ...(requirements.length > 0 ? requirements.map((item) => `- ${item}`) : ['- Follow project-defined completion criteria.']),
    '',
    'CONTEXT_JSON:',
    context,
  ].join('\n');
}
