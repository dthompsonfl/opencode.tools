import { z } from 'zod';

/**
 * Asset type enumeration
 */
export const ASSET_TYPE_VALUES = ['image', 'font', 'logo', 'icon', 'watermark'] as const;
export type AssetType = typeof ASSET_TYPE_VALUES[number];

/**
 * Supported image formats for asset processing
 */
export const ASSET_FORMAT_VALUES = ['jpeg', 'png', 'webp', 'gif', 'svg'] as const;
export type AssetFormat = typeof ASSET_FORMAT_VALUES[number];

/**
 * Image fit modes for resizing operations
 */
export const IMAGE_FIT_VALUES = ['cover', 'contain', 'fill', 'inside', 'outside'] as const;
export type ImageFit = typeof IMAGE_FIT_VALUES[number];

/**
 * Asset position options for placement in PDF
 */
export const ASSET_POSITION_VALUES = ['center', 'top', 'bottom', 'left', 'right'] as const;
export type AssetPosition = typeof ASSET_POSITION_VALUES[number];

/**
 * Blend mode options for image overlay effects
 */
export const BLEND_MODE_VALUES = ['normal', 'multiply', 'screen', 'overlay'] as const;
export type BlendMode = typeof BLEND_MODE_VALUES[number];

/**
 * Style configuration for asset rendering
 */
export const AssetStyleSchema = z.object({
  opacity: z.number().min(0).max(1).optional(),
  rotation: z.number().optional(),
  position: z.enum(ASSET_POSITION_VALUES).optional(),
  blendMode: z.enum(BLEND_MODE_VALUES).optional(),
});

export type AssetStyle = z.infer<typeof AssetStyleSchema>;

/**
 * Image processing options
 */
export const ImageProcessOptionsSchema = z.object({
  width: z.number().min(1).max(10000).optional(),
  height: z.number().min(1).max(10000).optional(),
  fit: z.enum(IMAGE_FIT_VALUES).optional(),
  format: z.enum(ASSET_FORMAT_VALUES).optional(),
  quality: z.number().min(1).max(100).optional(),
  background: z.object({
    r: z.number().min(0).max(255),
    g: z.number().min(0).max(255),
    b: z.number().min(0).max(255),
    alpha: z.number().min(0).max(1),
  }).optional(),
  compress: z.boolean().optional(),
});

export type ImageProcessOptions = z.infer<typeof ImageProcessOptionsSchema>;

/**
 * Main asset configuration schema
 */
export const AssetConfigSchema = z.object({
  id: z.string().min(1),
  type: z.enum(ASSET_TYPE_VALUES),
  source: z.string().min(1),
  alt: z.string().optional(),
  width: z.number().min(1).max(10000).optional(),
  height: z.number().min(1).max(10000).optional(),
  quality: z.number().min(1).max(100).optional(),
  format: z.enum(ASSET_FORMAT_VALUES).optional(),
  style: AssetStyleSchema.optional(),
});

export type AssetConfig = z.infer<typeof AssetConfigSchema>;

/**
 * Metadata associated with a processed asset
 */
export interface AssetMetadata {
  originalSize: number;
  processedSize: number;
  compressionRatio: number;
  mimeType: string;
  colorSpace?: string;
  hasAlpha: boolean;
  orientation?: number;
  dpi?: number;
  processingTime: number;
  opacity?: number;
  rotation?: number;
}

/**
 * Processed asset with all necessary data for PDF embedding
 */
export interface ProcessedAsset {
  id: string;
  type: AssetType;
  path: string;
  buffer?: Buffer;
  width?: number;
  height?: number;
  format: AssetFormat;
  fontFamily?: string;
  metadata?: AssetMetadata;
}

/**
 * Asset manager initialization options
 */
export interface AssetManagerOptions {
  tempDir?: string;
  maxCacheSize?: number;
  cacheTTL?: number;
  defaultQuality?: number;
  printDpi?: number;
  webDpi?: number;
}

/**
 * Font configuration for loading
 */
export interface FontConfig {
  family: string;
  source: string;
  weights?: number[];
  style?: 'normal' | 'italic';
  subset?: string;
}

/**
 * Font asset with loaded data
 */
export interface FontAsset {
  family: string;
  path: string;
  buffer: Buffer;
  postscriptName?: string;
}

/**
 * Watermark configuration
 */
export interface WatermarkConfig {
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  opacity?: number;
  rotation?: number;
  position?: AssetPosition;
  repeat?: boolean;
}

/**
 * Logo processing options
 */
export interface LogoProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  preserveAspectRatio?: boolean;
  quality?: number;
  format?: AssetFormat;
}
