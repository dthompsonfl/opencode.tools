# Fortune-500 Level PDF Generator Agent - Implementation Plan

**Document Version**: 1.0.0  
**Date**: February 11, 2026  
**Author**: OpenCode Tools Architecture Team  
**Status**: Planning Phase  

---

## Executive Summary

This document outlines a comprehensive plan to implement a Fortune-500 level PDF generator agent for the OpenCode Tools platform. The agent will produce Adobe-quality PDFs with support for charts, diagrams, professional typography, and enterprise-grade document generation for whitepapers, client documentation, and presentation materials.

**Target Capabilities**:
- Professional-grade PDF generation with vector graphics
- Chart and diagram support (Mermaid, Plotly, Chart.js integration)
- Multi-column layouts with master pages
- Watermarking, pagination, and TOC generation
- Image optimization and asset management
- Template-based document construction
- Font embedding and typography control
- Security features (encryption, permissions)
- Batch generation capabilities

**Estimated Implementation Timeline**: 6-8 weeks  
**Complexity Level**: High (Enterprise-grade)

---

## 1. Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          PDF Generator Agent                            │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────────┐ │
│  │  Input Handler   │  │   Template       │  │   Asset Manager       │ │
│  │  (Zod Schema)    │  │   Engine         │  │   (Images/Fonts)      │ │
│  └────────┬─────────┘  └────────┬─────────┘  └───────────┬────────────┘ │
│           │                     │                        │               │
│           └─────────────────────┼────────────────────────┘               │
│                                 ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Document Composer                               │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐    │   │
│  │  │ Layout      │  │ Typography  │  │ Graphics Renderer       │    │   │
│  │  │ Engine      │  │ Engine      │  │ (Charts/Diagrams)       │    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                 │                                        │
│           ┌─────────────────────┼─────────────────────┐                 │
│           ▼                     ▼                     ▼                 │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐   │
│  │ PDFKit/Puppeteer│  │  Output        │  │   Audit & Logging       │   │
│  │ Renderer        │  │  Handler       │  │   (Enterprise Ready)   │   │
│  └────────────────┘  └────────────────┘  └────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Component Responsibilities

| Component | Responsibility | Dependencies |
|-----------|---------------|--------------|
| **Input Handler** | Validates PDF generation requests using Zod schemas | Zod, Validation Logic |
| **Template Engine** | Processes document templates with variable substitution | Handlebars/Embedded templates |
| **Asset Manager** | Manages images, fonts, and static assets | File system, Image processing |
| **Layout Engine** | Calculates page layouts, columns, margins | PDF layout algorithms |
| **Typography Engine** | Font loading, line spacing, kerning | FontKit, Custom fonts |
| **Graphics Renderer** | Renders charts, diagrams, and vector graphics | Chart libraries, Mermaid |
| **PDF Renderer** | Generates final PDF document | PDFKit or Puppeteer |
| **Output Handler** | Saves, encrypts, and delivers PDFs | File system, Encryption |
| **Audit System** | Tracks generation requests and outputs | Winston logger, Audit trail |

---

## 2. PDF Generation Strategy

### 2.1 Primary Technology Stack

#### Option A: PDFKit (Recommended for Headless Generation)
**Pros**:
- Native Node.js library
- Excellent performance
- Full control over layout
- No browser dependency
- Small footprint

**Cons**:
- Steeper learning curve
- Manual layout calculations

#### Option B: Puppeteer + Chrome
**Pros**:
- HTML/CSS rendering
- CSS Grid/Flexbox layouts
- JavaScript chart libraries work natively
- Easier styling

**Cons**:
- Heavy dependency (Chromium)
- Memory intensive
- Larger container images

**Recommendation**: **PDFKit with Hybrid Approach**
- Use PDFKit for primary generation
- Use Puppeteer for complex HTML/CSS layouts
- Chart generation via dedicated libraries

### 2.2 Chart and Diagram Integration

#### Chart Libraries Supported:
1. **Chart.js** - Render to canvas, embed as images
2. **Plotly.js** - SVG export, high-quality charts
3. **Mermaid** - Text-to-diagram (flowcharts, sequence diagrams, gantt)
4. **D3.js** - Custom visualizations
5. **Graphviz** - Professional graph diagrams

#### Diagram Rendering Pipeline:
```
Mermaid/Graphviz Source Text
           │
           ▼
┌───────────────────────┐
│  Diagram Parser       │
│  (Parse AST)          │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Vector Renderer      │
│  (SVG Generation)     │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  SVG to PDF Converter │
│  (Embed in PDF)       │
└───────────────────────┘
```

### 2.3 Typography System

#### Font Strategy:
- **Embedded Fonts**: Professional fonts (Adobe Garamond, Helvetica Neue)
- **Google Fonts**: Web fonts with licensing
- **Subset Font Files**: Reduce PDF size by subsetting
- **Fallback Chains**: Graceful degradation

#### Typography Settings:
```typescript
interface TypographySettings {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  kerning: boolean;
  ligatures: boolean;
  fontWeight: 300 | 400 | 500 | 600 | 700;
  fontStyle: 'normal' | 'italic';
  color: string;
}
```

### 2.4 Page Layout System

#### Layout Templates:
1. **Cover Page** - Full-bleed images, minimal text
2. **Title Page** - Company branding, document info
3. **TOC Page** - Auto-generated table of contents
4. **Content Pages** - Multi-column layouts
5. **Landscape Pages** - Wide tables and charts
6. **Appendix Pages** - Reference materials
7. **Blank Pages** - Document separators

#### Layout Configuration:
```typescript
interface PageLayout {
  pageSize: 'A4' | 'Letter' | 'Legal';
  orientation: 'portrait' | 'landscape';
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  columns: number;
  columnGap: number;
  header?: HeaderConfig;
  footer?: FooterConfig;
  pageNumbers: boolean;
  runningHeaders?: RunningHeaderConfig;
}
```

---

## 3. Agent Implementation Plan

### 3.1 Agent Class Structure

**Location**: `agents/pdf/pdf-agent.ts`

```typescript
import { z } from 'zod';
import { EventEmitter } from 'events';
import { logger } from 'src/runtime/logger';
import { Database } from 'src/database';
import { AuditService } from 'src/runtime/audit';
import { PDFRenderer } from './rendering/pdf-renderer';
import { TemplateEngine } from './templating/template-engine';
import { AssetManager } from './assets/asset-manager';
import { ChartRenderer } from './graphics/chart-renderer';
import { DiagramEngine } from './graphics/diagram-engine';
import { LayoutEngine } from './layout/layout-engine';

const PDF_AGENT_NAME = 'pdf-generator-agent';
const PROMPT_VERSION = 'v1';
const MCP_VERSION = 'v1';

export interface PDFInput {
  /** Document title */
  title: string;
  /** Document subtitle/description */
  subtitle?: string;
  /** Document author(s) */
  authors: string[];
  /** Company/organization name */
  organization?: string;
  /** Document version */
  version?: string;
  /** Creation date */
  date?: Date;
  /** Document template to use */
  template: string;
  /** Content sections */
  sections: PDFSection[];
  /** Custom styling options */
  styling?: PDFStyling;
  /** Chart configurations */
  charts?: ChartConfig[];
  /** Diagram configurations */
  diagrams?: DiagramConfig[];
  /** Asset references */
  assets?: AssetReference[];
  /** Security settings */
  security?: PDFSecurity;
  /** Output configuration */
  output?: PDFOutputConfig;
}

export interface PDFSection {
  id: string;
  title: string;
  level: 1 | 2 | 3 | 4;
  content: string; // Markdown or HTML
  layout?: SectionLayout;
  charts?: ChartConfig[];
  diagrams?: DiagramConfig[];
}

export interface PDFStyling {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
  pageLayout?: PageLayout;
  headerStyle?: TextStyle;
  footerStyle?: TextStyle;
  tocStyle?: TOCStyle;
}

export interface PDFSecurity {
  encrypt: boolean;
  userPassword?: string;
  ownerPassword?: string;
  permissions?: PDFPermissions;
  encryptionLevel?: 40 | 128 | 256;
}

export interface PDFPermissions {
  print: 'none' | 'low' | 'high';
  copy: boolean;
  modify: boolean;
  annotate: boolean;
  formFields: boolean;
  contentAccessibility: boolean;
  documentAssembly: boolean;
}

export interface PDFOutputConfig {
  format: 'pdf' | 'pdfa' | 'pdfx';
  compress: boolean;
  imageQuality: number;
  embedFonts: boolean;
  generateTOC: boolean;
  generateBookmarks: boolean;
  outputPath?: string;
}

export class PDFGeneratorAgent {
  private readonly agentName = PDF_AGENT_NAME;
  private readonly promptVersion = PROMPT_VERSION;
  private readonly mcpVersion = MCP_VERSION;
  
  private pdfRenderer: PDFRenderer;
  private templateEngine: TemplateEngine;
  private assetManager: AssetManager;
  private chartRenderer: ChartRenderer;
  private diagramEngine: DiagramEngine;
  private layoutEngine: LayoutEngine;
  private db: Database;
  private audit: AuditService;
  
  constructor(
    db: Database,
    audit: AuditService,
    options?: {
      pdfRenderer?: PDFRenderer;
      templateEngine?: TemplateEngine;
      assetManager?: AssetManager;
      chartRenderer?: ChartRenderer;
      diagramEngine?: DiagramEngine;
      layoutEngine?: LayoutEngine;
    }
  ) {
    this.db = db;
    this.audit = audit;
    
    // Initialize core components
    this.pdfRenderer = options?.pdfRenderer || new PDFRenderer();
    this.templateEngine = options?.templateEngine || new TemplateEngine();
    this.assetManager = options?.assetManager || new AssetManager();
    this.chartRenderer = options?.chartRenderer || new ChartRenderer();
    this.diagramEngine = options?.diagramEngine || new DiagramEngine();
    this.layoutEngine = options?.layoutEngine || new LayoutEngine();
    
    logger.info('PDF Generator Agent initialized', {
      agent: this.agentName,
      version: this.promptVersion
    });
  }

  /**
   * Execute PDF generation workflow
   */
  async execute(input: PDFInput): Promise<PDFOutput> {
    const runId = this.audit.generateRunId();
    const startTime = Date.now();
    
    logger.info('PDF generation started', {
      runId,
      title: input.title,
      sections: input.sections.length,
      agent: this.agentName
    });

    try {
      // 1. Validate input with Zod schema
      const validatedInput = this.validateInput(input);
      
      // 2. Initialize PDF generation record
      const generationRecord = await this.initializeGenerationRecord(validatedInput, runId);
      
      // 3. Process assets and dependencies
      await this.processAssets(validatedInput, runId);
      
      // 4. Render charts (if any)
      if (validatedInput.charts && validatedInput.charts.length > 0) {
        await this.renderCharts(validatedInput.charts, runId);
      }
      
      // 5. Render diagrams (if any)
      if (validatedInput.diagrams && validatedInput.diagrams.length > 0) {
        await this.renderDiagrams(validatedInput.diagrams, runId);
      }
      
      // 6. Calculate layouts
      const layoutPlan = await this.layoutEngine.calculateLayout(validatedInput, runId);
      
      // 7. Generate PDF document
      const pdfBuffer = await this.generatePDF(validatedInput, layoutPlan, runId);
      
      // 8. Apply security (if specified)
      const securedPDF = await this.applySecurity(pdfBuffer, validatedInput.security, runId);
      
      // 9. Save output
      const outputPath = await this.saveOutput(securedPDF, validatedInput, runId);
      
      // 10. Compile output result
      const output = await this.compileOutput(validatedInput, outputPath, runId);
      
      const duration = Date.now() - startTime;
      logger.info('PDF generation completed', {
        runId,
        duration: `${duration}ms`,
        outputPath,
        fileSize: output.metadata.fileSize,
        agent: this.agentName
      });
      
      return output;
      
    } catch (error) {
      logger.error('PDF generation failed', {
        runId,
        error: error.message,
        stack: error.stack,
        agent: this.agentName
      });
      
      throw new PDFGenerationError(
        `PDF generation failed: ${error.message}`,
        { runId, title: input.title },
        error
      );
    }
  }

  /**
   * Validate input using Zod schema
   */
  private validateInput(input: PDFInput): PDFInput {
    const result = PDFInputSchema.safeParse(input);
    if (!result.success) {
      throw new ValidationError('Invalid PDF input', result.error);
    }
    return result.data;
  }

  /**
   * Initialize generation record in database
   */
  private async initializeGenerationRecord(input: PDFInput, runId: string): Promise<any> {
    const record = {
      id: runId,
      title: input.title,
      authors: input.authors,
      template: input.template,
      sections: input.sections.length,
      status: 'processing',
      createdAt: new Date().toISOString(),
      metadata: {
        agent: this.agentName,
        promptVersion: this.promptVersion,
        mcpVersion: this.mcpVersion
      }
    };
    
    await this.db.savePDFGeneration(record);
    return record;
  }

  /**
   * Process and optimize all assets
   */
  private async processAssets(input: PDFInput, runId: string): Promise<void> {
    logger.info('Processing assets', {
      runId,
      assetCount: input.assets?.length || 0
    });
    
    if (input.assets) {
      for (const asset of input.assets) {
        await this.assetManager.process(asset, runId);
      }
    }
  }

  /**
   * Render all charts
   */
  private async renderCharts(charts: ChartConfig[], runId: string): Promise<void> {
    logger.info('Rendering charts', {
      runId,
      chartCount: charts.length
    });
    
    for (const chart of charts) {
      await this.chartRenderer.render(chart, runId);
    }
  }

  /**
   * Render all diagrams
   */
  private async renderDiagrams(diagrams: DiagramConfig[], runId: string): Promise<void> {
    logger.info('Rendering diagrams', {
      runId,
      diagramCount: diagrams.length
    });
    
    for (const diagram of diagrams) {
      await this.diagramEngine.render(diagram, runId);
    }
  }

  /**
   * Generate PDF document
   */
  private async generatePDF(
    input: PDFInput,
    layoutPlan: LayoutPlan,
    runId: string
  ): Promise<Buffer> {
    logger.info('Generating PDF document', {
      runId,
      pageCount: layoutPlan.pageCount
    });
    
    const document = await this.pdfRenderer.createDocument(input, layoutPlan, runId);
    return document.render();
  }

  /**
   * Apply security settings
   */
  private async applySecurity(
    pdfBuffer: Buffer,
    security?: PDFSecurity,
    runId?: string
  ): Promise<Buffer> {
    if (!security?.encrypt) {
      return pdfBuffer;
    }
    
    logger.info('Applying PDF security', { runId });
    
    return this.pdfRenderer.encrypt(pdfBuffer, security);
  }

  /**
   * Save PDF output to disk
   */
  private async saveOutput(
    pdfBuffer: Buffer,
    input: PDFInput,
    runId: string
  ): Promise<string> {
    const fileName = this.generateFileName(input, runId);
    const outputPath = `artifacts/pdf/${fileName}`;
    
    await this.pdfRenderer.save(pdfBuffer, outputPath);
    
    logger.info('PDF saved', {
      runId,
      outputPath
    });
    
    return outputPath;
  }

  /**
   * Compile final output result
   */
  private async compileOutput(
    input: PDFInput,
    outputPath: string,
    runId: string
  ): Promise<PDFOutput> {
    const fileStats = await this.audit.getFileStats(outputPath);
    
    return {
      success: true,
      documentPath: outputPath,
      fileName: this.generateFileName(input, runId),
      metadata: {
        title: input.title,
        authors: input.authors,
        organization: input.organization,
        version: input.version,
        creationDate: new Date().toISOString(),
        fileSize: fileStats.size,
        pageCount: await this.pdfRenderer.getPageCount(outputPath)
      },
      sources: [],
      meta: {
        agent: this.agentName,
        promptVersion: this.promptVersion,
        mcpVersion: this.mcpVersion,
        runId,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Generate filename for output
   */
  private generateFileName(input: PDFInput, runId: string): string {
    const sanitizedTitle = input.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    const date = new Date().toISOString().split('T')[0];
    return `${sanitizedTitle}_${date}_${runId.substring(0, 8)}.pdf`;
  }
}
```

### 3.2 Zod Input Schema

```typescript
const ChartConfigSchema = z.object({
  id: z.string(),
  type: z.enum(['bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea', 'bubble', 'scatter']),
  title: z.string(),
  data: z.object({
    labels: z.array(z.string()),
    datasets: z.array(z.object({
      label: z.string(),
      data: z.array(z.number()),
      backgroundColor: z.union([z.string(), z.array(z.string())]),
      borderColor: z.union([z.string(), z.array(z.string())]),
      borderWidth: z.number().optional()
    }))
  }),
  options: z.object({
    responsive: z.boolean().default(true),
    maintainAspectRatio: z.boolean().default(true),
    plugins: z.object({
      legend: z.object({
        display: z.boolean(),
        position: z.enum(['top', 'bottom', 'left', 'right']).optional()
      }).optional(),
      title: z.object({
        display: z.boolean(),
        text: z.string()
      }).optional()
    }).optional()
  }).optional()
});

const DiagramConfigSchema = z.object({
  id: z.string(),
  type: z.enum(['flowchart', 'sequence', 'gantt', 'class', 'state', 'er', 'journey']),
  title: z.string(),
  definition: z.string(), // Mermaid syntax
  layout: z.enum(['TB', 'LR', 'RL', 'BT']).default('TB')
});

const AssetReferenceSchema = z.object({
  id: z.string(),
  type: z.enum(['image', 'font', 'logo', 'icon', 'watermark']),
  source: z.string(), // File path or URL
  alt: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  quality: z.number().min(1).max(100).optional()
});

const PDFSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  content: z.string(),
  charts: z.array(ChartConfigSchema).optional(),
  diagrams: z.array(DiagramConfigSchema).optional()
});

const PDFStylingSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  fontFamily: z.string().optional(),
  fontSize: z.number().min(8).max(72).optional(),
  lineHeight: z.number().min(1).max(3).optional(),
  pageLayout: z.object({
    pageSize: z.enum(['A4', 'Letter', 'Legal']).default('Letter'),
    orientation: z.enum(['portrait', 'landscape']).default('portrait'),
    margins: z.object({
      top: z.number().min(0).max(3).default(1),
      bottom: z.number().min(0).max(3).default(1),
      left: z.number().min(0).max(3).default(1),
      right: z.number().min(0).max(3).default(1)
    }),
    columns: z.number().min(1).max(4).default(1),
    columnGap: z.number().min(0.25).max(2).default(0.5)
  }).optional(),
  headerStyle: z.object({
    fontFamily: z.string(),
    fontSize: z.number(),
    color: z.string()
  }).optional(),
  footerStyle: z.object({
    fontFamily: z.string(),
    fontSize: z.number(),
    color: z.string()
  }).optional(),
  tocStyle: z.object({
    showPageNumbers: z.boolean(),
    indentSize: z.number()
  }).optional()
});

const PDFSecuritySchema = z.object({
  encrypt: z.boolean().default(false),
  userPassword: z.string().min(4).max(32).optional(),
  ownerPassword: z.string().min(4).max(32).optional(),
  permissions: z.object({
    print: z.enum(['none', 'low', 'high']),
    copy: z.boolean(),
    modify: z.boolean(),
    annotate: z.boolean(),
    formFields: z.boolean(),
    contentAccessibility: z.boolean(),
    documentAssembly: z.boolean()
  }).optional(),
  encryptionLevel: z.union([z.literal(40), z.literal(128), z.literal(256)]).default(128)
});

const PDFOutputConfigSchema = z.object({
  format: z.enum(['pdf', 'pdfa', 'pdfx']).default('pdf'),
  compress: z.boolean().default(true),
  imageQuality: z.number().min(10).max(100).default(85),
  embedFonts: z.boolean().default(true),
  generateTOC: z.boolean().default(true),
  generateBookmarks: z.boolean().default(true),
  outputPath: z.string().optional()
});

export const PDFInputSchema = z.object({
  title: z.string().min(1).max(200),
  subtitle: z.string().max(300).optional(),
  authors: z.array(z.string().min(1)).min(1).max(10),
  organization: z.string().optional(),
  version: z.string().regex(/^\d+\.\d+/).optional(),
  date: z.date().optional(),
  template: z.string().default('standard'),
  sections: z.array(PDFSectionSchema).min(1).max(100),
  styling: PDFStylingSchema.optional(),
  charts: z.array(ChartConfigSchema).optional(),
  diagrams: z.array(DiagramConfigSchema).optional(),
  assets: z.array(AssetReferenceSchema).optional(),
  security: PDFSecuritySchema.optional(),
  output: PDFOutputConfigSchema.optional()
});
```

---

## 4. Component Specifications

### 4.1 PDF Renderer (PDFKit Implementation)

```typescript
// agents/pdf/rendering/pdf-renderer.ts

import PDFDocument from 'pdfkit';
import { logger } from 'src/runtime/logger';
import { PDFInput, PageLayout } from '../types';

export class PDFRenderer {
  private defaultFonts = {
    'Helvetica': 'Helvetica',
    'Helvetica-Bold': 'Helvetica-Bold',
    'Times-Roman': 'Times-Roman',
    'Times-Bold': 'Times-Bold',
    'Courier': 'Courier'
  };

  async createDocument(
    input: PDFInput,
    layoutPlan: LayoutPlan,
    runId: string
  ): Promise<PDFDocument> {
    const doc = new PDFDocument({
      size: this.getPageSize(input.styling?.pageLayout?.pageSize),
      layout: input.styling?.pageLayout?.orientation || 'portrait',
      margins: this.getMargins(input.styling?.pageLayout),
      compress: input.output?.compress ?? true,
      info: {
        Title: input.title,
        Author: input.authors.join(', '),
        Subject: input.subtitle,
        Creator: 'OpenCode Tools PDF Generator',
        Producer: `PDF Generator Agent v${process.env.npm_package_version}`,
        CreationDate: new Date(),
        ModDate: new Date()
      }
    });

    // Register fonts
    await this.registerFonts(doc, input.styling?.fontFamily);

    // Track pages for layout calculations
    let currentPage = doc.addPage();
    
    // Generate cover page
    if (input.sections.length > 0) {
      await this.renderCoverPage(doc, input, runId);
    }

    // Generate table of contents
    if (input.output?.generateTOC ?? true) {
      await this.renderTableOfContents(doc, layoutPlan.toc, runId);
    }

    // Render all sections
    for (const section of input.sections) {
      await this.renderSection(doc, section, input.styling, runId);
    }

    // Add page numbers
    this.addPageNumbers(doc, input.styling);

    return doc;
  }

  private async renderCoverPage(
    doc: PDFDocument,
    input: PDFInput,
    runId: string
  ): Promise<void> {
    const page = doc.page;
    const { width, height } = page;
    
    // Background color
    if (input.styling?.primaryColor) {
      doc.rect(0, 0, width, height)
        .fill(input.styling.primaryColor);
    }

    // Title (centered, large)
    doc.fillColor('#FFFFFF')
      .fontSize(36)
      .text(input.title, 0, height * 0.35, {
        align: 'center',
        width: width - 100
      });

    // Subtitle
    if (input.subtitle) {
      doc.moveDown()
        .fontSize(18)
        .fillColor('#FFFFFF')
        .text(input.subtitle, {
          align: 'center',
          width: width - 100
        });
    }

    // Authors
    doc.moveDown(3)
      .fontSize(12)
      .fillColor('#FFFFFF')
      .text(input.authors.join(', '), {
        align: 'center',
        width: width - 100
      });

    // Organization
    if (input.organization) {
      doc.moveDown()
        .fontSize(10)
        .text(input.organization, {
          align: 'center',
          width: width - 100
        });
    }

    // Date and version
    doc.moveDown()
      .fontSize(10)
      .text(`Version ${input.version || '1.0'} | ${this.formatDate(input.date || new Date())}`, {
        align: 'center',
        width: width - 100
      });

    doc.fillColor('#000000');
  }

  private async renderSection(
    doc: PDFDocument,
    section: PDFSection,
    styling?: PDFStyling,
    runId?: string
  ): Promise<void> {
    // Page break if needed
    if (doc.y > doc.page.height - 200) {
      doc.addPage();
    }

    // Section title
    doc.fillColor(styling?.primaryColor || '#000000')
      .fontSize(this.getTitleFontSize(section.level))
      .text(section.title, {
        underline: false,
        indent: (section.level - 1) * 20
      });

    doc.moveDown(0.5);

    // Section content (supports Markdown conversion)
    doc.fillColor('#000000')
      .fontSize(styling?.fontSize || 12)
      .font(styling?.fontFamily || 'Helvetica')
      .text(this.parseMarkdown(section.content), {
        lineGap: (styling?.lineHeight || 1.5) * 4,
        align: 'justify'
      });

    // Render embedded charts
    if (section.charts) {
      for (const chart of section.charts) {
        await this.renderChart(doc, chart, runId);
      }
    }

    // Render embedded diagrams
    if (section.diagrams) {
      for (const diagram of section.diagrams) {
        await this.renderDiagram(doc, diagram, runId);
      }
    }

    doc.moveDown();
  }

  private async renderChart(
    doc: PDFDocument,
    chart: ChartConfig,
    runId?: string
  ): Promise<void> {
    // Chart rendering logic
    const chartBuffer = await this.chartRenderer.renderToBuffer(chart, runId);
    
    doc.image(chartBuffer, {
      fit: [400, 300],
      align: 'center'
    });

    // Chart title
    doc.fontSize(10)
      .fillColor('#666666')
      .text(chart.title, {
        align: 'center'
      });
  }

  private async renderDiagram(
    doc: PDFDocument,
    diagram: DiagramConfig,
    runId?: string
  ): Promise<void> {
    const svgBuffer = await this.diagramEngine.renderToSVG(diagram, runId);
    
    doc.image(svgBuffer, {
      fit: [500, 400],
      align: 'center'
    });

    doc.fontSize(10)
      .fillColor('#666666')
      .text(diagram.title, {
        align: 'center'
      });
  }

  private addPageNumbers(doc: PDFDocument, styling?: PDFStyling): void {
    const pages = doc.bufferedPageRange();
    
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      
      const pageNum = i + 1;
      const totalPages = pages.count;
      
      // Don't number cover page
      if (i === 0) continue;

      doc.fontSize(9)
        .fillColor(styling?.footerStyle?.color || '#666666')
        .font(styling?.footerStyle?.fontFamily || 'Helvetica')
        .text(
          `${pageNum}`,
          0,
          doc.page.height - 50,
          {
            align: 'center',
            width: doc.page.width
          }
        );
    }
  }

  private async registerFonts(
    doc: PDFDocument,
    customFont?: string
  ): Promise<void> {
    // Register default fonts
    for (const [name, path] of Object.entries(this.defaultFonts)) {
      doc.registerFont(name, path);
    }

    // Register custom fonts if provided
    if (customFont) {
      await this.loadCustomFont(doc, customFont);
    }
  }

  private async encrypt(
    pdfBuffer: Buffer,
    security: PDFSecurity
  ): Promise<Buffer> {
    // Use PDF-lib for encryption
    const PDFLib = await import('pdf-lib');
    const pdfDoc = await PDFLib.PDFDocument.load(pdfBuffer);
    
    // Set permissions
    const permissions = new PDFLib.PDFPermissions({
      printing: security.permissions?.print || 'highResolution',
      modifying: security.permissions?.modify || true,
      copying: security.permissions?.copy || true,
      annotating: security.permissions?.annotating || true,
      fillingForms: security.permissions?.formFields || true,
      contentAccessibility: security.permissions?.contentAccessibility || true,
      documentAssembly: security.permissions?.documentAssembly || true
    });

    // Encrypt document
    await pdfDoc.encrypt({
      userPassword: security.userPassword,
      ownerPassword: security.ownerPassword,
      permissions,
      encryptionLevel: security.encryptionLevel === 256 
        ? PDFLib.EncryptionVersion AES256 
        : PDFLib.EncryptionVersion.RC4128
    });

    return await pdfDoc.save();
  }

  private getPageSize(size: string = 'Letter'): string | number[] {
    const sizes: Record<string, string | number[]> = {
      'A4': 'A4',
      'Letter': 'Letter',
      'Legal': 'Legal'
    };
    return sizes[size] || 'Letter';
  }

  private getMargins(layout?: PageLayout): { top: number; bottom: number; left: number; right: number } {
    return {
      top: layout?.margins?.top ?? 72,
      bottom: layout?.margins?.bottom ?? 72,
      left: layout?.margins?.left ?? 72,
      right: layout?.margins?.right ?? 72
    };
  }

  private getTitleFontSize(level: number): number {
    const sizes = { 1: 24, 2: 18, 3: 14, 4: 12 };
    return sizes[level] || 12;
  }

  private parseMarkdown(content: string): string {
    // Simple markdown to plain text conversion
    // For full rendering, integrate marked or markdown-it
    return content
      .replace(/^### (.*$)/gm, '$1')
      .replace(/^## (.*$)/gm, '$1')
      .replace(/^# (.*$)/gm, '$1')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`{3}[\s\S]*?`{3}/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .trim();
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  async save(pdfBuffer: Buffer, outputPath: string): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const fullPath = path.join(process.cwd(), outputPath);
    const dir = path.dirname(fullPath);
    
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, pdfBuffer);
    
    logger.info('PDF file saved', { path: outputPath });
  }

  async getPageCount(pdfPath: string): Promise<number> {
    // Implementation to read PDF page count
    return 0;
  }
}
```

### 4.2 Chart Renderer

```typescript
// agents/pdf/graphics/chart-renderer.ts

import { ChartConfiguration } from 'chart.js';
import { createCanvas } from 'canvas';
import { logger } from 'src/runtime/logger';

export class ChartRenderer {
  async render(chartConfig: ChartConfig, runId: string): Promise<Buffer> {
    const buffer = await this.renderToBuffer(chartConfig, runId);
    
    // Save chart image
    await this.saveChart(chartConfig.id, buffer, runId);
    
    return buffer;
  }

  async renderToBuffer(chartConfig: ChartConfig, runId?: string): Promise<Buffer> {
    const canvas = createCanvas(800, 600);
    const ctx = canvas.getContext('2d');

    // Configure chart based on type
    const chart = this.createChart(ctx, chartConfig);
    
    // Render chart
    await chart.render();
    
    // Convert to buffer
    return canvas.toBuffer('image/png', { compressionLevel: 9 });
  }

  private createChart(ctx: CanvasRenderingContext2D, config: ChartConfig): any {
    // Using canvas library for chart rendering
    // Alternatively, use chart.js with node-canvas
    const ChartJS = require('chart.js');
    const chartJS = new ChartJS(ctx, {
      type: config.type,
      data: config.data,
      options: {
        responsive: false,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          title: {
            display: config.options?.plugins?.title?.display || false,
            text: config.options?.plugins?.title?.text || ''
          },
          legend: {
            display: config.options?.plugins?.legend?.display || true,
            position: config.options?.plugins?.legend?.position || 'top'
          }
        }
      }
    });

    return chartJS;
  }

  private async saveChart(chartId: string, buffer: Buffer, runId: string): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const chartDir = path.join(process.cwd(), 'temp', 'charts', runId);
    await fs.mkdir(chartDir, { recursive: true });
    
    const chartPath = path.join(chartDir, `${chartId}.png`);
    await fs.writeFile(chartPath, buffer);
    
    logger.info('Chart saved', { chartId, path: chartPath });
  }
}
```

### 4.3 Diagram Engine (Mermaid Integration)

```typescript
// agents/pdf/graphics/diagram-engine.ts

import mermaid from 'mermaid';
import { logger } from 'src/runtime/logger';

export class DiagramEngine {
  constructor() {
    // Initialize Mermaid
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis'
      },
      sequence: {
        mirrorActors: false,
        bottomMarginAdj: 1
      },
      gantt: {
        titleTopMargin: 25,
        barHeight: 20,
        barGap: 4,
        topPadding: 50,
        sidePadding: 75
      }
    });
  }

  async render(diagramConfig: DiagramConfig, runId: string): Promise<void> {
    const svg = await this.renderToSVG(diagramConfig, runId);
    
    // Save diagram
    await this.saveDiagram(diagramConfig.id, svg, runId);
  }

  async renderToSVG(diagramConfig: DiagramConfig, runId?: string): Promise<string> {
    const { svg } = await mermaid.render(
      `diagram-${diagramConfig.id}`,
      diagramConfig.definition
    );

    return svg;
  }

  private async saveDiagram(diagramId: string, svg: string, runId: string): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const diagramDir = path.join(process.cwd(), 'temp', 'diagrams', runId);
    await fs.mkdir(diagramDir, { recursive: true });
    
    const diagramPath = path.join(diagramDir, `${diagramId}.svg`);
    await fs.writeFile(diagramPath, svg);
    
    logger.info('Diagram saved', { diagramId, path: diagramPath });
  }

  async convertSVGtoPNG(svg: string, width: number, height: number): Promise<Buffer> {
    // Use sharp or svgo for SVG to PNG conversion
    const sharp = require('sharp');
    
    return await sharp(Buffer.from(svg))
      .resize(width, height, { fit: 'contain' })
      .png()
      .toBuffer();
  }
}
```

### 4.4 Asset Manager

```typescript
// agents/pdf/assets/asset-manager.ts

import sharp from 'sharp';
import { logger } from 'src/runtime/logger';

export interface AssetConfig {
  id: string;
  type: 'image' | 'font' | 'logo' | 'icon' | 'watermark';
  source: string;
  alt?: string;
  width?: number;
  height?: number;
  quality?: number;
}

export class AssetManager {
  async process(asset: AssetConfig, runId: string): Promise<ProcessedAsset> {
    logger.info('Processing asset', { assetId: asset.id, type: asset.type });
    
    switch (asset.type) {
      case 'image':
        return await this.processImage(asset, runId);
      case 'font':
        return await this.processFont(asset, runId);
      case 'logo':
        return await this.processLogo(asset, runId);
      case 'icon':
        return await this.processIcon(asset, runId);
      case 'watermark':
        return await this.processWatermark(asset, runId);
      default:
        throw new Error(`Unknown asset type: ${asset.type}`);
    }
  }

  private async processImage(asset: AssetConfig, runId: string): Promise<ProcessedAsset> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    let imageBuffer: Buffer;
    
    // Load image from source
    if (asset.source.startsWith('http')) {
      // Fetch from URL
      const response = await fetch(asset.source);
      imageBuffer = Buffer.from(await response.arrayBuffer());
    } else {
      // Load from file
      const fullPath = path.isAbsolute(asset.source)
        ? asset.source
        : path.join(process.cwd(), asset.source);
      imageBuffer = await fs.readFile(fullPath);
    }

    // Optimize image
    const optimizedBuffer = await sharp(imageBuffer)
      .resize(asset.width, asset.height, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: asset.quality || 85 })
      .toBuffer();

    // Save optimized image
    const assetDir = path.join(process.cwd(), 'temp', 'assets', runId);
    await fs.mkdir(assetDir, { recursive: true });
    
    const assetPath = path.join(assetDir, `${asset.id}.jpg`);
    await fs.writeFile(assetPath, optimizedBuffer);

    return {
      id: asset.id,
      type: asset.type,
      path: assetPath,
      width: asset.width,
      height: asset.height,
      format: 'jpeg'
    };
  }

  private async processFont(asset: AssetConfig, runId: string): Promise<ProcessedAsset> {
    // Register font for embedding
    return {
      id: asset.id,
      type: asset.type,
      path: asset.source,
      fontFamily: asset.id,
      fontWeight: 'normal',
      fontStyle: 'normal'
    };
  }

  private async processLogo(asset: AssetConfig, runId: string): Promise<ProcessedAsset> {
    // Process logo with transparency support
    const fs = await import('fs/promises');
    const path = await import('path');
    
    let imageBuffer: Buffer;
    
    if (asset.source.startsWith('http')) {
      const response = await fetch(asset.source);
      imageBuffer = Buffer.from(await response.arrayBuffer());
    } else {
      const fullPath = path.isAbsolute(asset.source)
        ? asset.source
        : path.join(process.cwd(), asset.source);
      imageBuffer = await fs.readFile(fullPath);
    }

    // Optimize for print quality
    const optimizedBuffer = await sharp(imageBuffer)
      .resize(asset.width || 200, asset.height || 200, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png({ quality: asset.quality || 95 })
      .toBuffer();

    const assetDir = path.join(process.cwd(), 'temp', 'assets', runId);
    await fs.mkdir(assetDir, { recursive: true });
    
    const assetPath = path.join(assetDir, `${asset.id}.png`);
    await fs.writeFile(assetPath, optimizedBuffer);

    return {
      id: asset.id,
      type: asset.type,
      path: assetPath,
      width: asset.width || 200,
      height: asset.height || 200,
      format: 'png'
    };
  }

  private async processIcon(asset: AssetConfig, runId: string): Promise<ProcessedAsset> {
    // Process icons as vector or high-quality raster
    return await this.processImage(asset, runId);
  }

  private async processWatermark(asset: AssetConfig, runId: string): Promise<ProcessedAsset> {
    // Create watermark overlay
    return await this.processImage(asset, runId);
  }
}
```

### 4.5 Template Engine

```typescript
// agents/pdf/templating/template-engine.ts

import Handlebars from 'handlebars';
import { logger } from 'src/runtime/logger';

export class TemplateEngine {
  private templates: Map<string, Handlebars.TemplateDelegate> = new Map();

  constructor() {
    this.registerDefaultTemplates();
  }

  private registerDefaultTemplates(): void {
    // Standard document template
    this.registerTemplate('standard', `
{{#* inline "header" }}
<header>
  <div class="logo">{{ organization }}</div>
  <div class="document-title">{{ title }}</div>
</header>
{{/inline }}

{{#* inline "footer" }}
<footer>
  <div class="page-number">Page {{page}} of {{pages}}</div>
</footer>
{{/inline }}

<!DOCTYPE html>
<html>
<head>
  <title>{{ title }}</title>
  <style>
    body {
      font-family: {{ fontFamily }};
      font-size: {{ fontSize }}pt;
      line-height: {{ lineHeight }};
      color: {{ textColor }};
      margin: {{ marginTop }}in {{ marginRight }}in {{ marginBottom }}in {{ marginLeft }}in;
    }
    .cover {
      page: cover;
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: {{ primaryColor }};
      color: white;
    }
    h1 { font-size: 36pt; margin-bottom: 24pt; }
    h2 { font-size: 24pt; margin-top: 18pt; margin-bottom: 12pt; }
    h3 { font-size: 18pt; margin-top: 14pt; margin-bottom: 10pt; }
    .content { page-break-after: always; }
    .toc { page-break-after: always; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 8pt; text-align: left; }
    th { background: {{ secondaryColor }}; color: white; }
  </style>
</head>
<body>
  <div class="cover">
    <h1>{{ title }}</h1>
    {{#if subtitle}}<p>{{ subtitle }}</p>{{/if}}
    <p>{{ authors }}</p>
    {{#if organization}}<p>{{ organization }}</p>{{/if}}
  </div>

  <div class="content">
    {{{ body }}}
  </div>
</body>
</html>
    `);

    // Whitepaper template (enhanced)
    this.registerTemplate('whitepaper', `
{{#* inline "header" }}
<header class="whitepaper-header">
  <div class="brand">{{ organization }}</div>
  <div class="meta">{{ title }} | Version {{ version }}</div>
</header>
{{/inline }}

<!-- Whitepaper-specific styling and structure -->
    `);

    // Technical documentation template
    this.registerTemplate('technical', `
{{#* inline "header" }}
<header class="tech-header">
  <div class="navigation">
    <span>{{ title }}</span>
    <span class="version">v{{ version }}</span>
  </div>
</header>
{{/inline }}

<!-- Technical documentation structure -->
    `);
  }

  registerTemplate(name: string, source: string): void {
    const template = Handlebars.compile(source);
    this.templates.set(name, template);
    
    logger.info('Template registered', { name });
  }

  async render(
    templateName: string,
    data: Record<string, any>
  ): Promise<string> {
    const template = this.templates.get(templateName);
    
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    return template(data);
  }

  async renderSection(
    section: PDFSection,
    context: Record<string, any>
  ): Promise<string> {
    // Render individual section
    return '';
  }
}
```

### 4.6 Layout Engine

```typescript
// agents/pdf/layout/layout-engine.ts

import { logger } from 'src/runtime/logger';

export class LayoutEngine {
  async calculateLayout(
    input: PDFInput,
    runId: string
  ): Promise<LayoutPlan> {
    logger.info('Calculating layout', { runId });
    
    // Calculate page count based on content
    const pageCount = this.estimatePageCount(input);
    
    // Calculate TOC entries
    const toc = this.generateTOC(input.sections);
    
    // Calculate running headers
    const runningHeaders = this.generateRunningHeaders(input.sections);

    return {
      pageCount,
      toc,
      runningHeaders,
      pageBreaks: this.calculatePageBreaks(input),
      columnLayouts: this.calculateColumnLayouts(input)
    };
  }

  private estimatePageCount(input: PDFInput): number {
    // Estimate pages based on content length
    const charsPerPage = 3000; // Approximate characters per page
    const totalChars = input.sections.reduce(
      (sum, section) => sum + section.content.length,
      0
    );

    // Add pages for charts and diagrams
    const mediaPages = (input.charts?.length || 0) + (input.diagrams?.length || 0);

    // Add pages for front matter and TOC
    const frontMatterPages = 2;

    return Math.ceil(totalChars / charsPerPage) + mediaPages + frontMatterPages;
  }

  private generateTOC(sections: PDFSection[]): TOCEntry[] {
    const entries: TOCEntry[] = [];

    for (const section of sections) {
      entries.push({
        id: section.id,
        title: section.title,
        level: section.level,
        page: 0 // Will be calculated during rendering
      });

      // Recursively add subsections if needed
    }

    return entries;
  }

  private generateRunningHeaders(sections: PDFSection[]): RunningHeader[] {
    const headers: RunningHeader[] = [];

    for (const section of sections) {
      headers.push({
        sectionId: section.id,
        text: section.title,
        level: section.level
      });
    }

    return headers;
  }

  private calculatePageBreaks(input: PDFInput): PageBreak[] {
    const breaks: PageBreak[] = [];

    // Force page break before major sections
    let currentPage = 0;
    for (const section of input.sections) {
      if (section.level === 1) {
        breaks.push({
          before: section.id,
          page: currentPage
        });
      }
    }

    return breaks;
  }

  private calculateColumnLayouts(input: PDFInput): ColumnLayout[] {
    const layouts: ColumnLayout[] = [];
    const columns = input.styling?.pageLayout?.columns || 1;
    const gap = input.styling?.pageLayout?.columnGap || 0.5;

    // Calculate column widths based on page width and margins
    const pageWidth = 8.5 - 
      (input.styling?.pageLayout?.margins?.left || 1) - 
      (input.styling?.pageLayout?.margins?.right || 1);
    
    const columnWidth = (pageWidth - (columns - 1) * gap) / columns;

    layouts.push({
      columns,
      columnWidth,
      gap
    });

    return layouts;
  }
}
```

---

## 5. Dependencies and Packages

### 5.1 Required NPM Packages

```json
{
  "dependencies": {
    // PDF Generation
    "pdfkit": "^0.14.0",
    "pdf-lib": "^1.17.1",
    
    // HTML/CSS Rendering (for complex layouts)
    "puppeteer": "^21.0.0",
    
    // Chart Generation
    "chart.js": "^4.4.0",
    "node-canvas": "^2.9.3",
    
    // Diagram Generation
    "mermaid": "^10.6.0",
    
    // Image Processing
    "sharp": "^0.33.0",
    
    // Template Engine
    "handlebars": "^4.7.8",
    
    // Font Management
    "@pdf-lib/fontkit": "^1.1.1",
    
    // Typography
    "opentype.js": "^1.3.4",
    
    // Security
    "node-rsa": "^1.1.1"
  },
  
  "devDependencies": {
    "@types/pdfkit": "^0.13.2",
    "@types/node-rsa": "^1.1.4",
    "@types/chart.js": "^2.9.41"
  }
}
```

### 5.2 Installation Command

```bash
npm install pdfkit pdf-lib puppeteer chart.js node-canvas mermaid sharp handlebars @pdf-lib/fontkit opentype.js node-rsa @types/pdfkit @types/node-rsa @types/chart.js
```

---

## 6. Integration with Existing Systems

### 6.1 Agent Registration

```typescript
// src/tui-agents/index.ts

import { TUIResearchAgent } from './tui-agents/tui-research-agent';
import { TUIPDFAgent } from './tui-agents/tui-pdf-agent';

export const TUITools = [
  {
    id: 'research-agent',
    name: 'Research Agent',
    description: 'Gather comprehensive intelligence on any company, industry, or technology',
    handler: async (options: any) => {
      const agent = new TUIResearchAgent();
      await agent.runInteractive();
    },
    modes: ['interactive', 'programmatic']
  },
  {
    id: 'pdf-generator-agent',
    name: 'PDF Generator Agent',
    description: 'Generate professional Fortune-500 level PDF documents with charts, diagrams, and enterprise styling',
    handler: async (options: any) => {
      const agent = new TUIPDFAgent();
      await agent.runInteractive();
    },
    modes: ['interactive', 'programmatic']
  },
  // ... existing tools
];
```

### 6.2 TUI Integration

```typescript
// src/tui-agents/tui-pdf-agent.ts

import readline from 'readline';
import { PDFGeneratorAgent } from 'agents/pdf/pdf-agent';
import { Database } from 'src/database';
import { AuditService } from 'src/runtime/audit';
import { logger } from 'src/runtime/logger';

export class TUIPDFAgent {
  private db: Database;
  private audit: AuditService;
  private agent: PDFGeneratorAgent;

  constructor() {
    this.db = new Database();
    this.audit = new AuditService();
    this.agent = new PDFGeneratorAgent(this.db, this.audit);
  }

  async runInteractive(): Promise<void> {
    console.clear();
    this.displayHeader();
    
    const input = await this.gatherInput();
    const result = await this.agent.execute(input);
    
    this.displayResults(result);
  }

  private displayHeader(): void {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║         PDF Generator Agent - Fortune-500 Edition      ║');
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log('║  Generate professional PDFs with charts, diagrams,      ║');
    console.log('║  and enterprise-grade styling for whitepapers,          ║');
    console.log('║  client documentation, and presentation materials.      ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('');
  }

  private async gatherInput(): Promise<PDFInput> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const ask = (question: string): Promise<string> => {
      return new Promise(resolve => {
        rl.question(question, answer => resolve(answer));
      });
    };

    // Gather document information
    const title = await ask('📄 Document Title: ');
    const subtitle = await ask('📝 Subtitle (optional): ');
    const authorsStr = await ask('👤 Authors (comma-separated): ');
    const authors = authorsStr.split(',').map(a => a.trim());
    const organization = await ask('🏢 Organization (optional): ');
    const version = await ask('🔢 Version (default 1.0): ') || '1.0';
    const template = await this.selectTemplate();

    console.log('\n📊 Now let\'s add sections...\n');
    const sections = await this.gatherSections();

    // Optionally add charts and diagrams
    const hasCharts = await this.confirm('Would you like to add charts? (y/n) ');
    const charts = hasCharts ? await this.gatherCharts() : [];

    const hasDiagrams = await this.confirm('Would you like to add diagrams? (y/n) ');
    const diagrams = hasDiagrams ? await this.gatherDiagrams() : [];

    const hasAssets = await this.confirm('Would you like to add assets (images, logos)? (y/n) ');
    const assets = hasAssets ? await this.gatherAssets() : [];

    // Styling options
    const styling = await this.gatherStyling();

    // Security options
    const hasSecurity = await this.confirm('Would you like to encrypt the PDF? (y/n) ');
    const security = hasSecurity ? await this.gatherSecurity() : undefined;

    rl.close();

    return {
      title,
      subtitle: subtitle || undefined,
      authors,
      organization: organization || undefined,
      version,
      template,
      sections,
      charts,
      diagrams,
      assets,
      styling,
      security
    };
  }

  private async selectTemplate(): Promise<string> {
    console.log('\n📋 Available Templates:');
    console.log('  1. Standard - Professional multi-page document');
    console.log('  2. Whitepaper - Enhanced cover and section styling');
    console.log('  3. Technical - Code-focused with navigation aids');
    
    const choice = await this.askNumber('Select template (1-3): ', 1, 3);
    
    const templates = ['standard', 'whitepaper', 'technical'];
    return templates[choice - 1];
  }

  private async gatherSections(): Promise<PDFSection[]> {
    const sections: PDFSection[] = [];
    let addMore = true;

    while (addMore) {
      const title = await this.ask('  📑 Section Title: ');
      const level = await this.selectSectionLevel();
      const content = await this.askMultiline('  📄 Section Content (use \\n for line breaks): ');

      sections.push({
        id: `section-${sections.length + 1}`,
        title,
        level,
        content: content.replace(/\\n/g, '\n')
      });

      addMore = await this.confirm('  Add another section? (y/n) ');
    }

    return sections;
  }

  private async selectSectionLevel(): Promise<1 | 2 | 3 | 4> {
    console.log('    Section Levels:');
    console.log('    1. H1 - Major Section');
    console.log('    2. H2 - Subsection');
    console.log('    3. H3 - Sub-subsection');
    console.log('    4. H4 - Minor heading');

    const level = await this.askNumber('    Select level (1-4): ', 1, 4);
    return level as 1 | 2 | 3 | 4;
  }

  private async gatherCharts(): Promise<ChartConfig[]> {
    const charts: ChartConfig[] = [];
    let addMore = true;

    console.log('\n  📊 Chart Configuration:\n');

    while (addMore) {
      const type = await this.selectChartType();
      const title = await this.ask('    Chart Title: ');
      
      // Simplified chart config (would use interactive chart builder)
      const chart: ChartConfig = {
        id: `chart-${charts.length + 1}`,
        type,
        title,
        data: {
          labels: [],
          datasets: []
        },
        options: {
          responsive: true,
          maintainAspectRatio: true
        }
      };

      charts.push(chart);
      addMore = await this.confirm('    Add another chart? (y/n) ');
    }

    return charts;
  }

  private async selectChartType(): Promise<ChartType> {
    console.log('    Chart Types:');
    console.log('    1. Bar');
    console.log('    2. Line');
    console.log('    3. Pie');
    console.log('    4. Doughnut');
    console.log('    5. Radar');

    const choice = await this.askNumber('    Select type (1-5): ', 1, 5);
    
    const types: ChartType[] = ['bar', 'line', 'pie', 'doughnut', 'radar'];
    return types[choice - 1];
  }

  private async gatherDiagrams(): Promise<DiagramConfig[]> {
    const diagrams: DiagramConfig[] = [];
    let addMore = true;

    console.log('\n  🔀 Diagram Configuration:\n');

    while (addMore) {
      const type = await this.selectDiagramType();
      const title = await this.ask('    Diagram Title: ');
      const definition = await this.askMultiline('    Mermaid Definition:\n    (e.g., graph TD; A→B; B→C;)\n    ');

      diagrams.push({
        id: `diagram-${diagrams.length + 1}`,
        type,
        title,
        definition
      });

      addMore = await this.confirm('    Add another diagram? (y/n) ');
    }

    return diagrams;
  }

  private async selectDiagramType(): Promise<DiagramType> {
    console.log('    Diagram Types:');
    console.log('    1. Flowchart');
    console.log('    2. Sequence Diagram');
    console.log('    3. Gantt Chart');
    console.log('    4. Class Diagram');
    console.log('    5. State Diagram');

    const choice = await this.askNumber('    Select type (1-5): ', 1, 5);
    
    const types: DiagramType[] = ['flowchart', 'sequence', 'gantt', 'class', 'state'];
    return types[choice - 1];
  }

  private async gatherAssets(): Promise<AssetReference[]> {
    const assets: AssetReference[] = [];
    let addMore = true;

    console.log('\n  🖼️ Asset Configuration:\n');

    while (addMore) {
      const type = await this.selectAssetType();
      const source = await this.ask('    File path or URL: ');

      assets.push({
        id: `asset-${assets.length + 1}`,
        type,
        source
      });

      addMore = await this.confirm('    Add another asset? (y/n) ');
    }

    return assets;
  }

  private async selectAssetType(): Promise<'image' | 'font' | 'logo' | 'icon' | 'watermark'> {
    console.log('    Asset Types:');
    console.log('    1. Image');
    console.log('    2. Font');
    console.log('    3. Logo');
    console.log('    4. Icon');
    console.log('    5. Watermark');

    const choice = await this.askNumber('    Select type (1-5): ', 1, 5);
    
    const types: Array<'image' | 'font' | 'logo' | 'icon' | 'watermark'> = 
      ['image', 'font', 'logo', 'icon', 'watermark'];
    return types[choice - 1];
  }

  private async gatherStyling(): Promise<PDFStyling> {
    console.log('\n  🎨 Styling Configuration:\n');

    const primaryColor = await this.ask('    Primary Color (hex, e.g., #1a365d): ') || '#1a365d';
    const secondaryColor = await this.ask('    Secondary Color (hex, e.g., #2c5282): ') || '#2c5282';
    const accentColor = await this.ask('    Accent Color (hex, e.g., #ed8936): ') || '#ed8936';
    
    console.log('    Page Layout Options:');
    const pageSize = await this.selectPageSize();
    const orientation = await this.selectOrientation();
    const columns = await this.askNumber('    Number of columns (1-3): ', 1, 3);

    return {
      primaryColor,
      secondaryColor,
      accentColor,
      pageLayout: {
        pageSize,
        orientation,
        columns,
        margins: { top: 1, bottom: 1, left: 1, right: 1 }
      }
    };
  }

  private async selectPageSize(): Promise<'A4' | 'Letter' | 'Legal'> {
    console.log('    Page Sizes:');
    console.log('    1. A4 (210 × 297 mm)');
    console.log('    2. Letter (8.5 × 11 in)');
    console.log('    3. Legal (8.5 × 14 in)');

    const choice = await this.askNumber('    Select size (1-3): ', 1, 3);
    
    const sizes: Array<'A4' | 'Letter' | 'Legal'> = ['A4', 'Letter', 'Legal'];
    return sizes[choice - 1];
  }

  private async selectOrientation(): Promise<'portrait' | 'landscape'> {
    const choice = await this.confirm('    Use landscape orientation? (y/n) ');
    return choice ? 'landscape' : 'portrait';
  }

  private async gatherSecurity(): Promise<PDFSecurity> {
    console.log('\n  🔐 Security Configuration:\n');

    const userPassword = await this.ask('    User Password (required for opening): ');
    const ownerPassword = await this.ask('    Owner Password (for permissions): ');
    
    console.log('    Permissions:');
    const print = await this.selectPrintPermission();
    const copy = await this.confirm('    Allow copying? (y/n) ');
    const modify = await this.confirm('    Allow modifying? (y/n) ');
    const annotate = await this.confirm('    Allow annotations? (y/n) ');

    return {
      encrypt: true,
      userPassword,
      ownerPassword,
      permissions: {
        print,
        copy,
        modify,
        annotate,
        formFields: modify,
        contentAccessibility: true,
        documentAssembly: true
      },
      encryptionLevel: 256
    };
  }

  private async selectPrintPermission(): Promise<'none' | 'low' | 'high'> {
    console.log('    Print Permissions:');
    console.log('    1. None');
    console.log('    2. Low Resolution');
    console.log('    3. High Resolution');

    const choice = await this.askNumber('    Select (1-3): ', 1, 3);
    
    const permissions: Array<'none' | 'low' | 'high'> = ['none', 'low', 'high'];
    return permissions[choice - 1];
  }

  private async ask(question: string): Promise<string> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise(resolve => {
      rl.question(question, answer => {
        rl.close();
        resolve(answer);
      });
    });
  }

  private async askNumber(question: string, min: number, max: number): Promise<number> {
    let valid = false;
    let value = 0;

    while (!valid) {
      const answer = await this.ask(question);
      value = parseInt(answer);
      valid = !isNaN(value) && value >= min && value <= max;
      
      if (!valid) {
        console.log(`    Please enter a number between ${min} and ${max}`);
      }
    }

    return value;
  }

  private async askMultiline(question: string): Promise<string> {
    console.log(question);
    console.log('    (Enter your text, then press Ctrl+D on a new line when done)');
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const lines: string[] = [];
    
    rl.on('line', (line) => {
      lines.push(line);
    });

    return new Promise(resolve => {
      rl.on('close', () => {
        rl.close();
        resolve(lines.join('\n'));
      });
    });
  }

  private async confirm(question: string): Promise<boolean> {
    const answer = await this.ask(question);
    return answer.toLowerCase().startsWith('y');
  }

  private displayResults(result: PDFOutput): void {
    console.clear();
    console.log('\n✅ PDF Generation Complete!\n');
    console.log('═'.repeat(60));
    console.log(`📄 Document: ${result.metadata.title}`);
    console.log(`👤 Authors: ${result.metadata.authors.join(', ')}`);
    console.log(`📅 Created: ${result.metadata.creationDate}`);
    console.log(`📊 Pages: ${result.metadata.pageCount}`);
    console.log(`💾 Size: ${(result.metadata.fileSize / 1024).toFixed(2)} KB`);
    console.log('═'.repeat(60));
    console.log(`\n📁 Output: ${result.documentPath}\n`);
    console.log('Options:');
    console.log('  1. Open PDF');
    console.log('  2. Generate Another PDF');
    console.log('  3. Return to Main Menu');
    
    const choice = await this.askNumber('Select option: ', 1, 3);
    
    if (choice === 1) {
      // Open PDF in default viewer
      const { exec } = await import('child_process');
      exec(`start "" "${result.documentPath}"`);
    } else if (choice === 2) {
      await this.runInteractive();
    }
  }
}
```

### 6.3 Governance Integration

```typescript
// agents/pdf/governance/pdf-gatekeeper.ts

export class PDFGatekeeper {
  evaluate(pdfBuffer: Buffer, input: PDFInput): GatekeeperResult {
    const reasons: string[] = [];
    let score = 0;

    // Check minimum content
    if (input.sections.length < 1) {
      reasons.push('Document must have at least one section');
    } else {
      score += 25;
    }

    // Check document length
    if (pdfBuffer.length > 50000) {
      score += 25;
    } else {
      reasons.push('Document appears too short (< 50KB)');
    }

    // Check for required metadata
    if (!input.title || input.title.length < 5) {
      reasons.push('Document title must be at least 5 characters');
    } else {
      score += 25;
    }

    // Check author information
    if (input.authors && input.authors.length > 0) {
      score += 25;
    } else {
      reasons.push('Document must have at least one author');
    }

    return {
      passed: reasons.length === 0,
      score,
      reasons
    };
  }
}
```

### 6.4 Audit Trail Integration

```typescript
// agents/pdf/audit/pdf-audit.ts

import { AuditService } from 'src/runtime/audit';

export class PDFGenerationAudit {
  constructor(private audit: AuditService) {}

  async logGenerationStart(input: PDFInput, runId: string): Promise<void> {
    await this.audit.log({
      runId,
      action: 'pdf_generation_started',
      agent: 'pdf-generator-agent',
      details: {
        title: input.title,
        sections: input.sections.length,
        charts: input.charts?.length || 0,
        diagrams: input.diagrams?.length || 0,
        hasSecurity: !!input.security?.encrypt
      }
    });
  }

  async logGenerationComplete(output: PDFOutput, runId: string): Promise<void> {
    await this.audit.log({
      runId,
      action: 'pdf_generation_completed',
      agent: 'pdf-generator-agent',
      details: {
        documentPath: output.documentPath,
        fileSize: output.metadata.fileSize,
        pageCount: output.metadata.pageCount,
        duration: Date.now()
      }
    });
  }

  async logGenerationError(error: Error, input: PDFInput, runId: string): Promise<void> {
    await this.audit.log({
      runId,
      action: 'pdf_generation_failed',
      agent: 'pdf-generator-agent',
      details: {
        title: input.title,
        error: error.message,
        stack: error.stack
      }
    });
  }
}
```

---

## 7. Testing Strategy

### 7.1 Unit Tests

```typescript
// tests/agents/pdf-agent.test.ts

import { PDFGeneratorAgent } from 'agents/pdf/pdf-agent';
import { MockPDFRenderer } from './mocks/pdf-renderer-mock';
import { MockTemplateEngine } from './mocks/template-engine-mock';
import { MockAssetManager } from './mocks/asset-manager-mock';

describe('PDFGeneratorAgent', () => {
  let agent: PDFGeneratorAgent;
  let mockRenderer: MockPDFRenderer;
  let mockTemplateEngine: MockTemplateEngine;
  let mockAssetManager: MockAssetManager;

  beforeEach(() => {
    mockRenderer = new MockPDFRenderer();
    mockTemplateEngine = new MockTemplateEngine();
    mockAssetManager = new MockAssetManager();

    agent = new PDFGeneratorAgent(
      new MockDatabase(),
      new MockAuditService(),
      {
        pdfRenderer: mockRenderer,
        templateEngine: mockTemplateEngine,
        assetManager: mockAssetManager
      }
    );
  });

  describe('execute', () => {
    it('should generate PDF from valid input', async () => {
      const validInput: PDFInput = {
        title: 'Test Whitepaper',
        subtitle: 'A Comprehensive Guide',
        authors: ['John Doe', 'Jane Smith'],
        organization: 'Test Corp',
        version: '1.0',
        template: 'whitepaper',
        sections: [
          {
            id: 'section-1',
            title: 'Introduction',
            level: 1,
            content: 'This is the introduction content for the whitepaper.'
          },
          {
            id: 'section-2',
            title: 'Overview',
            level: 1,
            content: 'This section provides an overview of the topic.'
          }
        ]
      };

      const result = await agent.execute(validInput);

      expect(result.success).toBe(true);
      expect(result.documentPath).toBeDefined();
      expect(result.metadata.title).toBe('Test Whitepaper');
      expect(result.metadata.authors).toEqual(['John Doe', 'Jane Smith']);
      expect(result.metadata.pageCount).toBeGreaterThan(0);
    });

    it('should throw ValidationError for invalid input', async () => {
      const invalidInput = {
        title: '', // Invalid: empty title
        authors: [] // Invalid: empty authors
      };

      await expect(agent.execute(invalidInput as any))
        .rejects.toThrow(ValidationError);
    });

    it('should render charts when specified', async () => {
      const inputWithCharts: PDFInput = {
        title: 'Report with Charts',
        authors: ['Author'],
        template: 'standard',
        sections: [
          {
            id: 'section-1',
            title: 'Analysis',
            level: 1,
            content: 'See chart below:'
          }
        ],
        charts: [
          {
            id: 'chart-1',
            type: 'bar',
            title: 'Sales Data',
            data: {
              labels: ['Q1', 'Q2', 'Q3', 'Q4'],
              datasets: [{
                label: 'Revenue',
                data: [100, 200, 150, 300],
                backgroundColor: '#1a365d'
              }]
            },
            options: { responsive: true }
          }
        ]
      };

      const result = await agent.execute(inputWithCharts);

      expect(result.success).toBe(true);
      expect(mockRenderer.renderChart).toHaveBeenCalled();
    });

    it('should render diagrams when specified', async () => {
      const inputWithDiagrams: PDFInput = {
        title: 'Technical Documentation',
        authors: ['Tech Writer'],
        template: 'technical',
        sections: [
          {
            id: 'section-1',
            title: 'System Architecture',
            level: 1,
            content: 'The system architecture is shown below:'
          }
        ],
        diagrams: [
          {
            id: 'diagram-1',
            type: 'flowchart',
            title: 'System Flow',
            definition: 'graph TD; A→B; B→C; C→D;'
          }
        ]
      };

      const result = await agent.execute(inputWithDiagrams);

      expect(result.success).toBe(true);
      expect(mockRenderer.renderDiagram).toHaveBeenCalled();
    });

    it('should apply security when specified', async () => {
      const inputWithSecurity: PDFInput = {
        title: 'Confidential Report',
        authors: ['Author'],
        template: 'standard',
        sections: [
          {
            id: 'section-1',
            title: 'Confidential',
            level: 1,
            content: 'This is confidential content.'
          }
        ],
        security: {
          encrypt: true,
          userPassword: 'secure123',
          ownerPassword: 'admin456',
          permissions: {
            print: 'high',
            copy: true,
            modify: false,
            annotate: false,
            formFields: false,
            contentAccessibility: true,
            documentAssembly: true
          },
          encryptionLevel: 256
        }
      };

      const result = await agent.execute(inputWithSecurity);

      expect(result.success).toBe(true);
      expect(mockRenderer.encrypt).toHaveBeenCalled();
    });
  });
});
```

### 7.2 Integration Tests

```typescript
// tests/integration/pdf-generation.test.ts

describe('PDF Generation Integration', () => {
  it('should generate complete PDF with all components', async () => {
    // Test full PDF generation workflow
  });

  it('should handle charts and diagrams correctly', async () => {
    // Test chart and diagram rendering
  });

  it('should produce PDF/A compliant output', async () => {
    // Test PDF/A compliance
  });

  it('should handle large documents efficiently', async () => {
    // Test performance with large documents
  });
});
```

### 7.3 E2E Tests

```typescript
// tests/e2e/pdf-workflow.test.ts

describe('PDF Generator E2E Workflows', () => {
  it('should generate whitepaper from research dossier', async () => {
    // Full workflow from research to PDF
  });

  it('should generate client documentation from templates', async () => {
    // Client documentation workflow
  });

  it('should handle batch PDF generation', async () => {
    // Batch generation workflow
  });
});
```

---

## 8. Error Handling

### 8.1 Custom Error Classes

```typescript
// agents/pdf/errors/pdf-errors.ts

export class BaseError extends Error {
  constructor(
    message: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class PDFGenerationError extends BaseError {
  constructor(
    message: string,
    public context: Record<string, any>,
    public cause?: Error
  ) {
    super(`PDF Generation Error: ${message}`, context);
    this.name = 'PDFGenerationError';
  }
}

export class ValidationError extends BaseError {
  constructor(
    message: string,
    public validationErrors: z.ZodError
  ) {
    super(`Validation Error: ${message}`, { errors: validationErrors.errors });
    this.name = 'ValidationError';
  }
}

export class ChartRenderingError extends BaseError {
  constructor(
    chartId: string,
    message: string,
    public cause?: Error
  ) {
    super(`Chart Rendering Error for ${chartId}: ${message}`, { chartId });
    this.name = 'ChartRenderingError';
  }
}

export class DiagramRenderingError extends BaseError {
  constructor(
    diagramId: string,
    message: string,
    public cause?: Error
  ) {
    super(`Diagram Rendering Error for ${diagramId}: ${message}`, { diagramId });
    this.name = 'DiagramRenderingError';
  }
}

export class AssetProcessingError extends BaseError {
  constructor(
    assetId: string,
    message: string,
    public cause?: Error
  ) {
    super(`Asset Processing Error for ${assetId}: ${message}`, { assetId });
    this.name = 'AssetProcessingError';
  }
}

export class SecurityError extends BaseError {
  constructor(message: string) {
    super(`Security Error: ${message}`, {});
    this.name = 'SecurityError';
  }
}
```

---

## 9. Implementation Roadmap

### Phase 1: Core Infrastructure (Week 1-2)
- [ ] Create agent directory structure
- [ ] Implement PDFRenderer with PDFKit
- [ ] Implement Input Handler with Zod validation
- [ ] Set up basic template system
- [ ] Create unit tests for core components
- [ ] Integrate with existing audit/logging

### Phase 2: Graphics & Charts (Week 2-3)
- [ ] Implement ChartRenderer with Chart.js
- [ ] Implement DiagramEngine with Mermaid
- [ ] Create chart configuration UI
- [ ] Implement diagram rendering pipeline
- [ ] Add image optimization with Sharp
- [ ] Test chart and diagram rendering

### Phase 3: Layout & Typography (Week 3-4)
- [ ] Implement LayoutEngine
- [ ] Create template library (Standard, Whitepaper, Technical)
- [ ] Implement TypographyEngine with font embedding
- [ ] Add page layout system (margins, columns, headers, footers)
- [ ] Implement table of contents generation
- [ ] Add page numbering system

### Phase 4: Security & Output (Week 4-5)
- [ ] Implement PDF encryption with pdf-lib
- [ ] Add permission management
- [ ] Implement output handlers (save, compress)
- [ ] Add PDF/A and PDF/X compliance options
- [ ] Implement batch generation
- [ ] Performance optimization

### Phase 5: TUI Integration (Week 5-6)
- [ ] Create TUI PDF Agent
- [ ] Implement interactive wizard
- [ ] Add chart builder UI
- [ ] Implement diagram builder UI
- [ ] Create asset upload functionality
- [ ] Add styling configuration UI

### Phase 6: Testing & Documentation (Week 6-7)
- [ ] Complete unit test coverage (>75%)
- [ ] Write integration tests
- [ ] Create E2E test suite
- [ ] Write user documentation
- [ ] Create API documentation
- [ ] Performance benchmarking

### Phase 7: Production Hardening (Week 7-8)
- [ ] Security audit
- [ ] Load testing
- [ ] Error handling review
- [ ] Logging enrichment
- [ ] Deployment configuration
- [ ] CI/CD pipeline setup

---

## 10. Sample Usage

### 10.1 Basic PDF Generation

```typescript
import { PDFGeneratorAgent } from 'agents/pdf/pdf-agent';
import { Database } from 'src/database';
import { AuditService } from 'src/runtime/audit';

const db = new Database();
const audit = new AuditService();
const agent = new PDFGeneratorAgent(db, audit);

const input: PDFInput = {
  title: 'Enterprise AI Whitepaper',
  subtitle: 'A Strategic Guide for Fortune-500 Companies',
  authors: ['Dr. Sarah Chen', 'Michael Roberts'],
  organization: 'TechStrategy Institute',
  version: '2.1',
  template: 'whitepaper',
  sections: [
    {
      id: 'executive-summary',
      title: 'Executive Summary',
      level: 1,
      content: `Executive Summary content goes here...`
    },
    {
      id: 'market-analysis',
      title: 'Market Analysis',
      level: 1,
      content: `Market analysis content goes here...`
    }
  ],
  styling: {
    primaryColor: '#1a365d',
    secondaryColor: '#2c5282',
    accentColor: '#ed8936',
    pageLayout: {
      pageSize: 'Letter',
      orientation: 'portrait',
      columns: 2,
      margins: { top: 1, bottom: 1, left: 1, right: 1 }
    }
  },
  output: {
    format: 'pdf',
    compress: true,
    imageQuality: 90,
    generateTOC: true,
    generateBookmarks: true
  }
};

const result = await agent.execute(input);
console.log(`PDF generated: ${result.documentPath}`);
```

### 10.2 PDF with Charts

```typescript
const inputWithCharts: PDFInput = {
  title: 'Quarterly Performance Report',
  authors: ['Finance Team'],
  template: 'standard',
  sections: [
    {
      id: 'revenue-analysis',
      title: 'Revenue Analysis',
      level: 1,
      content: 'Our quarterly revenue has shown significant growth across all divisions.',
      charts: [
        {
          id: 'revenue-chart',
          type: 'bar',
          title: 'Quarterly Revenue (in millions)',
          data: {
            labels: ['Q1', 'Q2', 'Q3', 'Q4'],
            datasets: [
              {
                label: '2024',
                data: [45, 52, 48, 61],
                backgroundColor: '#1a365d'
              },
              {
                label: '2023',
                data: [38, 42, 39, 50],
                backgroundColor: '#718096'
              }
            ]
          },
          options: {
            responsive: true,
            plugins: {
              legend: {
                display: true,
                position: 'top'
              }
            }
          }
        }
      ]
    }
  ]
};
```

### 10.3 PDF with Diagrams

```typescript
const inputWithDiagrams: PDFInput = {
  title: 'System Architecture Document',
  authors: ['Engineering Team'],
  template: 'technical',
  sections: [
    {
      id: 'architecture-overview',
      title: 'Architecture Overview',
      level: 1,
      content: 'The system follows a microservices architecture with the following components:',
      diagrams: [
        {
          id: 'system-flow',
          type: 'flowchart',
          title: 'System Data Flow',
          definition: `
            graph TD
              A[Client Apps] --> B[API Gateway]
              B --> C[Auth Service]
              B --> D[User Service]
              B --> E[Order Service]
              C --> F[(User DB)]
              D --> F
              E --> G[(Order DB)]
              H[Payment Gateway] --> E
              I[Notification Service] --> B
          `
        },
        {
          id: 'sequence-diagram',
          type: 'sequence',
          title: 'Order Processing Sequence',
          definition: `
            sequenceDiagram
              participant C as Client
              participant G as API Gateway
              participant O as Order Service
              participant P as Payment Gateway
              
              C->>G: Submit Order
              G->>O: Create Order
              O->>P: Process Payment
              P-->>O: Payment Confirmation
              O-->>G: Order Created
              G-->>C: Order Confirmation
          `
        }
      ]
    }
  ]
};
```

### 10.4 Secured PDF

```typescript
const securedInput: PDFInput = {
  title: 'Confidential Strategy Document',
  authors: ['Executive Team'],
  template: 'standard',
  sections: [
    {
      id: 'strategy',
      title: 'Corporate Strategy 2025',
      level: 1,
      content: 'This document contains confidential strategic information...'
    }
  ],
  security: {
    encrypt: true,
    userPassword: 'Str0ngP@ss!',
    ownerPassword: 'Admin#2025!',
    permissions: {
      print: 'high',
      copy: false,
      modify: false,
      annotate: false,
      formFields: false,
      contentAccessibility: true,
      documentAssembly: false
    },
    encryptionLevel: 256
  }
};
```

---

## 11. Quality Metrics & Requirements

### 11.1 Code Coverage Requirements

| Metric | Threshold |
|--------|-----------|
| Statements | 75% |
| Branches | 75% |
| Functions | 75% |
| Lines | 75% |

### 11.2 Performance Requirements

| Operation | Target Time |
|-----------|-------------|
| Simple PDF (5 pages, no charts) | < 5 seconds |
| Medium PDF (20 pages, 5 charts) | < 15 seconds |
| Complex PDF (50+ pages, many charts) | < 60 seconds |
| Chart rendering | < 2 seconds per chart |
| Diagram rendering | < 3 seconds per diagram |
| PDF encryption | < 1 second |

### 11.3 Output Quality Requirements

- PDF/A-1b compliance (when requested)
- CMYK color support
- Vector graphics throughout
- Embedded fonts (no font substitution)
- High-resolution images (300 DPI)
- Accessible PDF (PDF/UA compliant)

---

## 12. Security Considerations

### 12.1 Asset Security
- Validate all asset URLs before processing
- Sanitize user-provided content
- Limit asset file sizes
- Use safe image parsing

### 12.2 PDF Security
- Strong encryption (AES-256)
- Secure password handling
- Permission enforcement
- No JavaScript in PDFs

### 12.3 Input Validation
- Zod schema validation for all inputs
- Sanitize markdown content
- Validate diagram syntax
- Limit resource usage

---

## 13. Future Enhancements

### 13.1 Planned Features
- [ ] PDF Form generation
- [ ] Digital signature support
- [ ] Interactive PDFs with links
- [ ] Accessibility checker
- [ ] Multi-language support
- [ ] Cloud storage integration
- [ ] Email delivery integration
- [ ] Webhook notifications

### 13.2 Advanced Rendering
- [ ] 3D model support
- [ ] Video embedding
- [ ] Audio annotations
- [ ] Animated transitions
- [ ] AR/VR content

---

## 14. Conclusion

This plan outlines a comprehensive implementation of a Fortune-500 level PDF generator agent for the OpenCode Tools platform. The agent will provide enterprise-grade PDF generation capabilities with support for charts, diagrams, professional typography, and advanced styling.

**Key Deliverables**:
1. Complete PDF generation agent with all specified components
2. Integration with existing OpenCode Tools infrastructure
3. Comprehensive testing suite (>75% coverage)
4. Full documentation and user guides
5. Production-ready deployment configuration

**Risk Mitigation**:
- Phased implementation approach
- Extensive testing at each phase
- Security review and hardening
- Performance optimization

**Expected Outcome**:
A robust, scalable PDF generator that produces Adobe-quality documents for whitepapers, client documentation, and enterprise presentations.

---

**Document Version**: 1.0.0  
**Last Updated**: February 11, 2026  
**Next Review**: Upon completion of Phase 1  
**Owner**: PDF Generator Agent Team
