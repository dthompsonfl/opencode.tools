import type { StatePhase } from '@foundry/types';
import type {
  CompletionCriteriaSpec,
  CompletionCriteriaVerificationReport,
} from './completion-criteria';
import type { DeliverableScopeReport } from './deliverable-scope';
import type { FoundryIntakeDocumentInput, FoundryIntakeProcessingResult } from './intake-document-processor';
import type { FoundryExecutionPlan } from './plan-developer';

export type FoundryTaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface FoundryTask {
  id: string;
  title: string;
  roleId: string;
  phase: StatePhase;
  status: FoundryTaskStatus;
  priority: 'low' | 'medium' | 'high';
  dependsOn: string[];
  payload?: Record<string, unknown>;
  summary?: string;
}

export interface FoundryMessage {
  id: string;
  threadId: string;
  from: string;
  to?: string;
  topic: string;
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface FoundryTaskResult {
  taskId: string;
  roleId: string;
  success: boolean;
  summary: string;
  output?: Record<string, unknown>;
  evidence?: Record<string, unknown>[];
  followUpTasks?: Omit<FoundryTask, 'status'>[];
  errors?: string[];
  coworkOutput?: unknown;
}

export interface FoundryExecutionRequest {
  projectId: string;
  resumeKey?: string;
  projectName: string;
  repoRoot: string;
  company?: string;
  industry?: string;
  description?: string;
  maxIterations?: number;
  runQualityGates?: boolean;
  enforceDeliverableScope?: boolean;
  deliverableScopeAllowList?: string[];
  intakeDocuments?: FoundryIntakeDocumentInput[];
  completionCriteriaDsl?: string;
  completionCriteriaSpec?: CompletionCriteriaSpec;
}

export interface FoundryQualityGateResult {
  name: string;
  command: string;
  passed: boolean;
  exitCode: number;
  output: string;
}

export interface FoundryReviewResult {
  passed: boolean;
  notes: string[];
  reviewer: string;
}

export interface FoundryExecutionReport {
  projectId: string;
  status: 'completed' | 'failed';
  iterationCount: number;
  phase: StatePhase;
  tasks: FoundryTask[];
  messages: FoundryMessage[];
  gateResults: FoundryQualityGateResult[];
  review: FoundryReviewResult;
  intake?: FoundryIntakeProcessingResult;
  plan?: FoundryExecutionPlan;
  completionCriteriaReport?: CompletionCriteriaVerificationReport;
  deliverableScopeReport?: DeliverableScopeReport;
  startedAt: string;
  finishedAt: string;
}
