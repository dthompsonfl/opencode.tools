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
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logToolCall } from './audit';
import { resolveRunContext } from '../src/runtime/run-context';


/**
 * Interface for a captured discovery item.
 */
export interface DiscoveryItem {
    id: string;
    type: 'question' | 'decision' | 'constraint' | 'risk' | 'acceptance_criteria';
    content: string;
    rationale?: string;
    source?: string;
}

/**
 * Project stack information
 */
export interface ProjectStack {
    languages: string[];
    frameworks: string[];
    databases: string[];
    cloudServices: string[];
    buildTools: string[];
    testingFrameworks: string[];
    packageManagers: string[];
}

/**
 * Project structure information
 */
export interface ProjectStructure {
    rootFiles: string[];
    sourceDirectories: string[];
    testDirectories: string[];
    configFiles: string[];
    totalFiles: number;
    totalLinesOfCode: number;
}

/**
 * Analysis result
 */
export interface DiscoveryResult {
    sessionId: string;
    projectPath: string;
    stack: ProjectStack;
    structure: ProjectStructure;
    securityFindings: string[];
    risks: DiscoveryItem[];
    recommendations: string[];
    artifacts: DiscoveryItem[];
}

/**
 * Detect programming languages from file extensions
 */
function detectLanguages(dirPath: string): string[] {
    const languages: Set<string> = new Set();
    const extMap: Record<string, string> = {
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

    function scanDir(dir: string, depth: number = 0) {
        if (depth > 5) return;
        
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
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (extMap[ext]) {
                        languages.add(extMap[ext]);
                    }
                }
            }
        } catch {
            // Ignore permission errors
        }
    }

    scanDir(dirPath);
    return Array.from(languages);
}

/**
 * Categorize a dependency based on its name
 */
function categorizeDep(depName: string): string | null {
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
function detectFrameworks(dirPath: string): { frameworks: string[], databases: string[], cloudServices: string[], buildTools: string[], testingFrameworks: string[], packageManagers: string[] } {
    const frameworks = new Set<string>();
    const databases = new Set<string>();
    const cloudServices = new Set<string>();
    const buildTools = new Set<string>();
    const testingFrameworks = new Set<string>();
    const packageManagers = new Set<string>();

    // Check package.json
    const packageJsonPath = path.join(dirPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
        try {
            const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
            const deps = { ...pkg.dependencies, ...pkg.devDependencies };
            
            for (const dep of Object.keys(deps)) {
                const category = categorizeDep(dep);
                if (category === 'frameworks') frameworks.add(dep);
                else if (category === 'databases') databases.add(dep);
                else if (category === 'cloudServices') cloudServices.add(dep);
                else if (category === 'buildTools') buildTools.add(dep);
                else if (category === 'testingFrameworks') testingFrameworks.add(dep);
            }
            
            // Check package manager
            if (fs.existsSync(path.join(dirPath, 'yarn.lock'))) packageManagers.add('yarn');
            if (fs.existsSync(path.join(dirPath, 'pnpm-lock.yaml'))) packageManagers.add('pnpm');
            if (fs.existsSync(path.join(dirPath, 'package-lock.json'))) packageManagers.add('npm');
        } catch { /* ignore */ }
    }

    // Check requirements.txt (Python)
    const reqPath = path.join(dirPath, 'requirements.txt');
    if (fs.existsSync(reqPath)) {
        try {
            const content = fs.readFileSync(reqPath, 'utf-8');
            const lines = content.split('\n');
            
            for (const line of lines) {
                const dep = line.split('==')[0].split('>=')[0].split('<=')[0].trim();
                if (!dep || dep.startsWith('#')) continue;
                
                const category = categorizeDep(dep);
                if (category === 'frameworks') frameworks.add(dep);
                else if (category === 'databases') databases.add(dep);
                else if (category === 'testingFrameworks') testingFrameworks.add(dep);
            }
            
            packageManagers.add('pip');
        } catch { /* ignore */ }
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
function analyzeStructure(dirPath: string): ProjectStructure {
    const rootFiles: string[] = [];
    const sourceDirectories = new Set<string>();
    const testDirectories = new Set<string>();
    const configFiles: string[] = [];
    let totalFiles = 0;
    let totalLines = 0;

    const sourcePatterns = ['src', 'lib', 'app', 'source', 'sources', 'code'];
    const testPatterns = ['test', 'tests', '__tests__', 'spec', 'specs', 'testsuite'];

    function scanDir(dir: string, depth: number = 0) {
        if (depth > 10) return;
        
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
                } else if (entry.isFile()) {
                    totalFiles++;
                    
                    const ext = path.extname(entry.name).toLowerCase();
                    if (['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.cs', '.go', '.rs', '.rb', '.php'].includes(ext)) {
                        try {
                            const content = fs.readFileSync(fullPath, 'utf-8');
                            totalLines += content.split('\n').length;
                        } catch { /* ignore */ }
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
        } catch { /* ignore */ }
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
function identifySecurityRisks(dirPath: string): string[] {
    const risks: string[] = [];
    const secretPatterns = ['password', 'secret', 'apikey', 'api_key', 'token', 'private_key'];
    
    function checkFileSecrets(filePath: string) {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const lowerContent = content.toLowerCase();
            
            for (const pattern of secretPatterns) {
                if (lowerContent.includes(pattern) && (content.includes('=') || content.includes(':'))) {
                    risks.push(`Potential hardcoded secret found in ${path.relative(dirPath, filePath)}`);
                    break;
                }
            }
        } catch { /* ignore */ }
    }

    function scanForSecrets(dir: string, depth: number = 0) {
        if (depth > 5) return;
        
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('.')) continue;
                
                const fullPath = path.join(dir, entry.name);
                
                if (entry.isDirectory()) {
                    scanForSecrets(fullPath, depth + 1);
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (['.ts', '.js', '.json', '.yaml', '.yml', '.env', '.py', '.rb'].includes(ext)) {
                        checkFileSecrets(fullPath);
                    }
                }
            }
        } catch { /* ignore */ }
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
function generateRecommendations(stack: ProjectStack, structure: ProjectStructure, risks: string[]): string[] {
    const recommendations: string[] = [];

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
export async function startSession(clientName: string, projectPath?: string): Promise<DiscoveryResult> {
    const context = resolveRunContext();
    const targetPath = projectPath || process.cwd();
    const sessionId = `disc-${uuidv4().substring(0, 8)}`;
    
    console.log(`[Discovery] Starting analysis session ${sessionId} for: ${clientName}`);
    console.log(`[Discovery] Analyzing project at: ${targetPath}`);
    
    if (!fs.existsSync(targetPath)) {
        throw new Error(`Project path does not exist: ${targetPath}`);
    }
    
    const languages = detectLanguages(targetPath);
    const { frameworks, databases, cloudServices, buildTools, testingFrameworks, packageManagers } = detectFrameworks(targetPath);
    
    const stack: ProjectStack = {
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
    const risks: DiscoveryItem[] = securityRisks.map((r, i) => ({
        id: `risk-${i + 1}`,
        type: 'risk' as const,
        content: r,
        source: 'security-scan'
    }));
    
    const recommendations = generateRecommendations(stack, structure, securityRisks);
    
    const artifacts: DiscoveryItem[] = [
        {
            id: 'tech-1',
            type: 'decision',
            content: `Technology stack: ${languages.join(', ')}`,
            rationale: 'Detected from project files and dependencies'
        },
        ...frameworks.map((f, i) => ({
            id: `fw-${i + 1}`,
            type: 'decision' as const,
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
    
    const result: DiscoveryResult = {
        sessionId,
        projectPath: targetPath,
        stack,
        structure,
        securityFindings: securityRisks,
        risks,
        recommendations,
        artifacts
    };
    
    await logToolCall(context.runId, 'discovery.session.start', { clientName, projectPath }, { 
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
export async function exportSession(sessionId: string, result: DiscoveryResult): Promise<{ 
    filePath: string; 
    artifacts: DiscoveryItem[];
    summary: string;
}> {
    const context = resolveRunContext();
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
    
    await logToolCall(context.runId, 'discovery.session.export', { sessionId }, { 
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
export async function detectStack(projectPath?: string): Promise<ProjectStack> {
    const targetPath = projectPath || process.cwd();
    
    return {
        languages: detectLanguages(targetPath),
        ...detectFrameworks(targetPath)
    };
}
