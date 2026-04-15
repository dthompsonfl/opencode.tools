#!/usr/bin/env node

const { execFileSync } = require('child_process');

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

function normalizePath(input) {
  return String(input || '').replace(/\\/g, '/').replace(/^\.\//, '').trim();
}

function parseGitStatusPaths(output) {
  const lines = String(output || '')
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
  const paths = new Set();

  for (const line of lines) {
    const payload = line.length > 3 ? line.slice(3).trim() : '';
    if (!payload) {
      continue;
    }

    const renamedPath = payload.includes(' -> ') ? payload.split(' -> ').pop() : payload;
    let resolved = renamedPath || '';

    if (resolved.startsWith('"') && resolved.endsWith('"')) {
      resolved = resolved.slice(1, -1).replace(/\\"/g, '"');
    }

    const normalized = normalizePath(resolved);
    if (normalized) {
      paths.add(normalized);
    }
  }

  return Array.from(paths);
}

function classify(pathInput) {
  const normalized = normalizePath(pathInput);
  const lower = normalized.toLowerCase();
  const fileName = lower.includes('/') ? lower.slice(lower.lastIndexOf('/') + 1) : lower;
  const extension = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')) : '';
  const isRoot = !lower.includes('/');

  if (GENERATED_FILE_NAMES.has(fileName) || GENERATED_PREFIXES.some((prefix) => lower.startsWith(prefix))) {
    return { path: normalized, category: 'generated', included: false, reason: 'generated/runtime artifact' };
  }

  if (GENERATED_EXTENSIONS.has(extension)) {
    return {
      path: normalized,
      category: 'generated',
      included: false,
      reason: `generated or binary extension (${extension || 'unknown'})`,
    };
  }

  if (TEST_PREFIXES.some((prefix) => lower.startsWith(prefix)) || /\.(test|spec)\.[jt]sx?$/.test(lower)) {
    return { path: normalized, category: 'tests', included: true, reason: 'test artifact' };
  }

  if (DOC_PREFIXES.some((prefix) => lower.startsWith(prefix)) || extension === '.md' || extension === '.mdx') {
    return { path: normalized, category: 'documentation', included: true, reason: 'documentation artifact' };
  }

  if (CODE_PREFIXES.some((prefix) => lower.startsWith(prefix))) {
    return { path: normalized, category: 'code', included: true, reason: 'source artifact' };
  }

  if (isRoot && ROOT_CODE_FILES.has(fileName)) {
    return { path: normalized, category: 'code', included: true, reason: 'root source/config artifact' };
  }

  if (/\.(ts|tsx|js|jsx|json|yaml|yml|toml|ini|cjs|mjs)$/.test(extension)) {
    return { path: normalized, category: 'code', included: true, reason: `source extension (${extension})` };
  }

  return { path: normalized, category: 'non_source', included: false, reason: 'outside code/docs/tests policy scope' };
}

function run() {
  const output = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], {
    cwd: process.cwd(),
    encoding: 'utf-8',
  });

  const paths = parseGitStatusPaths(output);
  if (paths.length === 0) {
    console.log('Deliverable scope check passed: no changed artifacts detected.');
    return;
  }

  const classified = paths.map((item) => classify(item));
  const excluded = classified.filter((item) => !item.included);
  const blocking = excluded.filter((item) => item.category === 'non_source');

  if (blocking.length > 0) {
    console.error('Deliverable scope check failed. Blocking non-source artifacts detected:');
    for (const item of blocking) {
      console.error(` - ${item.path} (${item.reason})`);
    }
    process.exit(1);
  }

  if (excluded.length > 0) {
    console.warn('Deliverable scope check note: excluded generated artifacts were detected and ignored for release scope:');
    for (const item of excluded) {
      console.warn(` - ${item.path} (${item.reason})`);
    }
  }

  console.log(`Deliverable scope check passed: ${classified.length} artifacts are within code/docs/tests scope.`);
}

try {
  run();
} catch (error) {
  const message = error && error.message ? error.message : String(error);
  console.error(`Deliverable scope check failed: ${message}`);
  process.exit(1);
}
