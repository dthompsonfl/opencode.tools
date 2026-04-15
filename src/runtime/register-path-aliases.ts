import * as fs from 'fs';
import * as path from 'path';

type ResolveFilename = (
  request: string,
  parent: NodeModule | null | undefined,
  isMain: boolean,
  options?: unknown,
) => string;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const NodeModule = require('module') as { _resolveFilename: ResolveFilename };

const REGISTER_FLAG = '__opencode_runtime_aliases_registered__';
const globalScope = globalThis as Record<string, unknown>;

function findProjectRoot(startDir: string): string {
  let current = startDir;

  while (true) {
    if (fs.existsSync(path.join(current, 'package.json'))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return startDir;
    }

    current = parent;
  }
}

function buildAliasRoots(): Record<string, string[]> {
  const projectRoot = findProjectRoot(__dirname);
  const runningFromDist = __dirname.includes(`${path.sep}dist${path.sep}`);
  const runtimeRoot = runningFromDist ? path.join(projectRoot, 'dist') : projectRoot;

  return {
    '@foundry/core': [path.join(runtimeRoot, 'src', 'foundry', 'core'), path.join(runtimeRoot, 'foundry', 'foundry', 'core')],
    '@foundry/core/': [
      path.join(runtimeRoot, 'src', 'foundry', 'core'),
      path.join(runtimeRoot, 'foundry', 'foundry', 'core'),
    ],
    '@foundry/types': [path.join(runtimeRoot, 'src', 'foundry', 'types'), path.join(runtimeRoot, 'foundry', 'foundry', 'types')],
    '@foundry/types/': [path.join(runtimeRoot, 'foundry', 'foundry', 'types')],
    '@foundry/': [
      path.join(runtimeRoot, 'src', 'foundry'),
      path.join(runtimeRoot, 'foundry', 'foundry'),
    ],
    '@src/': [path.join(runtimeRoot, 'src')],
    '@/': [path.join(runtimeRoot, 'src'), path.join(runtimeRoot, 'foundry')],
    'src/': [path.join(runtimeRoot, 'src')],
    'agents/': [path.join(runtimeRoot, 'agents')],
    'tools/': [path.join(runtimeRoot, 'tools')],
  };
}

function isNotFoundError(error: unknown): boolean {
  return Boolean(
    error
    && typeof error === 'object'
    && 'code' in error
    && (error as { code?: string }).code === 'MODULE_NOT_FOUND'
  );
}

function getSuffix(request: string, aliasPrefix: string): string | null {
  if (aliasPrefix.endsWith('/')) {
    if (!request.startsWith(aliasPrefix)) {
      return null;
    }

    return request.slice(aliasPrefix.length);
  }

  if (request === aliasPrefix) {
    return '';
  }

  if (request.startsWith(`${aliasPrefix}/`)) {
    return request.slice(aliasPrefix.length + 1);
  }

  return null;
}

function registerRuntimeAliases(): void {
  if (globalScope[REGISTER_FLAG]) {
    return;
  }

  const aliasRoots = buildAliasRoots();
  const originalResolveFilename = NodeModule._resolveFilename.bind(NodeModule);

  NodeModule._resolveFilename = (
    request: string,
    parent: NodeModule | null | undefined,
    isMain: boolean,
    options?: unknown,
  ): string => {
    for (const [aliasPrefix, roots] of Object.entries(aliasRoots)) {
      const suffix = getSuffix(request, aliasPrefix);
      if (suffix === null) {
        continue;
      }

      for (const root of roots) {
        const candidate = suffix.length === 0 ? root : path.join(root, suffix);
        try {
          return originalResolveFilename(candidate, parent, isMain, options);
        } catch (error) {
          if (!isNotFoundError(error)) {
            throw error;
          }

          // Try the next candidate root.
        }
      }
    }

    return originalResolveFilename(request, parent, isMain, options);
  };

  globalScope[REGISTER_FLAG] = true;
}

registerRuntimeAliases();
