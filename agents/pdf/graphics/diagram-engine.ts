import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import {
  DiagramConfig,
  DiagramType,
  MermaidOptions,
  createDiagramError,
  logger
} from './diagram-config';
import {
  initializeMermaid,
  parseDiagram,
  generateSVG
} from './mermaid-utils';

export class DiagramEngine {
  private initialized: boolean;
  private outputDir: string;

  constructor(options?: MermaidOptions) {
    this.initialized = false;
    this.outputDir = path.join(process.cwd(), 'output', 'diagrams');
    this.initializeMermaid(options);
  }

  private initializeMermaid(options?: MermaidOptions): void {
    if (!this.initialized) {
      initializeMermaid(options);
      this.initialized = true;
    }
  }

  public async render(diagramConfig: DiagramConfig, runId: string): Promise<void> {
    const startTime = Date.now();

    try {
      logger.info('Starting diagram rendering', {
        diagramId: diagramConfig.id,
        diagramType: diagramConfig.type,
        runId
      });

      const svg = await this.renderToSVG(diagramConfig, runId);

      await this.saveDiagram(diagramConfig.id, svg, runId);

      const duration = Date.now() - startTime;
      logger.info('Diagram rendered successfully', {
        diagramId: diagramConfig.id,
        diagramType: diagramConfig.type,
        duration,
        runId
      });
    } catch (error) {
      const renderingError = createDiagramError(
        `Failed to render diagram: ${(error as Error).message}`,
        diagramConfig.id,
        diagramConfig.type,
        runId,
        error as Error
      );

      logger.error('Diagram rendering failed', {
        error: renderingError.message,
        diagramId: diagramConfig.id,
        diagramType: diagramConfig.type,
        runId,
        stack: renderingError.stack
      });

      throw renderingError;
    }
  }

  public async renderToSVG(diagramConfig: DiagramConfig, runId?: string): Promise<string> {
    if (!this.initialized) {
      this.initializeMermaid();
    }

    try {
      logger.debug('Validating diagram definition', {
        diagramId: diagramConfig.id,
        diagramType: diagramConfig.type,
        runId
      });

      const isValid = await this.validateDefinition(diagramConfig.definition, diagramConfig.type);
      if (!isValid) {
        throw createDiagramError(
          'Invalid diagram definition',
          diagramConfig.id,
          diagramConfig.type,
          runId || 'unknown'
        );
      }

      const uniqueId = `${diagramConfig.id}_${Date.now()}`;
      const svg = await generateSVG(uniqueId, diagramConfig.definition);

      if (diagramConfig.style?.backgroundColor) {
        const backgroundRect = `<rect width="100%" height="100%" fill="${diagramConfig.style.backgroundColor}"/>`;
        svg.replace('<svg', `<svg>${backgroundRect}<`);
      }

      logger.debug('SVG generated successfully', {
        diagramId: diagramConfig.id,
        diagramType: diagramConfig.type,
        svgLength: svg.length,
        runId
      });

      return svg;
    } catch (error) {
      throw createDiagramError(
        `Failed to render SVG: ${(error as Error).message}`,
        diagramConfig.id,
        diagramConfig.type,
        runId || 'unknown',
        error as Error
      );
    }
  }

  public async renderToPNG(
    diagramConfig: DiagramConfig,
    width: number,
    height: number,
    runId?: string
  ): Promise<Buffer> {
    const svg = await this.renderToSVG(diagramConfig, runId);

    try {
      logger.debug('Converting SVG to PNG', {
        diagramId: diagramConfig.id,
        width,
        height,
        runId
      });

      const pngBuffer = await this.convertSVGtoPNG(svg, width, height);

      logger.debug('PNG conversion successful', {
        diagramId: diagramConfig.id,
        pngSize: pngBuffer.length,
        runId
      });

      return pngBuffer;
    } catch (error) {
      throw createDiagramError(
        `Failed to convert SVG to PNG: ${(error as Error).message}`,
        diagramConfig.id,
        diagramConfig.type,
        runId || 'unknown',
        error as Error
      );
    }
  }

  public async validateDefinition(definition: string, type: DiagramType): Promise<boolean> {
    if (!this.initialized) {
      this.initializeMermaid();
    }

    const supportedTypes: DiagramType[] = [
      'flowchart',
      'sequence',
      'gantt',
      'class',
      'state',
      'er',
      'journey',
      'mindmap',
      'pie',
      'timeline'
    ];

    if (!supportedTypes.includes(type)) {
      logger.warn('Unsupported diagram type', { type });
      return false;
    }

    try {
      await parseDiagram(definition);
      return true;
    } catch (error) {
      logger.debug('Diagram validation failed', {
        type,
        error: (error as Error).message
      });
      return false;
    }
  }

  private async convertSVGtoPNG(svg: string, width: number, height: number): Promise<Buffer> {
    const defaultWidth = width || 1200;
    const defaultHeight = height || 800;

    return await sharp(Buffer.from(svg))
      .resize(defaultWidth, defaultHeight, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png({ quality: 95, compressionLevel: 6 })
      .toBuffer();
  }

  private async saveDiagram(diagramId: string, svg: string, runId: string): Promise<void> {
    try {
      const runDir = path.join(this.outputDir, runId);
      await fs.mkdir(runDir, { recursive: true });

      const svgPath = path.join(runDir, `${diagramId}.svg`);
      await fs.writeFile(svgPath, svg, 'utf-8');

      logger.debug('Diagram saved', {
        diagramId,
        path: svgPath,
        runId
      });
    } catch (error) {
      throw createDiagramError(
        `Failed to save diagram: ${(error as Error).message}`,
        diagramId,
        'flowchart',
        runId,
        error as Error
      );
    }
  }

  public async renderFlowchart(
    config: {
      id: string;
      title: string;
      definition: string;
      layout?: 'TB' | 'LR' | 'RL' | 'BT';
    },
    runId: string
  ): Promise<void> {
    const diagramConfig: DiagramConfig = {
      id: config.id,
      type: 'flowchart',
      title: config.title,
      definition: config.definition,
      layout: config.layout
    };
    return await this.render(diagramConfig, runId);
  }

  public async renderSequenceDiagram(
    config: {
      id: string;
      title: string;
      definition: string;
    },
    runId: string
  ): Promise<void> {
    const diagramConfig: DiagramConfig = {
      id: config.id,
      type: 'sequence',
      title: config.title,
      definition: config.definition
    };
    return await this.render(diagramConfig, runId);
  }

  public async renderGanttChart(
    config: {
      id: string;
      title: string;
      definition: string;
    },
    runId: string
  ): Promise<void> {
    const diagramConfig: DiagramConfig = {
      id: config.id,
      type: 'gantt',
      title: config.title,
      definition: config.definition
    };
    return await this.render(diagramConfig, runId);
  }

  public async renderClassDiagram(
    config: {
      id: string;
      title: string;
      definition: string;
    },
    runId: string
  ): Promise<void> {
    const diagramConfig: DiagramConfig = {
      id: config.id,
      type: 'class',
      title: config.title,
      definition: config.definition
    };
    return await this.render(diagramConfig, runId);
  }

  public async renderStateDiagram(
    config: {
      id: string;
      title: string;
      definition: string;
    },
    runId: string
  ): Promise<void> {
    const diagramConfig: DiagramConfig = {
      id: config.id,
      type: 'state',
      title: config.title,
      definition: config.definition
    };
    return await this.render(diagramConfig, runId);
  }

  public async renderERDiagram(
    config: {
      id: string;
      title: string;
      definition: string;
    },
    runId: string
  ): Promise<void> {
    const diagramConfig: DiagramConfig = {
      id: config.id,
      type: 'er',
      title: config.title,
      definition: config.definition
    };
    return await this.render(diagramConfig, runId);
  }
}

export const diagramEngine = new DiagramEngine();
