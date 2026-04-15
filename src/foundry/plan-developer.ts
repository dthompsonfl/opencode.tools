import { listRolePromptTemplates, type FoundryRoleId } from './role-prompts';
import type { CompletionCriteriaSpec } from './completion-criteria';

export interface PlanMilestone {
  name: string;
  targetDate: string;
  dependencies: string[];
}

export interface WorkBreakdownItem {
  id: string;
  title: string;
  ownerRole: FoundryRoleId;
  dependencies: string[];
  acceptanceCriteria: string[];
}

export interface ResourceAllocation {
  roleId: FoundryRoleId;
  roleName: string;
  allocationPercent: number;
  focus: string;
}

export interface PlanRisk {
  id: string;
  level: 'low' | 'medium' | 'high';
  description: string;
  mitigation: string;
}

export interface QualityGatePlan {
  gateId: string;
  ownerRole: FoundryRoleId;
  intent: string;
}

export interface FoundryExecutionPlan {
  executiveSummary: string;
  workBreakdownStructure: WorkBreakdownItem[];
  resourceAllocation: ResourceAllocation[];
  milestones: PlanMilestone[];
  risks: PlanRisk[];
  qualityGates: QualityGatePlan[];
}

export interface PlanDevelopmentInput {
  projectName: string;
  description?: string;
  industry?: string;
  completionCriteria?: CompletionCriteriaSpec;
  intakeContext?: Record<string, unknown>;
  preferredRoles?: FoundryRoleId[];
}

export class PlanDeveloper {
  public developPlan(input: PlanDevelopmentInput): FoundryExecutionPlan {
    const criteriaItems = input.completionCriteria?.criteria ?? [];
    const wbs = criteriaItems.length > 0 ? this.wbsFromCriteria(criteriaItems) : this.defaultWbs();

    const summary = [
      `${input.projectName} execution plan establishes a phased delivery model with measurable completion criteria.`,
      input.description ? `Primary intent: ${input.description}` : '',
      input.industry ? `Industry considerations: ${input.industry}.` : '',
      `Plan includes ${wbs.length} work packages and explicit quality gates for build, test, lint, security, documentation, and deliverable scope control.`,
    ]
      .filter(Boolean)
      .join(' ');

    return {
      executiveSummary: summary,
      workBreakdownStructure: wbs,
      resourceAllocation: this.buildResourceAllocation(input.preferredRoles),
      milestones: this.buildMilestones(wbs),
      risks: this.buildRisks(input.industry, wbs.length),
      qualityGates: this.buildQualityGates(),
    };
  }

  private wbsFromCriteria(criteriaItems: CompletionCriteriaSpec['criteria']): WorkBreakdownItem[] {
    return criteriaItems.map((criterion, index) => {
      const roleId = index % 2 === 0 ? 'STAFF_BACKEND_ENGINEER' : 'STAFF_FRONTEND_ENGINEER';
      return {
        id: `wbs-${index + 1}`,
        title: criterion.task,
        ownerRole: roleId,
        dependencies: index === 0 ? [] : [`wbs-${index}`],
        acceptanceCriteria: [...criterion.requires],
      };
    });
  }

  private defaultWbs(): WorkBreakdownItem[] {
    return [
      {
        id: 'wbs-1',
        title: 'Discovery and requirement finalization',
        ownerRole: 'PRODUCT_MANAGER',
        dependencies: [],
        acceptanceCriteria: ['Requirements are explicit', 'Acceptance criteria are measurable'],
      },
      {
        id: 'wbs-2',
        title: 'Architecture and data strategy',
        ownerRole: 'CTO_ORCHESTRATOR',
        dependencies: ['wbs-1'],
        acceptanceCriteria: ['Architecture decisions documented', 'Data model constraints captured'],
      },
      {
        id: 'wbs-3',
        title: 'Implementation delivery',
        ownerRole: 'STAFF_BACKEND_ENGINEER',
        dependencies: ['wbs-2'],
        acceptanceCriteria: ['Implementation complete', 'Core tests added'],
      },
      {
        id: 'wbs-4',
        title: 'Quality and security validation',
        ownerRole: 'QA_LEAD',
        dependencies: ['wbs-3'],
        acceptanceCriteria: ['Quality gates pass', 'Security controls verified'],
      },
      {
        id: 'wbs-5',
        title: 'Documentation and release readiness',
        ownerRole: 'TECH_WRITER',
        dependencies: ['wbs-4'],
        acceptanceCriteria: ['Operator documentation updated', 'Release notes prepared'],
      },
    ];
  }

  private buildResourceAllocation(preferredRoles?: FoundryRoleId[]): ResourceAllocation[] {
    const templates = listRolePromptTemplates();
    const selected = preferredRoles?.length
      ? templates.filter((template) => preferredRoles.includes(template.roleId))
      : templates;

    if (selected.length === 0) {
      return [];
    }

    const share = Math.max(5, Math.floor(100 / selected.length));
    return selected.map((template) => ({
      roleId: template.roleId,
      roleName: template.roleName,
      allocationPercent: share,
      focus: template.responsibilities[0] ?? 'Execution support',
    }));
  }

  private buildMilestones(wbs: WorkBreakdownItem[]): PlanMilestone[] {
    const now = new Date();
    return wbs.map((item, index) => {
      const milestoneDate = new Date(now.getTime() + (index + 1) * 3 * 24 * 60 * 60 * 1000);
      return {
        name: item.title,
        targetDate: milestoneDate.toISOString(),
        dependencies: [...item.dependencies],
      };
    });
  }

  private buildRisks(industry: string | undefined, taskCount: number): PlanRisk[] {
    const risks: PlanRisk[] = [
      {
        id: 'risk-1',
        level: 'high',
        description: 'Scope growth may outpace planned iterations.',
        mitigation: 'Use explicit completion criteria and iteration boundaries.',
      },
      {
        id: 'risk-2',
        level: 'medium',
        description: 'Quality gate failures may delay release readiness.',
        mitigation: 'Run security and documentation checks early in each loop.',
      },
    ];

    if (industry && industry.trim().length > 0) {
      risks.push({
        id: 'risk-3',
        level: 'medium',
        description: `Industry-specific compliance risk for ${industry}.`,
        mitigation: 'Include compliance-targeted security and documentation reviews.',
      });
    }

    if (taskCount > 8) {
      risks.push({
        id: 'risk-4',
        level: 'high',
        description: 'Large plan size increases coordination overhead.',
        mitigation: 'Apply dependency-aware delegation and enforce concurrency limits.',
      });
    }

    return risks;
  }

  private buildQualityGates(): QualityGatePlan[] {
    return [
      { gateId: 'build', ownerRole: 'SRE_DEVOPS', intent: 'Code compiles and packages cleanly' },
      { gateId: 'test', ownerRole: 'QA_LEAD', intent: 'Automated tests pass with expected coverage' },
      { gateId: 'lint', ownerRole: 'STAFF_BACKEND_ENGINEER', intent: 'Static analysis and style checks pass' },
      { gateId: 'security', ownerRole: 'SECURITY_LEAD', intent: 'Security checks and audit controls pass' },
      { gateId: 'documentation', ownerRole: 'TECH_WRITER', intent: 'Required documentation is complete and current' },
      {
        gateId: 'deliverable_scope',
        ownerRole: 'QA_LEAD',
        intent: 'Final deliverables include only code/docs/tests and exclude generated artifacts',
      },
    ];
  }
}
