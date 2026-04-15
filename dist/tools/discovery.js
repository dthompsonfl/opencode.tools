"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSession = startSession;
exports.exportSession = exportSession;
exports.detectStack = detectStack;
/**
 * Discovery Tool - Real Repository Analysis
 *
 * Analyzes project repositories to discover:
 * - Tech stack (languages, frameworks, dependencies)
 * - Project structure and architecture patterns
 * - Code quality metrics
 * - Security considerations
 * - Integration points
 */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
const audit_1 = require("./audit");
const run_context_1 = require("../src/runtime/run-context");
/**
 * Detect programming languages from file extensions
 */
function detectLanguages(dirPath) {
    const languages = new Set();
    const extMap = {
        '.ts': 'TypeScript',
        '.js': 'JavaScript',
        '.tsx': 'TypeScript (React)',
        '.jsx': 'JavaScript (React)',
        '.py': 'Python',
        '.java': 'Java',
        '.cs': 'C#',
        '.go': 'Go',
        '.rs': 'Rust',
        '.rb': 'Ruby',
        '.php': 'PHP',
        '.swift': 'Swift',
        '.kt': 'Kotlin',
        '.scala': 'Scala',
        '.r': 'R',
        '.sql': 'SQL',
        '.sh': 'Shell',
    };
    function scanDir(dir, depth = 0) {
        if (depth > 5)
            return;
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.name === 'node_modules' || entry.name === '.git' ||
                    entry.name === 'dist' || entry.name === 'build' ||
                    entry.name === 'coverage' || entry.name.startsWith('.')) {
                    continue;
                }
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    scanDir(fullPath, depth + 1);
                }
                else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (extMap[ext]) {
                        languages.add(extMap[ext]);
                    }
                }
            }
        }
        catch {
            // Ignore permission errors
        }
    }
    scanDir(dirPath);
    return Array.from(languages);
}
/**
 * Categorize a dependency based on its name
 */
function categorizeDep(depName) {
    const name = depName.toLowerCase();
    // Frameworks
    if (['express', 'fastify', 'koa', 'nestjs', 'next', 'nuxt', 'react', 'vue',
        'angular', 'svelte', 'django', 'flask', 'fastapi', 'spring', 'rails',
        'laravel', '.net', 'aspnet'].some(f => name.includes(f))) {
        return 'frameworks';
    }
    // Databases
    if (['postgresql', 'mysql', 'mariadb', 'mongodb', 'redis', 'elasticsearch',
        'dynamodb', 'sqlite', 'firebase', 'supabase', 'prisma', 'typeorm'].some(f => name.includes(f))) {
        return 'databases';
    }
    // Cloud Services
    if (['aws-sdk', 'azure', 'google-cloud', 'vercel', 'netlify', 'heroku'].some(f => name.includes(f))) {
        return 'cloudServices';
    }
    // Build Tools
    if (['webpack', 'vite', 'rollup', 'esbuild', 'parcel', 'gradle', 'maven'].some(f => name.includes(f))) {
        return 'buildTools';
    }
    // Testing Frameworks
    if (['jest', 'mocha', 'jasmine', 'pytest', 'cypress', 'playwright', 'vitest',
        '@testing-library'].some(f => name.includes(f))) {
        return 'testingFrameworks';
    }
    return null;
}
/**
 * Detect frameworks and libraries from package.json or requirements
 */
function detectFrameworks(dirPath) {
    const frameworks = new Set();
    const databases = new Set();
    const cloudServices = new Set();
    const buildTools = new Set();
    const testingFrameworks = new Set();
    const packageManagers = new Set();
    // Check package.json
    const packageJsonPath = path.join(dirPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
        try {
            const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
            const deps = { ...pkg.dependencies, ...pkg.devDependencies };
            for (const dep of Object.keys(deps)) {
                const category = categorizeDep(dep);
                if (category === 'frameworks')
                    frameworks.add(dep);
                else if (category === 'databases')
                    databases.add(dep);
                else if (category === 'cloudServices')
                    cloudServices.add(dep);
                else if (category === 'buildTools')
                    buildTools.add(dep);
                else if (category === 'testingFrameworks')
                    testingFrameworks.add(dep);
            }
            // Check package manager
            if (fs.existsSync(path.join(dirPath, 'yarn.lock')))
                packageManagers.add('yarn');
            if (fs.existsSync(path.join(dirPath, 'pnpm-lock.yaml')))
                packageManagers.add('pnpm');
            if (fs.existsSync(path.join(dirPath, 'package-lock.json')))
                packageManagers.add('npm');
        }
        catch { /* ignore */ }
    }
    // Check requirements.txt (Python)
    const reqPath = path.join(dirPath, 'requirements.txt');
    if (fs.existsSync(reqPath)) {
        try {
            const content = fs.readFileSync(reqPath, 'utf-8');
            const lines = content.split('\n');
            for (const line of lines) {
                const dep = line.split('==')[0].split('>=')[0].split('<=')[0].trim();
                if (!dep || dep.startsWith('#'))
                    continue;
                const category = categorizeDep(dep);
                if (category === 'frameworks')
                    frameworks.add(dep);
                else if (category === 'databases')
                    databases.add(dep);
                else if (category === 'testingFrameworks')
                    testingFrameworks.add(dep);
            }
            packageManagers.add('pip');
        }
        catch { /* ignore */ }
    }
    // Check go.mod (Go)
    if (fs.existsSync(path.join(dirPath, 'go.mod'))) {
        packageManagers.add('Go modules');
    }
    return {
        frameworks: Array.from(frameworks),
        databases: Array.from(databases),
        cloudServices: Array.from(cloudServices),
        buildTools: Array.from(buildTools),
        testingFrameworks: Array.from(testingFrameworks),
        packageManagers: Array.from(packageManagers)
    };
}
/**
 * Analyze project structure
 */
function analyzeStructure(dirPath) {
    const rootFiles = [];
    const sourceDirectories = new Set();
    const testDirectories = new Set();
    const configFiles = [];
    let totalFiles = 0;
    let totalLines = 0;
    const sourcePatterns = ['src', 'lib', 'app', 'source', 'sources', 'code'];
    const testPatterns = ['test', 'tests', '__tests__', 'spec', 'specs', 'testsuite'];
    function scanDir(dir, depth = 0) {
        if (depth > 10)
            return;
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.name === 'node_modules' || entry.name === '.git' ||
                    entry.name === 'dist' || entry.name === 'build' ||
                    entry.name === 'coverage' || entry.name.startsWith('.')) {
                    continue;
                }
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    const dirLower = entry.name.toLowerCase();
                    if (sourcePatterns.includes(dirLower) || sourcePatterns.some(p => dirLower.includes(p))) {
                        sourceDirectories.add(path.relative(dirPath, fullPath));
                    }
                    if (testPatterns.includes(dirLower) || testPatterns.some(p => dirLower.includes(p))) {
                        testDirectories.add(path.relative(dirPath, fullPath));
                    }
                    scanDir(fullPath, depth + 1);
                }
                else if (entry.isFile()) {
                    totalFiles++;
                    const ext = path.extname(entry.name).toLowerCase();
                    if (['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.cs', '.go', '.rs', '.rb', '.php'].includes(ext)) {
                        try {
                            const content = fs.readFileSync(fullPath, 'utf-8');
                            totalLines += content.split('\n').length;
                        }
                        catch { /* ignore */ }
                    }
                    if (entry.name === 'package.json' || entry.name === 'tsconfig.json' ||
                        entry.name === 'jest.config.js' || entry.name === '.eslintrc' ||
                        entry.name.endsWith('.config.js') || entry.name === 'Dockerfile' ||
                        entry.name === 'docker-compose.yml') {
                        configFiles.push(entry.name);
                    }
                    const relativePath = path.relative(dirPath, fullPath);
                    if (!relativePath.includes(path.sep)) {
                        rootFiles.push(entry.name);
                    }
                }
            }
        }
        catch { /* ignore */ }
    }
    scanDir(dirPath);
    return {
        rootFiles,
        sourceDirectories: Array.from(sourceDirectories),
        testDirectories: Array.from(testDirectories),
        configFiles,
        totalFiles,
        totalLinesOfCode: totalLines
    };
}
/**
 * Identify security considerations
 */
function identifySecurityRisks(dirPath) {
    const risks = [];
    const secretPatterns = ['password', 'secret', 'apikey', 'api_key', 'token', 'private_key'];
    function checkFileSecrets(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const lowerContent = content.toLowerCase();
            for (const pattern of secretPatterns) {
                if (lowerContent.includes(pattern) && (content.includes('=') || content.includes(':'))) {
                    risks.push(`Potential hardcoded secret found in ${path.relative(dirPath, filePath)}`);
                    break;
                }
            }
        }
        catch { /* ignore */ }
    }
    function scanForSecrets(dir, depth = 0) {
        if (depth > 5)
            return;
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('.'))
                    continue;
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    scanForSecrets(fullPath, depth + 1);
                }
                else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (['.ts', '.js', '.json', '.yaml', '.yml', '.env', '.py', '.rb'].includes(ext)) {
                        checkFileSecrets(fullPath);
                    }
                }
            }
        }
        catch { /* ignore */ }
    }
    scanForSecrets(dirPath);
    if (!fs.existsSync(path.join(dirPath, '.gitignore'))) {
        risks.push('No .gitignore file found - may accidentally commit sensitive files');
    }
    if (!fs.existsSync(path.join(dirPath, 'package.json')) && !fs.existsSync(path.join(dirPath, 'requirements.txt'))) {
        risks.push('No dependency manifest found - cannot verify dependency security');
    }
    return risks;
}
/**
 * Generate recommendations based on analysis
 */
function generateRecommendations(stack, structure, risks) {
    const recommendations = [];
    if (stack.testingFrameworks.length === 0) {
        recommendations.push('Add testing framework to improve code quality and reliability');
    }
    if (!structure.configFiles.includes('tsconfig.json') && stack.languages.includes('TypeScript')) {
        recommendations.push('Add tsconfig.json for TypeScript configuration');
    }
    if (structure.testDirectories.length === 0) {
        recommendations.push('Create dedicated test directory structure');
    }
    if (structure.totalLinesOfCode > 50000 && !structure.configFiles.includes('jest.config.js') &&
        !structure.configFiles.includes('vitest.config.ts')) {
        recommendations.push('Consider adding test configuration for better test organization');
    }
    if (stack.databases.length > 0 && !structure.configFiles.some(f => f.includes('docker'))) {
        recommendations.push('Consider adding Docker configuration for database services');
    }
    if (risks.some(r => r.includes('secret'))) {
        recommendations.push('Review and rotate any exposed secrets; use environment variables or secrets management');
    }
    if (stack.frameworks.length === 0 && stack.languages.length > 0) {
        recommendations.push('Consider adding a web framework for API endpoints');
    }
    if (structure.totalFiles > 100 && structure.sourceDirectories.length < 2) {
        recommendations.push('Consider organizing code into modules/packages for better maintainability');
    }
    return recommendations;
}
/**
 * Start a new discovery session - analyzes a project directory
 */
async function startSession(clientName, projectPath) {
    const context = (0, run_context_1.resolveRunContext)();
    const targetPath = projectPath || process.cwd();
    const sessionId = `disc-${(0, uuid_1.v4)().substring(0, 8)}`;
    console.log(`[Discovery] Starting analysis session ${sessionId} for: ${clientName}`);
    console.log(`[Discovery] Analyzing project at: ${targetPath}`);
    if (!fs.existsSync(targetPath)) {
        throw new Error(`Project path does not exist: ${targetPath}`);
    }
    const languages = detectLanguages(targetPath);
    const { frameworks, databases, cloudServices, buildTools, testingFrameworks, packageManagers } = detectFrameworks(targetPath);
    const stack = {
        languages,
        frameworks,
        databases,
        cloudServices,
        buildTools,
        testingFrameworks,
        packageManagers
    };
    const structure = analyzeStructure(targetPath);
    const securityRisks = identifySecurityRisks(targetPath);
    const risks = securityRisks.map((r, i) => ({
        id: `risk-${i + 1}`,
        type: 'risk',
        content: r,
        source: 'security-scan'
    }));
    const recommendations = generateRecommendations(stack, structure, securityRisks);
    const artifacts = [
        {
            id: 'tech-1',
            type: 'decision',
            content: `Technology stack: ${languages.join(', ')}`,
            rationale: 'Detected from project files and dependencies'
        },
        ...frameworks.map((f, i) => ({
            id: `fw-${i + 1}`,
            type: 'decision',
            content: `Framework: ${f}`,
            rationale: 'Detected from dependencies'
        })),
        ...risks,
        {
            id: 'rec-1',
            type: 'question',
            content: 'Does the project meet security requirements?',
            rationale: recommendations.length > 0 ? `Recommendations: ${recommendations.join('; ')}` : undefined
        }
    ];
    const result = {
        sessionId,
        projectPath: targetPath,
        stack,
        structure,
        securityFindings: securityRisks,
        risks,
        recommendations,
        artifacts
    };
    await (0, audit_1.logToolCall)(context.runId, 'discovery.session.start', { clientName, projectPath }, {
        sessionId,
        languages: languages.length,
        frameworks: frameworks.length,
        files: structure.totalFiles,
        loc: structure.totalLinesOfCode
    });
    console.log(`[Discovery] Analysis complete. Found ${languages.length} languages, ${frameworks.length} frameworks, ${structure.totalFiles} files.`);
    return result;
}
/**
 * Export discovery session artifact
 */
async function exportSession(sessionId, result) {
    const context = (0, run_context_1.resolveRunContext)();
    const outputDir = path.join(process.cwd(), 'artifacts', 'discovery');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    const filePath = path.join(outputDir, `${sessionId}.json`);
    const summary = `
# Discovery Session: ${sessionId}

## Project: ${result.projectPath}

## Technology Stack
- Languages: ${result.stack.languages.join(', ')}
- Frameworks: ${result.stack.frameworks.join(', ')}
- Databases: ${result.stack.databases.join(', ')}
- Cloud Services: ${result.stack.cloudServices.join(', ')}

## Project Structure
- Total Files: ${result.structure.totalFiles}
- Lines of Code: ${result.structure.totalLinesOfCode}
- Source Directories: ${result.structure.sourceDirectories.join(', ')}

## Security Findings
${result.securityFindings.length > 0 ? result.securityFindings.map(r => `- ${r}`).join('\n') : 'No issues found'}

## Recommendations
${result.recommendations.map(r => `- ${r}`).join('\n')}
    `.trim();
    const exportData = {
        sessionId,
        timestamp: new Date().toISOString(),
        projectPath: result.projectPath,
        stack: result.stack,
        structure: result.structure,
        securityFindings: result.securityFindings,
        risks: result.risks,
        recommendations: result.recommendations,
        artifacts: result.artifacts,
        summary
    };
    fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
    await (0, audit_1.logToolCall)(context.runId, 'discovery.session.export', { sessionId }, {
        filePath,
        artifactCount: result.artifacts.length
    });
    return {
        filePath,
        artifacts: result.artifacts,
        summary
    };
}
/**
 * Quick stack detection
 */
async function detectStack(projectPath) {
    const targetPath = projectPath || process.cwd();
    return {
        languages: detectLanguages(targetPath),
        ...detectFrameworks(targetPath)
    };
}
//# sourceMappingURL=discovery.js.map