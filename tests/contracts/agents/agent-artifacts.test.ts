import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { DocumentationAgent } from '../../../agents/docs';
import { ArchitectureAgent } from '../../../agents/architecture';
import { CodeGenAgent } from '../../../agents/codegen';
import { QAAgent } from '../../../agents/qa';
import { DeliveryAgent } from '../../../agents/delivery';

describe('agent artifact contracts', () => {
  const originalCwd = process.cwd();
  const originalEnv = { ...process.env };
  let sandboxDir: string;

  beforeEach(() => {
    sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-contracts-'));
    process.chdir(sandboxDir);
    process.env.OPENCODE_RUN_ID = 'agent-contract-run';
  });

  afterEach(() => {
    process.chdir(originalCwd);
    process.env = { ...originalEnv };
    fs.rmSync(sandboxDir, { recursive: true, force: true });
  });

  it('documentation agent emits provenance metadata', async () => {
    const agent = new DocumentationAgent();
    const result = await agent.generateDocuments(
      {
        companySummary: 'Acme builds automation tools.',
        industryOverview: 'The tooling market is expanding.',
        competitors: [{ name: 'Contoso', url: 'https://contoso.example', differentiation: 'price', marketPosition: 'challenger' }],
        techStack: { frontend: ['React'], backend: ['Node.js'], infrastructure: ['AWS'] },
        risks: ['Vendor lock-in'],
        opportunities: ['Automation expansion'],
        recommendations: ['Prioritize observable architecture']
      },
      'Build a production automation platform for enterprise customers.'
    );

    expect(result.metadata?.runId).toBe('agent-contract-run');
    expect(result.metadata?.provenance.briefHash).toHaveLength(64);
  });

  it('architecture agent remains deterministic for same PRD', async () => {
    const agent = new ArchitectureAgent();
    const first = await agent.execute({ prd_content: 'Support billing, authentication, and audit trails.' });
    const second = await agent.execute({ prd_content: 'Support billing, authentication, and audit trails.' });

    expect(first.backlog.epics[0].id).toBe(second.backlog.epics[0].id);
    expect(first.metadata?.runId).toBe('agent-contract-run');
  });

  it('codegen and qa agents include metadata artifacts', async () => {
    const codegen = new CodeGenAgent();
    const qa = new QAAgent();

    const scaffold = await codegen.execute({
      id: 'BL-1',
      title: 'Audit Logger',
      description: 'Implement audit log export for enterprise reporting.',
      techStack: 'TypeScript'
    });

    const packageJson = path.join(sandboxDir, 'package.json');
    fs.writeFileSync(packageJson, JSON.stringify({ dependencies: { jest: '^29.0.0' } }), 'utf-8');
    const qaResult = await qa.prototype(sandboxDir);

    expect(scaffold.metadata?.inputHash).toHaveLength(64);
    expect(qaResult.metadata?.runId).toBe('agent-contract-run');
    expect(qaResult.metadata?.evidence.some((entry) => entry.includes('packageJson:true'))).toBe(true);
  });

  it('delivery agent includes manifest provenance metadata', async () => {
    const artifactPath = path.join(sandboxDir, 'artifact.txt');
    fs.writeFileSync(artifactPath, 'artifact', 'utf-8');

    const delivery = new DeliveryAgent();
    const result = await delivery.packageForDelivery('project-123', [artifactPath]);

    expect(result.metadata?.runId).toBe('agent-contract-run');
    expect(result.artifacts).toContain(artifactPath);
    expect(result.manifest).toContain('manifestHash');
  });
});
