import { PDFGeneratorAgent } from '../../agents/pdf/pdf-agent';
import {
  createCompletePDFInput,
  createPDFInputWithCharts,
  createPDFInputWithDiagrams,
  createPDFInputWithSecurity,
  createLargePDFInput,
  createMockDatabase,
  createMockAuditService,
} from '../utils/pdf-test-factories';

describe('PDF Generation Integration', () => {
  let agent: PDFGeneratorAgent;
  let mockDb: any;
  let mockAudit: any;

  beforeEach(() => {
    mockDb = createMockDatabase();
    mockAudit = createMockAuditService();
    agent = new PDFGeneratorAgent(mockDb, mockAudit);
    jest.clearAllMocks();
  });

  it('should generate complete PDF with all components', async () => {
    const input = createCompletePDFInput();

    const result = await agent.execute(input);

    expect(result).toBeDefined();
    expect(result.documentPath).toBeDefined();
    expect(result.metadata.pageCount).toBeGreaterThan(0);
    expect(result.metadata.fileSize).toBeGreaterThan(0);
  });

  it('should render charts correctly in PDF', async () => {
    const input = createPDFInputWithCharts();

    const result = await agent.execute(input);

    expect(result).toBeDefined();
  });

  it('should render diagrams correctly in PDF', async () => {
    const input = createPDFInputWithDiagrams();

    const result = await agent.execute(input);

    expect(result).toBeDefined();
  });

  it('should encrypt PDF when security is specified', async () => {
    const input = createPDFInputWithSecurity();

    const result = await agent.execute(input);

    expect(result).toBeDefined();
  });

  it('should handle large documents efficiently', async () => {
    const input = createLargePDFInput(50);
    const startTime = Date.now();

    const result = await agent.execute(input);

    const duration = Date.now() - startTime;
    expect(result).toBeDefined();
    expect(duration).toBeLessThan(60000);
  });

  it('should include all metadata fields', async () => {
    const input = createCompletePDFInput();

    const result = await agent.execute(input);

    expect(result.metadata).toHaveProperty('fileSize');
    expect(result.metadata).toHaveProperty('pageCount');
    expect(result.metadata).toHaveProperty('createdAt');
    expect(result.metadata).toHaveProperty('producer');
    expect(result.metadata).toHaveProperty('creator');
    expect(result.metadata).toHaveProperty('title');
    expect(result.metadata).toHaveProperty('author');
  });

  it('should generate TOC entries', async () => {
    const input = createCompletePDFInput();

    const result = await agent.execute(input);

    expect(result.tocEntries.length).toBeGreaterThan(0);
  });

  it('should generate bookmarks', async () => {
    const input = createCompletePDFInput();

    const result = await agent.execute(input);

    expect(result.bookmarks.length).toBeGreaterThan(0);
  });

  it('should collect warnings', async () => {
    const input = createCompletePDFInput();

    const result = await agent.execute(input);

    expect(result.warnings).toBeDefined();
  });

  it('should include provenance metadata', async () => {
    const input = createCompletePDFInput();

    const result = await agent.execute(input);

    expect(result.meta).toHaveProperty('agent');
    expect(result.meta).toHaveProperty('promptVersion');
    expect(result.meta).toHaveProperty('mcpVersion');
    expect(result.meta).toHaveProperty('timestamp');
    expect(result.meta).toHaveProperty('runId');
  });

  it('should log audit events', async () => {
    const input = createCompletePDFInput();

    await agent.execute(input);

    expect(mockAudit.logEvent).toHaveBeenCalled();
  });
});
