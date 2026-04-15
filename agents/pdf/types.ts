import { z } from 'zod';

export const PAGE_SIZE_VALUES = ['A4', 'Letter', 'Legal', 'Tabloid'] as const;
export const ORIENTATION_VALUES = ['portrait', 'landscape'] as const;
export const PERMISSION_LEVEL_VALUES = ['none', 'low', 'high'] as const;
export const PDF_FORMAT_VALUES = ['pdf', 'pdfa', 'pdfx'] as const;
export const CHART_TYPE_VALUES = ['bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea', 'bubble', 'scatter'] as const;
export const DIAGRAM_TYPE_VALUES = ['flowchart', 'sequence', 'gantt', 'classDiagram', 'stateDiagram', 'erDiagram', 'userJourney', 'mindmap'] as const;
export const SECTION_LEVEL_VALUES = ['1', '2', '3', '4'] as const;

export const TextStyleSchema = z.object({
  fontFamily: z.string().optional(),
  fontSize: z.number().min(1).max(100).optional(),
  fontWeight: z.enum(['300', '400', '500', '600', '700']).optional(),
  fontStyle: z.enum(['normal', 'italic']).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  textAlign: z.enum(['left', 'center', 'right', 'justify']).optional(),
  lineHeight: z.number().min(0.5).max(3).optional(),
  letterSpacing: z.number().optional(),
  marginTop: z.number().optional(),
  marginBottom: z.number().optional(),
  padding: z.number().optional(),
  paddingBottom: z.number().optional(),
  borderWidth: z.number().optional(),
  borderColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  borderStyle: z.enum(['none', 'solid', 'dashed', 'dotted']).optional(),
  borderRadius: z.number().optional(),
});

export type TextStyle = z.infer<typeof TextStyleSchema>;

export const HeaderFooterConfigSchema = z.object({
  showOnFirstPage: z.boolean().optional(),
  showOnLastPage: z.boolean().optional(),
  height: z.number().min(0).max(5).optional(),
  content: z.string().optional(),
  textStyle: TextStyleSchema.optional(),
  includePageNumber: z.boolean().optional(),
  pageNumberFormat: z.enum(['1', 'i', 'I', 'a', 'A']).optional(),
});

export type HeaderFooterConfig = z.infer<typeof HeaderFooterConfigSchema>;

export const RunningHeaderConfigSchema = z.object({
  showOnAllPages: z.boolean().optional(),
  leftText: z.string().optional(),
  centerText: z.string().optional(),
  rightText: z.string().optional(),
  textStyle: TextStyleSchema.optional(),
});

export type RunningHeaderConfig = z.infer<typeof RunningHeaderConfigSchema>;

export const PageLayoutSchema = z.object({
  pageSize: z.enum(PAGE_SIZE_VALUES).default('Letter'),
  orientation: z.enum(ORIENTATION_VALUES).default('portrait'),
  margins: z.object({
    top: z.number().min(0).max(10).default(1),
    bottom: z.number().min(0).max(10).default(1),
    left: z.number().min(0).max(10).default(1),
    right: z.number().min(0).max(10).default(1),
  }).default({ top: 1, bottom: 1, left: 1, right: 1 }),
  columns: z.number().min(1).max(4).default(1),
  columnGap: z.number().min(0).max(2).default(0.5),
  header: HeaderFooterConfigSchema.optional(),
  footer: HeaderFooterConfigSchema.optional(),
  runningHeaders: RunningHeaderConfigSchema.optional(),
  pageNumbers: z.boolean().default(true),
});

export type PageLayout = z.infer<typeof PageLayoutSchema>;

export const SectionLayoutSchema = z.object({
  fullWidth: z.boolean().optional(),
  breakBefore: z.enum(['always', 'left', 'right', 'none']).optional(),
  breakAfter: z.enum(['always', 'left', 'right', 'none']).optional(),
  keepWithNext: z.boolean().optional(),
  orphans: z.number().min(0).optional(),
  widows: z.number().min(0).optional(),
});

export type SectionLayout = z.infer<typeof SectionLayoutSchema>;

export const TOCStyleSchema = z.object({
  title: z.string().optional(),
  titleStyle: TextStyleSchema.optional(),
  entryStyle: TextStyleSchema.optional(),
  pageNumberStyle: TextStyleSchema.optional(),
  indentLevel1: z.number().optional(),
  indentLevel2: z.number().optional(),
  indentLevel3: z.number().optional(),
  indentLevel4: z.number().optional(),
  showPageNumbers: z.boolean().optional(),
  includeSections: z.array(z.string()).optional(),
  excludeSections: z.array(z.string()).optional(),
});

export type TOCStyle = z.infer<typeof TOCStyleSchema>;

export const ChartDataPointSchema = z.object({
  x: z.union([z.string(), z.number()]).optional(),
  y: z.number().optional(),
  label: z.string().optional(),
  value: z.number().optional(),
});

export type ChartDataPoint = z.infer<typeof ChartDataPointSchema>;

export const ChartDatasetSchema = z.object({
  label: z.string(),
  data: z.array(z.union([z.number(), ChartDataPointSchema])),
  backgroundColor: z.union([z.string(), z.array(z.string())]).optional(),
  borderColor: z.union([z.string(), z.array(z.string())]).optional(),
  borderWidth: z.number().min(0).optional(),
  fill: z.boolean().optional(),
  tension: z.number().min(0).max(1).optional(),
  pointRadius: z.number().min(0).optional(),
  pointStyle: z.enum(['circle', 'cross', 'crossRot', 'dash', 'line', 'rect', 'rectRounded', 'rectRot', 'star', 'triangle']).optional(),
});

export type ChartDataset = z.infer<typeof ChartDatasetSchema>;

export const ChartOptionsSchema = z.object({
  responsive: z.boolean().default(true),
  maintainAspectRatio: z.boolean().default(true),
  plugins: z.record(z.string(), z.any()).optional(),
  scales: z.record(z.string(), z.any()).optional(),
  legend: z.object({
    display: z.boolean().optional(),
    position: z.enum(['top', 'bottom', 'left', 'right']).optional(),
    labels: z.object({
      font: z.any().optional(),
      color: z.string().optional(),
      padding: z.number().optional(),
    }).optional(),
  }).optional(),
  title: z.object({
    display: z.boolean().optional(),
    text: z.string().optional(),
    font: z.any().optional(),
    color: z.string().optional(),
  }).optional(),
  animation: z.any().optional(),
  tooltips: z.any().optional(),
  hover: z.any().optional(),
});

export type ChartOptions = z.infer<typeof ChartOptionsSchema>;

export const ChartConfigSchema = z.object({
  id: z.string().min(1),
  type: z.enum(CHART_TYPE_VALUES),
  title: z.string().optional(),
  description: z.string().optional(),
  data: z.object({
    labels: z.array(z.union([z.string(), z.number()])),
    datasets: z.array(ChartDatasetSchema),
  }),
  options: ChartOptionsSchema.optional(),
  width: z.number().min(100).max(1200).optional(),
  height: z.number().min(100).max(1200).optional(),
  position: z.enum(['full', 'float', 'inline']).optional(),
  caption: z.string().optional(),
});

export type ChartConfig = z.infer<typeof ChartConfigSchema>;

export const DiagramConfigSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(DIAGRAM_TYPE_VALUES),
  title: z.string().optional(),
  description: z.string().optional(),
  definition: z.string(),
  theme: z.enum(['default', 'dark', 'neutral', 'forest', 'base']).optional(),
  width: z.number().min(200).max(2000).optional(),
  height: z.number().min(200).max(2000).optional(),
  position: z.enum(['full', 'float', 'inline']).optional(),
  caption: z.string().optional(),
});

export type DiagramConfig = z.infer<typeof DiagramConfigSchema>;

export const AssetReferenceSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['image', 'font', 'svg', 'vector', 'signature']),
  source: z.string().url(),
  altText: z.string().optional(),
  description: z.string().optional(),
  width: z.number().min(1).max(5000).optional(),
  height: z.number().min(1).max(5000).optional(),
  quality: z.number().min(1).max(100).optional(),
  compression: z.enum(['none', 'lossless', 'lossy']).optional(),
  embed: z.boolean().optional(),
  preserveAspectRatio: z.boolean().optional(),
});

export type AssetReference = z.infer<typeof AssetReferenceSchema>;

export const PDFPermissionsSchema = z.object({
  print: z.enum(PERMISSION_LEVEL_VALUES).default('high'),
  copy: z.boolean().default(true),
  modify: z.boolean().default(true),
  annotate: z.boolean().default(true),
  formFields: z.boolean().default(true),
  contentAccessibility: z.boolean().default(true),
  documentAssembly: z.boolean().default(true),
});

export type PDFPermissions = z.infer<typeof PDFPermissionsSchema>;

export const PDFSecuritySchema = z.object({
  encrypt: z.boolean().default(false),
  userPassword: z.string().min(1).optional(),
  ownerPassword: z.string().min(1).optional(),
  permissions: PDFPermissionsSchema.optional(),
  encryptionLevel: z.enum(['40', '128', '256']).default('256'),
});

export type PDFSecurity = z.infer<typeof PDFSecuritySchema>;

export const PDFOutputConfigSchema = z.object({
  format: z.enum(PDF_FORMAT_VALUES).default('pdf'),
  compress: z.boolean().default(true),
  imageQuality: z.number().min(1).max(100).default(90),
  embedFonts: z.boolean().default(true),
  generateTOC: z.boolean().default(true),
  generateBookmarks: z.boolean().default(true),
  outputPath: z.string().optional(),
  linearize: z.boolean().optional(),
  preserveEditability: z.boolean().optional(),
});

export type PDFOutputConfig = z.infer<typeof PDFOutputConfigSchema>;

export const PDFStylingSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  fontFamily: z.string().optional(),
  fontSize: z.number().min(8).max(24).optional(),
  lineHeight: z.number().min(1).max(2).optional(),
  pageLayout: PageLayoutSchema.optional(),
  headerStyle: TextStyleSchema.optional(),
  footerStyle: TextStyleSchema.optional(),
  tocStyle: TOCStyleSchema.optional(),
  coverPageStyle: TextStyleSchema.optional(),
  titlePageStyle: TextStyleSchema.optional(),
  bodyTextStyle: TextStyleSchema.optional(),
  headingStyles: z.record(z.string(), TextStyleSchema).optional(),
});

export type PDFStyling = z.infer<typeof PDFStylingSchema>;

export const PDFSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  level: z.enum(SECTION_LEVEL_VALUES),
  content: z.string().min(1),
  layout: SectionLayoutSchema.optional(),
  charts: z.array(ChartConfigSchema).optional(),
  diagrams: z.array(DiagramConfigSchema).optional(),
});

export type PDFSection = z.infer<typeof PDFSectionSchema>;

export const PDFInputSchema = z.object({
  title: z.string().min(1).max(500),
  subtitle: z.string().max(500).optional(),
  authors: z.array(z.string().min(1)).min(1),
  organization: z.string().optional(),
  version: z.string().optional(),
  date: z.date().optional(),
  template: z.string().min(1),
  sections: z.array(PDFSectionSchema).min(1),
  styling: PDFStylingSchema.optional(),
  charts: z.array(ChartConfigSchema).optional(),
  diagrams: z.array(DiagramConfigSchema).optional(),
  assets: z.array(AssetReferenceSchema).optional(),
  security: PDFSecuritySchema.optional(),
  output: PDFOutputConfigSchema.optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type PDFInput = z.infer<typeof PDFInputSchema>;

export interface PDFMetadata {
  fileSize: number;
  pageCount: number;
  createdAt: string;
  modifiedAt: string;
  producer: string;
  creator: string;
  title: string;
  author: string;
  subject: string;
  keywords: string[];
  version: string;
  format: string;
}

export interface PDFOutput {
  documentPath: string;
  documentBuffer: Buffer;
  metadata: PDFMetadata;
  tocEntries: TOCEntry[];
  bookmarks: BookmarkEntry[];
  warnings: string[];
  meta: ProvenanceMeta;
}

export interface TOCEntry {
  id: string;
  title: string;
  level: number;
  pageNumber: number;
}

export interface BookmarkEntry {
  id: string;
  title: string;
  level: number;
  pageNumber: number;
  children: BookmarkEntry[];
}

export interface ProvenanceMeta {
  agent: string;
  promptVersion: string;
  mcpVersion: string;
  timestamp: string;
  runId: string;
}

export interface PDFGenerationRecord {
  id: string;
  title: string;
  authors: string[];
  template: string;
  sections: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  outputPath?: string;
  metadata?: PDFMetadata;
  error?: string;
}
