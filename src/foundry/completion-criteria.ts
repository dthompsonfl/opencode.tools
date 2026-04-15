import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import * as yaml from 'js-yaml';

const execAsync = promisify(exec);

export interface CompletionVerificationStep {
  run?: string;
  check?: string;
}

export interface CompletionCriterion {
  task: string;
  requires: string[];
  verification: CompletionVerificationStep[];
}

export interface CompletionCriteriaSpec {
  criteria: CompletionCriterion[];
}

export interface CompletionCriteriaValidationResult {
  valid: boolean;
  errors: string[];
}

export interface CompletionCriteriaParseResult {
  spec: CompletionCriteriaSpec;
  validation: CompletionCriteriaValidationResult;
}

export interface CriteriaEvidenceRecord {
  criterionTask: string;
  stepType: 'run' | 'check';
  expression: string;
  passed: boolean;
  output: string;
  durationMs: number;
  timestamp: string;
}

export interface CriterionVerificationResult {
  task: string;
  passed: boolean;
  requiredChecks: string[];
  stepResults: CriteriaEvidenceRecord[];
}

export interface CompletionCriteriaVerificationReport {
  passed: boolean;
  startedAt: string;
  finishedAt: string;
  criteria: CriterionVerificationResult[];
  evidence: CriteriaEvidenceRecord[];
  errors: string[];
}

export interface CompletionCriteriaVerifierOptions {
  cwd: string;
  commandTimeoutMs?: number;
}

export function parseCompletionCriteriaDsl(dsl: string): CompletionCriteriaParseResult {
  const normalized = dsl.trim();
  if (!normalized) {
    return {
      spec: { criteria: [] },
      validation: { valid: false, errors: ['Completion criteria DSL is empty.'] },
    };
  }

  let parsed: unknown;
  try {
    parsed = yaml.load(normalized);
  } catch (error) {
    return {
      spec: { criteria: [] },
      validation: {
        valid: false,
        errors: [`Unable to parse completion criteria DSL: ${error instanceof Error ? error.message : String(error)}`],
      },
    };
  }

  const rawCriteria = extractCriteriaArray(parsed);
  const spec: CompletionCriteriaSpec = {
    criteria: rawCriteria.map((item) => toCriterion(item)).filter((item): item is CompletionCriterion => item !== null),
  };

  return {
    spec,
    validation: validateCompletionCriteria(spec),
  };
}

export function validateCompletionCriteria(spec: CompletionCriteriaSpec): CompletionCriteriaValidationResult {
  const errors: string[] = [];
  if (!Array.isArray(spec.criteria) || spec.criteria.length === 0) {
    errors.push('Completion criteria must define at least one criterion item.');
    return { valid: false, errors };
  }

  spec.criteria.forEach((criterion, index) => {
    const prefix = `criteria[${index}]`;
    if (!criterion.task || criterion.task.trim().length === 0) {
      errors.push(`${prefix}.task is required.`);
    }

    if (!Array.isArray(criterion.requires) || criterion.requires.length === 0) {
      errors.push(`${prefix}.requires must include at least one requirement.`);
    }

    if (!Array.isArray(criterion.verification) || criterion.verification.length === 0) {
      errors.push(`${prefix}.verification must include at least one run/check step.`);
    }

    criterion.verification.forEach((step, stepIndex) => {
      const hasRun = typeof step.run === 'string' && step.run.trim().length > 0;
      const hasCheck = typeof step.check === 'string' && step.check.trim().length > 0;
      if (!hasRun && !hasCheck) {
        errors.push(`${prefix}.verification[${stepIndex}] must define run or check.`);
      }
    });
  });

  return { valid: errors.length === 0, errors };
}

export class CompletionCriteriaVerifier {
  private readonly cwd: string;

  private readonly commandTimeoutMs: number;

  public constructor(options: CompletionCriteriaVerifierOptions) {
    this.cwd = path.resolve(options.cwd);
    this.commandTimeoutMs = Math.max(1000, options.commandTimeoutMs ?? 120000);
  }

  public async verify(spec: CompletionCriteriaSpec): Promise<CompletionCriteriaVerificationReport> {
    const startedAt = new Date().toISOString();
    const validation = validateCompletionCriteria(spec);
    if (!validation.valid) {
      return {
        passed: false,
        startedAt,
        finishedAt: new Date().toISOString(),
        criteria: [],
        evidence: [],
        errors: validation.errors,
      };
    }

    const criteriaResults: CriterionVerificationResult[] = [];
    const evidence: CriteriaEvidenceRecord[] = [];
    const errors: string[] = [];

    for (const criterion of spec.criteria) {
      const stepResults: CriteriaEvidenceRecord[] = [];

      for (const step of criterion.verification) {
        if (typeof step.run === 'string' && step.run.trim().length > 0) {
          const result = await this.runCommandStep(criterion.task, step.run);
          stepResults.push(result);
          evidence.push(result);
          if (!result.passed) {
            errors.push(`Command verification failed for "${criterion.task}": ${step.run}`);
          }
          continue;
        }

        if (typeof step.check === 'string' && step.check.trim().length > 0) {
          const result = this.runCheckStep(criterion.task, step.check);
          stepResults.push(result);
          evidence.push(result);
          if (!result.passed) {
            errors.push(`Check verification failed for "${criterion.task}": ${step.check}`);
          }
        }
      }

      criteriaResults.push({
        task: criterion.task,
        requiredChecks: [...criterion.requires],
        passed: stepResults.every((item) => item.passed),
        stepResults,
      });
    }

    return {
      passed: criteriaResults.every((item) => item.passed),
      startedAt,
      finishedAt: new Date().toISOString(),
      criteria: criteriaResults,
      evidence,
      errors,
    };
  }

  private async runCommandStep(task: string, command: string): Promise<CriteriaEvidenceRecord> {
    const started = Date.now();
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.cwd,
        timeout: this.commandTimeoutMs,
        maxBuffer: 1024 * 1024 * 20,
      });

      return {
        criterionTask: task,
        stepType: 'run',
        expression: command,
        passed: true,
        output: [stdout, stderr].filter(Boolean).join('\n').trim().slice(0, 10000),
        durationMs: Date.now() - started,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const execError = error as NodeJS.ErrnoException & {
        stdout?: string;
        stderr?: string;
      };

      return {
        criterionTask: task,
        stepType: 'run',
        expression: command,
        passed: false,
        output: [execError.stdout, execError.stderr, execError.message].filter(Boolean).join('\n').trim().slice(0, 10000),
        durationMs: Date.now() - started,
        timestamp: new Date().toISOString(),
      };
    }
  }

  private runCheckStep(task: string, checkExpression: string): CriteriaEvidenceRecord {
    const started = Date.now();
    const parsed = parseCheckExpression(checkExpression);
    if (!parsed) {
      return {
        criterionTask: task,
        stepType: 'check',
        expression: checkExpression,
        passed: false,
        output: 'Unsupported check expression. Supported format: "<relative path> exists".',
        durationMs: Date.now() - started,
        timestamp: new Date().toISOString(),
      };
    }

    const targetPath = path.resolve(this.cwd, parsed.path);
    const exists = fs.existsSync(targetPath);
    return {
      criterionTask: task,
      stepType: 'check',
      expression: checkExpression,
      passed: exists,
      output: exists ? `Found: ${targetPath}` : `Missing: ${targetPath}`,
      durationMs: Date.now() - started,
      timestamp: new Date().toISOString(),
    };
  }
}

function extractCriteriaArray(parsed: unknown): unknown[] {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return [];
  }

  const record = parsed as Record<string, unknown>;
  const criteria = record.CRITERIA ?? record.criteria;
  return Array.isArray(criteria) ? criteria : [];
}

function toCriterion(value: unknown): CompletionCriterion | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const task = typeof record.task === 'string' ? record.task : '';

  const requires = Array.isArray(record.requires)
    ? record.requires.map((item) => String(item))
    : [];

  const verification = Array.isArray(record.verification)
    ? record.verification.reduce<CompletionVerificationStep[]>((acc, item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return acc;
      }

      const candidate = item as Record<string, unknown>;
      const run = typeof candidate.run === 'string' ? candidate.run : undefined;
      const check = typeof candidate.check === 'string' ? candidate.check : undefined;
      if (!run && !check) {
        return acc;
      }

      acc.push({ run, check });
      return acc;
    }, [])
    : [];

  return {
    task,
    requires,
    verification,
  };
}

function parseCheckExpression(expression: string): { path: string } | null {
  const trimmed = expression.trim();
  const fileMatch = trimmed.match(/^file\s+(.+?)\s+exists$/i);
  if (fileMatch) {
    return { path: fileMatch[1].trim() };
  }

  const directMatch = trimmed.match(/^(.+?)\s+exists$/i);
  if (directMatch) {
    return { path: directMatch[1].trim() };
  }

  return null;
}
