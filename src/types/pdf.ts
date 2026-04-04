export interface PDFInput {
  title: string;
  subtitle?: string;
  authors: string[];
  organization?: string;
  version: string;
  template: string;
  sections: PDFSection[];
  charts: ChartConfig[];
  diagrams: DiagramConfig[];
  assets: AssetReference[];
  styling: PDFStyling;
  security?: PDFSecurity;
}

export interface PDFSection {
  id: string;
  title: string;
  content: string;
  level: number;
  type: 'text' | 'chart' | 'diagram' | 'table';
  pageBreak?: boolean;
}

export interface ChartConfig {
  id: string;
  type: ChartType;
  title?: string;
  data: ChartData;
  options: ChartOptions;
  width?: number;
  height?: number;
  position?: 'inline' | 'full-page' | 'float';
}

export type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'radar' | 'polar' | 'scatter' | 'bubble';

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
  pointRadius?: number;
  pointStyle?: string;
}

export interface ChartOptions {
  legend?: {
    display: boolean;
    position: 'top' | 'bottom' | 'left' | 'right';
  };
  grid?: {
    display: boolean;
    color?: string;
    borderDash?: number[];
  };
  responsive?: boolean;
  xLabel?: string;
  yLabel?: string;
  colors?: boolean;
  title?: string;
  subtitle?: string;
  animation?: boolean;
  tooltips?: boolean;
  scales?: {
    x?: ChartAxis;
    y?: ChartAxis;
  };
}

export interface ChartAxis {
  display?: boolean;
  title?: string;
  min?: number;
  max?: number;
  gridLines?: {
    display?: boolean;
    color?: string;
  };
}

export interface DiagramConfig {
  id: string;
  type: DiagramType;
  title?: string;
  definition: string;
  options: DiagramOptions;
  width?: number;
  height?: number;
  position?: 'inline' | 'full-page' | 'float';
}

export type DiagramType = 'flowchart' | 'sequence' | 'class' | 'state' | 'er' | 'gantt' | 'mindmap' | 'pie' | 'graph';

export interface DiagramOptions {
  theme?: 'default' | 'forest' | 'dark' | 'neutral';
  layout?: 'TB' | 'BT' | 'LR' | 'RL';
  nodeSpacing?: number;
  edgeLength?: number;
  title?: string;
  caption?: string;
}

export interface AssetReference {
  id: string;
  type: AssetType;
  path: string;
  alt?: string;
  caption?: string;
  position?: 'inline' | 'float-left' | 'float-right' | 'full-page';
  width?: number;
  height?: number;
  preserveAspectRatio?: boolean;
}

export type AssetType = 'image' | 'logo' | 'font' | 'watermark' | 'signature' | 'background' | 'footer' | 'header';

export interface PDFStyling {
  colorScheme: ColorScheme;
  typography: TypographySettings;
  pageLayout: PageLayoutConfig;
  headersFooters: HeaderFooterConfig;
}

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  name: string;
}

export interface TypographySettings {
  fontFamily: string;
  fontSize: {
    body: number;
    heading1: number;
    heading2: number;
    heading3: number;
    caption: number;
  };
  lineHeight: number;
  fontWeight: {
    body: number;
    headings: number;
  };
  textColor: string;
  headingColor?: string;
}

export interface PageLayoutConfig {
  pageSize: 'A4' | 'Letter' | 'Legal' | 'Tabloid';
  orientation: 'portrait' | 'landscape';
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  columns: number;
  columnGap: number;
  pageNumbers: boolean;
}

export interface HeaderFooterConfig {
  header?: {
    left?: string;
    center?: string;
    right?: string;
    includeOnFirst: boolean;
    fontSize?: number;
    color?: string;
  };
  footer?: {
    left?: string;
    center?: string;
    right?: string;
    includeOnFirst: boolean;
    fontSize?: number;
    color?: string;
  };
  runningHeaders?: RunningHeader[];
}

export interface RunningHeader {
  text: string;
  startPage: number;
  endPage?: number;
  documentSection?: string;
}

export interface PDFSecurity {
  password: string;
  encryption: 128 | 256;
  restrictions: SecurityRestrictions;
  ownerPassword?: string;
}

export interface SecurityRestrictions {
  print: boolean;
  copy: boolean;
  modify: boolean;
  annotate: boolean;
  formFields: boolean;
  assembly: boolean;
}

export interface PDFOutput {
  documentPath: string;
  metadata: PDFMetadata;
  success: boolean;
  errors?: string[];
}

export interface PDFMetadata {
  title?: string;
  subtitle?: string;
  authors: string[];
  organization?: string;
  version: string;
  creationDate: string;
  modificationDate?: string;
  pageCount: number;
  fileSize: number;
  security?: {
    encrypted: boolean;
    encryptionLevel: number;
    permissions: SecurityRestrictions;
  };
}

export interface PDFResult {
  success: boolean;
  output?: PDFOutput;
  error?: string;
}

export interface PDFParams {
  input?: PDFInput;
  template?: string;
  interactive?: boolean;
  outputPath?: string;
}

export interface DocumentInfo {
  title: string;
  subtitle?: string;
  authors: string[];
  organization?: string;
  version: string;
  template: string;
}

export interface ChartWizardState {
  currentChart?: ChartConfig;
  charts: ChartConfig[];
  editing: boolean;
}

export interface AssetConfig {
  type: AssetType;
  source: string;
  options?: Record<string, unknown>;
}

export { ChartConfig as ChartConfigType, ChartType as ChartTypeEnum };
