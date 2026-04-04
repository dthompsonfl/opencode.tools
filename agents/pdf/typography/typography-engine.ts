import winston from 'winston';
import { typographyDefaults, headingSizes, FontConfig } from './font-config';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'typography-engine' }
});

export interface TypographyOptions {
  defaultFontFamily?: string;
  defaultFontSize?: number;
  defaultLineHeight?: number;
}

export interface TypographySettings {
  defaultFontFamily: string;
  defaultFontSize: number;
  defaultLineHeight: number;
  defaultFontWeight: 300 | 400 | 500 | 600 | 700;
  defaultLetterSpacing: number;
  kerning: boolean;
  ligatures: boolean;
}

export interface TextStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 300 | 400 | 500 | 600 | 700;
  fontStyle?: 'normal' | 'italic';
  color?: string;
  letterSpacing?: number;
  lineHeight?: number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  textDecoration?: 'none' | 'underline' | 'overline' | 'line-through';
  paddingBottom?: number;
}

export interface ParagraphStyle extends TextStyle {
  marginTop?: number;
  marginBottom?: number;
  textIndent?: number;
}

export interface LineMetrics {
  text: string;
  width: number;
  height: number;
  ascent: number;
  descent: number;
}

export interface ParagraphMetrics {
  text: string;
  lineCount: number;
  totalHeight: number;
  width: number;
}

export interface StyledText {
  html: string;
  plainText: string;
  metrics: LineMetrics[];
}

export class TypographyEngine {
  private settings: TypographySettings;
  private loadedFonts: Map<string, FontConfig>;
  private hyphenationPatterns: Map<string, string[]>;

  constructor(options: TypographyOptions = {}) {
    this.settings = {
      defaultFontFamily: options.defaultFontFamily ?? typographyDefaults.fontFamily,
      defaultFontSize: options.defaultFontSize ?? typographyDefaults.fontSize,
      defaultLineHeight: options.defaultLineHeight ?? typographyDefaults.lineHeight,
      defaultFontWeight: 400,
      defaultLetterSpacing: typographyDefaults.letterSpacing,
      kerning: typographyDefaults.kerning,
      ligatures: typographyDefaults.ligatures
    };

    this.loadedFonts = new Map();
    this.hyphenationPatterns = new Map();
    this.initializeDefaultFonts();
  }

  private initializeDefaultFonts(): void {
    const defaultFonts: FontConfig[] = [
      { family: 'Helvetica', weights: [300, 400, 500, 600, 700], fallback: 'Arial, sans-serif' },
      { family: 'Arial', weights: [400, 700], fallback: 'Helvetica, sans-serif' },
      { family: 'Times New Roman', weights: [400, 700], fallback: 'Georgia, serif' },
      { family: 'Georgia', weights: [400, 700], fallback: 'Times New Roman, serif' },
      { family: 'Courier New', weights: [400, 700], fallback: 'monospace' },
      { family: 'Consolas', weights: [400], fallback: 'monospace' }
    ];

    for (const font of defaultFonts) {
      this.loadedFonts.set(font.family, font);
    }
  }

  public configure(settings: Partial<TypographySettings>): void {
    this.settings = { ...this.settings, ...settings };
    logger.info('Typography settings updated');
  }

  public applyToText(text: string, style: TextStyle = {}): StyledText {
    const appliedStyle = this.mergeStyles(style);
    const html = this.generateStyledHtml(text, appliedStyle);
    const metrics = this.calculateLineMetricsForText(text, appliedStyle);

    return {
      html,
      plainText: text,
      metrics
    };
  }

  public calculateLineMetrics(text: string, style: TextStyle = {}): LineMetrics {
    const fontSize = style.fontSize ?? this.settings.defaultFontSize;
    const lineHeight = style.lineHeight ?? this.settings.defaultLineHeight;

    const avgCharWidth = fontSize * 0.5;
    const width = text.length * avgCharWidth;
    const height = fontSize * lineHeight;
    const ascent = fontSize * 0.8;
    const descent = fontSize * 0.2;

    return {
      text,
      width,
      height,
      ascent,
      descent
    };
  }

  public calculateParagraphMetrics(text: string, style: ParagraphStyle = {}): ParagraphMetrics {
    const lines = text.split('\n').filter(line => line.length > 0);
    const lineMetrics = lines.map(line => this.calculateLineMetrics(line, style));
    const totalHeight = lineMetrics.reduce((sum, m) => sum + m.height, 0);

    const marginTop = style.marginTop ?? 0;
    const marginBottom = style.marginBottom ?? 0;

    return {
      text,
      lineCount: lines.length,
      totalHeight: totalHeight + marginTop + marginBottom,
      width: Math.max(...lineMetrics.map(m => m.width))
    };
  }

  public hyphenate(text: string): string[] {
    const words = text.split(/\s+/);
    const hyphenated: string[] = [];

    for (const word of words) {
      if (word.length <= 5) {
        hyphenated.push(word);
        continue;
      }

      const hyphenatedWord = this.hyphenateWord(word);
      hyphenated.push(...hyphenatedWord);
    }

    return hyphenated;
  }

  private hyphenateWord(word: string): string[] {
    const hyphenationPoints = [3, 5, 7, 9];
    const hyphenated: string[] = [];
    let current = '';

    for (let i = 0; i < word.length; i++) {
      current += word[i];
      if (hyphenationPoints.includes(i + 1) && i < word.length - 1) {
        hyphenated.push(current + '-');
        current = '';
      }
    }

    if (current) {
      hyphenated.push(current);
    }

    return hyphenated.length > 0 ? hyphenated : [word];
  }

  public loadFont(fontFamily: string, options: Partial<FontConfig>): void {
    const existingFont = this.loadedFonts.get(fontFamily);
    const newFont: FontConfig = {
      family: fontFamily,
      weights: options.weights ?? (existingFont?.weights ?? [400]),
      fallback: options.fallback ?? (existingFont?.fallback ?? 'sans-serif'),
      features: options.features
    };

    this.loadedFonts.set(fontFamily, newFont);
    logger.info(`Font loaded: ${fontFamily}`);
  }

  public getHeadingStyle(level: number): TextStyle {
    const levelKey = `h${level}` as keyof typeof headingSizes;
    const headingConfig = headingSizes[levelKey] ?? headingSizes.h4;

    return {
      fontFamily: this.settings.defaultFontFamily,
      fontSize: headingConfig.fontSize,
      fontWeight: headingConfig.fontWeight as 300 | 400 | 500 | 600 | 700,
      lineHeight: headingConfig.lineHeight
    };
  }

  public generateCSS(style: TextStyle): string {
    const cssProps: string[] = [];

    if (style.fontFamily) cssProps.push(`font-family: ${style.fontFamily}`);
    if (style.fontSize) cssProps.push(`font-size: ${style.fontSize}pt`);
    if (style.fontWeight) cssProps.push(`font-weight: ${style.fontWeight}`);
    if (style.fontStyle) cssProps.push(`font-style: ${style.fontStyle}`);
    if (style.color) cssProps.push(`color: ${style.color}`);
    if (style.letterSpacing) cssProps.push(`letter-spacing: ${style.letterSpacing}px`);
    if (style.lineHeight) cssProps.push(`line-height: ${style.lineHeight}`);
    if (style.textAlign) cssProps.push(`text-align: ${style.textAlign}`);
    if (style.textDecoration) cssProps.push(`text-decoration: ${style.textDecoration}`);

    return cssProps.join('; ');
  }

  public getCurrentSettings(): Readonly<TypographySettings> {
    return { ...this.settings };
  }

  public getLoadedFonts(): string[] {
    return Array.from(this.loadedFonts.keys());
  }

  private mergeStyles(style: TextStyle): TextStyle {
    return {
      fontFamily: style.fontFamily ?? this.settings.defaultFontFamily,
      fontSize: style.fontSize ?? this.settings.defaultFontSize,
      fontWeight: style.fontWeight ?? this.settings.defaultFontWeight,
      fontStyle: style.fontStyle ?? 'normal',
      color: style.color ?? '#000000',
      letterSpacing: style.letterSpacing ?? this.settings.defaultLetterSpacing,
      lineHeight: style.lineHeight ?? this.settings.defaultLineHeight,
      textAlign: style.textAlign ?? 'left',
      textDecoration: style.textDecoration ?? 'none',
      ...style
    };
  }

  private generateStyledHtml(text: string, style: TextStyle): string {
    const css = this.generateCSS(style);
    return `<span style="${css}">${text}</span>`;
  }

  private calculateLineMetricsForText(text: string, style: TextStyle): LineMetrics[] {
    const lines = text.split('\n').filter(line => line.length > 0);
    return lines.map(line => this.calculateLineMetrics(line, style));
  }
}
