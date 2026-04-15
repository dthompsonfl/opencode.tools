export const defaultColorPalette = [
  '#1a365d',
  '#2c5282',
  '#3182ce',
  '#4299e1',
  '#63b3ed',
  '#90cdf4',
  '#ed8936',
  '#f56565',
  '#48bb78',
  '#9f7aea'
];

export const professionalPalette = {
  blues: [
    '#1a365d',
    '#2c5282',
    '#3182ce',
    '#4299e1',
    '#63b3ed'
  ],
  grays: [
    '#1a202c',
    '#2d3748',
    '#4a5568',
    '#718096',
    '#a0aec0'
  ],
  categorical: [
    '#1a365d',
    '#ed8936',
    '#48bb78',
    '#e53e3e',
    '#805ad5',
    '#38b2ac',
    '#d69e2e',
    '#ed64a6'
  ],
  gradient: [
    '#1a365d',
    '#2b6cb0',
    '#3182ce',
    '#4299e1',
    '#63b3ed'
  ],
  monochrome: [
    '#1a202c',
    '#2d3748',
    '#4a5568',
    '#718096',
    '#a0aec0',
    '#cbd5e0',
    '#e2e8f0',
    '#edf2f7'
  ]
};

export function generateColorPalette(count: number, palette: string[] = defaultColorPalette): string[] {
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    colors.push(palette[i % palette.length]);
  }
  return colors;
}

export function generateGradientColors(count: number, startColor: string, endColor: string): string[] {
  const start = hexToRgb(startColor);
  const end = hexToRgb(endColor);
  const colors: string[] = [];

  if (!start || !end) {
    return generateColorPalette(count);
  }

  for (let i = 0; i < count; i++) {
    const r = Math.round(start.r + (end.r - start.r) * (i / (count - 1)));
    const g = Math.round(start.g + (end.g - start.g) * (i / (count - 1)));
    const b = Math.round(start.b + (end.b - start.b) * (i / (count - 1)));
    colors.push(rgbToHex(r, g, b));
  }

  return colors;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

export function adjustBrightness(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const adjustValue = (value: number) => {
    return Math.min(255, Math.max(0, Math.round(value * (1 + percent / 100))));
  };

  const newR = adjustValue(rgb.r);
  const newG = adjustValue(rgb.g);
  const newB = adjustValue(rgb.b);

  return rgbToHex(newR, newG, newB);
}

export function getContrastColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#000000';

  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

export function generateChartColors(
  count: number,
  useGradients: boolean = false,
  basePalette: string[] = defaultColorPalette
): string[] {
  if (useGradients && count > 1) {
    return generateGradientColors(count, basePalette[0], basePalette[Math.min(4, basePalette.length - 1)]);
  }
  return generateColorPalette(count, basePalette);
}

export function formatLabel(label: string, maxLength: number = 20): string {
  if (label.length <= maxLength) return label;
  return label.substring(0, maxLength - 3) + '...';
}

export function calculateLabelPositions(
  labels: string[],
  availableWidth: number,
  fontSize: number = 12
): number[] {
  const positions: number[] = [];
  const spacing = Math.min(availableWidth / labels.length, fontSize * 3);

  for (let i = 0; i < labels.length; i++) {
    positions.push((i + 0.5) * spacing);
  }

  return positions;
}

export function getDefaultFontFamily(): string {
  return 'Helvetica, Arial, sans-serif';
}

export function getDefaultFontSize(context: 'title' | 'label' | 'legend'): number {
  switch (context) {
    case 'title':
      return 16;
    case 'legend':
      return 12;
    case 'label':
    default:
      return 11;
  }
}

export function getDefaultFontColor(): string {
  return '#1a202c';
}

export function getDefaultGridColor(): string {
  return '#e2e8f0';
}

export function calculateChartDimensions(
  suggestedWidth: number | undefined,
  suggestedHeight: number | undefined,
  aspectRatio: number = 1.5
): { width: number; height: number } {
  const width = suggestedWidth || 800;
  const height = suggestedHeight || Math.round(width / aspectRatio);
  return { width, height };
}

export function validateDataPoints(
  data: number[] | Array<{ x?: number | string; y: number }>,
  chartType: string
): { valid: boolean; error?: string } {
  if (chartType === 'scatter' || chartType === 'bubble') {
    const firstPoint = data[0];
    if (typeof firstPoint !== 'object' || firstPoint === null) {
      return { valid: false, error: `${chartType} charts require objects with x and y properties` };
    }
    const point = firstPoint as { x?: number; y?: number };
    if (typeof point.y !== 'number' || typeof point.x !== 'number') {
      return { valid: false, error: `${chartType} charts require objects with x and y properties` };
    }
  }

  for (let i = 0; i < data.length; i++) {
    const value = typeof data[i] === 'number' ? data[i] : Number((data[i] as { y?: number }).y);
    if (typeof value !== 'number' || isNaN(value)) {
      return { valid: false, error: `Invalid data point at index ${i}` };
    }
  }

  return { valid: true };
}

export function sanitizeChartTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ');
}
