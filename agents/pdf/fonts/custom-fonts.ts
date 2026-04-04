import { FontConfig } from '../assets/asset-config';

/**
 * Custom font configuration options
 */
export interface CustomFontConfig {
  family: string;
  source: string;
  weights?: number[];
  style?: 'normal' | 'italic';
  subset?: string;
  displayName?: string;
  category?: 'serif' | 'sans-serif' | 'monospace' | 'display' | 'handwriting';
  fallback?: string;
}

/**
 * Google Fonts configuration
 */
export const googleFonts: CustomFontConfig[] = [
  {
    family: 'Roboto',
    source: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2',
    weights: [400, 700],
    style: 'normal',
    category: 'sans-serif',
    fallback: 'Helvetica',
  },
  {
    family: 'Open Sans',
    source: 'https://fonts.gstatic.com/s/opensans/v34/memSYaGs126MiZpYUfAcn.woff2',
    weights: [400, 700],
    style: 'normal',
    category: 'sans-serif',
    fallback: 'Helvetica',
  },
  {
    family: 'Lato',
    source: 'https://fonts.gstatic.com/s/lato/v23/S6uyw4BMUTPHjx4wXiWtFCc.woff2',
    weights: [400, 700],
    style: 'normal',
    category: 'sans-serif',
    fallback: 'Helvetica',
  },
  {
    family: 'Merriweather',
    source: 'https://fonts.gstatic.com/s/merriweather/v30/u-4n0qyriQwlOrhSvowK_l52_wfzU1U9.woff2',
    weights: [400, 700],
    style: 'normal',
    category: 'serif',
    fallback: 'Times-Roman',
  },
  {
    family: 'Source Code Pro',
    source: 'https://fonts.gstatic.com/s/sourcecodepro/v15/HI_diYsKStx74E9bYcw5.woff2',
    weights: [400, 700],
    style: 'normal',
    category: 'monospace',
    fallback: 'Courier',
  },
];

/**
 * Open source fonts for professional documents
 */
export const openSourceFonts: CustomFontConfig[] = [
  {
    family: 'Inter',
    source: 'https://github.com/rsms/inter/raw/master/docs/font-files/Inter-Regular.woff2',
    weights: [400, 700],
    style: 'normal',
    category: 'sans-serif',
    fallback: 'Helvetica',
    displayName: 'Inter',
  },
  {
    family: 'Playfair Display',
    source: 'https://github.com/google/fonts/raw/main/ofl/playfairdisplay/PlayfairDisplay-Regular.ttf',
    weights: [400, 700],
    style: 'normal',
    category: 'serif',
    fallback: 'Times-Roman',
    displayName: 'Playfair Display',
  },
  {
    family: 'Fira Code',
    source: 'https://github.com/tonsky/FiraCode/blob/master/distr/ttf/FiraCode-Regular.ttf?raw=true',
    weights: [400, 700],
    style: 'normal',
    category: 'monospace',
    fallback: 'Courier',
    displayName: 'Fira Code',
  },
  {
    family: 'Lora',
    source: 'https://github.com/google/fonts/raw/main/ofl/lora/Lora-Regular.ttf',
    weights: [400, 700],
    style: 'normal',
    category: 'serif',
    fallback: 'Times-Roman',
    displayName: 'Lora',
  },
  {
    family: 'Work Sans',
    source: 'https://github.com/google/fonts/raw/main/ofl/worksans/WorkSans-Regular.ttf',
    weights: [400, 700],
    style: 'normal',
    category: 'sans-serif',
    fallback: 'Helvetica',
    displayName: 'Work Sans',
  },
];

/**
 * Premium-style fonts for business documents
 */
export const businessFonts: CustomFontConfig[] = [
  {
    family: 'Montserrat',
    source: 'https://fonts.gstatic.com/s/montserrat/v25/JTUSjIg1_i6t8kCHKm459Wlhyw.woff2',
    weights: [400, 700],
    style: 'normal',
    category: 'sans-serif',
    fallback: 'Helvetica',
  },
  {
    family: 'Bitter',
    source: 'https://fonts.gstatic.com/s/bitter/v23/rax8HiqOu83IV0K6wj.woff2',
    weights: [400, 700],
    style: 'normal',
    category: 'serif',
    fallback: 'Times-Roman',
  },
  {
    family: 'Ubuntu Mono',
    source: 'https://fonts.gstatic.com/s/ubuntumono/v15/KFOjCneDtsqEr0hlXQms0IPxAQw.woff2',
    weights: [400, 700],
    style: 'normal',
    category: 'monospace',
    fallback: 'Courier',
  },
];

/**
 * Font substitution map for when custom fonts are not available
 */
export const fontSubstitutions: Record<string, string> = {
  'Arial': 'Helvetica',
  'Arial Black': 'Helvetica-Bold',
  'Arial Narrow': 'Helvetica',
  'Calibri': 'Helvetica',
  'Cambria': 'Times-Roman',
  'Century Gothic': 'Helvetica',
  'Comic Sans MS': 'Helvetica',
  'Consolas': 'Courier',
  'Courier New': 'Courier',
  'Georgia': 'Times-Roman',
  'Helvetica Neue': 'Helvetica',
  'Impact': 'Helvetica-Bold',
  'Lucida Console': 'Courier',
  'Lucida Sans Unicode': 'Helvetica',
  'Microsoft Sans Serif': 'Helvetica',
  'Palatino Linotype': 'Times-Roman',
  'Tahoma': 'Helvetica',
  'Trebuchet MS': 'Helvetica',
  'Verdana': 'Helvetica',
};

/**
 * Gets all available custom fonts
 * @returns Array of custom font configurations
 */
export function getAllCustomFonts(): CustomFontConfig[] {
  return [
    ...googleFonts,
    ...openSourceFonts,
    ...businessFonts,
  ];
}

/**
 * Gets custom fonts by category
 * @param category - Font category
 * @returns Array of custom font configurations
 */
export function getFontsByCategory(category: CustomFontConfig['category']): CustomFontConfig[] {
  return getAllCustomFonts().filter(font => font.category === category);
}

/**
 * Gets a custom font by family name
 * @param family - Font family name
 * @returns Custom font configuration or undefined
 */
export function getFontByFamily(family: string): CustomFontConfig | undefined {
  return getAllCustomFonts().find(
    font => font.family.toLowerCase() === family.toLowerCase()
  );
}

/**
 * Checks if a font is available as custom font
 * @param family - Font family name
 * @returns True if custom font is available
 */
export function isCustomFont(family: string): boolean {
  return getFontByFamily(family) !== undefined;
}

/**
 * Gets the font configuration for PDF embedding
 * @param fontFamily - Font family name
 * @param customFonts - Array of custom font configurations
 * @returns Font configuration for loading
 */
export function getFontConfig(
  fontFamily: string,
  customFonts?: CustomFontConfig[]
): FontConfig | null {
  const fonts = customFonts ?? getAllCustomFonts();
  const customFont = fonts.find(
    f => f.family.toLowerCase() === fontFamily.toLowerCase()
  );

  if (customFont) {
    return {
      family: customFont.displayName ?? customFont.family,
      source: customFont.source,
      weights: customFont.weights,
      style: customFont.style,
      subset: customFont.subset,
    };
  }

  return null;
}
