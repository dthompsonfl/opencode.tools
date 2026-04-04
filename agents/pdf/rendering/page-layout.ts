import { PageLayout as PageLayoutType, TextStyle } from '../types';

interface PageDimensions {
  width: number;
  height: number;
}

interface MarginConfig {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface ColumnConfig {
  count: number;
  gap: number;
  widths: number[];
}

interface HeaderFooterPosition {
  x: number;
  y: number;
  height: number;
  width: number;
}

interface ContentArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PageBreakResult {
  shouldBreak: boolean;
  reason: 'page-full' | 'section-break' | 'column-break' | 'forced';
}

const PAGE_SIZES: Record<string, PageDimensions> = {
  'A4': { width: 595, height: 842 },
  'Letter': { width: 612, height: 792 },
  'Legal': { width: 612, height: 1008 },
  'Tabloid': { width: 792, height: 1224 },
};

const POINTS_PER_INCH = 72;

export class PageLayout {
  private readonly defaultPageSize: string = 'Letter';
  private readonly defaultMargins: MarginConfig = {
    top: 72,
    bottom: 72,
    left: 72,
    right: 72,
  };
  private readonly defaultHeaderHeight: number = 50;
  private readonly defaultFooterHeight: number = 50;

  constructor() {
    console.log('[PageLayout] Initialized');
  }

  getPageSize(pageWidth: number, pageHeight: number): string | [number, number] {
    const tolerance = 10;

    for (const [sizeName, dimensions] of Object.entries(PAGE_SIZES)) {
      if (
        Math.abs(dimensions.width - pageWidth) < tolerance &&
        Math.abs(dimensions.height - pageHeight) < tolerance
      ) {
        return sizeName;
      }
    }

    return [pageWidth, pageHeight];
  }

  getPageDimensions(
    pageSize: string = this.defaultPageSize,
    orientation: 'portrait' | 'landscape' = 'portrait'
  ): PageDimensions {
    const dimensions = PAGE_SIZES[pageSize] || PAGE_SIZES[this.defaultPageSize];
    
    if (orientation === 'landscape') {
      return {
        width: dimensions.height,
        height: dimensions.width,
      };
    }

    return dimensions;
  }

  calculateContentArea(
    pageWidth: number,
    pageHeight: number,
    margins: MarginConfig,
    includeHeader: boolean = false,
    headerHeight: number = this.defaultHeaderHeight,
    includeFooter: boolean = false,
    footerHeight: number = this.defaultFooterHeight
  ): ContentArea {
    const contentX = margins.left;
    const contentY = margins.top + (includeHeader ? headerHeight : 0);
    const contentWidth = pageWidth - margins.left - margins.right;
    const contentHeight = 
      pageHeight - 
      margins.top - 
      margins.bottom - 
      (includeHeader ? headerHeight : 0) - 
      (includeFooter ? footerHeight : 0);

    return {
      x: contentX,
      y: contentY,
      width: Math.max(contentWidth, 0),
      height: Math.max(contentHeight, 0),
    };
  }

  calculateMargins(
    topInches: number = 1,
    bottomInches: number = 1,
    leftInches: number = 1,
    rightInches: number = 1
  ): MarginConfig {
    return {
      top: topInches * POINTS_PER_INCH,
      bottom: bottomInches * POINTS_PER_INCH,
      left: leftInches * POINTS_PER_INCH,
      right: rightInches * POINTS_PER_INCH,
    };
  }

  calculateColumnLayout(
    contentWidth: number,
    columnCount: number,
    columnGapInches: number = 0.5
  ): ColumnConfig {
    const columnGap = columnGapInches * POINTS_PER_INCH;
    
    const totalGapWidth = (columnCount - 1) * columnGap;
    const availableWidth = contentWidth - totalGapWidth;
    const columnWidth = availableWidth / columnCount;

    const widths: number[] = [];
    for (let i = 0; i < columnCount; i++) {
      widths.push(columnWidth);
    }

    return {
      count: columnCount,
      gap: columnGap,
      widths,
    };
  }

  calculateHeaderPosition(
    pageWidth: number,
    margins: MarginConfig,
    headerHeight: number = this.defaultHeaderHeight
  ): HeaderFooterPosition {
    return {
      x: margins.left,
      y: margins.top,
      height: headerHeight,
      width: pageWidth - margins.left - margins.right,
    };
  }

  calculateFooterPosition(
    pageWidth: number,
    pageHeight: number,
    margins: MarginConfig,
    footerHeight: number = this.defaultFooterHeight
  ): HeaderFooterPosition {
    return {
      x: margins.left,
      y: pageHeight - margins.bottom - footerHeight,
      height: footerHeight,
      width: pageWidth - margins.left - margins.right,
    };
  }

  calculateRunningHeaderPositions(
    pageWidth: number,
    pageHeight: number,
    margins: MarginConfig,
    columnLayout: ColumnConfig
  ): HeaderFooterPosition[] {
    const positions: HeaderFooterPosition[] = [];
    const headerHeight = this.defaultHeaderHeight;

    for (let i = 0; i < columnLayout.count; i++) {
      const columnX = margins.left + i * (columnLayout.widths[i] + columnLayout.gap);
      
      positions.push({
        x: columnX,
        y: margins.top,
        height: headerHeight,
        width: columnLayout.widths[i],
      });
    }

    return positions;
  }

  detectPageBreak(
    currentY: number,
    contentHeight: number,
    nextElementHeight: number,
    minLinesAtBottom: number = 3
  ): PageBreakResult {
    const spaceAtBottom = contentHeight - currentY;
    
    if (currentY <= 0) {
      return {
        shouldBreak: true,
        reason: 'forced',
      };
    }

    if (spaceAtBottom < nextElementHeight) {
      return {
        shouldBreak: true,
        reason: 'page-full',
      };
    }

    if (spaceAtBottom < minLinesAtBottom * 12) {
      return {
        shouldBreak: true,
        reason: 'page-full',
      };
    }

    return {
      shouldBreak: false,
      reason: 'forced' as const,
    };
  }

  calculateTextWrapping(
    text: string,
    fontSize: number,
    contentWidth: number,
    characterSpacing: number = 0
  ): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    const averageCharWidth = fontSize * 0.5 + characterSpacing;

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const estimatedWidth = testLine.length * averageCharWidth;

      if (estimatedWidth > contentWidth) {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [''];
  }

  calculateVerticalSpace(
    fontSize: number,
    lineHeight: number = 1.5,
    paragraphSpacing: number = 12
  ): number {
    return fontSize * lineHeight + paragraphSpacing;
  }

  calculateTableLayout(
    contentWidth: number,
    columnWidths: number[],
    rowHeight: number = 20,
    cellPadding: number = 8,
    borderWidth: number = 1
  ): {
    columnWidths: number[];
    rowHeight: number;
    cellPadding: number;
    borderWidth: number;
    totalWidth: number;
  } {
    const totalBorderWidth = (columnWidths.length + 1) * borderWidth;
    const totalPaddingWidth = columnWidths.length * 2 * cellPadding;
    const availableWidth = contentWidth - totalBorderWidth - totalPaddingWidth;

    const totalColumnWidth = columnWidths.reduce((sum, w) => sum + w, 0);
    const normalizedWidths = columnWidths.map((width) => {
      const percentage = width / totalColumnWidth;
      return percentage * availableWidth;
    });

    return {
      columnWidths: normalizedWidths,
      rowHeight,
      cellPadding,
      borderWidth,
      totalWidth: contentWidth,
    };
  }

  calculateImageLayout(
    imageWidth: number,
    imageHeight: number,
    maxWidth: number,
    maxHeight: number,
    maintainAspectRatio: boolean = true
  ): { width: number; height: number } {
    let width = imageWidth;
    let height = imageHeight;

    if (maintainAspectRatio) {
      const widthRatio = maxWidth / imageWidth;
      const heightRatio = maxHeight / imageHeight;
      const ratio = Math.min(widthRatio, heightRatio);

      width = imageWidth * ratio;
      height = imageHeight * ratio;
    } else {
      width = Math.min(imageWidth, maxWidth);
      height = Math.min(imageHeight, maxHeight);
    }

    return {
      width: Math.max(width, 1),
      height: Math.max(height, 1),
    };
  }

  calculateTitlePageLayout(
    pageWidth: number,
    pageHeight: number,
    margins: MarginConfig
  ): {
    title: { x: number; y: number; maxWidth: number };
    subtitle: { x: number; y: number; maxWidth: number };
    authors: { x: number; y: number; maxWidth: number };
    organization: { x: number; y: number; maxWidth: number };
    version: { x: number; y: number; maxWidth: number };
  } {
    const centerX = pageWidth / 2;
    const contentWidth = pageWidth - margins.left - margins.right;
    
    const titleY = pageHeight * 0.35;
    const subtitleY = titleY + 60;
    const authorsY = pageHeight * 0.75;
    const organizationY = authorsY + 24;
    const versionY = organizationY + 48;

    return {
      title: {
        x: centerX,
        y: titleY,
        maxWidth: contentWidth,
      },
      subtitle: {
        x: centerX,
        y: subtitleY,
        maxWidth: contentWidth,
      },
      authors: {
        x: centerX,
        y: authorsY,
        maxWidth: contentWidth,
      },
      organization: {
        x: centerX,
        y: organizationY,
        maxWidth: contentWidth,
      },
      version: {
        x: centerX,
        y: versionY,
        maxWidth: contentWidth,
      },
    };
  }

  calculateTOCLayout(
    contentWidth: number,
    entryCount: number,
    entryHeight: number = 18
  ): {
    titleY: number;
    entries: Array<{
      y: number;
      indent: number;
      pageNumberX: number;
    }>;
  } {
    const titleY = 72;
    const startY = titleY + 50;
    const indentAmount = 20;
    const pageNumberWidth = 50;

    const entries = [];
    for (let i = 0; i < entryCount; i++) {
      const level = 1;
      const indent = (level - 1) * indentAmount;
      
      entries.push({
        y: startY + i * entryHeight,
        indent,
        pageNumberX: contentWidth - pageNumberWidth,
      });
    }

    return {
      titleY,
      entries,
    };
  }

  calculateSectionLayout(
    contentWidth: number,
    sectionIndex: number,
    headingHeight: number = 36,
    contentStartY: number
  ): {
    headingY: number;
    contentY: number;
    pageBreakAfter: boolean;
  } {
    const headingY = contentStartY;
    const contentY = headingY + headingHeight + 12;

    return {
      headingY,
      contentY,
      pageBreakAfter: false,
    };
  }

  convertInchesToPoints(inches: number): number {
    return inches * POINTS_PER_INCH;
  }

  convertPointsToInches(points: number): number {
    return points / POINTS_PER_INCH;
  }

  convertPixelsToPoints(pixels: number, dpi: number = 72): number {
    return (pixels / dpi) * POINTS_PER_INCH;
  }

  convertPointsToPixels(points: number, dpi: number = 72): number {
    return (points / POINTS_PER_INCH) * dpi;
  }

  validatePageSize(pageSize: string): boolean {
    return pageSize in PAGE_SIZES;
  }

  validateOrientation(orientation: string): boolean {
    return orientation === 'portrait' || orientation === 'landscape';
  }

  validateMargins(margins: MarginConfig, pageWidth: number, pageHeight: number): boolean {
    const totalHorizontal = margins.left + margins.right;
    const totalVertical = margins.top + margins.bottom;

    return (
      totalHorizontal < pageWidth * 0.9 &&
      totalVertical < pageHeight * 0.9 &&
      margins.top >= 0 &&
      margins.bottom >= 0 &&
      margins.left >= 0 &&
      margins.right >= 0
    );
  }

  getOptimalPageCount(
    contentHeight: number,
    averageSectionHeight: number,
    reserveForTOC: number = 300
  ): number {
    const effectiveContentHeight = contentHeight - reserveForTOC;
    return Math.ceil(averageSectionHeight / effectiveContentHeight) + 1;
  }

  calculateGutter(
    pageWidth: number,
    pageHeight: number,
    facingPages: boolean = false
  ): number {
    if (facingPages) {
      return POINTS_PER_INCH * 0.125;
    }
    return 0;
  }

  calculateBindingOffset(
    pageWidth: number,
    facingPages: boolean = false
  ): number {
    if (facingPages) {
      return pageWidth * 0.02;
    }
    return 0;
  }

  createPageLayoutConfig(
    pageSize: string,
    orientation: 'portrait' | 'landscape',
    margins: MarginConfig
  ): PageLayoutType {
    return {
      pageSize: pageSize as 'A4' | 'Letter' | 'Legal' | 'Tabloid',
      orientation,
      margins: {
        top: this.convertPointsToInches(margins.top),
        bottom: this.convertPointsToInches(margins.bottom),
        left: this.convertPointsToInches(margins.left),
        right: this.convertPointsToInches(margins.right),
      },
      columns: 1,
      columnGap: 0.5,
      pageNumbers: true,
    };
  }
}
