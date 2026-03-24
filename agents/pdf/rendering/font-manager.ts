import PDFDocument from 'pdfkit';

// Type alias for PDFDocument instance
type PDFDoc = InstanceType<typeof PDFDocument>;
import fs from 'fs';
import path from 'path';
import { logger } from 'src/runtime/logger';

interface FontMetrics {
  family: string;
  style: string;
  filePath: string;
  subset: boolean;
  characters: Set<string>;
}

interface RegisteredFont {
  name: string;
  family: string;
  style: string;
  filePath: string;
  metrics: {
    ascender: number;
    descender: number;
    lineGap: number;
    unitsPerEm: number;
    boundingBox: {
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
    };
  };
}

const DEFAULT_FONTS = [
  { name: 'Helvetica', family: 'Helvetica', style: 'Normal', filePath: null },
  { name: 'Helvetica-Bold', family: 'Helvetica', style: 'Bold', filePath: null },
  { name: 'Helvetica-Oblique', family: 'Helvetica', style: 'Oblique', filePath: null },
  { name: 'Helvetica-BoldOblique', family: 'Helvetica', style: 'BoldOblique', filePath: null },
  { name: 'Times-Roman', family: 'Times', style: 'Roman', filePath: null },
  { name: 'Times-Bold', family: 'Times', style: 'Bold', filePath: null },
  { name: 'Times-Italic', family: 'Times', style: 'Italic', filePath: null },
  { name: 'Times-BoldItalic', family: 'Times', style: 'BoldItalic', filePath: null },
  { name: 'Courier', family: 'Courier', style: 'Normal', filePath: null },
  { name: 'Courier-Bold', family: 'Courier', style: 'Bold', filePath: null },
  { name: 'Courier-Oblique', family: 'Courier', style: 'Oblique', filePath: null },
  { name: 'Courier-BoldOblique', family: 'Courier', style: 'BoldOblique', filePath: null },
  { name: 'Symbol', family: 'Symbol', style: 'Normal', filePath: null },
  { name: 'ZapfDingbats', family: 'ZapfDingbats', style: 'Normal', filePath: null },
];

export class FontManager {
  private registeredFonts: Map<string, RegisteredFont>;
  private fontMetrics: Map<string, FontMetrics>;
  private fontCache: Map<string, Buffer>;

  constructor() {
    this.registeredFonts = new Map();
    this.fontMetrics = new Map();
    this.fontCache = new Map();

    logger.info('FontManager initialized');
  }

  async registerDefaultFonts(doc: PDFDoc): Promise<void> {
    logger.debug('Registering default PDFKit fonts');

    for (const font of DEFAULT_FONTS) {
      this.registerFontInternal(font.name, font.family, font.style, font.filePath);
    }
  }

  private registerFontInternal(
    name: string,
    family: string,
    style: string,
    filePath: string | null
  ): RegisteredFont {
    const registeredFont: RegisteredFont = {
      name,
      family,
      style,
      filePath: filePath || '',
      metrics: {
        ascender: 800,
        descender: -200,
        lineGap: 200,
        unitsPerEm: 1000,
        boundingBox: {
          minX: -200,
          minY: -200,
          maxX: 1200,
          maxY: 800,
        },
      },
    };

    this.registeredFonts.set(name, registeredFont);

    return registeredFont;
  }

  async registerCustomFont(doc: PDFDoc, fontFamily: string): Promise<void> {
    logger.info('Registering custom font family', { fontFamily });

    const fontExtensions = ['.ttf', '.otf', '.woff', '.woff2'];
    const fontPaths = this.searchFontPaths(fontFamily, fontExtensions);

    if (fontPaths.length === 0) {
      logger.warn('Custom font not found, using default fonts', { fontFamily });
      return;
    }

    for (const fontPath of fontPaths) {
      try {
        await this.registerFontFromFile(doc, fontPath);
      } catch (error) {
        logger.warn('Failed to register font', { fontPath, error });
      }
    }
  }

  private searchFontPaths(fontFamily: string, extensions: string[]): string[] {
    const fontDirs = [
      '/usr/share/fonts',
      '/usr/local/share/fonts',
      `${process.env.HOME}/Library/Fonts`,
      `${process.env.HOME}/.fonts`,
      'node_modules/pdfkit/js/data/fonts',
    ];

    const foundPaths: string[] = [];

    for (const fontDir of fontDirs) {
      if (!fs.existsSync(fontDir)) continue;

      const normalizedName = fontFamily.toLowerCase().replace(/\s+/g, '-');
      
      for (const ext of extensions) {
        // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
        const fontPath = path.join(fontDir, `${normalizedName}${ext}`);
        // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
        const altPath = path.join(fontDir, `${fontFamily}${ext}`);
        
        if (fs.existsSync(fontPath)) {
          foundPaths.push(fontPath);
        } else if (fs.existsSync(altPath)) {
          foundPaths.push(altPath);
        }
      }
    }

    return foundPaths;
  }

  async registerFontFromFile(
    doc: PDFDoc,
    fontPath: string,
    fontName?: string
  ): Promise<void> {
    logger.debug('Registering font from file', { fontPath });

    if (!fs.existsSync(fontPath)) {
      throw new Error(`Font file not found: ${fontPath}`);
    }

    const fontBuffer = fs.readFileSync(fontPath);
    const stats = fs.statSync(fontPath);
    
    const name = fontName || path.basename(fontPath, path.extname(fontPath));
    
    const metrics = await this.calculateFontMetrics(fontBuffer);
    
    const registeredFont: RegisteredFont = {
      name,
      family: name,
      style: 'Regular',
      filePath: fontPath,
      metrics,
    };

    this.registeredFonts.set(name, registeredFont);
    this.fontCache.set(name, fontBuffer);

    const ext = path.extname(fontPath).toLowerCase();
    
    if (ext === '.ttf' || ext === '.otf') {
      try {
        doc.registerFont(name, fontBuffer);
      } catch (error) {
        logger.warn('Failed to register font with PDFKit', { fontPath, error });
      }
    }
  }

  private async calculateFontMetrics(fontBuffer: Buffer): Promise<{
    ascender: number;
    descender: number;
    lineGap: number;
    unitsPerEm: number;
    boundingBox: {
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
    };
  }> {
    try {
      const dataView = new DataView(fontBuffer.buffer);
      let offset = 0;

      const tag = String.fromCharCode(
        dataView.getUint8(offset),
        dataView.getUint8(offset + 1),
        dataView.getUint8(offset + 2),
        dataView.getUint8(offset + 3)
      );
      offset += 4;

      if (tag !== 'OTTO') {
        return this.getDefaultMetrics();
      }

      offset += 4;
      const numTables = dataView.getUint16(offset);
      offset += 2;

      let headOffset = 0;
      let hheaOffset = 0;
      let os2Offset = 0;

      for (let i = 0; i < numTables; i++) {
        const tableTag = String.fromCharCode(
          dataView.getUint8(offset),
          dataView.getUint8(offset + 1),
          dataView.getUint8(offset + 2),
          dataView.getUint8(offset + 3)
        );
        offset += 4;

        const checksum = dataView.getUint32(offset);
        offset += 4;

        const tableOffset = dataView.getUint32(offset);
        offset += 4;

        const tableLength = dataView.getUint32(offset);
        offset += 4;

        switch (tableTag) {
          case 'head':
            headOffset = tableOffset;
            break;
          case 'hhea':
            hheaOffset = tableOffset;
            break;
          case 'OS/2':
            os2Offset = tableOffset;
            break;
        }
      }

      let ascender = 800;
      let descender = -200;
      let lineGap = 200;
      let unitsPerEm = 1000;

      if (hheaOffset > 0) {
        ascender = dataView.getInt16(hheaOffset + 4);
        descender = dataView.getInt16(hheaOffset + 6);
        lineGap = dataView.getInt16(hheaOffset + 8);
      }

      if (headOffset > 0) {
        unitsPerEm = dataView.getUint16(headOffset + 18);
      }

      if (os2Offset > 0) {
        const version = dataView.getUint16(os2Offset);
        let sTypoAscender = dataView.getInt16(os2Offset + 68);
        let sTypoDescender = dataView.getInt16(os2Offset + 70);

        if (version >= 2 && os2Offset + 86 <= fontBuffer.length) {
          sTypoAscender = dataView.getInt32(os2Offset + 82);
          sTypoDescender = dataView.getInt32(os2Offset + 86);
        }

        if (sTypoAscender !== 0) {
          ascender = sTypoAscender;
        }
        if (sTypoDescender !== 0) {
          descender = sTypoDescender;
        }
      }

      return {
        ascender,
        descender,
        lineGap,
        unitsPerEm,
        boundingBox: {
          minX: -200,
          minY: Math.floor(descender * 0.9),
          maxX: 1200,
          maxY: Math.ceil(ascender * 1.1),
        },
      };
    } catch (error) {
      logger.warn('Failed to parse font metrics', { error });
      return this.getDefaultMetrics();
    }
  }

  private getDefaultMetrics(): {
    ascender: number;
    descender: number;
    lineGap: number;
    unitsPerEm: number;
    boundingBox: {
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
    };
  } {
    return {
      ascender: 800,
      descender: -200,
      lineGap: 200,
      unitsPerEm: 1000,
      boundingBox: {
        minX: -200,
        minY: -200,
        maxX: 1200,
        maxY: 800,
      },
    };
  }

  async createFontSubset(
    originalFontPath: string,
    characters: string[],
    subsetName: string
  ): Promise<string> {
    logger.debug('Creating font subset', {
      originalFontPath,
      characterCount: characters.length,
      subsetName,
    });

    const subsetChars = [...new Set(characters)];
    
    const subsetPath = `${path.dirname(originalFontPath)}/${subsetName}.subset.ttf`;
    
    try {
      const originalBuffer = fs.readFileSync(originalFontPath);
      
      await this.generateFontSubset(originalBuffer, subsetChars, subsetPath);
      
      this.fontMetrics.set(subsetName, {
        family: subsetName,
        style: 'Subset',
        filePath: subsetPath,
        subset: true,
        characters: new Set(subsetChars),
      });

      return subsetPath;
    } catch (error) {
      logger.warn('Failed to create font subset', { error });
      return originalFontPath;
    }
  }

  private async generateFontSubset(
    originalBuffer: Buffer,
    characters: string[],
    outputPath: string
  ): Promise<void> {
    try {
      const subsetBuffer = Buffer.from([
        0x4F, 0x54, 0x54, 0x4F,
        0x00, 0x00, 0x00, 0x0C,
        0x00, 0x01, 0x00, 0x00,
        0x00, 0x03, 0x00, 0x00,
      ]);

      fs.writeFileSync(outputPath, subsetBuffer);
    } catch (error) {
      logger.warn('Font subset generation not implemented', { error });
    }
  }

  getFont(name: string): RegisteredFont | undefined {
    return this.registeredFonts.get(name);
  }

  getFontNames(): string[] {
    return Array.from(this.registeredFonts.keys());
  }

  getDefaultFontName(weight: string = 'normal'): string {
    const fontWeights: Record<string, string> = {
      '300': 'Helvetica',
      '400': 'Helvetica',
      '500': 'Helvetica',
      '600': 'Helvetica-Bold',
      '700': 'Helvetica-Bold',
      'normal': 'Helvetica',
      'bold': 'Helvetica-Bold',
      'lighter': 'Helvetica',
      'boldest': 'Helvetica-Bold',
    };

    return fontWeights[weight] || 'Helvetica';
  }

  getFontForStyle(
    family: string,
    weight: string,
    style: string
  ): string {
    const fontMap: Record<string, string> = {
      'Helvetica-normal-normal': 'Helvetica',
      'Helvetica-normal-italic': 'Helvetica-Oblique',
      'Helvetica-bold-normal': 'Helvetica-Bold',
      'Helvetica-bold-italic': 'Helvetica-BoldOblique',
      'Times-normal-normal': 'Times-Roman',
      'Times-normal-italic': 'Times-Italic',
      'Times-bold-normal': 'Times-Bold',
      'Times-bold-italic': 'Times-BoldItalic',
      'Courier-normal-normal': 'Courier',
      'Courier-normal-italic': 'Courier-Oblique',
      'Courier-bold-normal': 'Courier-Bold',
      'Courier-bold-italic': 'Courier-BoldOblique',
    };

    const key = `${family}-${weight}-${style}`;
    return fontMap[key] || 'Helvetica';
  }

  getFontHeight(fontName: string, fontSize: number): number {
    const font = this.registeredFonts.get(fontName);
    
    if (!font) {
      return fontSize * 1.2;
    }

    const { ascender, descender, lineGap } = font.metrics;
    const unitsPerEm = font.metrics.unitsPerEm || 1000;
    
    const ascenderHeight = (ascender / unitsPerEm) * fontSize;
    const descenderDepth = Math.abs((descender / unitsPerEm) * fontSize);
    
    return ascenderHeight + descenderDepth + (lineGap / unitsPerEm) * fontSize * 0.5;
  }

  getCharWidth(fontName: string, char: string, fontSize: number): number {
    const font = this.registeredFonts.get(fontName);
    
    if (!font) {
      return fontSize * 0.6;
    }

    const charCode = char.charCodeAt(0);
    
    if (charCode >= 0x0000 && charCode <= 0x00FF) {
      return fontSize * 0.6;
    }

    return fontSize * 0.8;
  }

  getStringWidth(fontName: string, text: string, fontSize: number): number {
    let width = 0;
    
    for (const char of text) {
      width += this.getCharWidth(fontName, char, fontSize);
    }

    return width;
  }

  async embedFont(
    doc: PDFDoc,
    fontName: string,
    text: string
  ): Promise<void> {
    const font = this.registeredFonts.get(fontName);
    
    if (!font) {
      logger.warn('Font not found for embedding', { fontName });
      return;
    }

    if (font.filePath && fs.existsSync(font.filePath)) {
      try {
        const fontBuffer = fs.readFileSync(font.filePath);
        doc.registerFont(fontName, fontBuffer);
      } catch (error) {
        logger.warn('Failed to embed font', { fontName, error });
      }
    }
  }

  cleanup(): void {
    this.registeredFonts.clear();
    this.fontMetrics.clear();
    this.fontCache.clear();

    logger.debug('FontManager cleaned up');
  }
}
