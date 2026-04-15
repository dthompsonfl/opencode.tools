import { execFileSync } from 'child_process';

export type DeliverableCategory = 'code' | 'documentation' | 'tests' | 'generated' | 'non_source';

export interface DeliverableScopeEntry {
  path: string;
  normalizedPath: string;
  category: DeliverableCategory;
  included: boolean;
  reason: string;
}

export interface DeliverableScopeReport {
  checkedAt: string;
  source: 'provided_paths' | 'git_status';
  strict: boolean;
  passed: boolean;
  included: DeliverableScopeEntry[];
  excluded: DeliverableScopeEntry[];
  blockingExcluded: DeliverableScopeEntry[];
  summary: string;
}

export interface DeliverableScopeOptions {
  strict?: boolean;
  allowList?: string[];
  source?: DeliverableScopeReport['source'];
}

const GENERATED_PREFIXES = ['dist/', 'coverage/', '.jest-cache/', 'test-results/', 'runs/', 'artifacts/'];
const GENERATED_FILE_NAMES = new Set(['nul']);
const GENERATED_EXTENSIONS = new Set([
  '.log',
  '.zip',
  '.tar',
  '.tgz',
  '.gz',
  '.rar',
  '.7z',
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.mp4',
  '.mov',
  '.avi',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.bin',
]);

const CODE_PREFIXES = ['src/', 'agents/', 'tools/', 'scripts/', 'mcp/', 'foundry/'];
const TEST_PREFIXES = ['tests/'];
const DOC_PREFIXES = ['docs/'];

const ROOT_CODE_FILES = new Set([
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'jest.config.js',
  '.eslintrc.js',
  '.eslintignore',
  '.gitignore',
  'opencode.json',
]);

const ROOT_DOC_FILES = new Set([
  'README.md',
  'AGENTS.md',
  'INTEGRATION_GUIDE.md',
  'TUI_INTEGRATION.md',
  'FOUNDRY_PROMPT.md',
  'opencode-system-prompt.md',
]);

export function normalizeDeliverablePath(input: string): string {
  return input.replace(/\\/g, '/').replace(/^\.\//, '').trim();
}

export function parseGitStatusPaths(porcelainOutput: string): string[] {
  const paths = new Set<string>();
  const lines = porcelainOutput
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  for (const line of lines) {
    const payload = line.length > 3 ? line.slice(3).trim() : '';
    if (!payload) {
      continue;
    }

    const renamedPath = payload.includes(' -> ') ? payload.split(' -> ').pop() ?? payload : payload;
    let resolved = renamedPath;

    if (resolved.startsWith('"') && resolved.endsWith('"')) {
      resolved = resolved.slice(1, -1).replace(/\\"/g, '"');
    }

    const normalized = normalizeDeliverablePath(resolved);
    if (normalized) {
      paths.add(normalized);
    }
  }

  return Array.from(paths);
}

export function classifyDeliverablePath(pathInput: string, allowList: string[] = []): DeliverableScopeEntry {
  const normalizedPath = normalizeDeliverablePath(pathInput);
  const lower = normalizedPath.toLowerCase();
  const fileName = lower.includes('/') ? lower.slice(lower.lastIndexOf('/') + 1) : lower;
  const extension = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')) : '';
  const isRoot = !lower.includes('/');

  if (matchesAllowList(lower, allowList)) {
    return {
      path: pathInput,
      normalizedPath,
      category: 'code',
      included: true,
      reason: 'explicit allow-list exception',
    };
  }

  if (GENERATED_FILE_NAMES.has(fileName) || GENERATED_PREFIXES.some((prefix) => lower.startsWith(prefix))) {
    return {
      path: pathInput,
      normalizedPath,
      category: 'generated',
      included: false,
      reason: 'generated/runtime artifact',
    };
  }

  if (GENERATED_EXTENSIONS.has(extension)) {
    return {
      path: pathInput,
      normalizedPath,
      category: 'generated',
      included: false,
      reason: `generated or binary extension (${extension || 'unknown'})`,
    };
  }

  if (TEST_PREFIXES.some((prefix) => lower.startsWith(prefix)) || /\.(test|spec)\.[jt]sx?$/.test(lower)) {
    return {
      path: pathInput,
      normalizedPath,
      category: 'tests',
      included: true,
      reason: 'test artifact',
    };
  }

  if (DOC_PREFIXES.some((prefix) => lower.startsWith(prefix)) || extension === '.md' || extension === '.mdx') {
    return {
      path: pathInput,
      normalizedPath,
      category: 'documentation',
      included: true,
      reason: 'documentation artifact',
    };
  }

  if (CODE_PREFIXES.some((prefix) => lower.startsWith(prefix))) {
    return {
      path: pathInput,
      normalizedPath,
      category: 'code',
      included: true,
      reason: 'source artifact',
    };
  }

  if (isRoot && ROOT_CODE_FILES.has(fileName)) {
    return {
      path: pathInput,
      normalizedPath,
      category: 'code',
      included: true,
      reason: 'root source/config artifact',
    };
  }

  if (isRoot && ROOT_DOC_FILES.has(fileName)) {
    return {
      path: pathInput,
      normalizedPath,
      category: 'documentation',
      included: true,
      reason: 'root documentation artifact',
    };
  }

  if (/\.(ts|tsx|js|jsx|json|yaml|yml|toml|ini|cjs|mjs)$/.test(extension)) {
    return {
      path: pathInput,
      normalizedPath,
      category: 'code',
      included: true,
      reason: `source extension (${extension})`,
    };
  }

  return {
    path: pathInput,
    normalizedPath,
    category: 'non_source',
    included: false,
    reason: 'outside code/docs/tests policy scope',
  };
}

export function evaluateDeliverableScope(paths: string[], options: DeliverableScopeOptions = {}): DeliverableScopeReport {
  const strict = options.strict !== false;
  const allowList = options.allowList ?? [];
  const uniquePaths = Array.from(new Set(paths.map((item) => normalizeDeliverablePath(item)).filter(Boolean)));
  const entries = uniquePaths.map((item) => classifyDeliverablePath(item, allowList));
  const included = entries.filter((entry) => entry.included);
  const excluded = entries.filter((entry) => !entry.included);
  const blockingExcluded = excluded.filter((entry) => entry.category === 'non_source');
  const passed = strict ? blockingExcluded.length === 0 : true;

  const summary = uniquePaths.length === 0
    ? 'No changed artifacts detected.'
    : strict
      ? `Evaluated ${uniquePaths.length} artifacts: ${included.length} included, ${excluded.length} excluded (${blockingExcluded.length} blocking).`
      : `Evaluated ${uniquePaths.length} artifacts in advisory mode: ${included.length} included, ${excluded.length} excluded.`;

  return {
    checkedAt: new Date().toISOString(),
    source: options.source ?? 'provided_paths',
    strict,
    passed,
    included,
    excluded,
    blockingExcluded,
    summary,
  };
}

export function evaluateRepositoryDeliverableScope(repoRoot: string, options: DeliverableScopeOptions = {}): DeliverableScopeReport {
  try {
    const output = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], {
      cwd: repoRoot,
      encoding: 'utf-8',
    });
    return evaluateDeliverableScope(parseGitStatusPaths(output), { ...options, source: 'git_status' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const fallback = evaluateDeliverableScope([], { ...options, source: 'git_status' });

    if (options.strict === false) {
      return {
        ...fallback,
        passed: true,
        summary: `Deliverable scope check skipped in advisory mode: ${message}`,
      };
    }

    return {
      ...fallback,
      passed: false,
      excluded: [
        {
          path: 'repository-state',
          normalizedPath: 'repository-state',
          category: 'non_source',
          included: false,
          reason: `unable to evaluate repository scope: ${message}`,
        },
      ],
      blockingExcluded: [
        {
          path: 'repository-state',
          normalizedPath: 'repository-state',
          category: 'non_source',
          included: false,
          reason: `unable to evaluate repository scope: ${message}`,
        },
      ],
      summary: `Deliverable scope check failed: ${message}`,
    };
  }
}

function matchesAllowList(normalizedLowerPath: string, allowList: string[]): boolean {
  if (allowList.length === 0) {
    return false;
  }

  return allowList.some((item) => {
    const normalized = normalizeDeliverablePath(item).toLowerCase();
    if (!normalized) {
      return false;
    }

    if (normalized.endsWith('/')) {
      return normalizedLowerPath.startsWith(normalized);
    }

    return normalizedLowerPath === normalized || normalizedLowerPath.startsWith(`${normalized}/`);
  });
}
