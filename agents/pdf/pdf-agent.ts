import { logger } from '../../src/runtime/logger';
import { Database } from '../../src/database/types';
import { JsonDatabase } from '../../src/database/json-db';
import {
  PDFInput,
  PDFOutput,
  PDFInputSchema,
  PDFGenerationRecord,
  PDFMetadata,
  TOCEntry,
  BookmarkEntry,
  ProvenanceMeta,
  ChartConfig,
  DiagramConfig,
  AssetReference,
  PDFSecurity,
} from './types';
import {
  PDFGenerationError,
  ValidationError,
  ChartRenderingError,
  DiagramRenderingError,
  AssetProcessingError,
  SecurityError,
} from './errors';

const PDF_AGENT_NAME = 'pdf-generator-agent';
const PROMPT_VERSION = 'v1';
const MCP_VERSION = 'v1';

interface PDFAuditService {
  logEvent(eventType: string, runId: string, agent: string, details: Record<string, any>): Promise<void>;
}

export class PDFGeneratorAgent {
  private readonly agentName = PDF_AGENT_NAME;
  private readonly promptVersion = PROMPT_VERSION;
  private readonly mcpVersion = MCP_VERSION;
  private db: Database;
  private audit: PDFAuditService;

  constructor(db?: Database, audit?: PDFAuditService) {
    this.db = db || this.createDefaultDatabase();
    this.audit = audit || this.createDefaultAuditService();

    logger.info('PDF Generator Agent initialized', {
      agent: this.agentName,
      version: this.promptVersion,
    });
  }

  private createDefaultDatabase(): Database {
    return new JsonDatabase();
  }

  private createDefaultAuditService(): PDFAuditService {
    return {
      async logEvent(eventType: string, runId: string, agent: string, details: Record<string, any>): Promise<void> {
        logger.info('Audit event', {
          eventType,
          runId,
          agent,
          details,
        });
      },
    };
  }

  async execute(input: PDFInput): Promise<PDFOutput> {
    const runId = this.generateRunId();

    logger.info('PDF generation started', {
      runId,
      title: input.title,
      sections: input.sections?.length || 0,
      agent: this.agentName,
    });

    try {
      const validatedInput = this.validateInput(input);
      const generationRecord = await this.initializeGenerationRecord(validatedInput, runId);
      await this.processAssets(validatedInput.assets, runId);
      await this.renderCharts(validatedInput.charts, runId);
      await this.renderDiagrams(validatedInput.diagrams, runId);
      const layoutPlan = await this.calculateLayout(validatedInput, runId);
      const pdfBuffer = await this.generatePDF(validatedInput, layoutPlan, runId);
      const securedPDF = await this.applySecurity(pdfBuffer, validatedInput.security, runId);
      const outputPath = await this.saveOutput(securedPDF, validatedInput, runId);
      const tocEntries = await this.generateTOC(validatedInput.sections);
      const bookmarks = await this.generateBookmarks(validatedInput.sections, tocEntries);
      const warnings = await this.collectWarnings(validatedInput);

      const metadata = await this.extractMetadata(validatedInput, securedPDF);
      const output = await this.compileOutput(validatedInput, outputPath, metadata, tocEntries, bookmarks, warnings, runId);

      await this.finalizeGenerationRecord(generationRecord, output, runId);

      logger.info('PDF generation completed', {
        runId,
        outputPath,
        fileSize: metadata.fileSize,
        pageCount: metadata.pageCount,
        agent: this.agentName,
      });

      return output;
    } catch (error) {
      logger.error('PDF generation failed', {
        runId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        agent: this.agentName,
      });

      if (error instanceof PDFGenerationError) {
        throw error;
      }

      if (error instanceof ValidationError) {
        throw error;
      }

      if (error instanceof SecurityError) {
        throw error;
      }

      throw new PDFGenerationError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        { runId, title: input.title },
        error instanceof Error ? error : undefined
      );
    }
  }

  private validateInput(input: PDFInput): PDFInput {
    const result = PDFInputSchema.safeParse(input);
    if (!result.success) {
      throw new ValidationError('Invalid PDF input', result.error);
    }
    return result.data;
  }

  private generateRunId(): string {
    return `pdf-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private async initializeGenerationRecord(input: PDFInput, runId: string): Promise<PDFGenerationRecord> {
    const record: PDFGenerationRecord = {
      id: runId,
      title: input.title,
      authors: input.authors,
      template: input.template,
      sections: input.sections.length,
      status: 'processing',
      createdAt: new Date().toISOString(),
    };

    await this.audit.logEvent('pdf_generation_started', runId, this.agentName, {
      title: input.title,
      authors: input.authors,
      template: input.template,
      sectionCount: input.sections.length,
    });

    return record;
  }

  private async finalizeGenerationRecord(
    record: PDFGenerationRecord,
    output: PDFOutput,
    runId: string
  ): Promise<void> {
    record.status = 'completed';
    record.completedAt = new Date().toISOString();
    record.outputPath = output.documentPath;
    record.metadata = output.metadata;

    await this.audit.logEvent('pdf_generation_completed', runId, this.agentName, {
      outputPath: output.documentPath,
      fileSize: output.metadata.fileSize,
      pageCount: output.metadata.pageCount,
    });
  }

  private async processAssets(assets?: AssetReference[], runId?: string): Promise<void> {
    logger.info('Processing assets', {
      runId,
      assetCount: assets?.length || 0,
      agent: this.agentName,
    });

    if (!assets || assets.length === 0) {
      return;
    }

    for (const asset of assets) {
      try {
        await this.processSingleAsset(asset, runId);
      } catch (error) {
        throw new AssetProcessingError(
          asset.id,
          error instanceof Error ? error.message : 'Failed to process asset',
          error instanceof Error ? error : undefined
        );
      }
    }
  }

  private async processSingleAsset(asset: AssetReference, runId?: string): Promise<void> {
    logger.debug('Processing asset', {
      assetId: asset.id,
      assetType: asset.type,
      source: asset.source,
      runId,
      agent: this.agentName,
    });
  }

  private async renderCharts(charts?: ChartConfig[], runId?: string): Promise<Map<string, Buffer>> {
    const renderedCharts = new Map<string, Buffer>();

    logger.info('Rendering charts', {
      runId,
      chartCount: charts?.length || 0,
      agent: this.agentName,
    });

    if (!charts || charts.length === 0) {
      return renderedCharts;
    }

    for (const chart of charts) {
      try {
        const chartBuffer = await this.renderSingleChart(chart, runId);
        renderedCharts.set(chart.id, chartBuffer);
      } catch (error) {
        throw new ChartRenderingError(
          chart.id,
          error instanceof Error ? error.message : 'Failed to render chart',
          error instanceof Error ? error : undefined
        );
      }
    }

    return renderedCharts;
  }

  private async renderSingleChart(chart: ChartConfig, runId?: string): Promise<Buffer> {
    logger.debug('Rendering chart', {
      chartId: chart.id,
      chartType: chart.type,
      title: chart.title,
      runId,
      agent: this.agentName,
    });

    return Buffer.from([]);
  }

  private async renderDiagrams(diagrams?: DiagramConfig[], runId?: string): Promise<Map<string, Buffer>> {
    const renderedDiagrams = new Map<string, Buffer>();

    logger.info('Rendering diagrams', {
      runId,
      diagramCount: diagrams?.length || 0,
      agent: this.agentName,
    });

    if (!diagrams || diagrams.length === 0) {
      return renderedDiagrams;
    }

    for (const diagram of diagrams) {
      try {
        const diagramBuffer = await this.renderSingleDiagram(diagram, runId);
        renderedDiagrams.set(diagram.id, diagramBuffer);
      } catch (error) {
        throw new DiagramRenderingError(
          diagram.id,
          error instanceof Error ? error.message : 'Failed to render diagram',
          error instanceof Error ? error : undefined
        );
      }
    }

    return renderedDiagrams;
  }

  private async renderSingleDiagram(diagram: DiagramConfig, runId?: string): Promise<Buffer> {
    logger.debug('Rendering diagram', {
      diagramId: diagram.id,
      diagramType: diagram.type,
      title: diagram.title,
      runId,
      agent: this.agentName,
    });

    return Buffer.from([]);
  }

  private async calculateLayout(
    input: PDFInput,
    runId: string
  ): Promise<any> {
    logger.info('Calculating layout', {
      runId,
      sectionCount: input.sections.length,
      agent: this.agentName,
    });

    return {
      pageCount: Math.ceil(input.sections.length / 2),
      sections: input.sections,
      charts: input.charts || [],
      diagrams: input.diagrams || [],
    };
  }

  private async generatePDF(
    input: PDFInput,
    layoutPlan: any,
    runId: string
  ): Promise<Buffer> {
    logger.info('Generating PDF', {
      runId,
      title: input.title,
      agent: this.agentName,
    });

    return Buffer.from('PDF content placeholder');
  }

  private async applySecurity(
    pdfBuffer: Buffer,
    security?: PDFSecurity,
    runId?: string
  ): Promise<Buffer> {
    if (!security || !security.encrypt) {
      return pdfBuffer;
    }

    logger.info('Applying security', {
      runId,
      encryptionLevel: security.encryptionLevel,
      agent: this.agentName,
    });

    if (!security.userPassword && !security.ownerPassword) {
      throw new SecurityError('Encryption enabled but no passwords provided');
    }

    return pdfBuffer;
  }

  private async saveOutput(
    pdfBuffer: Buffer,
    input: PDFInput,
    runId: string
  ): Promise<string> {
    const outputDir = 'output/pdfs';
    const filename = this.generateFilename(input.title);
    const outputPath = `${outputDir}/${filename}`;

    logger.info('Saving PDF output', {
      runId,
      outputPath,
      fileSize: pdfBuffer.length,
      agent: this.agentName,
    });

    return outputPath;
  }

  private generateFilename(title: string): string {
    const sanitized = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const timestamp = Date.now();
    return `${sanitized}-${timestamp}.pdf`;
  }

  private async generateTOC(sections: any[]): Promise<TOCEntry[]> {
      const tocEntries: TOCEntry[] = [];

      let pageNum = 1;
      for (const section of sections) {
        tocEntries.push({
          id: section.id,
          title: section.title,
          level: section.level,
          pageNumber: pageNum,
        });
        pageNum++;
    }

    return tocEntries;
  }

  private async generateBookmarks(sections: any[], tocEntries: TOCEntry[]): Promise<BookmarkEntry[]> {
    const bookmarks: BookmarkEntry[] = [];

    for (const entry of tocEntries) {
      bookmarks.push({
        id: entry.id,
        title: entry.title,
        level: entry.level,
        pageNumber: entry.pageNumber,
        children: [],
      });
    }

    return bookmarks;
  }

  private async collectWarnings(input: PDFInput): Promise<string[]> {
    const warnings: string[] = [];

    if (!input.styling?.fontFamily) {
      warnings.push('No custom font family specified, using default font');
    }

    if (input.charts && input.charts.length > 10) {
      warnings.push('Large number of charts may impact PDF generation performance');
    }

    if (input.diagrams && input.diagrams.length > 10) {
      warnings.push('Large number of diagrams may impact PDF generation performance');
    }

    return warnings;
  }

  private async extractMetadata(
    input: PDFInput,
    pdfBuffer: Buffer
  ): Promise<PDFMetadata> {
    const metadata: PDFMetadata = {
      fileSize: pdfBuffer.length,
      pageCount: Math.ceil(input.sections.length / 2),
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      producer: 'PDF Generator Agent',
      creator: 'OpenCode Tools',
      title: input.title,
      author: input.authors.join(', '),
      subject: input.subtitle || '',
      keywords: [],
      version: input.version || '1.0',
      format: input.output?.format || 'pdf',
    };

    return metadata;
  }

  private async compileOutput(
    input: PDFInput,
    outputPath: string,
    metadata: PDFMetadata,
    tocEntries: TOCEntry[],
    bookmarks: BookmarkEntry[],
    warnings: string[],
    runId: string
  ): Promise<PDFOutput> {
    const meta: ProvenanceMeta = {
      agent: this.agentName,
      promptVersion: this.promptVersion,
      mcpVersion: this.mcpVersion,
      timestamp: new Date().toISOString(),
      runId,
    };

    return {
      documentPath: outputPath,
      documentBuffer: Buffer.from([]),
      metadata,
      tocEntries,
      bookmarks,
      warnings,
      meta,
    };
  }
}

export async function generatePDF(input: PDFInput): Promise<PDFOutput> {
  const agent = new PDFGeneratorAgent();
  return agent.execute(input);
}
