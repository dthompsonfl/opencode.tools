// Common types for all agents

export interface IAgent {
  // Base agent interface
}

export interface BacklogItem {
  id: string;
  title: string;
  description: string;
  techStack: string;
}

export interface ProjectScaffoldResult {
  success: boolean;
  log: string;
  filesCreated: string[];
  metadata?: {
    runId: string;
    generatedAt: string;
    inputHash: string;
  };
}

export interface TestCase {
  id: string;
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  type: 'Unit' | 'Integration' | 'E2E' | 'Security' | 'Performance';
  acceptanceCriteria: string[];
}

export interface TestPlan {
  testCases: TestCase[];
  coverage: {
    unit: number;
    integration: number;
    e2e: number;
  };
  estimatedEffort: string;
}

export interface RiskMatrix {
  risks: Array<{
    id: string;
    description: string;
    probability: 'Low' | 'Medium' | 'High';
    impact: 'Low' | 'Medium' | 'High';
    mitigation: string;
  }>;
}

export interface TestPlanResult {
  testPlan: string;
  unitTestCode: string;
  staticAnalysisReport: StaticAnalysisReport;
  metadata?: {
    runId: string;
    generatedAt: string;
    evidence: string[];
  };
}

export interface StaticAnalysisReport {
  summary: string;
  issues: { severity: string; description: string; file: string }[];
}
