import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'layout-calculator' }
});

export interface PageMetrics {
  pageWidth: number;
  pageHeight: number;
  contentWidth: number;
  contentHeight: number;
  headerHeight: number;
  footerHeight: number;
  availableHeight: number;
  unit: string;
}

export interface ColumnMetrics {
  columnWidth: number;
  columnHeight: number;
  gap: number;
  columns: number;
  totalWidth: number;
}

export interface TextFlow {
  lines: string[];
  lineCount: number;
  pageBreaks: number[];
  estimatedPages: number;
}

export interface ChartConfig {
  id: string;
  type: 'bar' | 'line' | 'pie' | 'scatter';
  width: number;
  height: number;
  x: number;
  y: number;
}

export interface DiagramConfig {
  id: string;
  type: 'flowchart' | 'uml' | 'sequence';
  width: number;
  height: number;
  x: number;
  y: number;
}

export interface ChartPlacement {
  chartId: string;
  pageNumber: number;
  x: number;
  y: number;
  fits: boolean;
}

export interface DiagramPlacement {
  diagramId: string;
  pageNumber: number;
  x: number;
  y: number;
  fits: boolean;
}

export class LayoutCalculator {
  private pointsPerInch = 72;
  private defaultHeaderHeight = 0.5;
  private defaultFooterHeight = 0.5;

  public calculatePageMetrics(pageSize: { width: number; height: number; unit: string }, margins: { top: number; bottom: number; left: number; right: number }): PageMetrics {
    const width = this.convertToPoints(pageSize.width, pageSize.unit);
    const height = this.convertToPoints(pageSize.height, pageSize.unit);

    const headerHeight = this.convertToPoints(this.defaultHeaderHeight, 'in');
    const footerHeight = this.convertToPoints(this.defaultFooterHeight, 'in');

    const contentWidth = width - this.convertToPoints(margins.left, 'in') - this.convertToPoints(margins.right, 'in');
    const contentHeight = height - this.convertToPoints(margins.top, 'in') - this.convertToPoints(margins.bottom, 'in');
    const availableHeight = contentHeight - headerHeight - footerHeight;

    return {
      pageWidth: width,
      pageHeight: height,
      contentWidth,
      contentHeight,
      headerHeight,
      footerHeight,
      availableHeight,
      unit: 'pt'
    };
  }

  public calculateColumnMetrics(columns: number, gap: number, pageWidth: number): ColumnMetrics {
    const gapWidth = this.convertToPoints(gap, 'in');
    const totalGapWidth = gapWidth * (columns - 1);
    const columnWidth = (pageWidth - totalGapWidth) / columns;

    return {
      columnWidth,
      columnHeight: 0,
      gap: gapWidth,
      columns,
      totalWidth: columnWidth * columns + totalGapWidth
    };
  }

  public calculateTextFlow(content: string, metrics: PageMetrics): TextFlow {
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    const lineHeight = 12;
    const linesPerPage = Math.floor(metrics.availableHeight / lineHeight);

    const pageBreaks: number[] = [];
    let currentPage = 1;
    let lineCount = 0;

    for (let i = 0; i < lines.length; i++) {
      lineCount++;
      if (lineCount >= linesPerPage) {
        pageBreaks.push(i);
        currentPage++;
        lineCount = 0;
      }
    }

    return {
      lines,
      lineCount: lines.length,
      pageBreaks,
      estimatedPages: currentPage
    };
  }

  public estimateContentPages(content: string, metrics: PageMetrics): number {
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
    const wordsPerLine = 10;
    const linesPerPage = Math.floor(metrics.availableHeight / 12);
    const wordsPerPage = wordsPerLine * linesPerPage;

    return Math.max(1, Math.ceil(wordCount / wordsPerPage));
  }

  public calculateChartPlacement(charts: ChartConfig[], metrics: PageMetrics): ChartPlacement[] {
    const placements: ChartPlacement[] = [];
    let currentY = 0;

    for (const chart of charts) {
      const fits = chart.height <= metrics.availableHeight - currentY;
      const pageNumber = fits ? 1 : 2;

      placements.push({
        chartId: chart.id,
        pageNumber,
        x: chart.x,
        y: fits ? currentY : 0,
        fits
      });

      if (fits) {
        currentY += chart.height + 20;
      } else {
        currentY = chart.height + 20;
      }
    }

    return placements;
  }

  public calculateDiagramPlacement(diagrams: DiagramConfig[], metrics: PageMetrics): DiagramPlacement[] {
    const placements: DiagramPlacement[] = [];
    let currentY = 0;

    for (const diagram of diagrams) {
      const fits = diagram.height <= metrics.availableHeight - currentY;
      const pageNumber = fits ? 1 : 2;

      placements.push({
        diagramId: diagram.id,
        pageNumber,
        x: diagram.x,
        y: fits ? currentY : 0,
        fits
      });

      if (fits) {
        currentY += diagram.height + 20;
      } else {
        currentY = diagram.height + 20;
      }
    }

    return placements;
  }

  public calculateImagePlacement(width: number, height: number, metrics: PageMetrics): { fits: boolean; scale: number; scaledWidth: number; scaledHeight: number } {
    const maxWidth = metrics.contentWidth;
    const maxHeight = metrics.availableHeight;

    const scaleX = maxWidth / width;
    const scaleY = maxHeight / height;
    const scale = Math.min(1, Math.min(scaleX, scaleY));

    const scaledWidth = width * scale;
    const scaledHeight = height * scale;

    return {
      fits: scaledWidth <= maxWidth && scaledHeight <= maxHeight,
      scale,
      scaledWidth,
      scaledHeight
    };
  }

  private convertToPoints(value: number, fromUnit: string): number {
    const conversions: Record<string, number> = {
      pt: 1,
      in: 72,
      mm: 2.834645669291339,
      cm: 28.34645669291339
    };

    const factor = conversions[fromUnit] ?? 1;
    return value * factor;
  }
}
