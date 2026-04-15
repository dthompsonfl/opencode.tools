export interface PDFSection {
  id: string;
  title: string;
  level: number;
  content?: string;
  data?: Record<string, unknown>;
  children?: PDFSection[];
  order: number;
}

export interface PageInfo {
  page: number;
  pages: number;
  date: string;
  title?: string;
  organization?: string;
}

export interface RenderContext {
  title: string;
  organization?: string;
  pageInfo: PageInfo;
  [key: string]: unknown;
}

export interface PDFInput {
  title: string;
  sections: PDFSection[];
  metadata?: Record<string, unknown>;
  pageSize?: PageSize;
  margins?: PageMargins;
}

export interface PageSize {
  width: number;
  height: number;
  unit: 'pt' | 'in' | 'mm' | 'cm';
}

export interface PageMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface TOCEntry {
  id: string;
  title: string;
  level: number;
  page: number;
  indent: number;
}

export interface RunningHeader {
  sectionId: string;
  text: string;
  level: number;
}

export interface PageBreak {
  afterSectionId: string;
  forced: boolean;
}

export interface ColumnLayout {
  columns: number;
  gap: number;
  widths: number[];
  startPage: number;
  endPage: number;
}

export interface PageLayout {
  pageNumber: number;
  width: number;
  height: number;
  margins: PageMargins;
  headerHeight: number;
  footerHeight: number;
  contentHeight: number;
  columns?: ColumnLayout;
}

export interface LayoutPlan {
  pageCount: number;
  toc: TOCEntry[];
  runningHeaders: RunningHeader[];
  pageBreaks: PageBreak[];
  columnLayouts: ColumnLayout[];
  pageSize: PageSize;
  margins: PageMargins;
}

export interface Page {
  number: number;
  content: PageContent;
  header?: HeaderFooterContent;
  footer?: HeaderFooterContent;
}

export interface PageContent {
  html: string;
  text: string;
  sections: PDFSection[];
}

export interface HeaderFooterContent {
  html: string;
  height: number;
}
