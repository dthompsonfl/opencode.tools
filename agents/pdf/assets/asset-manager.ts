import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { logger } from '../../../src/runtime/logger';
import { AssetProcessingError } from '../errors/pdf-errors';
import {
  AssetConfig,
  AssetManagerOptions,
  AssetFormat,
  ProcessedAsset,
  AssetMetadata,
} from './asset-config';
import { ImageProcessor } from './image-processor';
import { FontLoader } from './font-loader';
import {
  isStandardPdfFont,
} from '../fonts/default-fonts';

/**
 * AssetManager orchestrates all asset processing operations for PDF generation.
 * Handles images, fonts, logos, icons, and watermarks with Sharp integration.
 */
export class AssetManager {
  private readonly imageProcessor: ImageProcessor;
  private readonly fontLoader: FontLoader;
  private readonly assetCache: Map<string, ProcessedAsset> = new Map();
  private readonly runAssetMap: Map<string, Set<string>> = new Map();
  private readonly tempDir: string;
  private readonly maxCacheSize: number;
  private readonly cacheTTL: number;
  private readonly defaultQuality: number;
  private readonly printDpi: number;
  private readonly webDpi: number;

  /**
   * Creates a new AssetManager instance
   * @param options - Configuration options
   */
  constructor(options?: AssetManagerOptions) {
    this.tempDir = options?.tempDir ?? path.join(process.cwd(), 'temp', 'assets');
    this.maxCacheSize = options?.maxCacheSize ?? 100 * 1024 * 1024;
    this.cacheTTL = options?.cacheTTL ?? 3600000;
    this.defaultQuality = options?.defaultQuality ?? 85;
    this.printDpi = options?.printDpi ?? 300;
    this.webDpi = options?.webDpi ?? 72;

    this.imageProcessor = new ImageProcessor({
      defaultQuality: this.defaultQuality,
      printDpi: this.printDpi,
      webDpi: this.webDpi,
    });

    this.fontLoader = new FontLoader();

    this.ensureTempDirectory();
  }

  /**
   * Processes a single asset according to its type
   * @param asset - Asset configuration
   * @param runId - Run identifier for temporary file organization
   * @returns Processed asset
   */
  async process(asset: AssetConfig, runId: string): Promise<ProcessedAsset> {
    const processingLogger = logger.child({
      operation: 'asset-process',
      assetId: asset.id,
      assetType: asset.type,
      runId,
    });

    processingLogger.debug('Processing asset');

    try {
      let processedAsset: ProcessedAsset;

      switch (asset.type) {
        case 'image':
          processedAsset = await this.processImage(asset, runId);
          break;
        case 'font':
          processedAsset = await this.processFont(asset, runId);
          break;
        case 'logo':
          processedAsset = await this.processLogo(asset, runId);
          break;
        case 'icon':
          processedAsset = await this.processIcon(asset, runId);
          break;
        case 'watermark':
          processedAsset = await this.processWatermark(asset, runId);
          break;
        default:
          throw new AssetProcessingError(
            asset.id,
            `Unknown asset type: ${asset.type}`
          );
      }

      this.cacheAsset(processedAsset);
      this.trackRunAsset(runId, asset.id);

      processingLogger.debug('Asset processed successfully', {
        assetId: asset.id,
        type: asset.type,
        path: processedAsset.path,
        size: processedAsset.buffer?.length,
      });

      return processedAsset;
    } catch (error) {
      processingLogger.error('Asset processing failed', {
        assetId: asset.id,
        assetType: asset.type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof AssetProcessingError) {
        throw error;
      }

      throw new AssetProcessingError(
        asset.id,
        `Failed to process asset: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Processes multiple assets concurrently
   * @param assets - Array of asset configurations
   * @param runId - Run identifier
   * @returns Array of processed assets
   */
  async processAll(assets: AssetConfig[], runId: string): Promise<ProcessedAsset[]> {
    const processingLogger = logger.child({
      operation: 'asset-process-all',
      assetCount: assets.length,
      runId,
    });

    processingLogger.debug('Processing multiple assets');

    const results = await Promise.all(
      assets.map(asset => this.process(asset, runId))
    );

    processingLogger.debug('All assets processed', {
      processedCount: results.length,
    });

    return results;
  }

  /**
   * Retrieves a cached asset by ID
   * @param assetId - Asset identifier
   * @returns Processed asset or null if not found
   */
  async getAsset(assetId: string): Promise<ProcessedAsset | null> {
    return this.assetCache.get(assetId) ?? null;
  }

  /**
   * Deletes an asset from cache and temporary storage
   * @param assetId - Asset identifier
   */
  async deleteAsset(assetId: string): Promise<void> {
    const asset = this.assetCache.get(assetId);
    if (asset) {
      try {
        if (asset.path && fs.existsSync(asset.path)) {
          fs.unlinkSync(asset.path);
        }
      } catch (error) {
        logger.warn('Failed to delete asset file', {
          assetId,
          path: asset.path,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      this.assetCache.delete(assetId);
    }
  }

  /**
   * Cleans up all assets for a specific run
   * @param runId - Run identifier
   */
  async cleanup(runId: string): Promise<void> {
    const processingLogger = logger.child({
      operation: 'asset-cleanup',
      runId,
    });

    processingLogger.debug('Cleaning up assets');

    const runAssets = this.runAssetMap.get(runId);
    if (runAssets) {
      for (const assetId of runAssets) {
        await this.deleteAsset(assetId);
      }
      this.runAssetMap.delete(runId);
    }

    const runTempDir = path.join(this.tempDir, runId);
    try {
      if (fs.existsSync(runTempDir)) {
        fs.rmSync(runTempDir, { recursive: true, force: true });
      }
    } catch (error) {
      processingLogger.warn('Failed to clean up run directory', {
        runTempDir,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    processingLogger.debug('Asset cleanup completed');
  }

  /**
   * Processes an image asset
   * @param asset - Image asset configuration
   * @param runId - Run identifier
   * @returns Processed asset
   */
  private async processImage(asset: AssetConfig, runId: string): Promise<ProcessedAsset> {
    const imageLogger = logger.child({
      operation: 'process-image',
      assetId: asset.id,
      source: asset.source,
    });

    imageLogger.debug('Processing image asset');

    const imageBuffer = await this.loadSource(asset.source);

    let processedBuffer = imageBuffer;
    const format: AssetFormat = asset.format ?? 'png';
    let width: number | undefined;
    let height: number | undefined;

    if (asset.width || asset.height) {
      processedBuffer = await this.imageProcessor.resize(
        imageBuffer,
        asset.width ?? 0,
        asset.height ?? 0,
        'inside'
      );
      const metadata = await this.imageProcessor.getImageMetadata(processedBuffer);
      width = metadata.width;
      height = metadata.height;
    }

    if (asset.quality && format !== 'png') {
      processedBuffer = await this.imageProcessor.convertFormat(
        processedBuffer,
        format,
        asset.quality
      );
    }

    const outputPath = await this.saveToTemp(processedBuffer, asset.id, runId, format);
    const metadata = await this.imageProcessor.getImageMetadata(processedBuffer);

    const assetMetadata: AssetMetadata = {
      originalSize: imageBuffer.length,
      processedSize: processedBuffer.length,
      compressionRatio: processedBuffer.length / imageBuffer.length,
      mimeType: `image/${format}`,
      hasAlpha: metadata.hasAlpha ?? false,
      orientation: metadata.orientation,
      dpi: metadata.density ?? this.webDpi,
      processingTime: 0,
    };

    return {
      id: asset.id,
      type: 'image',
      path: outputPath,
      buffer: processedBuffer,
      width,
      height,
      format,
      metadata: assetMetadata,
    };
  }

  /**
   * Processes a font asset
   * @param asset - Font asset configuration
   * @param runId - Run identifier
   * @returns Processed asset
   */
  private async processFont(asset: AssetConfig, runId: string): Promise<ProcessedAsset> {
    const fontLogger = logger.child({
      operation: 'process-font',
      assetId: asset.id,
      source: asset.source,
    });

    fontLogger.debug('Processing font asset');

    if (isStandardPdfFont(asset.source)) {
      return {
        id: asset.id,
        type: 'font',
        path: asset.source,
        format: 'svg',
        fontFamily: asset.source,
      };
    }

    const fontAsset = await this.fontLoader.loadFont({
      family: asset.id,
      source: asset.source,
      weights: [400, 700],
      style: 'normal',
    });

    const outputPath = await this.saveToTemp(
      fontAsset.buffer,
      asset.id,
      runId,
      'svg'
    );

    return {
      id: asset.id,
      type: 'font',
      path: outputPath,
      buffer: fontAsset.buffer,
      format: 'svg',
      fontFamily: fontAsset.family,
    };
  }

  /**
   * Processes a logo asset with special handling for transparency and quality
   * @param asset - Logo asset configuration
   * @param runId - Run identifier
   * @returns Processed asset
   */
  private async processLogo(asset: AssetConfig, runId: string): Promise<ProcessedAsset> {
    const logoLogger = logger.child({
      operation: 'process-logo',
      assetId: asset.id,
      source: asset.source,
    });

    logoLogger.debug('Processing logo asset');

    const logoBuffer = await this.loadSource(asset.source);
    const metadata = await this.imageProcessor.getImageMetadata(logoBuffer);

    let processedBuffer = logoBuffer;
    const maxWidth = 300;
    const maxHeight = 200;

    if (metadata.width && metadata.height) {
      if (metadata.width > maxWidth || metadata.height > maxHeight) {
        const aspectRatio = metadata.width / metadata.height;
        let newWidth = Math.min(metadata.width, maxWidth);
        let newHeight = newWidth / aspectRatio;

        if (newHeight > maxHeight) {
          newHeight = maxHeight;
          newWidth = newHeight * aspectRatio;
        }

        processedBuffer = await this.imageProcessor.resize(
          logoBuffer,
          Math.round(newWidth),
          Math.round(newHeight),
          'inside'
        );
      }
    }

    const format: AssetFormat = metadata.hasAlpha ? 'png' : 'png';
    const outputPath = await this.saveToTemp(processedBuffer, asset.id, runId, format);
    const processedMetadata = await this.imageProcessor.getImageMetadata(processedBuffer);

    const assetMetadata: AssetMetadata = {
      originalSize: logoBuffer.length,
      processedSize: processedBuffer.length,
      compressionRatio: processedBuffer.length / logoBuffer.length,
      mimeType: `image/${format}`,
      hasAlpha: processedMetadata.hasAlpha ?? false,
      orientation: processedMetadata.orientation,
      dpi: this.printDpi,
      processingTime: 0,
    };

    return {
      id: asset.id,
      type: 'logo',
      path: outputPath,
      buffer: processedBuffer,
      width: processedMetadata.width,
      height: processedMetadata.height,
      format,
      metadata: assetMetadata,
    };
  }

  /**
   * Processes an icon asset
   * @param asset - Icon asset configuration
   * @param runId - Run identifier
   * @returns Processed asset
   */
  private async processIcon(asset: AssetConfig, runId: string): Promise<ProcessedAsset> {
    const iconLogger = logger.child({
      operation: 'process-icon',
      assetId: asset.id,
      source: asset.source,
    });

    iconLogger.debug('Processing icon asset');

    const iconBuffer = await this.loadSource(asset.source);

    const targetSize = asset.width ?? 32;
    const processedBuffer = await this.imageProcessor.resize(
      iconBuffer,
      targetSize,
      targetSize,
      'cover'
    );

    const format: AssetFormat = 'png';
    const outputPath = await this.saveToTemp(processedBuffer, asset.id, runId, format);
    const processedMetadata = await this.imageProcessor.getImageMetadata(processedBuffer);

    const assetMetadata: AssetMetadata = {
      originalSize: iconBuffer.length,
      processedSize: processedBuffer.length,
      compressionRatio: processedBuffer.length / iconBuffer.length,
      mimeType: `image/${format}`,
      hasAlpha: processedMetadata.hasAlpha ?? false,
      dpi: this.webDpi,
      processingTime: 0,
    };

    return {
      id: asset.id,
      type: 'icon',
      path: outputPath,
      buffer: processedBuffer,
      width: processedMetadata.width,
      height: processedMetadata.height,
      format,
      metadata: assetMetadata,
    };
  }

  /**
   * Processes a watermark asset
   * @param asset - Watermark asset configuration
   * @param runId - Run identifier
   * @returns Processed asset
   */
  private async processWatermark(asset: AssetConfig, runId: string): Promise<ProcessedAsset> {
    const watermarkLogger = logger.child({
      operation: 'process-watermark',
      assetId: asset.id,
      source: asset.source,
    });

    watermarkLogger.debug('Processing watermark asset');

    if (asset.source) {
      const watermarkBuffer = await this.loadSource(asset.source);

      const format: AssetFormat = 'png';
      const outputPath = await this.saveToTemp(watermarkBuffer, asset.id, runId, format);
      const metadata = await this.imageProcessor.getImageMetadata(watermarkBuffer);

      const rotation = asset.style?.rotation ?? -45;
      const opacity = asset.style?.opacity ?? 0.3;

      return {
        id: asset.id,
        type: 'watermark',
        path: outputPath,
        buffer: watermarkBuffer,
        width: metadata.width,
        height: metadata.height,
        format,
        metadata: {
          originalSize: watermarkBuffer.length,
          processedSize: watermarkBuffer.length,
          compressionRatio: 1,
          mimeType: `image/${format}`,
          hasAlpha: metadata.hasAlpha ?? false,
          orientation: rotation,
          dpi: this.webDpi,
          processingTime: 0,
          opacity,
        },
      };
    }

    throw new AssetProcessingError(
      asset.id,
      'Watermark requires either text or image source'
    );
  }

  /**
   * Loads asset source from file path or URL
   * @param source - Source path or URL
   * @returns Asset data as Buffer
   */
  private async loadSource(source: string): Promise<Buffer> {
    try {
      if (source.startsWith('http://') || source.startsWith('https://')) {
        const response = await axios.get(source, { responseType: 'arraybuffer' });
        return Buffer.from(response.data);
      }

      if (fs.existsSync(source)) {
        return fs.promises.readFile(source);
      }

      throw new Error(`Source file not found: ${source}`);
    } catch (error) {
      throw new Error(
        `Failed to load source: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Saves processed asset to temporary directory
   * @param buffer - Asset data
   * @param assetId - Asset identifier
   * @param runId - Run identifier
   * @param format - Asset format
   * @returns Path to saved file
   */
  private async saveToTemp(
    buffer: Buffer,
    assetId: string,
    runId: string,
    format: AssetFormat
  ): Promise<string> {
    const runTempDir = path.join(this.tempDir, runId);
    this.ensureDirectory(runTempDir);

    const filename = `${assetId}.${format}`;
    const filePath = path.join(runTempDir, filename);

    await fs.promises.writeFile(filePath, buffer);

    return filePath;
  }

  /**
   * Caches a processed asset
   * @param asset - Processed asset
   */
  private cacheAsset(asset: ProcessedAsset): void {
    this.assetCache.set(asset.id, asset);

    while (this.getCacheSize() > this.maxCacheSize) {
      const oldestKey = this.assetCache.keys().next().value;
      if (oldestKey) {
        this.assetCache.delete(oldestKey);
      }
    }
  }

  /**
   * Tracks an asset for a specific run
   * @param runId - Run identifier
   * @param assetId - Asset identifier
   */
  private trackRunAsset(runId: string, assetId: string): void {
    if (!this.runAssetMap.has(runId)) {
      this.runAssetMap.set(runId, new Set());
    }
    this.runAssetMap.get(runId)!.add(assetId);
  }

  /**
   * Gets total cache size
   * @returns Total cache size in bytes
   */
  private getCacheSize(): number {
    let size = 0;
    for (const asset of this.assetCache.values()) {
      size += asset.buffer?.length ?? 0;
    }
    return size;
  }

  /**
   * Ensures temporary directory exists
   */
  private ensureTempDirectory(): void {
    this.ensureDirectory(this.tempDir);
  }

  /**
   * Ensures a directory exists
   * @param dir - Directory path
   */
  private ensureDirectory(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Gets the image processor instance
   * @returns ImageProcessor
   */
  getImageProcessor(): ImageProcessor {
    return this.imageProcessor;
  }

  /**
   * Gets the font loader instance
   * @returns FontLoader
   */
  getFontLoader(): FontLoader {
    return this.fontLoader;
  }

  /**
   * Clears all cached assets
   */
  clearCache(): void {
    this.assetCache.clear();
  }

  /**
   * Gets cache statistics
   * @returns Cache statistics object
   */
  getCacheStats(): { size: number; count: number; maxSize: number } {
    return {
      size: this.getCacheSize(),
      count: this.assetCache.size,
      maxSize: this.maxCacheSize,
    };
  }
}
