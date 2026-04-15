/**
 * Simplified type declarations for canvas
 * Used for server-side chart rendering
 */

declare module 'canvas' {
  interface CanvasRenderingContext2D {
    // Drawing state
    canvas: HTMLCanvasElement;
    save(): void;
    restore(): void;
    
    // Transformations
    scale(x: number, y: number): void;
    rotate(angle: number): void;
    translate(x: number, y: number): void;
    
    // Drawing paths
    beginPath(): void;
    closePath(): void;
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void;
    quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
    arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, anticlockwise?: boolean): void;
    arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void;
    ellipse(x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number, anticlockwise?: boolean): void;
    
    // Drawing rectangles
    rect(x: number, y: number, width: number, height: number): void;
    clearRect(x: number, y: number, width: number, height: number): void;
    fillRect(x: number, y: number, width: number, height: number): void;
    strokeRect(x: number, y: number, width: number, height: number): void;
    
    // Drawing text
    fillText(text: string, x: number, y: number, maxWidth?: number): void;
    strokeText(text: string, x: number, y: number, maxWidth?: number): void;
    measureText(text: string): TextMetrics;
    
    // Drawing images
    drawImage(image: CanvasImageSource, dx: number, dy: number, dWidth?: number, dHeight?: number): void;
    
    // Path painting
    fill(fillRule?: 'evenodd' | 'nonzero'): void;
    stroke(): void;
    clip(): void;
    
    // Line styles
    setLineDash(segments: number[]): void;
    getLineDash(): number[];
    lineDashOffset: number;
    lineWidth: number;
    lineCap: 'butt' | 'round' | 'square';
    lineJoin: 'miter' | 'round' | 'bevel';
    miterLimit: number;
    
    // Colors and styles
    fillStyle: string | CanvasGradient | CanvasPattern;
    strokeStyle: string | CanvasGradient | CanvasPattern;
    globalAlpha: number;
    opacity: number;
    
    // Shadows
    shadowColor: string;
    shadowBlur: number;
    shadowOffsetX: number;
    shadowOffsetY: number;
    
    // Text
    font: string;
    textAlign: 'left' | 'center' | 'right' | 'start' | 'end';
    textBaseline: 'top' | 'hanging' | 'middle' | 'alphabetic' | 'ideographic' | 'bottom';
    direction: 'ltr' | 'rtl' | 'inherit';
  }

  interface TextMetrics {
    width: number;
    actualBoundingBoxAscent: number;
    actualBoundingBoxDescent: number;
    fontBoundingBoxAscent: number;
    fontBoundingBoxDescent: number;
  }

  interface CanvasGradient {
    addColorStop(offset: number, color: string): void;
  }

  interface HTMLCanvasElement {
    width: number;
    height: number;
    getContext(contextId: '2d'): CanvasRenderingContext2D;
    toBuffer(mimeType?: string, quality?: number): Buffer;
    toDataURL(mimeType?: string, quality?: number): string;
  }

  function createCanvas(width: number, height: number): HTMLCanvasElement;
}

export = createCanvas;
export as namespace canvas;
