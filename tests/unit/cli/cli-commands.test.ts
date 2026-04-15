import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

describe('CLI command flows', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oct-cli-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    jest.resetModules();
  });

  it('writes docs artifacts from docs command', async () => {
    const inputPath = path.join(tempDir, 'dossier.json');
    const outputDir = path.join(tempDir, 'docs-output');
    fs.writeFileSync(
      inputPath,
      JSON.stringify({
        dossier: {
          companySummary: 'Acme summary',
          industryOverview: 'Industry',
          competitors: [],
          techStack: {},
          risks: [],
          opportunities: [],
          recommendations: [],
        },
        brief: 'Client brief',
      }),
      'utf-8',
    );

    const docsAgent = {
      generateDocuments: jest.fn(async () => ({
        prd: '# PRD',
        sow: '# SOW',
        metadata: { runId: 'run-1', generatedAt: new Date().toISOString(), provenance: { briefHash: 'a', dossierHash: 'b' } },
      })),
    };

    const { createCliProgram } = await import('../../../src/cli');
    const cli = createCliProgram({
      createDocumentationAgent: () => docsAgent as any,
      createArchitectureAgent: () => ({ execute: jest.fn() }) as any,
      createPdfAgent: () => ({ execute: jest.fn() }) as any,
    });

    await cli.parseAsync(['docs', inputPath, '--output', outputDir], { from: 'user' });

    expect(docsAgent.generateDocuments).toHaveBeenCalledTimes(1);
    expect(fs.existsSync(path.join(outputDir, 'PRD.md'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'SOW.md'))).toBe(true);
  });

  it('writes architecture artifacts from architect command', async () => {
    const prdPath = path.join(tempDir, 'PRD.md');
    const outputDir = path.join(tempDir, 'arch-output');
    fs.writeFileSync(prdPath, '# Product Requirements', 'utf-8');

    const architectureAgent = {
      execute: jest.fn(async () => ({
        architectureDiagram: 'graph TD\nA-->B',
        backlog: { epics: [] },
        metadata: { runId: 'run-2', generatedAt: new Date().toISOString(), prdHash: 'hash' },
      })),
    };

    const { createCliProgram } = await import('../../../src/cli');
    const cli = createCliProgram({
      createDocumentationAgent: () => ({ generateDocuments: jest.fn() }) as any,
      createArchitectureAgent: () => architectureAgent as any,
      createPdfAgent: () => ({ execute: jest.fn() }) as any,
    });

    await cli.parseAsync(['architect', prdPath, '--output', outputDir], { from: 'user' });

    expect(architectureAgent.execute).toHaveBeenCalledTimes(1);
    expect(fs.existsSync(path.join(outputDir, 'architecture.mmd'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'backlog.json'))).toBe(true);
  });

  it('writes pdf output and metadata from pdf command', async () => {
    const configPath = path.join(tempDir, 'pdf-config.json');
    const outputPath = path.join(tempDir, 'out', 'document.pdf');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        title: 'Test Document',
        authors: ['Tester'],
        template: 'default',
        sections: [{ id: 's1', title: 'Section 1', level: '1', content: 'Hello' }],
      }),
      'utf-8',
    );

    const pdfAgent = {
      execute: jest.fn(async () => ({
        documentPath: 'output/pdfs/test.pdf',
        documentBuffer: Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n', 'utf-8'),
        metadata: {
          fileSize: 11,
          pageCount: 1,
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
          producer: 'test',
          creator: 'test',
          title: 'Test',
          author: 'Tester',
          subject: '',
          keywords: [],
          version: '1.0',
          format: 'pdf',
        },
        tocEntries: [],
        bookmarks: [],
        warnings: [],
        meta: {
          agent: 'pdf-generator-agent',
          promptVersion: 'v1',
          mcpVersion: 'v1',
          timestamp: new Date().toISOString(),
          runId: 'run-3',
        },
      })),
    };

    const { createCliProgram } = await import('../../../src/cli');
    const cli = createCliProgram({
      createDocumentationAgent: () => ({ generateDocuments: jest.fn() }) as any,
      createArchitectureAgent: () => ({ execute: jest.fn() }) as any,
      createPdfAgent: () => pdfAgent as any,
    });

    await cli.parseAsync(['pdf', configPath, '--output', outputPath], { from: 'user' });

    expect(pdfAgent.execute).toHaveBeenCalledTimes(1);
    expect(fs.existsSync(outputPath)).toBe(true);
    expect(fs.existsSync(outputPath.replace(/\.pdf$/i, '.metadata.json'))).toBe(true);
  });

  it('fails pdf command when the agent returns an empty buffer', async () => {
    const configPath = path.join(tempDir, 'pdf-config.json');
    const outputPath = path.join(tempDir, 'out', 'document.pdf');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        title: 'Invalid PDF',
        authors: ['Tester'],
        template: 'default',
        sections: [{ id: 's1', title: 'Section 1', level: '1', content: 'Hello' }],
      }),
      'utf-8',
    );

    const pdfAgent = {
      execute: jest.fn(async () => ({
        documentPath: 'output/pdfs/invalid.pdf',
        documentBuffer: Buffer.alloc(0),
        metadata: {
          fileSize: 0,
          pageCount: 0,
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
          producer: 'test',
          creator: 'test',
          title: 'Invalid',
          author: 'Tester',
          subject: '',
          keywords: [],
          version: '1.0',
          format: 'pdf',
        },
        tocEntries: [],
        bookmarks: [],
        warnings: [],
        meta: {
          agent: 'pdf-generator-agent',
          promptVersion: 'v1',
          mcpVersion: 'v1',
          timestamp: new Date().toISOString(),
          runId: 'run-4',
        },
      })),
    };

    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit(1)');
    }) as never);

    const { createCliProgram } = await import('../../../src/cli');
    const cli = createCliProgram({
      createDocumentationAgent: () => ({ generateDocuments: jest.fn() }) as any,
      createArchitectureAgent: () => ({ execute: jest.fn() }) as any,
      createPdfAgent: () => pdfAgent as any,
    });

    await expect(cli.parseAsync(['pdf', configPath, '--output', outputPath], { from: 'user' })).rejects.toThrow('process.exit(1)');
    expect(fs.existsSync(outputPath)).toBe(false);

    exitSpy.mockRestore();
  });

  it('fails pdf command when the agent returns a non-pdf payload', async () => {
    const configPath = path.join(tempDir, 'pdf-config.json');
    const outputPath = path.join(tempDir, 'out', 'document.pdf');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        title: 'Invalid PDF Header',
        authors: ['Tester'],
        template: 'default',
        sections: [{ id: 's1', title: 'Section 1', level: '1', content: 'Hello' }],
      }),
      'utf-8',
    );

    const pdfAgent = {
      execute: jest.fn(async () => ({
        documentPath: 'output/pdfs/invalid-header.pdf',
        documentBuffer: Buffer.from('NOT_A_PDF', 'utf-8'),
        metadata: {
          fileSize: 9,
          pageCount: 1,
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
          producer: 'test',
          creator: 'test',
          title: 'Invalid',
          author: 'Tester',
          subject: '',
          keywords: [],
          version: '1.0',
          format: 'pdf',
        },
        tocEntries: [],
        bookmarks: [],
        warnings: [],
        meta: {
          agent: 'pdf-generator-agent',
          promptVersion: 'v1',
          mcpVersion: 'v1',
          timestamp: new Date().toISOString(),
          runId: 'run-5',
        },
      })),
    };

    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit(1)');
    }) as never);

    const { createCliProgram } = await import('../../../src/cli');
    const cli = createCliProgram({
      createDocumentationAgent: () => ({ generateDocuments: jest.fn() }) as any,
      createArchitectureAgent: () => ({ execute: jest.fn() }) as any,
      createPdfAgent: () => pdfAgent as any,
    });

    await expect(cli.parseAsync(['pdf', configPath, '--output', outputPath], { from: 'user' })).rejects.toThrow('process.exit(1)');
    expect(fs.existsSync(outputPath)).toBe(false);

    exitSpy.mockRestore();
  });

  it('applies orchestration mode settings to foundry requests', async () => {
    const { applyOrchestrationMode } = await import('../../../src/cli');
    const baseRequest = {
      projectId: 'project-1',
      projectName: 'Project',
      repoRoot: tempDir,
      description: 'Run tasks',
      maxIterations: 2,
      runQualityGates: true,
    };

    expect(applyOrchestrationMode(baseRequest, 'research')).toMatchObject({ maxIterations: 1, runQualityGates: false, description: '[mode:research] Run tasks' });
    expect(applyOrchestrationMode(baseRequest, 'docs')).toMatchObject({ maxIterations: 1, runQualityGates: false, description: '[mode:docs] Run tasks' });
    expect(applyOrchestrationMode(baseRequest, 'architect')).toMatchObject({ maxIterations: 1, runQualityGates: true, description: '[mode:architect] Run tasks' });
    expect(applyOrchestrationMode(baseRequest, 'code')).toMatchObject({ maxIterations: 2, runQualityGates: true, description: '[mode:code] Run tasks' });
    expect(applyOrchestrationMode(baseRequest, 'full')).toMatchObject({ maxIterations: 3, runQualityGates: true, description: '[mode:full] Run tasks' });
  });

  it('fails orchestrate command when mode is invalid', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit(1)');
    }) as never);

    const { createCliProgram } = await import('../../../src/cli');
    const cli = createCliProgram();

    await expect(cli.parseAsync(['orchestrate', '--mode', 'invalid'], { from: 'user' })).rejects.toThrow('process.exit(1)');

    exitSpy.mockRestore();
  });
});
