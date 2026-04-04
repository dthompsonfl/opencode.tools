/**
 * Type declarations for PDFKit
 * PDFKit is a JavaScript library that generates PDFs in Node.js
 */

declare module 'pdfkit' {
  import { Writable } from 'stream';

  interface PDFDocumentOptions {
    size?: string | number[];
    layout?: 'portrait' | 'landscape';
    margins?: { top: number; bottom: number; left: number; right: number };
    compress?: boolean;
    info?: {
      Title?: string;
      Author?: string;
      Subject?: string;
      Creator?: string;
      Producer?: string;
      CreationDate?: Date;
      ModDate?: Date;
    };
    fontLayoutCache?: boolean;
    useObjectStreams?: boolean;
    addPageNumbers?: boolean;
    autoFirstPage?: boolean;
  }

  interface PDFPageOptions {
    size?: string | number[];
    layout?: 'portrait' | 'landscape';
    margins?: { top: number; bottom: number; left: number; right: number };
  }

  interface TextOptions {
    align?: 'left' | 'center' | 'right' | 'justify';
    width?: number;
    height?: number;
    lineBreak?: boolean;
    lineGap?: number;
    link?: string;
    underline?: boolean;
    strike?: boolean;
    continued?: boolean;
  }

  interface RectangleOptions {
    x?: number;
    y?: number;
    width: number;
    height: number;
    color?: RGBColor;
    borderColor?: RGBColor;
    borderWidth?: number;
    borderStyle?: 'solid' | 'dashed' | 'dotted';
    rotate?: number;
    opacity?: number;
  }

  interface ImageOptions {
    width?: number;
    height?: number;
    align?: 'left' | 'center' | 'right';
    cover?: { width: number; height: number };
    fit?: number[];
  }

  type RGBColor = number[] | string;

  class PDFDocument extends Writable {
    constructor(options?: PDFDocumentOptions);
    
    // Page methods
    addPage(options?: PDFPageOptions): PDFPage;
    switchToPage(pageNumber: number): PDFPage;
    bufferedPageRange(): { offset: number; count: number };
    pageIndex(page: PDFPage): number;

    // Font methods
    font(name: string): PDFDocument;
    fontSize(size: number): PDFDocument;
    fontSpacing(spacing: number): PDFDocument;

    // Color methods
    fill(color: RGBColor): PDFDocument;
    stroke(color: RGBColor): PDFDocument;
    fillColor(color: RGBColor): PDFDocument;
    strokeColor(color: RGBColor): PDFDocument;
    opacity(value: number): PDFDocument;
    strokeOpacity(value: number): PDFDocument;

    // Text methods
    text(text: string, x?: number, y?: number, options?: TextOptions): PDFDocument;
    widthOfStringAtSize(text: string, size: number): number;
    heightOfStringAtSize(text: string, size: number, options?: { lineGap?: number }): number;

    // Shape methods
    moveTo(x: number, y: number): PDFDocument;
    lineTo(x: number, y: number): PDFDocument;
    line(x1: number, y1: number, x2: number, y2: number): PDFDocument;
    rect(x: number, y: number, width: number, height: number): PDFDocument;
    roundedRect(x: number, y: number, width: number, height: number, cornerRadius: number): PDFDocument;
    circle(x: number, y: number, radius: number): PDFDocument;
    ellipse(x: number, y: number, radiusX: number, radiusY?: number): PDFDocument;
    polygon(points: number[][]): PDFDocument;

    // Path methods
    moveTo(x: number, y: number): PDFDocument;
    lineTo(x: number, y: number): PDFDocument;
    bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): PDFDocument;
    quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): PDFDocument;
    arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, anticlockwise?: boolean): PDFDocument;
    closePath(): PDFDocument;
    path(path: string): PDFDocument;

    // Path painting
    fill(rule?: 'evenodd' | 'nonzero'): PDFDocument;
    stroke(): PDFDocument;
    fillAndStroke(): PDFDocument;
    clip(): PDFDocument;

    // Dash and stroke
    dash(length: number, options?: { space?: number; phase?: number }): PDFDocument;
    undash(): PDFDocument;
    lineWidth(width: number): PDFDocument;
    lineCap(cap: 'butt' | 'round' | 'square'): PDFDocument;
    lineJoin(join: 'miter' | 'round' | 'bevel'): PDFDocument;
    miterLimit(limit: number): PDFDocument;

    // Transformations
    translate(x: number, y: number): PDFDocument;
    rotate(angle: number, options?: { origin?: [number, number] }): PDFDocument;
    scale(x: number, y: number, options?: { origin?: [number, number] }): PDFDocument;
    transform(m11: number, m12: number, m21: number, m22: number, dx: number, dy: number): PDFDocument;

    // Image methods
    image(image: string | Buffer, x?: number, y?: number, options?: ImageOptions): PDFDocument;
    openImage(image: string | Buffer): PDFImage;

    // Bookmarks/Outline
    ref(object: any): PDFReference;

    // Properties
    y: number;
    x: number;

    // Save
    save(): Promise<Buffer>;
    end(): Promise<void>;
  }

  interface PDFPage {
    size: string | number[];
    layout: 'portrait' | 'landscape';
    margins: { top: number; bottom: number; left: number; right: number };
    
    getSize(): { width: number; height: number };
    getContentStreamSize(): number;
  }

  interface PDFImage {
    width: number;
    height: number;
  }

  interface PDFReference {
    obj: any;
    ref: PDFReference;
  }

  function RGBColor(r: number, g: number, b: number): RGBColor;

  // Register font
  function registerFont(name: string, family: string, weight?: string): void;
}

export = PDFDocument;
export as namespace PDFDocument;
