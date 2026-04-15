// Simple canvas mock for PDF chart rendering
// This provides basic canvas-like functionality without native dependencies

export interface CanvasContext2D {
  // Drawing state
  canvas: CanvasElement;
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
  
  // Drawing rectangles
  rect(x: number, y: number, width: number, height: number): void;
  clearRect(x: number, y: number, width: number, height: number): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  strokeRect(x: number, y: number, width: number, height: number): void;
  
  // Drawing text
  fillText(text: string, x: number, y: number, maxWidth?: number): void;
  strokeText(text: string, x: number, y: number, maxWidth?: number): void;
  measureText(text: string): { width: number };
  
  // Drawing images
  drawImage(image: unknown, dx: number, dy: number, dWidth?: number, dHeight?: number): void;
  
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
  fillStyle: string;
  strokeStyle: string;
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

export interface CanvasElement {
  width: number;
  height: number;
  getContext(contextId: string): CanvasContext2D;
  toBuffer(mimeType: string): Buffer;
}

export function createCanvas(width: number, height: number): CanvasElement {
  const canvas: CanvasElement = {
    width,
    height,
    getContext: (contextId: string) => {
      if (contextId !== '2d') {
        throw new Error('Only 2D context is supported');
      }
      return new MockContext2D(canvas);
    },
    toBuffer: (_mimeType: string) => {
      // Return empty buffer for now
      return Buffer.from([]);
    }
  };
  return canvas;
}

class MockContext2D implements CanvasContext2D {
  fillStyle = '#000000';
  strokeStyle = '#000000';
  lineWidth = 1;
  font = '10px sans-serif';
  textAlign: 'left' | 'center' | 'right' | 'start' | 'end' = 'left';
  textBaseline: 'top' | 'hanging' | 'middle' | 'alphabetic' | 'ideographic' | 'bottom' = 'top';
  canvas: CanvasElement;
  
  private paths: Array<{type: string; x?: number; y?: number}> = [];
  private lineDash: number[] = [];
  private savedStates: Array<{
    fillStyle: string;
    strokeStyle: string;
    lineWidth: number;
    font: string;
    textAlign: 'left' | 'center' | 'right' | 'start' | 'end';
    textBaseline: 'top' | 'hanging' | 'middle' | 'alphabetic' | 'ideographic' | 'bottom';
  }> = [];
  private _globalAlpha = 1;
  private _opacity = 1;
  
  constructor(canvas: CanvasElement) {
    this.canvas = canvas;
  }
  
  save(): void {
    this.savedStates.push({
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      lineWidth: this.lineWidth,
      font: this.font,
      textAlign: this.textAlign,
      textBaseline: this.textBaseline
    });
  }
  
  restore(): void {
    const state = this.savedStates.pop();
    if (state) {
      this.fillStyle = state.fillStyle;
      this.strokeStyle = state.strokeStyle;
      this.lineWidth = state.lineWidth;
      this.font = state.font;
      this.textAlign = state.textAlign;
      this.textBaseline = state.textBaseline;
    }
  }
  
  scale(x: number, y: number): void {}
  rotate(angle: number): void {}
  translate(x: number, y: number): void {}
  
  rect(x: number, y: number, width: number, height: number): void {}
  clearRect(x: number, y: number, width: number, height: number): void {}
  fillRect(x: number, y: number, width: number, height: number): void {}
  strokeRect(x: number, y: number, width: number, height: number): void {}
  
  beginPath(): void { this.paths = []; }
  closePath(): void {}
  moveTo(x: number, y: number): void {}
  lineTo(x: number, y: number): void {}
  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {}
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {}
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, anticlockwise?: boolean): void {}
  fill(): void {}
  stroke(): void {}
  fillText(text: string, x: number, y: number, maxWidth?: number): void {}
  strokeText(text: string, x: number, y: number, maxWidth?: number): void {}
  measureText(text: string): { width: number } { return { width: text.length * 6 }; }
  drawImage(_image: unknown, _dx: number, _dy: number, _dWidth?: number, _dHeight?: number): void {}
  clip(): void {}
  setLineDash(segments: number[]): void { this.lineDash = segments; }
  getLineDash(): number[] { return this.lineDash; }
  lineDashOffset = 0;
  lineCap: 'butt' | 'round' | 'square' = 'butt';
  lineJoin: 'miter' | 'round' | 'bevel' = 'miter';
  miterLimit = 10;
  
  get globalAlpha(): number { return this._globalAlpha; }
  set globalAlpha(value: number) { this._globalAlpha = value; }
  
  get opacity(): number { return this._opacity; }
  set opacity(value: number) { this._opacity = value; }
  
  shadowColor = '#000000';
  shadowBlur = 0;
  shadowOffsetX = 0;
  shadowOffsetY = 0;
  
  direction: 'ltr' | 'rtl' | 'inherit' = 'ltr';
}

export type CanvasRenderingContext2D = CanvasContext2D;
