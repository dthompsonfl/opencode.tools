import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'page-manager' }
});

export interface PageManagerOptions {
  maxPages?: number;
  autoPageBreak?: boolean;
}

export interface Page {
  number: number;
  content: PageContent;
  header?: HeaderFooterContent;
  footer?: HeaderFooterContent;
}

export interface PageContent {
  html: string;
  text: string;
  sections: { id: string; title: string; level: number; content?: string }[];
}

export interface HeaderFooterContent {
  html: string;
  height: number;
}

export interface RenderContext {
  title: string;
  organization?: string;
  pageInfo: { page: number; pages: number; date: string };
  [key: string]: unknown;
}

export class PageManager {
  private pages: Page[];
  private currentPageIndex: number;
  private options: Required<PageManagerOptions>;

  constructor(options: PageManagerOptions = {}) {
    this.pages = [];
    this.currentPageIndex = -1;
    this.options = {
      maxPages: options.maxPages ?? 1000,
      autoPageBreak: options.autoPageBreak ?? true
    };

    this.addPage();
  }

  public async renderPage(page: Page, context: RenderContext): Promise<void> {
    const pageIndex = page.number - 1;

    if (pageIndex < 0 || pageIndex >= this.pages.length) {
      throw new Error(`Invalid page number: ${page.number}`);
    }

    const renderedContent = await this.renderPageContent(page.content, context);
    const renderedHeader = page.header ? await this.renderHeaderFooter(page.header, context) : undefined;
    const renderedFooter = page.footer ? await this.renderHeaderFooter(page.footer, context) : undefined;

    this.pages[pageIndex] = {
      ...page,
      content: renderedContent,
      header: renderedHeader,
      footer: renderedFooter
    };

    logger.debug(`Page ${page.number} rendered`);
  }

  public async addPage(): Promise<void> {
    if (this.pages.length >= this.options.maxPages) {
      throw new Error(`Maximum page limit (${this.options.maxPages}) reached`);
    }

    const newPage: Page = {
      number: this.pages.length + 1,
      content: {
        html: '',
        text: '',
        sections: []
      }
    };

    this.pages.push(newPage);
    this.currentPageIndex = this.pages.length - 1;

    logger.debug(`Page ${newPage.number} added`);
  }

  public async switchPage(pageNumber: number): Promise<void> {
    const pageIndex = pageNumber - 1;

    if (pageIndex < 0 || pageIndex >= this.pages.length) {
      throw new Error(`Invalid page number: ${pageNumber}`);
    }

    this.currentPageIndex = pageIndex;
    logger.debug(`Switched to page ${pageNumber}`);
  }

  public async getCurrentPage(): Promise<Page> {
    if (this.currentPageIndex < 0) {
      throw new Error('No current page');
    }

    return this.pages[this.currentPageIndex];
  }

  public async getPageCount(): Promise<number> {
    return this.pages.length;
  }

  public async insertPage(pageNumber: number, content: PageContent): Promise<void> {
    const pageIndex = pageNumber - 1;

    if (pageIndex < 0 || pageIndex > this.pages.length) {
      throw new Error(`Invalid page number: ${pageNumber}`);
    }

    if (this.pages.length >= this.options.maxPages) {
      throw new Error(`Maximum page limit (${this.options.maxPages}) reached`);
    }

    const newPage: Page = {
      number: pageNumber,
      content,
      header: undefined,
      footer: undefined
    };

    this.pages.splice(pageIndex, 0, newPage);

    for (let i = pageIndex + 1; i < this.pages.length; i++) {
      this.pages[i].number = i + 1;
    }

    logger.debug(`Page ${pageNumber} inserted`);
  }

  public async deletePage(pageNumber: number): Promise<void> {
    const pageIndex = pageNumber - 1;

    if (pageIndex < 0 || pageIndex >= this.pages.length) {
      throw new Error(`Invalid page number: ${pageNumber}`);
    }

    if (this.pages.length <= 1) {
      throw new Error('Cannot delete the last page');
    }

    this.pages.splice(pageIndex, 1);

    for (let i = pageIndex; i < this.pages.length; i++) {
      this.pages[i].number = i + 1;
    }

    if (this.currentPageIndex >= this.pages.length) {
      this.currentPageIndex = this.pages.length - 1;
    }

    logger.debug(`Page ${pageNumber} deleted`);
  }

  public async getPage(pageNumber: number): Promise<Page | null> {
    const pageIndex = pageNumber - 1;
    return (pageIndex >= 0 && pageIndex < this.pages.length) ? this.pages[pageIndex] : null;
  }

  public async getAllPages(): Promise<Page[]> {
    return [...this.pages];
  }

  public async clear(): Promise<void> {
    this.pages = [];
    this.currentPageIndex = -1;
    this.addPage();
    logger.info('Page manager cleared');
  }

  private async renderPageContent(content: PageContent, context: RenderContext): Promise<PageContent> {
    const renderedHtml = await this.renderHtml(content.html, context);
    const plainText = this.extractText(renderedHtml);

    return {
      ...content,
      html: renderedHtml,
      text: plainText
    };
  }

  private async renderHeaderFooter(content: HeaderFooterContent, context: RenderContext): Promise<HeaderFooterContent> {
    const renderedHtml = await this.renderHtml(content.html, context);
    return {
      ...content,
      html: renderedHtml
    };
  }

  private async renderHtml(html: string, context: RenderContext): Promise<string> {
    let result = html;

    const replacements: Record<string, string> = {
      '{{title}}': context.title || '',
      '{{organization}}': context.organization || '',
      '{{page}}': String(context.pageInfo.page),
      '{{pages}}': String(context.pageInfo.pages),
      '{{date}}': context.pageInfo.date
    };

    for (const [placeholder, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(placeholder, 'g'), value);
    }

    return result;
  }

  private extractText(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  public getStats(): { pageCount: number; currentPage: number; maxPages: number } {
    return {
      pageCount: this.pages.length,
      currentPage: this.currentPageIndex + 1,
      maxPages: this.options.maxPages
    };
  }
}
