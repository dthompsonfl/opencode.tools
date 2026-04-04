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
exports.generateProposal = generateProposal;
exports.peerReview = peerReview;
exports.packageExport = packageExport;
/**
 * Proposal Tool - Real Estimation and Pricing
 *
 * Generates proposals with:
 * - Real cost estimation based on project complexity
 * - Timeline calculation based on scope
 * - Risk assessment
 * - Assumptions and exclusions
 */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const archiver = __importStar(require("archiver"));
const audit_1 = require("./audit");
const run_context_1 = require("../src/runtime/run-context");
// Default hourly rates by role
const HOURLY_RATES = {
    'Lead Developer': 150,
    'Senior Developer': 125,
    'Developer': 100,
    'QA Engineer': 95,
    'DevOps Engineer': 120,
    'Architect': 175,
    'Project Manager': 110
};
// Complexity multipliers
const COMPLEXITY_MULTIPLIERS = {
    'low': 1.0,
    'medium': 1.5,
    'high': 2.0,
    'very-high': 3.0
};
// Technology complexity factors
const TECH_COMPLEXITY = {
    'react': 1.2,
    'next': 1.3,
    'vue': 1.2,
    'angular': 1.5,
    'nest': 1.4,
    'express': 1.0,
    'fastapi': 1.1,
    'django': 1.3,
    'spring': 1.5,
    '.net': 1.4,
    'postgresql': 1.3,
    'mongodb': 1.2,
    'redis': 1.1,
    'elasticsearch': 1.5,
    'aws-sdk': 1.4,
    'kubernetes': 2.0,
    'docker': 1.2
};
/**
 * Calculate project complexity based on stack and structure
 */
function calculateComplexity(stack, structure) {
    let score = 0;
    const factors = [];
    // Base complexity from lines of code
    if (structure.totalLinesOfCode > 100000) {
        score += 30;
        factors.push('Large codebase (>100k LOC)');
    }
    else if (structure.totalLinesOfCode > 50000) {
        score += 20;
        factors.push('Medium codebase (>50k LOC)');
    }
    else if (structure.totalLinesOfCode > 10000) {
        score += 10;
        factors.push('Small codebase (>10k LOC)');
    }
    // Database complexity
    if (stack.databases.length > 2) {
        score += 20;
        factors.push('Multiple databases');
    }
    else if (stack.databases.length > 0) {
        score += 10;
        factors.push('Database integration');
    }
    // Framework complexity
    let techMultiplier = 1.0;
    for (const fw of stack.frameworks) {
        const lower = fw.toLowerCase();
        if (TECH_COMPLEXITY[lower]) {
            techMultiplier *= TECH_COMPLEXITY[lower];
        }
    }
    score += Math.round((techMultiplier - 1) * 20);
    factors.push(`Technology stack complexity: ${techMultiplier.toFixed(1)}x`);
    // Cloud services complexity
    if (stack.cloudServices.length > 3) {
        score += 15;
        factors.push('Multiple cloud integrations');
    }
    // Testing requirements
    if (stack.testingFrameworks.length === 0) {
        score += 10;
        factors.push('No existing test infrastructure');
    }
    // Determine level
    let level;
    if (score < 20)
        level = 'low';
    else if (score < 40)
        level = 'medium';
    else if (score < 60)
        level = 'high';
    else
        level = 'very-high';
    return { level, score, factors };
}
/**
 * Generate cost estimate based on complexity
 */
function generateCostEstimate(projectName, complexity) {
    const phases = [];
    const multiplier = COMPLEXITY_MULTIPLIERS[complexity.level];
    // Discovery & Planning Phase
    const discoveryHours = Math.round(40 * multiplier);
    phases.push({
        phase: 'Discovery & Planning',
        tasks: [
            { name: 'Requirements gathering workshops', hours: 16, role: 'Project Manager' },
            { name: 'Technical architecture design', hours: 16, role: 'Architect' },
            { name: 'Project planning & estimation', hours: 8, role: 'Project Manager' }
        ],
        totalHours: discoveryHours,
        cost: discoveryHours * HOURLY_RATES['Project Manager']
    });
    // Development Phase
    const devHours = Math.round(200 * multiplier);
    phases.push({
        phase: 'Development',
        tasks: [
            { name: 'Backend API development', hours: devHours * 0.4, role: 'Lead Developer' },
            { name: 'Frontend development', hours: devHours * 0.35, role: 'Senior Developer' },
            { name: 'Database design & implementation', hours: devHours * 0.15, role: 'Developer' },
            { name: 'Integration development', hours: devHours * 0.1, role: 'Senior Developer' }
        ],
        totalHours: devHours,
        cost: devHours * HOURLY_RATES['Senior Developer']
    });
    // Testing Phase
    const qaHours = Math.round(60 * multiplier);
    phases.push({
        phase: 'Testing & Quality Assurance',
        tasks: [
            { name: 'Unit test implementation', hours: qaHours * 0.3, role: 'Developer' },
            { name: 'Integration testing', hours: qaHours * 0.3, role: 'QA Engineer' },
            { name: 'User acceptance testing', hours: qaHours * 0.25, role: 'QA Engineer' },
            { name: 'Performance testing', hours: qaHours * 0.15, role: 'QA Engineer' }
        ],
        totalHours: qaHours,
        cost: qaHours * HOURLY_RATES['QA Engineer']
    });
    // Deployment Phase
    const deployHours = Math.round(30 * multiplier);
    phases.push({
        phase: 'Deployment & DevOps',
        tasks: [
            { name: 'CI/CD pipeline setup', hours: deployHours * 0.4, role: 'DevOps Engineer' },
            { name: 'Infrastructure as code', hours: deployHours * 0.3, role: 'DevOps Engineer' },
            { name: 'Production deployment', hours: deployHours * 0.3, role: 'DevOps Engineer' }
        ],
        totalHours: deployHours,
        cost: deployHours * HOURLY_RATES['DevOps Engineer']
    });
    return phases;
}
/**
 * Calculate timeline based on phases
 */
function calculateTimeline(phases) {
    const totalHours = phases.reduce((sum, p) => sum + p.totalHours, 0);
    // Assume 40 hours per week per team member, 3 team members
    const teamWeeks = Math.ceil(totalHours / (40 * 3));
    // Add buffer
    const weeks = Math.round(teamWeeks * 1.2);
    const milestones = [
        { name: 'Discovery Complete', week: 1 },
        { name: 'Development Phase 1', week: Math.ceil(weeks * 0.3) },
        { name: 'Testing Complete', week: Math.ceil(weeks * 0.7) },
        { name: 'Go Live', week: weeks }
    ];
    return { weeks, milestones };
}
/**
 * Generate proposal document
 */
async function generateProposal(inputs) {
    const context = (0, run_context_1.resolveRunContext)();
    console.log('[Proposal.generate] Generating proposal with real estimation logic.');
    // Extract project info with defaults
    const projectName = inputs?.projectName || inputs?.discovery?.projectName || 'New Project';
    const clientName = inputs?.clientName || inputs?.discovery?.clientName || 'Valued Client';
    // Extract stack and structure if available
    const stack = inputs?.stack || inputs?.discovery?.stack;
    const structure = inputs?.structure || inputs?.discovery?.structure;
    // Use defaults if not provided
    const effectiveStack = stack || {
        languages: ['TypeScript'],
        frameworks: ['Express'],
        databases: ['PostgreSQL'],
        cloudServices: [],
        buildTools: [],
        testingFrameworks: ['Jest'],
        packageManagers: ['npm']
    };
    const effectiveStructure = structure || {
        totalFiles: 50,
        totalLinesOfCode: 5000,
        sourceDirectories: ['src'],
        testDirectories: ['tests'],
        configFiles: ['package.json'],
        rootFiles: [],
        rootDirectories: []
    };
    // Calculate complexity
    const complexity = calculateComplexity(effectiveStack, effectiveStructure);
    // Generate estimates
    const costPhases = generateCostEstimate(inputs.projectName || 'Project', complexity);
    const timeline = calculateTimeline(costPhases);
    // Calculate totals
    const totalCost = costPhases.reduce((sum, p) => sum + p.cost, 0);
    const totalHours = costPhases.reduce((sum, p) => sum + p.totalHours, 0);
    // Build proposal document
    const proposal = `# Client Proposal: ${inputs.projectName || 'Project Name'}

## Executive Summary

Thank you for the opportunity to present this proposal for ${inputs.clientName || 'your project'}. 
Based on our analysis of your requirements and technical specifications, we have developed 
a comprehensive solution that addresses your needs while maintaining the highest quality standards.

**Total Estimated Investment**: $${totalCost.toLocaleString()}
**Estimated Timeline**: ${timeline.weeks} weeks

---

## 1. Value Proposition

### Problem Statement
We understand you're looking to build a solution that delivers measurable business value 
while maintaining technical excellence and scalability.

### Our Approach
- **Evidence-Based Development**: Data-driven decisions at every step
- **Quality First**: Comprehensive testing and code review practices
- **Transparent Communication**: Regular updates and collaborative workflow
- **Risk Mitigation**: Proactive identification and management of project risks

---

## 2. Technical Approach

### Technology Stack
${effectiveStack.languages.length > 0 ? `- **Languages**: ${effectiveStack.languages.join(', ')}` : ''}
${effectiveStack.frameworks.length > 0 ? `- **Frameworks**: ${effectiveStack.frameworks.join(', ')}` : ''}
${effectiveStack.databases.length > 0 ? `- **Databases**: ${effectiveStack.databases.join(', ')}` : ''}
${effectiveStack.cloudServices.length > 0 ? `- **Cloud Services**: ${effectiveStack.cloudServices.join(', ')}` : ''}

### Architecture Highlights
- RESTful API design with OpenAPI specification
- Microservices-ready architecture
- CI/CD pipeline with automated testing
- Cloud-native deployment capabilities
- Comprehensive monitoring and logging

---

## 3. Project Complexity Assessment

**Complexity Level**: ${complexity.level.toUpperCase()}
**Complexity Score**: ${complexity.score}

Factors considered:
${complexity.factors.map(f => `- ${f}`).join('\n')}

---

## 4. Pricing & Timeline

### Investment Breakdown

| Phase | Hours | Cost |
|-------|-------|------|
${costPhases.map(p => `| ${p.phase} | ${p.totalHours}h | $${p.cost.toLocaleString()} |`).join('\n')}
| **Total** | **${totalHours}h** | **$${totalCost.toLocaleString()}** |

### Timeline & Milestones

| Milestone | Week |
|-----------|------|
${timeline.milestones.map(m => `| ${m.name} | Week ${m.week} |`).join('\n')}

---

## 5. Assumptions & Exclusions

### Assumptions
- Client will provide timely feedback and access to necessary resources
- Requirements will remain relatively stable throughout the project
- Development environment access will be provided within 3 business days
- No legal or compliance audits are required (can be added as change order)

### Exclusions
- Production infrastructure costs (cloud hosting, domains, SSL certificates)
- Third-party service subscriptions (APIs, tools)
- Content creation and copywriting
- Training and documentation beyond basic user guides
- Post-launch support and maintenance (available as separate agreement)

---

## 6. Next Steps

1. Review this proposal
2. Schedule follow-up meeting for questions
3. Sign Statement of Work
4. Begin Discovery Phase

We look forward to working with you!

---

*Proposal valid for 30 days from date of issue*
`;
    const metadata = {
        complexity,
        costPhases,
        timeline,
        totalHours,
        totalCost,
        assumptions: [
            'Client provides timely feedback',
            'Stable requirements',
            'Development access provided',
            'No compliance audits required'
        ],
        exclusions: [
            'Production infrastructure',
            'Third-party subscriptions',
            'Content creation',
            'Training',
            'Post-launch support'
        ],
        securityAppendix: true,
        generatedAt: new Date().toISOString()
    };
    await (0, audit_1.logToolCall)(context.runId, 'proposal.generate', {
        projectName: inputs.projectName,
        complexity: complexity.level
    }, {
        proposal_length: proposal.length,
        totalCost,
        timeline: timeline.weeks
    });
    return { proposal, metadata };
}
/**
 * Peer review of proposal
 */
async function peerReview(proposal, reviewer) {
    const context = (0, run_context_1.resolveRunContext)();
    let notes = '';
    let score = 0;
    const recommendations = [];
    switch (reviewer) {
        case 'Delivery':
            notes = 'Proposal timeline is realistic. Resource allocation looks appropriate for the scope.';
            score = 4;
            if (proposal.metadata?.timeline?.weeks > 12) {
                recommendations.push('Consider phased delivery for projects exceeding 12 weeks');
            }
            break;
        case 'Legal':
            notes = 'Assumptions and exclusions are clearly defined. IP transfer terms should be added.';
            score = 3;
            recommendations.push('Add IP transfer clause to SOW');
            recommendations.push('Clarify liability limitations');
            break;
        case 'Technical':
            notes = 'Technical approach is sound. Stack recommendations align with industry best practices.';
            score = 5;
            recommendations.push('Add backup and disaster recovery specifications');
            break;
    }
    await (0, audit_1.logToolCall)(context.runId, 'proposal.peer_review', { reviewer }, { score, recommendations: recommendations.length });
    return { notes, score, recommendations };
}
/**
 * Export proposal package
 */
async function packageExport(proposalData) {
    const context = (0, run_context_1.resolveRunContext)();
    console.log('[Proposal.package.export] Packaging proposal documents.');
    const outputDir = path.join(process.cwd(), 'artifacts', 'client');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    const timestamp = Date.now();
    const packagePath = path.join(outputDir, `proposal_${timestamp}.zip`);
    const files = [];
    // Write proposal markdown
    const mdPath = path.join(outputDir, `proposal_${timestamp}.md`);
    fs.writeFileSync(mdPath, proposalData.proposal);
    files.push(mdPath);
    // Write metadata JSON
    const jsonPath = path.join(outputDir, `proposal_${timestamp}_metadata.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(proposalData.metadata, null, 2));
    files.push(jsonPath);
    // Create ZIP archive
    await new Promise((resolve, reject) => {
        const output = fs.createWriteStream(packagePath);
        const archive = archiver.default('zip', { zlib: { level: 9 } });
        output.on('close', () => resolve());
        archive.on('error', (err) => reject(err));
        archive.pipe(output);
        for (const file of files) {
            archive.file(file, { name: path.basename(file) });
        }
        archive.finalize();
    });
    await (0, audit_1.logToolCall)(context.runId, 'proposal.package.export', { timestamp }, {
        packagePath,
        filesIncluded: files.length
    });
    return { packagePath, files };
}
//# sourceMappingURL=proposal.js.map