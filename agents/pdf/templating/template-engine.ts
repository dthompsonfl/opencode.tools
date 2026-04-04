import Handlebars from 'handlebars';
import winston from 'winston';
import { TemplateRegistry, DocumentTemplate } from './template-registry';
import { PDFSection, RenderContext, PageInfo } from '../../../src/common/types';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'template-engine' }
});

export interface TemplateEngineOptions {
  cacheTemplates?: boolean;
  cacheSize?: number;
  helpers?: Record<string, Handlebars.HelperDelegate>;
}

export interface RenderResult {
  html: string;
  pageCount: number;
  templateName: string;
  renderedAt: Date;
}

export class TemplateEngine {
  private registry: TemplateRegistry;
  private templateCache: Map<string, Handlebars.TemplateDelegate>;
  private options: Required<TemplateEngineOptions>;

  constructor(options: TemplateEngineOptions = {}) {
    this.registry = new TemplateRegistry();
    this.templateCache = new Map();
    this.options = {
      cacheTemplates: options.cacheTemplates ?? true,
      cacheSize: options.cacheSize ?? 100,
      helpers: options.helpers ?? {}
    };

    this.registerBuiltInHelpers();
  }

  private registerBuiltInHelpers(): void {
    Handlebars.registerHelper('uppercase', (str: string) => {
      return str?.toUpperCase() ?? '';
    });

    Handlebars.registerHelper('lowercase', (str: string) => {
      return str?.toLowerCase() ?? '';
    });

    Handlebars.registerHelper('trim', (str: string) => {
      return str?.trim() ?? '';
    });

    Handlebars.registerHelper('dateFormat', (date: string | Date, format: string) => {
      const d = new Date(date);
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      };
      return d.toLocaleDateString('en-US', options);
    });

    Handlebars.registerHelper('pageNumber', (page: number, pages: number) => {
      return `Page ${page} of ${pages}`;
    });

    Handlebars.registerHelper('sectionNumber', (level: number, index: number) => {
      return '.'.repeat(level - 1) + (index + 1);
    });

    Handlebars.registerHelper('ifNotEmpty', function (this: unknown, arg: unknown, options: Handlebars.HelperOptions) {
      return arg && (typeof arg === 'string' ? arg.trim() : true) ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('repeat', (count: number, options: Handlebars.HelperOptions) => {
      let result = '';
      for (let i = 0; i < count; i++) {
        result += options.fn({ index: i });
      }
      return result;
    });

    Handlebars.registerHelper('indent', (text: string, spaces: number) => {
      const indent = ' '.repeat(spaces);
      return text?.split('\n').map(line => indent + line).join('\n') ?? '';
    });

    Handlebars.registerHelper('stripTags', (html: string) => {
      return html?.replace(/<[^>]*>/g, '') ?? '';
    });

    Handlebars.registerHelper('truncate', (text: string, length: number, suffix: string = '...') => {
      if (!text) return '';
      return text.length > length ? text.substring(0, length) + suffix : text;
    });

    for (const [name, helper] of Object.entries(this.options.helpers)) {
      Handlebars.registerHelper(name, helper);
    }
  }

  public registerTemplate(name: string, source: string): void {
    const template: DocumentTemplate = {
      name,
      description: `Template: ${name}`,
      sections: [],
      styles: {
        fontFamily: 'Helvetica',
        fontSize: 12,
        lineHeight: 1.5
      }
    };
    this.registry.register(name, template);

    if (this.options.cacheTemplates) {
      const compiled = this.compileTemplate(source);
      this.templateCache.set(name, compiled);
      this.evictOldCacheEntries();
    }

    logger.info(`Registered template: ${name}`);
  }

  public registerPartial(name: string, source: string): void {
    Handlebars.registerPartial(name, source);
    logger.debug(`Registered partial: ${name}`);
  }

  public async render(templateName: string, data: Record<string, any>): Promise<RenderResult> {
    const startTime = Date.now();

    try {
      const template = this.loadTemplate(templateName);
      const context = this.buildRenderContext(data);
      const html = template(context);

      const pageCount = this.estimatePageCount(html, context);

      logger.info(`Template ${templateName} rendered in ${Date.now() - startTime}ms`);

      return {
        html,
        pageCount,
        templateName,
        renderedAt: new Date()
      };
    } catch (error) {
      logger.error(`Failed to render template ${templateName}:`, error);
      throw error;
    }
  }

  public async renderSection(section: PDFSection, context: Record<string, any>): Promise<string> {
    try {
      const sectionTemplate = this.compileTemplate(section.content || '');
      return sectionTemplate({
        ...context,
        ...section.data
      });
    } catch (error) {
      logger.error(`Failed to render section ${section.id}:`, error);
      throw error;
    }
  }

  private loadTemplate(templateName: string): Handlebars.TemplateDelegate {
    if (this.options.cacheTemplates) {
      const cached = this.templateCache.get(templateName);
      if (cached) {
        return cached;
      }
    }

    const template = this.registry.get(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    const compiled = this.compileTemplate(template);
    this.templateCache.set(templateName, compiled);
    return compiled;
  }

  private compileTemplate(template: DocumentTemplate | string): Handlebars.TemplateDelegate {
    const source = typeof template === 'string' ? template : this.generateTemplateSource(template);
    return Handlebars.compile(source);
  }

  private generateTemplateSource(template: DocumentTemplate): string {
    let source = `<!DOCTYPE html>
<html>
<head>
  <title>{{ title }}</title>
  <style>
    body {
      font-family: ${template.styles.fontFamily};
      font-size: ${template.styles.fontSize}pt;
      line-height: ${template.styles.lineHeight};
      color: ${template.styles.textColor || '#000000'};
      margin: ${template.styles.marginTop || 1}in ${template.styles.marginRight || 1}in ${template.styles.marginBottom || 1}in ${template.styles.marginLeft || 1}in;
    }
    .page-break { page-break-after: always; }
    .no-break { page-break-inside: avoid; }
    ${this.generateStyles(template.styles)}
  </style>
</head>
<body>
`;

    if (template.header) {
      source += `  {{> header }}\n`;
    }

    source += `  {{> content }}\n`;

    if (template.footer) {
      source += `  {{> footer }}\n`;
    }

    source += `</body>
</html>`;

    return source;
  }

  private generateStyles(styles: Record<string, unknown>): string {
    const cssLines: string[] = [];

    for (const [key, value] of Object.entries(styles)) {
      if (typeof value === 'object' && value !== null) {
        const selector = this.camelToKebab(key);
        cssLines.push(`    .${selector} {`);
        for (const [prop, val] of Object.entries(value as Record<string, unknown>)) {
          cssLines.push(`      ${this.camelToKebab(prop)}: ${val};`);
        }
        cssLines.push(`    }`);
      }
    }

    return cssLines.join('\n');
  }

  private camelToKebab(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }

  private buildRenderContext(data: Record<string, any>): RenderContext {
    const pageInfo: PageInfo = {
      page: 1,
      pages: data.pageCount || 1,
      date: new Date().toISOString(),
      ...data.pageInfo
    };

    return {
      title: data.title || 'Untitled Document',
      organization: data.organization || '',
      ...data,
      pageInfo
    };
  }

  private estimatePageCount(html: string, context: RenderContext): number {
    const wordsPerPage = 500;
    const textContent = html.replace(/<[^>]*>/g, '');
    const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length;
    return Math.max(1, Math.ceil(wordCount / wordsPerPage));
  }

  private evictOldCacheEntries(): void {
    if (this.templateCache.size > this.options.cacheSize) {
      const entriesToDelete = Array.from(this.templateCache.keys())
        .slice(0, this.templateCache.size - this.options.cacheSize);
      for (const key of entriesToDelete) {
        this.templateCache.delete(key);
      }
    }
  }

  public clearCache(): void {
    this.templateCache.clear();
    logger.info('Template cache cleared');
  }

  public getRegisteredTemplates(): string[] {
    return this.registry.list();
  }

  public hasTemplate(name: string): boolean {
    return this.registry.has(name);
  }
}
