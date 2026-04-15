import { PDFGeneratorAgent } from '../../agents/pdf/pdf-agent';
import { PDFInput, PDFInputSchema } from '../../agents/pdf/types';
import { ValidationError, SecurityError } from '../../agents/pdf/errors';
import {
  PDFGenerationError,
  ChartRenderingError,
  DiagramRenderingError,
  AssetProcessingError,
} from '../../agents/pdf/errors/pdf-errors';
import { v4 as uuidv4 } from 'uuid';

describe('PDFGeneratorAgent', () => {
  let agent: PDFGeneratorAgent;

  beforeEach(() => {
    agent = new PDFGeneratorAgent();
  });

  describe('execute', () => {
    const createValidInput = (): PDFInput => ({
      title: 'Test Document',
      subtitle: 'A test PDF document',
      authors: ['Test Author'],
      organization: 'Test Organization',
      version: '1.0',
      template: 'standard',
      sections: [
        {
          id: 'section-1',
          title: 'Introduction',
          level: '1',
          content: 'This is the introduction section.',
        },
        {
          id: 'section-2',
          title: 'Main Content',
          level: '1',
          content: 'This is the main content section.',
        },
      ],
      styling: {
        primaryColor: '#1a365d',
        fontFamily: 'Arial',
      },
      output: {
        format: 'pdf',
        compress: true,
        imageQuality: 90,
        embedFonts: true,
        generateTOC: true,
        generateBookmarks: true,
      },
    });

    it('should return a complete PDF output', async () => {
      const input = createValidInput();

      const result = await agent.execute(input);

      expect(result).toBeDefined();
      expect(result.documentPath).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.tocEntries).toBeDefined();
      expect(result.bookmarks).toBeDefined();
      expect(result.warnings).toBeDefined();
      expect(result.meta).toBeDefined();
    });

    it('should include metadata with required fields', async () => {
      const input = createValidInput();

      const result = await agent.execute(input);

      expect(result.metadata).toHaveProperty('fileSize');
      expect(result.metadata).toHaveProperty('pageCount');
      expect(result.metadata).toHaveProperty('createdAt');
      expect(result.metadata).toHaveProperty('producer');
      expect(result.metadata).toHaveProperty('creator');
      expect(result.metadata).toHaveProperty('title');
      expect(result.metadata).toHaveProperty('author');
      expect(result.metadata.producer).toBe('PDF Generator Agent');
      expect(result.metadata.creator).toBe('OpenCode Tools');
    });

    it('should include provenance metadata', async () => {
      const input = createValidInput();

      const result = await agent.execute(input);

      expect(result.meta).toHaveProperty('agent');
      expect(result.meta).toHaveProperty('promptVersion');
      expect(result.meta).toHaveProperty('mcpVersion');
      expect(result.meta).toHaveProperty('timestamp');
      expect(result.meta).toHaveProperty('runId');
      expect(result.meta.agent).toBe('pdf-generator-agent');
      expect(result.meta.promptVersion).toBe('v1');
      expect(result.meta.mcpVersion).toBe('v1');
    });

    it('should generate TOC entries for all sections', async () => {
      const input = createValidInput();

      const result = await agent.execute(input);

      expect(result.tocEntries).toHaveLength(input.sections.length);
      expect(result.tocEntries[0]).toHaveProperty('id');
      expect(result.tocEntries[0]).toHaveProperty('title');
      expect(result.tocEntries[0]).toHaveProperty('level');
      expect(result.tocEntries[0]).toHaveProperty('pageNumber');
    });

    it('should generate bookmarks for all sections', async () => {
      const input = createValidInput();

      const result = await agent.execute(input);

      expect(result.bookmarks).toHaveLength(input.sections.length);
      expect(result.bookmarks[0]).toHaveProperty('id');
      expect(result.bookmarks[0]).toHaveProperty('title');
      expect(result.bookmarks[0]).toHaveProperty('level');
      expect(result.bookmarks[0]).toHaveProperty('pageNumber');
      expect(result.bookmarks[0]).toHaveProperty('children');
    });

    it('should include warnings when font family is not specified', async () => {
      const input = createValidInput();
      delete input.styling?.fontFamily;

      const result = await agent.execute(input);

      expect(result.warnings).toContain('No custom font family specified, using default font');
    });

    it('should include warnings for large number of charts', async () => {
      const input = createValidInput();
      delete input.styling;
      input.charts = Array.from({ length: 15 }, () => ({
        id: uuidv4(),
        type: 'bar' as const,
        title: 'Chart',
        data: {
          labels: ['A', 'B', 'C'],
          datasets: [
            {
              label: 'Dataset 1',
              data: [1, 2, 3],
            },
          ],
        },
      }));

      const result = await agent.execute(input);

      expect(result.warnings).toContain('Large number of charts may impact PDF generation performance');
    });

    it('should include warnings for large number of diagrams', async () => {
      const input = createValidInput();
      delete input.styling;
      input.diagrams = Array.from({ length: 15 }, () => ({
        id: uuidv4(),
        type: 'flowchart' as const,
        title: 'Diagram',
        definition: 'graph TD\n  A[Start] --> B[End]',
      }));

      const result = await agent.execute(input);

      expect(result.warnings).toContain('Large number of diagrams may impact PDF generation performance');
    });
  });

  describe('input validation', () => {
    it('should throw ValidationError for missing required fields', async () => {
      const invalidInput = {
        title: 'Test',
        authors: [],
      } as unknown as PDFInput;

      await expect(agent.execute(invalidInput)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for empty sections array', async () => {
      const invalidInput: PDFInput = {
        title: 'Test Document',
        authors: ['Author'],
        template: 'standard',
        sections: [],
      };

      await expect(agent.execute(invalidInput)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid section', async () => {
      const invalidInput: PDFInput = {
        title: 'Test Document',
        authors: ['Author'],
        template: 'standard',
        sections: [
          {
            id: '',
            title: '',
            level: '1',
            content: '',
          },
        ],
      };

      await expect(agent.execute(invalidInput)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid chart configuration', async () => {
      const invalidInput: PDFInput = {
        title: 'Test Document',
        authors: ['Author'],
        template: 'standard',
        sections: [
          {
            id: 'section-1',
            title: 'Section 1',
            level: '1',
            content: 'Content',
            charts: [
              {
                id: 'invalid-uuid',
                type: 'bar',
                title: 'Chart',
                data: {
                  labels: ['A', 'B'],
                  datasets: [],
                },
              },
            ],
          },
        ],
      };

      await expect(agent.execute(invalidInput)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid diagram configuration', async () => {
      const invalidInput: PDFInput = {
        title: 'Test Document',
        authors: ['Author'],
        template: 'standard',
        sections: [
          {
            id: 'section-1',
            title: 'Section 1',
            level: '1',
            content: 'Content',
            diagrams: [
              {
                id: 'invalid-uuid',
                type: 'flowchart',
                title: 'Diagram',
                definition: '',
              },
            ],
          },
        ],
      };

      await expect(agent.execute(invalidInput)).rejects.toThrow(ValidationError);
    });
  });

  describe('security', () => {
    it('should throw SecurityError when encryption is enabled but no passwords provided', async () => {
      const input: PDFInput = {
        title: 'Test Document',
        authors: ['Author'],
        template: 'standard',
        sections: [
          {
            id: 'section-1',
            title: 'Section 1',
            level: '1',
            content: 'Content',
          },
        ],
        security: {
          encrypt: true,
          encryptionLevel: '256',
        },
      };

      await expect(agent.execute(input)).rejects.toThrow(SecurityError);
    });
  });
});

describe('PDFInputSchema', () => {
  const createValidInput = (): PDFInput => ({
    title: 'Test Document',
    authors: ['Test Author'],
    template: 'standard',
    sections: [
      {
        id: 'section-1',
        title: 'Introduction',
        level: '1',
        content: 'This is the introduction.',
      },
    ],
  });

  it('should validate valid input successfully', () => {
    const input = createValidInput();
    const result = PDFInputSchema.safeParse(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Test Document');
    }
  });

  it('should reject input with missing title', () => {
    const input = createValidInput();
    delete (input as Partial<PDFInput>).title;

    const result = PDFInputSchema.safeParse(input);

    expect(result.success).toBe(false);
  });

  it('should reject input with empty authors array', () => {
    const input = createValidInput();
    input.authors = [];

    const result = PDFInputSchema.safeParse(input);

    expect(result.success).toBe(false);
  });

  it('should reject input with invalid section level', () => {
    const input = createValidInput();
    (input.sections[0].level as any) = 5;

    const result = PDFInputSchema.safeParse(input);

    expect(result.success).toBe(false);
  });

  it('should accept optional fields', () => {
    const input: PDFInput = {
      title: 'Test',
      authors: ['Author'],
      template: 'standard',
      sections: [
        {
          id: 's1',
          title: 'Title',
          level: '1',
          content: 'Content',
        },
      ],
      subtitle: 'Subtitle',
      organization: 'Org',
      version: '1.0',
      styling: {
        primaryColor: '#1a365d',
      },
      output: {
        format: 'pdf',
        compress: true,
        imageQuality: 90,
        embedFonts: true,
        generateTOC: true,
        generateBookmarks: true,
      },
    };

    const result = PDFInputSchema.safeParse(input);

    expect(result.success).toBe(true);
  });

  it('should reject invalid hex color', () => {
    const input = createValidInput();
    input.styling = { primaryColor: 'invalid-color' };

    const result = PDFInputSchema.safeParse(input);

    expect(result.success).toBe(false);
  });

  it('should validate chart configuration', () => {
    const input = createValidInput();
    input.charts = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        type: 'bar',
        title: 'Chart',
        data: {
          labels: ['A', 'B', 'C'],
          datasets: [
            {
              label: 'Dataset',
              data: [1, 2, 3],
            },
          ],
        },
      },
    ];

    const result = PDFInputSchema.safeParse(input);

    expect(result.success).toBe(true);
  });

  it('should validate diagram configuration', () => {
    const input = createValidInput();
    input.diagrams = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        type: 'flowchart',
        title: 'Diagram',
        definition: 'graph TD\n  A[Start] --> B[End]',
      },
    ];

    const result = PDFInputSchema.safeParse(input);

    expect(result.success).toBe(true);
  });

  it('should validate asset reference', () => {
    const input = createValidInput();
    input.assets = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        type: 'image',
        source: 'https://example.com/image.png',
        altText: 'Image',
      },
    ];

    const result = PDFInputSchema.safeParse(input);

    expect(result.success).toBe(true);
  });

  it('should validate security settings', () => {
    const input = createValidInput();
    input.security = {
      encrypt: true,
      userPassword: 'password',
      ownerPassword: 'owner',
      encryptionLevel: '256',
    };

    const result = PDFInputSchema.safeParse(input);

    expect(result.success).toBe(true);
  });
});

describe('PDF Errors', () => {
  let agent: PDFGeneratorAgent;

  beforeEach(() => {
    agent = new PDFGeneratorAgent();
  });

  it('should create PDFGenerationError with message and context', () => {
    const error = new PDFGenerationError('Test error', { test: 'context' });
    expect(error.message).toBe('PDF Generation Error: Test error');
    expect(error.name).toBe('PDFGenerationError');
    expect(error.context).toEqual({ test: 'context' });
  });

  it('should create PDFGenerationError with cause', () => {
    const cause = new Error('Original error');
    const error = new PDFGenerationError('Test error', { test: 'context' }, cause);
    expect(error.cause).toBe(cause);
  });

  it('should create ValidationError with Zod error', () => {
    const zodError = new Error('Zod validation failed');
    const error = new ValidationError('Test validation error', zodError as any);
    expect(error.message).toBe('Validation Error: Test validation error');
    expect(error.name).toBe('ValidationError');
  });

  it('should create ChartRenderingError with chartId', () => {
    const error = new ChartRenderingError('chart-123', 'Chart rendering failed');
    expect(error.message).toBe('Chart Rendering Error for chart-123: Chart rendering failed');
    expect(error.name).toBe('ChartRenderingError');
  });

  it('should create DiagramRenderingError with diagramId', () => {
    const error = new DiagramRenderingError('diagram-456', 'Diagram rendering failed');
    expect(error.message).toBe('Diagram Rendering Error for diagram-456: Diagram rendering failed');
    expect(error.name).toBe('DiagramRenderingError');
  });

  it('should create AssetProcessingError with assetId', () => {
    const error = new AssetProcessingError('asset-789', 'Asset processing failed');
    expect(error.message).toBe('Asset Processing Error for asset-789: Asset processing failed');
    expect(error.name).toBe('AssetProcessingError');
  });

  it('should create SecurityError with message', () => {
    const error = new SecurityError('Security violation');
    expect(error.message).toBe('Security Error: Security violation');
    expect(error.name).toBe('SecurityError');
  });
});
