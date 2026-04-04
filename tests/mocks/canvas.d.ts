declare module 'canvas' {
  export function createCanvas(width: number, height: number): {
    width: number;
    height: number;
    getContext(context: '2d'): {
      canvas: { width: number; height: number };
      fillRect: (...args: unknown[]) => void;
      fillText: (...args: unknown[]) => void;
      beginPath: (...args: unknown[]) => void;
      rect: (...args: unknown[]) => void;
      fill: (...args: unknown[]) => void;
      stroke: (...args: unknown[]) => void;
      moveTo: (...args: unknown[]) => void;
      lineTo: (...args: unknown[]) => void;
      arc: (...args: unknown[]) => void;
      quadraticCurveTo: (...args: unknown[]) => void;
      bezierCurveTo: (...args: unknown[]) => void;
      clearRect: (...args: unknown[]) => void;
      setLineDash: (...args: unknown[]) => void;
      save: (...args: unknown[]) => void;
      restore: (...args: unknown[]) => void;
    };
    toBuffer(type?: string): Buffer;
  };
}
