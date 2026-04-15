/**
 * Default font configuration for PDF generation.
 * These fonts are standard PDF fonts that don't require embedding.
 */

export const defaultFonts = {
  Helvetica: 'Helvetica',
  'Helvetica-Bold': 'Helvetica-Bold',
  'Helvetica-Oblique': 'Helvetica-Oblique',
  'Helvetica-BoldOblique': 'Helvetica-BoldOblique',
  'Times-Roman': 'Times-Roman',
  'Times-Bold': 'Times-Bold',
  'Times-Italic': 'Times-Italic',
  'Times-BoldItalic': 'Times-BoldItalic',
  Courier: 'Courier',
  'Courier-Bold': 'Courier-Bold',
  'Courier-Oblique': 'Courier-Oblique',
  'Courier-BoldOblique': 'Courier-BoldOblique',
  Symbol: 'Symbol',
  ZapfDingbats: 'ZapfDingbats',
};

/**
 * Font family groups for easy lookup
 */
export const fontFamilies = {
  sans: ['Helvetica', 'Arial', 'Verdana', 'Trebuchet MS', 'Gill Sans', 'Univers'],
  serif: ['Times-Roman', 'Georgia', 'Palatino', 'Book Antiqua', 'Times New Roman'],
  mono: ['Courier', 'Courier New', 'Consolas', 'Monaco', 'Lucida Console'],
};

/**
 * Common font weights
 */
export const fontWeights = {
  thin: 100,
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
};

/**
 * Font styles
 */
export const fontStyles = {
  normal: 'normal',
  italic: 'italic',
  oblique: 'oblique',
};

/**
 * Default font configuration for PDF output
 */
export const defaultFontConfig = {
  body: {
    family: 'Helvetica',
    size: 12,
    style: 'normal',
    weight: 'normal' as const,
  },
  heading1: {
    family: 'Helvetica',
    size: 24,
    style: 'normal',
    weight: 'bold' as const,
  },
  heading2: {
    family: 'Helvetica',
    size: 18,
    style: 'normal',
    weight: 'bold' as const,
  },
  heading3: {
    family: 'Helvetica',
    size: 14,
    style: 'normal',
    weight: 'bold' as const,
  },
  heading4: {
    family: 'Helvetica',
    size: 12,
    style: 'normal',
    weight: 'bold' as const,
  },
  code: {
    family: 'Courier',
    size: 10,
    style: 'normal',
    weight: 'normal' as const,
  },
  caption: {
    family: 'Helvetica',
    size: 10,
    style: 'italic',
    weight: 'normal' as const,
  },
};

/**
 * Checks if a font is a standard PDF font
 * @param fontFamily - Font family name
 * @returns True if standard PDF font
 */
export function isStandardPdfFont(fontFamily: string): boolean {
  return Object.keys(defaultFonts).some(
    (standard) => standard.toLowerCase() === fontFamily.toLowerCase()
  );
}

/**
 * Gets the standard PDF font name
 * @param fontFamily - Font family name
 * @returns Standard PDF font name or original if not standard
 */
export function getStandardPdfFontName(fontFamily: string): string {
  const standard = Object.entries(defaultFonts).find(
    ([key]) => key.toLowerCase() === fontFamily.toLowerCase()
  );
  return standard?.[1] ?? fontFamily;
}
