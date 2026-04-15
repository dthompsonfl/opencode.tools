import sharp from 'sharp';
import { logger } from '../../../src/runtime/logger';
import {
  AssetFormat,
  ImageProcessOptions,
} from './asset-config';

/**
 * DPI settings for different output contexts
 */
export const PRINT_DPI = 300;
export const WEB_DPI = 72;

/**
 * Default image optimization settings indexed by format
 */
const imageDefaultsMap: Record<AssetFormat, Record<string, unknown>> = {
  jpeg: { quality: 85, progressive: true, mozjpeg: true },
  png: { quality: 95, compressionLevel: 9 },
  webp: { quality: 90, effort: 6 },
  gif: { colors: 256 },
  svg: {},
};

/**
 * Error class for image processing failures
 */
export class ImageProcessingError extends Error {
  constructor(
    message: string,
    public readonly source?: string | Buffer,
    public readonly cause?: Error
  ) {
    super(`Image Processing Error: ${message}`);
    this.name = 'ImageProcessingError';
  }
}

/**
 * ImageProcessor handles all image processing operations using Sharp.
 * Provides comprehensive image manipulation for PDF generation including:
 * - Format conversion
 * - Resizing with various fit modes
 * - Quality optimization
 * - Metadata extraction
 */
export class ImageProcessor {
  private readonly defaultQuality: number;
  private readonly printDpi: number;
  private readonly webDpi: number;

  /**
   * Creates a new ImageProcessor instance
   * @param options - Configuration options for the processor
   */
  constructor(options?: { defaultQuality?: number; printDpi?: number; webDpi?: number }) {
    this.defaultQuality = options?.defaultQuality ?? 85;
    this.printDpi = options?.printDpi ?? PRINT_DPI;
    this.webDpi = options?.webDpi ?? WEB_DPI;
  }

  /**
   * Loads an image from a file path or Buffer
   * @param source - File path or Buffer containing the image
   * @returns Sharp instance for further processing
   */
  private async loadImage(source: string | Buffer): Promise<sharp.Sharp> {
    try {
      if (Buffer.isBuffer(source)) {
        return sharp(source);
      }
      return sharp(source);
    } catch (error) {
      throw new ImageProcessingError(
        `Failed to load image: ${error instanceof Error ? error.message : 'Unknown error'}`,
        source,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Processes an image according to the specified options
   * @param source - Image source (path or Buffer)
   * @param options - Processing options
   * @returns Processed image as Buffer
   */
  async process(source: string | Buffer, options: ImageProcessOptions): Promise<Buffer> {
    const startTime = Date.now();
    const processingLogger = logger.child({ operation: 'image-process', sourceType: typeof source });

    processingLogger.debug('Starting image processing');

    try {
      let image = await this.loadImage(source);

      if (options.width || options.height) {
        image = await this.internalResize(image, options.width, options.height, options.fit);
      }

      if (options.format) {
        image = await this.internalConvertFormat(image, options.format, options.quality ?? this.defaultQuality);
      }

      if (options.compress) {
        image = await this.internalOptimize(image, options.format);
      }

      const buffer = await image.toBuffer();
      const processingTime = Date.now() - startTime;

      processingLogger.debug('Image processing completed', {
        originalSize: Buffer.isBuffer(source) ? source.length : undefined,
        processedSize: buffer.length,
        processingTime,
      });

      return buffer;
    } catch (error) {
      processingLogger.error('Image processing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new ImageProcessingError(
        `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        source,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Optimizes an image buffer with specified options
   * @param imageBuffer - Raw image Buffer
   * @param options - Optimization options
   * @returns Optimized image Buffer
   */
  async optimize(imageBuffer: Buffer, options: ImageProcessOptions): Promise<Buffer> {
    const processingLogger = logger.child({ operation: 'image-optimize', size: imageBuffer.length });

    try {
      let image = sharp(imageBuffer);
      const metadata = await image.metadata();
      const format = options.format ?? this.detectFormat(metadata.format);

      const config = imageDefaultsMap[format] ?? {};

      switch (format) {
        case 'jpeg':
          image = image.jpeg(config as sharp.JpegOptions);
          break;
        case 'png':
          image = image.png(config as sharp.PngOptions);
          break;
        case 'webp':
          image = image.webp(config as sharp.WebpOptions);
          break;
        case 'gif':
          image = image.gif(config as sharp.GifOptions);
          break;
        default:
          break;
      }

      const optimizedBuffer = await image.toBuffer();

      processingLogger.debug('Image optimization completed', {
        originalSize: imageBuffer.length,
        optimizedSize: optimizedBuffer.length,
        compressionRatio: (optimizedBuffer.length / imageBuffer.length).toFixed(2),
      });

      return optimizedBuffer;
    } catch (error) {
      processingLogger.error('Image optimization failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new ImageProcessingError(
        `Optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        imageBuffer,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Resizes an image buffer to specified dimensions
   * @param imageBuffer - Raw image Buffer
   * @param width - Target width in pixels
   * @param height - Target height in pixels
   * @param fit - Resize fit mode (default: 'inside')
   * @returns Resized image Buffer
   */
  async resize(
    imageBuffer: Buffer,
    width: number,
    height: number,
    fit: ImageProcessOptions['fit'] = 'inside'
  ): Promise<Buffer> {
    const processingLogger = logger.child({
      operation: 'image-resize',
      originalWidth: (await sharp(imageBuffer).metadata()).width,
      originalHeight: (await sharp(imageBuffer).metadata()).height,
      targetWidth: width,
      targetHeight: height,
      fit,
    });

    try {
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      const hasAlpha = metadata.hasAlpha ?? false;

      const resizeOptions: sharp.ResizeOptions = {
        width,
        height,
        fit,
        background: { r: 255, g: 255, b: 255, alpha: hasAlpha ? 0 : 1 },
      };

      const resizedBuffer = await image.resize(resizeOptions).toBuffer();

      processingLogger.debug('Image resize completed', {
        resizedWidth: (await sharp(resizedBuffer).metadata()).width,
        resizedHeight: (await sharp(resizedBuffer).metadata()).height,
      });

      return resizedBuffer;
    } catch (error) {
      processingLogger.error('Image resize failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new ImageProcessingError(
        `Resize failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        imageBuffer,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Converts an image buffer to the specified format
   * @param imageBuffer - Raw image Buffer
   * @param format - Target format
   * @param quality - Quality setting (1-100)
   * @returns Converted image Buffer
   */
  async convertFormat(
    imageBuffer: Buffer,
    format: AssetFormat,
    quality: number = this.defaultQuality
  ): Promise<Buffer> {
    const processingLogger = logger.child({
      operation: 'image-convert-format',
      originalFormat: (await sharp(imageBuffer).metadata()).format,
      targetFormat: format,
      quality,
    });

    try {
      let image = sharp(imageBuffer);

      switch (format) {
        case 'jpeg':
          image = image.jpeg({ quality, progressive: true, mozjpeg: true });
          break;
        case 'png':
          image = image.png({ quality, compressionLevel: 9 });
          break;
        case 'webp':
          image = image.webp({ quality, effort: 6 });
          break;
        case 'gif':
          image = image.gif({ colors: 256 });
          break;
        case 'svg':
          processingLogger.warn('SVG conversion requested - SVG is vector format, returning original');
          return imageBuffer;
      }

      const convertedBuffer = await image.toBuffer();

      processingLogger.debug('Image format conversion completed', {
        resultSize: convertedBuffer.length,
      });

      return convertedBuffer;
    } catch (error) {
      processingLogger.error('Image format conversion failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new ImageProcessingError(
        `Format conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        imageBuffer,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Extracts metadata from an image buffer
   * @param imageBuffer - Raw image Buffer
   * @returns Image metadata object
   */
  async getImageMetadata(imageBuffer: Buffer): Promise<{
    width?: number;
    height?: number;
    format?: string;
    space?: string;
    channels?: number;
    hasAlpha?: boolean;
    orientation?: number;
    density?: number;
  }> {
    try {
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();

      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        space: metadata.space,
        channels: metadata.channels,
        hasAlpha: metadata.hasAlpha,
        orientation: metadata.orientation,
        density: metadata.density,
      };
    } catch (error) {
      throw new ImageProcessingError(
        `Failed to extract metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
        imageBuffer,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Creates a resized version of an image
   * @param image - Sharp instance
   * @param width - Target width
   * @param height - Target height
   * @param fit - Fit mode
   * @returns Resized Sharp instance
   */
  private async internalResize(
    image: sharp.Sharp,
    width?: number,
    height?: number,
    fit?: ImageProcessOptions['fit']
  ): Promise<sharp.Sharp> {
    if (!width && !height) {
      return image;
    }

    const resizeOptions: sharp.ResizeOptions = {
      width,
      height,
      fit: fit ?? 'inside',
      withoutEnlargement: true,
    };

    return image.resize(resizeOptions);
  }

  /**
   * Converts Sharp instance to specified format
   * @param image - Sharp instance
   * @param format - Target format
   * @param quality - Quality setting
   * @returns Converted Sharp instance
   */
  private async internalConvertFormat(
    image: sharp.Sharp,
    format: AssetFormat,
    quality: number
  ): Promise<sharp.Sharp> {
    switch (format) {
      case 'jpeg':
        return image.jpeg({ quality, progressive: true, mozjpeg: true });
      case 'png':
        return image.png({ quality, compressionLevel: 9 });
      case 'webp':
        return image.webp({ quality, effort: 6 });
      case 'gif':
        return image.gif({ colors: 256 });
      case 'svg':
        return image;
      default:
        return image;
    }
  }

  /**
   * Applies optimization to Sharp instance
   * @param image - Sharp instance
   * @param format - Image format
   * @returns Optimized Sharp instance
   */
  private async internalOptimize(image: sharp.Sharp, format?: AssetFormat): Promise<sharp.Sharp> {
    const targetFormat = format ?? 'jpeg';
    const config = imageDefaultsMap[targetFormat] ?? {};

    switch (targetFormat) {
      case 'jpeg':
        return image.jpeg(config as sharp.JpegOptions);
      case 'png':
        return image.png(config as sharp.PngOptions);
      case 'webp':
        return image.webp(config as sharp.WebpOptions);
      case 'gif':
        return image.gif(config as sharp.GifOptions);
      default:
        return image;
    }
  }

  /**
   * Detects image format from Sharp metadata
   * @param format - Format string from Sharp
   * @returns Detected AssetFormat
   */
  private detectFormat(format?: string): AssetFormat {
    switch (format?.toLowerCase()) {
      case 'jpeg':
      case 'jpg':
        return 'jpeg';
      case 'png':
        return 'png';
      case 'webp':
        return 'webp';
      case 'gif':
        return 'gif';
      case 'svg':
        return 'svg';
      default:
        return 'png';
    }
  }
}
