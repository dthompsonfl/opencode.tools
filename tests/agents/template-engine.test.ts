import { TemplateEngine } from '../../agents/pdf/templating/template-engine';
import { TemplateRegistry, DocumentTemplate } from '../../agents/pdf/templating/template-registry';
import { LayoutEngine } from '../../agents/pdf/layout/layout-engine';
import { LayoutCalculator, PageMetrics } from '../../agents/pdf/layout/layout-calculator';
import { TypographyEngine } from '../../agents/pdf/typography/typography-engine';

describe('TemplateEngine', () => {
  let engine: TemplateEngine;

  beforeEach(() => {
    engine = new TemplateEngine({ cacheTemplates: false });
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const defaultEngine = new TemplateEngine();
      expect(defaultEngine).toBeDefined();
    });

    it('should initialize with custom options', () => {
      const customEngine = new TemplateEngine({
        cacheTemplates: true,
        cacheSize: 50
      });
      expect(customEngine).toBeDefined();
    });
  });

  describe('registerTemplate', () => {
    it('should register a template successfully', () => {
      const templateSource = '<html>{{ title }}</html>';
      engine.registerTemplate('test-template', templateSource);
      expect(engine.hasTemplate('test-template')).toBe(true);
    });

    it('should return true for existing template', () => {
      engine.registerTemplate('existing', '<html></html>');
      expect(engine.hasTemplate('existing')).toBe(true);
    });

    it('should return false for non-existing template', () => {
      expect(engine.hasTemplate('non-existing')).toBe(false);
    });
  });

  describe('registerPartial', () => {
    it('should register a partial successfully', () => {
      engine.registerPartial('header', '<header>Header</header>');
      engine.registerTemplate('with-partial', '<html>{{> header }}</html>');
      expect(engine.hasTemplate('with-partial')).toBe(true);
    });
  });

  describe('render', () => {
    beforeEach(() => {
      engine.registerPartial('header', '<header>Header</header>');
      engine.registerPartial('content', '<main>{{ title }}</main>');
      engine.registerPartial('footer', '<footer>Footer</footer>');
      engine.registerTemplate('test', '<html>{{> header }}{{> content }}{{> footer }}</html>');
    });

    it('should render a template with data', async () => {
      const result = await engine.render('test', { title: 'Test Document' });
      expect(result.templateName).toBe('test');
      expect(result.renderedAt).toBeInstanceOf(Date);
    });
  });

  describe('renderSection', () => {
    it('should prepare section data', async () => {
      const section = {
        id: 'section1',
        title: 'Test Section',
        level: 1,
        content: '<p>{{ message }}</p>',
        data: { message: 'Hello' },
        order: 1
      };

      const result = await engine.renderSection(section, {});
      expect(result).toBeDefined();
    });
  });

  describe('getRegisteredTemplates', () => {
    it('should return list of registered templates', () => {
      engine.registerTemplate('template1', '<html></html>');
      engine.registerTemplate('template2', '<html></html>');

      const templates = engine.getRegisteredTemplates();
      expect(templates).toContain('template1');
      expect(templates).toContain('template2');
    });
  });

  describe('clearCache', () => {
    it('should clear the template cache', () => {
      engine.registerTemplate('cached', '<html></html>');
      engine.clearCache();
      expect(engine.hasTemplate('cached')).toBe(true);
    });
  });
});

describe('TemplateRegistry', () => {
  let registry: TemplateRegistry;

  beforeEach(() => {
    registry = new TemplateRegistry();
  });

  describe('register', () => {
    it('should register a valid template', () => {
      const template: DocumentTemplate = {
        name: 'test',
        description: 'Test template',
        sections: [],
        styles: { fontFamily: 'Arial' }
      };

      registry.register('test', template);
      expect(registry.get('test')).toBeDefined();
    });

    it('should handle empty name gracefully', () => {
      const invalidTemplate = {
        name: '',
        description: 'Invalid',
        sections: [],
        styles: {}
      };

      expect(() => {
        registry.register('invalid', invalidTemplate as DocumentTemplate);
      }).not.toThrow();
    });
  });

  describe('get', () => {
    it('should return null for non-existing template', () => {
      expect(registry.get('non-existing')).toBeNull();
    });
  });

  describe('list', () => {
    it('should return all registered template names', () => {
      registry.register('t1', { name: 't1', description: '', sections: [], styles: {} });
      registry.register('t2', { name: 't2', description: '', sections: [], styles: {} });

      const names = registry.list();
      expect(names).toEqual(['t1', 't2']);
    });
  });

  describe('has', () => {
    it('should return true for existing template', () => {
      registry.register('exists', { name: 'exists', description: '', sections: [], styles: {} });
      expect(registry.has('exists')).toBe(true);
    });

    it('should return false for non-existing template', () => {
      expect(registry.has('not-exists')).toBe(false);
    });
  });

  describe('unregister', () => {
    it('should remove a template', () => {
      registry.register('to-remove', { name: 'to-remove', description: '', sections: [], styles: {} });
      registry.unregister('to-remove');
      expect(registry.has('to-remove')).toBe(false);
    });

    it('should return false when removing non-existing template', () => {
      expect(registry.unregister('non-existing')).toBe(false);
    });
  });

  describe('search', () => {
    it('should find templates by name', () => {
      registry.register('report-template', { name: 'report-template', description: 'Report template', sections: [], styles: {} });
      registry.register('letter-template', { name: 'letter-template', description: 'Letter template', sections: [], styles: {} });

      const results = registry.search('report');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('report-template');
    });
  });

  describe('clone', () => {
    it('should clone an existing template', () => {
      registry.register('original', { name: 'original', description: 'Original', sections: [], styles: { fontSize: 12 } });
      const cloned = registry.clone('original', 'cloned');

      expect(cloned).not.toBeNull();
      expect(cloned?.name).toBe('cloned');
      expect(cloned?.description).toContain('Clone');
      expect(cloned?.styles.fontSize).toBe(12);
    });

    it('should return null for non-existing template', () => {
      expect(registry.clone('non-existing', 'new-name')).toBeNull();
    });
  });

  describe('count', () => {
    it('should return the number of registered templates', () => {
      expect(registry.count()).toBe(0);
      registry.register('t1', { name: 't1', description: '', sections: [], styles: {} });
      registry.register('t2', { name: 't2', description: '', sections: [], styles: {} });
      expect(registry.count()).toBe(2);
    });
  });
});

describe('LayoutEngine', () => {
  let layoutEngine: LayoutEngine;

  beforeEach(() => {
    layoutEngine = new LayoutEngine();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const engine = new LayoutEngine();
      expect(engine).toBeDefined();
    });

    it('should initialize with custom options', () => {
      const engine = new LayoutEngine({
        defaultPageSize: { width: 8.5, height: 11, unit: 'in' },
        wordsPerPage: 600
      });
      expect(engine).toBeDefined();
    });
  });

  describe('calculateLayout', () => {
    it('should calculate layout for basic input', async () => {
      const input = {
        title: 'Test Document',
        sections: [
          { id: 's1', title: 'Section 1', level: 1, content: 'Content 1', order: 1 },
          { id: 's2', title: 'Section 2', level: 1, content: 'Content 2', order: 2 }
        ]
      };

      const layout = await layoutEngine.calculateLayout(input, 'test-run');
      expect(layout.pageCount).toBeGreaterThanOrEqual(1);
      expect(layout.pageSize).toBeDefined();
      expect(layout.margins).toBeDefined();
    });

    it('should generate TOC entries', async () => {
      const input = {
        title: 'Test',
        sections: [
          { id: 'h1', title: 'Heading 1', level: 1, content: '', order: 1 },
          { id: 'h2', title: 'Heading 2', level: 2, content: '', order: 2 }
        ]
      };

      const layout = await layoutEngine.calculateLayout(input, 'test-run');
      expect(layout.toc.length).toBe(2);
      expect(layout.toc[0].level).toBe(1);
    });

    it('should generate running headers', async () => {
      const input = {
        title: 'Test',
        sections: [
          { id: 'chap1', title: 'Chapter 1', level: 1, content: 'Content', order: 1 },
          { id: 'chap2', title: 'Chapter 2', level: 1, content: 'Content', order: 2 }
        ]
      };

      const layout = await layoutEngine.calculateLayout(input, 'test-run');
      expect(layout.runningHeaders.length).toBe(2);
    });
  });

  describe('calculatePageBreaks', () => {
    it('should calculate page breaks based on content', () => {
      const input = {
        title: 'Test',
        sections: [
          { id: 's1', title: 'Section', level: 1, content: 'word '.repeat(600), order: 1 }
        ]
      };

      const breaks = layoutEngine.calculatePageBreaks(input);
      expect(breaks.length).toBe(1);
    });
  });

  describe('calculateColumnLayouts', () => {
    it('should return column layouts for each page', () => {
      const input = {
        title: 'Test',
        sections: []
      };

      const layouts = layoutEngine.calculateColumnLayouts(input);
      expect(layouts.length).toBeGreaterThan(0);
      expect(layouts[0].columns).toBe(1);
    });
  });

  describe('estimatePageCount', () => {
    it('should estimate page count based on content', () => {
      const input = {
        title: 'Test',
        sections: [
          { id: 's1', title: 'Section', level: 1, content: 'word '.repeat(1500), order: 1 }
        ]
      };

      const count = layoutEngine.estimatePageCount(input);
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('LayoutCalculator', () => {
  let calculator: LayoutCalculator;

  beforeEach(() => {
    calculator = new LayoutCalculator();
  });

  describe('calculatePageMetrics', () => {
    it('should calculate page metrics correctly', () => {
      const pageSize = { width: 8.5, height: 11, unit: 'in' };
      const margins = { top: 1, bottom: 1, left: 1, right: 1 };

      const metrics = calculator.calculatePageMetrics(pageSize, margins);

      expect(metrics.pageWidth).toBeGreaterThan(0);
      expect(metrics.pageHeight).toBeGreaterThan(0);
      expect(metrics.contentWidth).toBeLessThan(metrics.pageWidth);
      expect(metrics.contentHeight).toBeLessThan(metrics.pageHeight);
      expect(metrics.availableHeight).toBeLessThan(metrics.contentHeight);
    });
  });

  describe('calculateColumnMetrics', () => {
    it('should calculate column metrics', () => {
      const metrics = calculator.calculateColumnMetrics(2, 0.5, 612);

      expect(metrics.columns).toBe(2);
      expect(metrics.gap).toBeGreaterThan(0);
      expect(metrics.columnWidth).toBeGreaterThan(0);
      expect(metrics.totalWidth).toBeLessThanOrEqual(612);
    });
  });

  describe('calculateTextFlow', () => {
    it('should calculate text flow', () => {
      const content = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
      const pageMetrics: PageMetrics = {
        pageWidth: 612,
        pageHeight: 792,
        contentWidth: 468,
        contentHeight: 648,
        headerHeight: 36,
        footerHeight: 36,
        availableHeight: 576,
        unit: 'pt'
      };

      const flow = calculator.calculateTextFlow(content, pageMetrics);

      expect(flow.lines.length).toBe(5);
      expect(flow.lineCount).toBe(5);
    });
  });

  describe('estimateContentPages', () => {
    it('should estimate content pages', () => {
      const content = 'word '.repeat(1000);
      const pageMetrics: PageMetrics = {
        pageWidth: 612,
        pageHeight: 792,
        contentWidth: 468,
        contentHeight: 648,
        headerHeight: 36,
        footerHeight: 36,
        availableHeight: 576,
        unit: 'pt'
      };

      const pages = calculator.estimateContentPages(content, pageMetrics);
      expect(pages).toBeGreaterThanOrEqual(1);
    });
  });

  describe('calculateImagePlacement', () => {
    it('should calculate image placement', () => {
      const pageMetrics: PageMetrics = {
        pageWidth: 612,
        pageHeight: 792,
        contentWidth: 468,
        contentHeight: 648,
        headerHeight: 36,
        footerHeight: 36,
        availableHeight: 576,
        unit: 'pt'
      };

      const placement = calculator.calculateImagePlacement(200, 150, pageMetrics);

      expect(placement.fits).toBe(true);
      expect(placement.scale).toBeLessThanOrEqual(1);
    });
  });
});

describe('TypographyEngine', () => {
  let typography: TypographyEngine;

  beforeEach(() => {
    typography = new TypographyEngine();
  });

  describe('constructor', () => {
    it('should initialize with default settings', () => {
      expect(typography).toBeDefined();
    });

    it('should initialize with custom options', () => {
      const custom = new TypographyEngine({
        defaultFontFamily: 'Arial',
        defaultFontSize: 14
      });
      expect(custom).toBeDefined();
    });
  });

  describe('configure', () => {
    it('should update typography settings', () => {
      typography.configure({
        defaultFontFamily: 'Georgia',
        defaultLineHeight: 1.8
      });

      const settings = typography.getCurrentSettings();
      expect(settings.defaultFontFamily).toBe('Georgia');
      expect(settings.defaultLineHeight).toBe(1.8);
    });
  });

  describe('applyToText', () => {
    it('should apply text styles', () => {
      const result = typography.applyToText('Hello World', {
        fontSize: 16,
        fontWeight: 700,
        color: '#ff0000'
      });

      expect(result.html).toContain('Hello World');
      expect(result.plainText).toBe('Hello World');
      expect(result.metrics.length).toBeGreaterThanOrEqual(1);
    });

    it('should use default styles when not specified', () => {
      const result = typography.applyToText('Test');
      expect(result.html).toContain('Test');
    });
  });

  describe('calculateLineMetrics', () => {
    it('should calculate line metrics', () => {
      const metrics = typography.calculateLineMetrics('Test line', {
        fontSize: 12,
        lineHeight: 1.5
      });

      expect(metrics.text).toBe('Test line');
      expect(metrics.width).toBeGreaterThan(0);
      expect(metrics.height).toBeGreaterThan(0);
    });
  });

  describe('calculateParagraphMetrics', () => {
    it('should calculate paragraph metrics', () => {
      const metrics = typography.calculateParagraphMetrics('Line 1\nLine 2', {
        fontSize: 12,
        lineHeight: 1.5,
        marginTop: 12,
        marginBottom: 12
      });

      expect(metrics.text).toContain('Line 1');
      expect(metrics.lineCount).toBe(2);
      expect(metrics.totalHeight).toBeGreaterThan(0);
    });
  });

  describe('hyphenate', () => {
    it('should hyphenate long words', () => {
      const words = typography.hyphenate('documentation');
      expect(Array.isArray(words)).toBe(true);
    });

    it('should not hyphenate short words', () => {
      const words = typography.hyphenate('test');
      expect(words).toContain('test');
    });
  });

  describe('loadFont', () => {
    it('should load a new font', () => {
      typography.loadFont('CustomFont', {
        weights: [400, 700],
        fallback: 'Arial'
      });

      const fonts = typography.getLoadedFonts();
      expect(fonts).toContain('CustomFont');
    });
  });

  describe('getHeadingStyle', () => {
    it('should return correct style for h1', () => {
      const style = typography.getHeadingStyle(1);
      expect(style.fontSize).toBe(36);
      expect(style.fontWeight).toBe(700);
    });

    it('should return correct style for h2', () => {
      const style = typography.getHeadingStyle(2);
      expect(style.fontSize).toBe(24);
      expect(style.fontWeight).toBe(600);
    });
  });

  describe('generateCSS', () => {
    it('should generate CSS string', () => {
      const css = typography.generateCSS({
        fontFamily: 'Arial',
        fontSize: 14,
        color: '#333'
      });

      expect(css).toContain('font-family: Arial');
      expect(css).toContain('font-size: 14pt');
      expect(css).toContain('color: #333');
    });
  });
});

describe('Template Engine Integration', () => {
  let engine: TemplateEngine;

  beforeEach(() => {
    engine = new TemplateEngine();
  });

  it('should register template with TOC data', async () => {
    engine.registerTemplate('doc', `
      <html>
      <body>
        <h1>{{ title }}</h1>
        {{#each sections}}
          <section>{{ title }}</section>
        {{/each}}
      </body>
      </html>
    `);

    expect(engine.hasTemplate('doc')).toBe(true);
  });
});

describe('Layout and Typography Integration', () => {
  let layoutEngine: LayoutEngine;
  let typography: TypographyEngine;

  beforeEach(() => {
    layoutEngine = new LayoutEngine();
    typography = new TypographyEngine();
  });

  it('should work together for document generation', async () => {
    const input = {
      title: 'Test Document',
      sections: [
        { id: 's1', title: 'Introduction', level: 1, content: 'This is the introduction content.', order: 1 },
        { id: 's2', title: 'Details', level: 1, content: 'Detailed information here.', order: 2 }
      ]
    };

    const layout = await layoutEngine.calculateLayout(input, 'integration-test');
    const styledText = typography.applyToText('Sample text', { fontSize: 12 });

    expect(layout.pageCount).toBeGreaterThanOrEqual(1);
    expect(styledText.html).toContain('Sample text');
  });
});
