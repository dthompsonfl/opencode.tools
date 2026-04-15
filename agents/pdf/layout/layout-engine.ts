import winston from 'winston';
import { PDFInput, PageSize, PageMargins, TOCEntry, RunningHeader, PageBreak, ColumnLayout, PageLayout } from '../../../src/common/types';
import { LayoutCalculator, PageMetrics } from './layout-calculator';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'layout-engine' }
});

export interface LayoutEngineOptions {
  defaultPageSize?: PageSize;
  defaultMargins?: PageMargins;
  wordsPerPage?: number;
  linesPerPage?: number;
  autoTOC?: boolean;
  runningHeaders?: boolean;
}

export interface LayoutPlan {
  pageCount: number;
  toc: TOCEntry[];
  runningHeaders: RunningHeader[];
  pageBreaks: PageBreak[];
  columnLayouts: ColumnLayout[];
  pageSize: PageSize;
  margins: PageMargins;
}

export class LayoutEngine {
  private calculator: LayoutCalculator;
  private options: Required<LayoutEngineOptions>;

  constructor(options: LayoutEngineOptions = {}) {
    this.calculator = new LayoutCalculator();
    this.options = {
      defaultPageSize: options.defaultPageSize ?? {
        width: 8.5,
        height: 11,
        unit: 'in'
      },
      defaultMargins: options.defaultMargins ?? {
        top: 1,
        bottom: 1,
        left: 1,
        right: 1
      },
      wordsPerPage: options.wordsPerPage ?? 500,
      linesPerPage: options.linesPerPage ?? 45,
      autoTOC: options.autoTOC ?? true,
      runningHeaders: options.runningHeaders ?? true
    };
  }

  public async calculateLayout(input: PDFInput, runId: string): Promise<LayoutPlan> {
    const startTime = Date.now();

    try {
      const pageSize = input.pageSize ?? this.options.defaultPageSize;
      const margins = input.margins ?? this.options.defaultMargins;

      const pageMetrics = this.calculator.calculatePageMetrics(pageSize, margins);
      const pageCount = this.estimatePageCount(input);
      const toc = this.options.autoTOC ? this.calculateTOC(input.sections) : [];
      const runningHeaders = this.options.runningHeaders ? this.calculateRunningHeaders(input.sections) : [];
      const pageBreaks = this.calculatePageBreaks(input);
      const columnLayouts = this.calculateColumnLayouts(input);

      logger.info(`Layout calculated in ${Date.now() - startTime}ms for run ${runId}`);

      return {
        pageCount,
        toc,
        runningHeaders,
        pageBreaks,
        columnLayouts,
        pageSize,
        margins
      };
    } catch (error) {
      logger.error(`Layout calculation failed for run ${runId}:`, error);
      throw error;
    }
  }

  public calculatePageBreaks(input: PDFInput): PageBreak[] {
    const pageBreaks: PageBreak[] = [];
    const maxWordsPerPage = this.options.wordsPerPage;

    const wordCount = 0;
    let currentPageWords = 0;

    for (const section of input.sections) {
      const sectionWordCount = this.countWords(section.content || '');
      const sectionBreak: PageBreak = {
        afterSectionId: section.id,
        forced: false
      };

      if (currentPageWords + sectionWordCount > maxWordsPerPage) {
        sectionBreak.forced = true;
        currentPageWords = 0;
      }

      currentPageWords += sectionWordCount;
      pageBreaks.push(sectionBreak);
    }

    return pageBreaks;
  }

  public calculateColumnLayouts(input: PDFInput): ColumnLayout[] {
    const layouts: ColumnLayout[] = [];
    const defaultColumns = 1;
    const columnGap = 0.5;

    for (let pageNum = 1; pageNum <= 10; pageNum++) {
      layouts.push({
        columns: defaultColumns,
        gap: columnGap,
        widths: [6.5],
        startPage: pageNum,
        endPage: pageNum
      });
    }

    return layouts;
  }

  public estimatePageCount(input: PDFInput): number {
    const totalWords = input.sections.reduce((sum, section) => {
      return sum + this.countWords(section.content || '');
    }, 0);

    return Math.max(1, Math.ceil(totalWords / this.options.wordsPerPage));
  }

  private calculateTOC(sections: { id: string; title: string; level: number; content?: string }[]): TOCEntry[] {
    const toc: TOCEntry[] = [];
    let currentPage = 1;
    let accumulatedWords = 0;

    for (const section of sections) {
      const sectionWords = this.countWords(section.content || '');
      const wordsPerPage = this.options.wordsPerPage;

      currentPage = 1 + Math.floor(accumulatedWords / wordsPerPage);

      toc.push({
        id: section.id,
        title: section.title,
        level: section.level,
        page: currentPage,
        indent: (section.level - 1) * 20
      });

      accumulatedWords += sectionWords;
    }

    return toc;
  }

  private calculateRunningHeaders(sections: { id: string; title: string; level: number; content?: string }[]): RunningHeader[] {
    const headers: RunningHeader[] = [];
    let currentSection = '';

    for (const section of sections) {
      if (section.level === 1) {
        currentSection = section.title;
      }

      headers.push({
        sectionId: section.id,
        text: currentSection || section.title,
        level: section.level
      });
    }

    return headers;
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(w => w.length > 0).length;
  }

  public getOptions(): Readonly<Required<LayoutEngineOptions>> {
    return { ...this.options };
  }

  public setOptions(options: Partial<LayoutEngineOptions>): void {
    this.options = { ...this.options, ...options };
  }
}
