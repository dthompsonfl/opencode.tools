import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'template-registry' }
});

export interface TemplateSection {
  id: string;
  title: string;
  level: number;
  content?: string;
  data?: Record<string, unknown>;
  order: number;
  required?: boolean;
}

export interface TemplateHeader {
  template: string;
  height?: number;
  showOnCover?: boolean;
  showOnFirstPage?: boolean;
}

export interface TemplateFooter {
  template: string;
  height?: number;
  showPageNumbers?: boolean;
  showDate?: boolean;
  showOnLastPage?: boolean;
}

export interface TemplateStyles {
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
  textColor?: string;
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
  [key: string]: unknown;
}

export interface DocumentTemplate {
  name: string;
  description: string;
  sections: TemplateSection[];
  header?: TemplateHeader;
  footer?: TemplateFooter;
  styles: TemplateStyles;
  assets?: string[];
  version?: string;
  category?: string;
}

export class TemplateRegistry {
  private templates: Map<string, DocumentTemplate>;
  private validators: Map<string, (template: DocumentTemplate) => boolean>;

  constructor() {
    this.templates = new Map();
    this.validators = new Map();
    this.registerBuiltInValidators();
  }

  private registerBuiltInValidators(): void {
    this.validators.set('name', (t: DocumentTemplate) => {
      return typeof t.name === 'string' && t.name.trim().length > 0;
    });

    this.validators.set('description', (t: DocumentTemplate) => {
      return typeof t.description === 'string';
    });

    this.validators.set('sections', (t: DocumentTemplate) => {
      return Array.isArray(t.sections);
    });

    this.validators.set('styles', (t: DocumentTemplate) => {
      return typeof t.styles === 'object' && t.styles !== null;
    });
  }

  public register(name: string, template: DocumentTemplate): void {
    if (this.templates.has(name)) {
      logger.warn(`Template "${name}" is being overwritten`);
    }

    template.name = name;
    const valid = this.validateTemplate(template);

    if (!valid) {
      const error = new Error(`Invalid template: ${name}`);
      logger.error(`Template validation failed:`, { name, errors: this.getValidationErrors(template) });
      throw error;
    }

    this.templates.set(name, template);
    logger.info(`Registered template: ${name}`);
  }

  public get(name: string): DocumentTemplate | null {
    const template = this.templates.get(name);
    return template ?? null;
  }

  public list(): string[] {
    return Array.from(this.templates.keys());
  }

  public has(name: string): boolean {
    return this.templates.has(name);
  }

  public unregister(name: string): boolean {
    const deleted = this.templates.delete(name);
    if (deleted) {
      logger.info(`Unregistered template: ${name}`);
    }
    return deleted;
  }

  public registerValidator(
    validatorName: string,
    validator: (template: DocumentTemplate) => boolean
  ): void {
    this.validators.set(validatorName, validator);
    logger.debug(`Registered validator: ${validatorName}`);
  }

  private validateTemplate(template: DocumentTemplate): boolean {
    const requiredValidators = ['name', 'description', 'sections', 'styles'];

    for (const validatorName of requiredValidators) {
      const validator = this.validators.get(validatorName);
      if (validator && !validator(template)) {
        logger.warn(`Template "${template.name}" failed validator: ${validatorName}`);
        return false;
      }
    }

    if (template.sections.length > 0) {
      const sectionIds = template.sections.map(s => s.id);
      const hasDuplicates = sectionIds.length !== new Set(sectionIds).size;
      if (hasDuplicates) {
        logger.warn(`Template "${template.name}" has duplicate section IDs`);
        return false;
      }
    }

    return true;
  }

  private getValidationErrors(template: DocumentTemplate): string[] {
    const errors: string[] = [];

    for (const [name, validator] of this.validators) {
      if (!validator(template)) {
        errors.push(name);
      }
    }

    return errors;
  }

  public getAll(): DocumentTemplate[] {
    return Array.from(this.templates.values());
  }

  public count(): number {
    return this.templates.size;
  }

  public clear(): void {
    this.templates.clear();
    logger.info('Template registry cleared');
  }

  public clone(name: string, newName: string): DocumentTemplate | null {
    const original = this.get(name);
    if (!original) {
      return null;
    }

    const clone: DocumentTemplate = {
      ...original,
      name: newName,
      description: `${original.description} (Clone)`
    };

    this.register(newName, clone);
    return clone;
  }

  public search(query: string): DocumentTemplate[] {
    const normalizedQuery = query.toLowerCase();
    return this.getAll().filter(t =>
      t.name.toLowerCase().includes(normalizedQuery) ||
      t.description.toLowerCase().includes(normalizedQuery) ||
      t.category?.toLowerCase().includes(normalizedQuery)
    );
  }
}
