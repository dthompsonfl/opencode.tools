import * as readline from 'readline';
import { PDFStyling, ColorScheme, TypographySettings, PageLayoutConfig, HeaderFooterConfig } from '@/types/pdf';
import { displaySection, confirm, selectOption } from './tui-utils';

export const presetSchemes: ColorScheme[] = [
  { name: 'Corporate Blue', primary: '#1a365d', secondary: '#2c5282', accent: '#ed8936' },
  { name: 'Modern Gray', primary: '#2d3748', secondary: '#4a5568', accent: '#38b2ac' },
  { name: 'Professional', primary: '#1a202c', secondary: '#2d3748', accent: '#3182ce' },
  { name: 'Custom', primary: '#1a365d', secondary: '#2c5282', accent: '#ed8936' }
];

export const availableFonts = [
  { id: 'helvetica', label: 'Helvetica/Arial', description: 'Clean, modern sans-serif' },
  { id: 'times', label: 'Times New Roman', description: 'Classic serif font' },
  { id: 'courier', label: 'Courier New', description: 'Monospace font' },
  { id: 'georgia', label: 'Georgia', description: 'Elegant serif' },
  { id: 'verdana', label: 'Verdana', description: 'Readable sans-serif' }
];

export const pageSizes = [
  { id: 'A4', label: 'A4', description: '210 x 297 mm (international standard)' },
  { id: 'Letter', label: 'Letter', description: '8.5 x 11 in (US standard)' },
  { id: 'Legal', label: 'Legal', description: '8.5 x 14 in (US legal)' },
  { id: 'Tabloid', label: 'Tabloid', description: '11 x 17 in (US)' }
];

export class StyleConfigurator {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async run(): Promise<PDFStyling> {
    try {
      displaySection('Document Styling');

      const colorScheme = await this.selectColorScheme();
      const typography = await this.configureTypography();
      const pageLayout = await this.configurePageLayout();
      const headersFooters = await this.configureHeadersFooters();

      return {
        colorScheme,
        typography,
        pageLayout,
        headersFooters
      };
    } finally {
      this.rl.close();
    }
  }

  private async selectColorScheme(): Promise<ColorScheme> {
    displaySection('Color Scheme');

    const usePreset = await this.confirm('Use a preset color scheme');

    if (usePreset) {
      const presets = presetSchemes.map(scheme => ({
        id: scheme.name,
        label: scheme.name,
        description: `Primary: ${scheme.primary}, Accent: ${scheme.accent}`
      }));

      const selected = await selectOption('Select color scheme:', presets);
      return presetSchemes.find(s => s.name === selected) || presetSchemes[0];
    }

    console.log('Custom color scheme:');
    const primary = await this.askQuestion('Enter primary color (hex): ');
    const secondary = await this.askQuestion('Enter secondary color (hex): ');
    const accent = await this.askQuestion('Enter accent color (hex): ');

    return {
      name: 'Custom',
      primary: primary || '#1a365d',
      secondary: secondary || '#2c5282',
      accent: accent || '#ed8936'
    };
  }

  private async configureTypography(): Promise<TypographySettings> {
    displaySection('Typography');

    const font = await selectOption('Select font family:', availableFonts);

    const fontSizeStr = await this.askQuestion('Enter body font size (default: 12): ');
    const bodySize = parseInt(fontSizeStr) || 12;

    const lineHeightStr = await this.askQuestion('Enter line height (default: 1.5): ');
    const lineHeight = parseFloat(lineHeightStr) || 1.5;

    const textColor = await this.askQuestion('Enter text color (hex, default: #333333): ');
    const headingColor = await this.askQuestion('Enter heading color (hex, optional): ');

    return {
      fontFamily: font,
      fontSize: {
        body: bodySize,
        heading1: 24,
        heading2: 20,
        heading3: 16,
        caption: 10
      },
      lineHeight,
      fontWeight: {
        body: 400,
        headings: 700
      },
      textColor: textColor || '#333333',
      headingColor: headingColor || undefined
    };
  }

  private async configurePageLayout(): Promise<PageLayoutConfig> {
    displaySection('Page Layout');

    const size = await selectOption('Select page size:', pageSizes);
    const orientation = await this.selectOrientation();

    const marginStr = await this.askQuestion('Enter margin (all sides in mm, default: 25): ');
    const margin = parseInt(marginStr) || 25;

    const columnsStr = await this.askQuestion('Enter number of columns (default: 1): ');
    const columns = parseInt(columnsStr) || 1;

    const columnGapStr = await this.askQuestion('Enter column gap in mm (default: 10): ');
    const columnGap = parseInt(columnGapStr) || 10;

    const pageNumbers = await this.confirm('Include page numbers');

    return {
      pageSize: size as 'A4' | 'Letter' | 'Legal' | 'Tabloid',
      orientation: orientation as 'portrait' | 'landscape',
      margins: {
        top: margin,
        bottom: margin,
        left: margin,
        right: margin
      },
      columns,
      columnGap,
      pageNumbers
    };
  }

  private async selectOrientation(): Promise<string> {
    const options = [
      { id: 'portrait', label: 'Portrait', description: 'Vertical orientation' },
      { id: 'landscape', label: 'Landscape', description: 'Horizontal orientation' }
    ];

    return await selectOption('Select page orientation:', options);
  }

  private async configureHeadersFooters(): Promise<HeaderFooterConfig> {
    displaySection('Headers and Footers');

    const includeHeader = await this.confirm('Include header on pages');
    const includeFooter = await this.confirm('Include footer on pages');

    const headerFooter: HeaderFooterConfig = {};

    if (includeHeader) {
      headerFooter.header = {
        includeOnFirst: await this.confirm('Include header on first page'),
        fontSize: parseInt(await this.askQuestion('Header font size (default: 10): ')) || 10
      };

      const headerLeft = await this.askQuestion('Header left text (optional): ');
      const headerCenter = await this.askQuestion('Header center text (optional): ');
      const headerRight = await this.askQuestion('Header right text (optional): ');

      if (headerLeft) headerFooter.header.left = headerLeft;
      if (headerCenter) headerFooter.header.center = headerCenter;
      if (headerRight) headerFooter.header.right = headerRight;
    }

    if (includeFooter) {
      headerFooter.footer = {
        includeOnFirst: await this.confirm('Include footer on first page'),
        fontSize: parseInt(await this.askQuestion('Footer font size (default: 10): ')) || 10
      };

      const footerLeft = await this.askQuestion('Footer left text (optional): ');
      const footerCenter = await this.askQuestion('Footer center text (optional): ');
      const footerRight = await this.askQuestion('Footer right text (optional): ');

      if (footerLeft) headerFooter.footer.left = footerLeft;
      if (footerCenter) headerFooter.footer.center = footerCenter;
      if (footerRight) headerFooter.footer.right = footerRight;
    }

    return headerFooter;
  }

  private askQuestion(question: string): Promise<string> {
    return new Promise(resolve => {
      this.rl.question(question, answer => {
        resolve(answer);
      });
    });
  }

  private confirm(question: string): Promise<boolean> {
    return new Promise(resolve => {
      this.rl.question(`${question} (y/n): `, answer => {
        resolve(answer.toLowerCase().startsWith('y'));
      });
    });
  }
}

export default StyleConfigurator;
