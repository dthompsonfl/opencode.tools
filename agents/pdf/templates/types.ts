export interface TemplateConfig {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  coverBackgroundColor?: string;
  fontFamily?: string;
  headingFontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
  pageSize?: 'A4' | 'Letter' | 'Legal' | 'Tabloid';
  orientation?: 'portrait' | 'landscape';
  margins?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export interface StandardTemplateConfig extends TemplateConfig {}

export interface WhitepaperTemplateConfig extends TemplateConfig {}

export interface TechnicalTemplateConfig extends TemplateConfig {}

export type TemplateType = 'standard' | 'whitepaper' | 'technical';
