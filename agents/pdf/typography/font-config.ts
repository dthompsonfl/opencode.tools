export interface FontConfig {
  family: string;
  weights: number[];
  fallback: string;
  features?: {
    ligatures?: boolean;
    kerning?: boolean;
    tabularNumbers?: boolean;
    smallCaps?: boolean;
  };
}

export interface TypographyConfig {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  fontWeight: number;
  letterSpacing: number;
  kerning: boolean;
  ligatures: boolean;
}

export const typographyDefaults: TypographyConfig = {
  fontFamily: 'Helvetica',
  fontSize: 12,
  lineHeight: 1.5,
  fontWeight: 400,
  letterSpacing: 0,
  kerning: true,
  ligatures: true
};

export interface HeadingConfig {
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  marginBottom?: number;
}

export const headingSizes: Record<string, HeadingConfig> = {
  h1: { fontSize: 36, fontWeight: 700, lineHeight: 1.2, marginBottom: 0.5 },
  h2: { fontSize: 24, fontWeight: 600, lineHeight: 1.3, marginBottom: 0.4 },
  h3: { fontSize: 18, fontWeight: 600, lineHeight: 1.4, marginBottom: 0.3 },
  h4: { fontSize: 14, fontWeight: 500, lineHeight: 1.5, marginBottom: 0.2 },
  h5: { fontSize: 12, fontWeight: 500, lineHeight: 1.5, marginBottom: 0.2 },
  h6: { fontSize: 10, fontWeight: 400, lineHeight: 1.5, marginBottom: 0.2 }
};

export const fontWeights = {
  100: 'Thin',
  200: 'Extra Light',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'Semi Bold',
  700: 'Bold',
  800: 'Extra Bold',
  900: 'Black'
};

export const standardFonts: Record<string, FontConfig> = {
  Helvetica: {
    family: 'Helvetica',
    weights: [300, 400, 500, 600, 700],
    fallback: 'Arial, sans-serif',
    features: { ligatures: true, kerning: true }
  },
  'Times New Roman': {
    family: 'Times New Roman',
    weights: [400, 700],
    fallback: 'Georgia, serif',
    features: { ligatures: true, kerning: true }
  },
  Georgia: {
    family: 'Georgia',
    weights: [400, 700],
    fallback: 'Times New Roman, serif',
    features: { ligatures: true, kerning: true }
  },
  'Courier New': {
    family: 'Courier New',
    weights: [400, 700],
    fallback: 'monospace',
    features: { tabularNumbers: true }
  },
  Arial: {
    family: 'Arial',
    weights: [400, 700],
    fallback: 'Helvetica, sans-serif',
    features: { ligatures: true, kerning: true }
  },
  Verdana: {
    family: 'Verdana',
    weights: [400, 700],
    fallback: 'Arial, sans-serif',
    features: { kerning: true }
  },
  Tahoma: {
    family: 'Tahoma',
    weights: [400, 700],
    fallback: 'Verdana, sans-serif',
    features: { kerning: true }
  },
  'Trebuchet MS': {
    family: 'Trebuchet MS',
    weights: [400, 700],
    fallback: 'Arial, sans-serif',
    features: { ligatures: true, kerning: true }
  }
};

export const monospaceFonts: Record<string, FontConfig> = {
  'Courier New': {
    family: 'Courier New',
    weights: [400, 700],
    fallback: 'monospace',
    features: { tabularNumbers: true }
  },
  Consolas: {
    family: 'Consolas',
    weights: [400],
    fallback: 'monospace',
    features: { tabularNumbers: true }
  },
  'Lucida Console': {
    family: 'Lucida Console',
    weights: [400],
    fallback: 'monospace',
    features: { tabularNumbers: true }
  },
  Monaco: {
    family: 'Monaco',
    weights: [400],
    fallback: 'monospace',
    features: { tabularNumbers: true }
  }
};

export const headingFonts: Record<string, FontConfig> = {
  'Helvetica Bold': {
    family: 'Helvetica',
    weights: [700],
    fallback: 'Arial, sans-serif'
  },
  'Georgia Bold': {
    family: 'Georgia',
    weights: [700],
    fallback: 'Times New Roman, serif'
  },
  'Arial Black': {
    family: 'Arial',
    weights: [900],
    fallback: 'Helvetica, sans-serif'
  }
};
