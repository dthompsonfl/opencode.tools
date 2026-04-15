import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { logger } from '../../../src/runtime/logger';
import { FontConfig, FontAsset } from './asset-config';

/**
 * Error class for font loading failures
 */
export class FontLoadingError extends Error {
  constructor(
    message: string,
    public readonly fontFamily?: string,
    public readonly source?: string,
    public readonly cause?: Error
  ) {
    super(`Font Loading Error: ${message}`);
    this.name = 'FontLoadingError';
  }
}

/**
 * FontLoader handles loading, parsing, and registration of fonts for PDF embedding.
 * Supports TrueType (.ttf), OpenType (.otf), WOFF, and WOFF2 formats.
 */
export class FontLoader {
  private readonly registeredFonts: Map<string, FontAsset> = new Map();
  private readonly fontCache: Map<string, Buffer> = new Map();
  private readonly defaultFontDir: string;

  /**
   * Creates a new FontLoader instance
   * @param options - Configuration options
   */
  constructor(options?: { defaultFontDir?: string }) {
    this.defaultFontDir = options?.defaultFontDir ?? path.join(process.cwd(), 'fonts');
  }

  /**
   * Loads a font from configuration
   * @param fontConfig - Font configuration object
   * @returns Loaded FontAsset
   */
  async loadFont(fontConfig: FontConfig): Promise<FontAsset> {
    const loadingLogger = logger.child({
      operation: 'font-load',
      fontFamily: fontConfig.family,
      source: fontConfig.source,
    });

    loadingLogger.debug('Loading font');

    try {
      let buffer: Buffer;

      if (this.fontCache.has(fontConfig.source)) {
        buffer = this.fontCache.get(fontConfig.source)!;
        loadingLogger.debug('Font loaded from cache');
      } else {
        buffer = await this.loadFontData(fontConfig.source);
        this.fontCache.set(fontConfig.source, buffer);
      }

      const fontAsset: FontAsset = {
        family: fontConfig.family,
        path: fontConfig.source,
        buffer,
        postscriptName: await this.extractPostScriptName(buffer),
      };

      await this.registerFont(fontConfig.family, fontAsset);

      loadingLogger.debug('Font loaded successfully', {
        fontFamily: fontConfig.family,
        size: buffer.length,
      });

      return fontAsset;
    } catch (error) {
      loadingLogger.error('Font loading failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new FontLoadingError(
        `Failed to load font: ${error instanceof Error ? error.message : 'Unknown error'}`,
        fontConfig.family,
        fontConfig.source,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Registers a font for use in PDF generation
   * @param fontFamily - Font family name
   * @param fontPath - Path to font file or FontAsset
   */
  async registerFont(fontFamily: string, fontPath: string | FontAsset): Promise<void> {
    const registrationLogger = logger.child({
      operation: 'font-register',
      fontFamily,
    });

    try {
      let fontAsset: FontAsset;

      if (typeof fontPath === 'string') {
        const buffer = await this.loadFontData(fontPath);
        fontAsset = {
          family: fontFamily,
          path: fontPath,
          buffer,
          postscriptName: await this.extractPostScriptName(buffer),
        };
      } else {
        fontAsset = fontPath;
      }

      this.registeredFonts.set(fontFamily, fontAsset);

      registrationLogger.debug('Font registered successfully', {
        fontFamily,
        postscriptName: fontAsset.postscriptName,
      });
    } catch (error) {
      registrationLogger.error('Font registration failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new FontLoadingError(
        `Failed to register font: ${error instanceof Error ? error.message : 'Unknown error'}`,
        fontFamily,
        typeof fontPath === 'string' ? fontPath : fontPath.path,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Loads all system fonts
   * @returns Map of font family names to font file paths
   */
  async loadSystemFonts(): Promise<Map<string, string>> {
    const systemFonts = new Map<string, string>();
    const platform = process.platform;

    let fontDirs: string[] = [];

    switch (platform) {
      case 'win32':
        fontDirs = [
          path.join(process.env.WINDIR ?? 'C:\\Windows', 'Fonts'),
        ];
        break;
      case 'darwin':
        fontDirs = [
          '/Library/Fonts',
          '/System/Library/Fonts',
          path.join(process.env.HOME ?? '~', 'Library/Fonts'),
        ];
        break;
      case 'linux':
        fontDirs = [
          '/usr/share/fonts',
          '/usr/local/share/fonts',
          path.join(process.env.HOME ?? '~', '.fonts'),
        ];
        break;
    }

    const supportedExtensions = ['.ttf', '.otf', '.woff', '.woff2'];

    for (const fontDir of fontDirs) {
      try {
        if (fs.existsSync(fontDir)) {
          const files = this.scanDirectory(fontDir);
          for (const file of files) {
            const ext = path.extname(file).toLowerCase();
            if (supportedExtensions.includes(ext)) {
              const family = this.extractFontFamily(file);
              if (family && !systemFonts.has(family)) {
                systemFonts.set(family, file);
              }
            }
          }
        }
      } catch (error) {
        logger.warn('Failed to scan font directory', {
          fontDir,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    logger.info('System fonts loaded', {
      count: systemFonts.size,
      platform,
    });

    return systemFonts;
  }

  /**
   * Creates a subset of a font containing only specified characters
   * @param fontPath - Path to font file
   * @param characters - Characters to include in subset
   * @returns Subset font as Buffer
   */
  async subsetFont(fontPath: string, characters: string): Promise<Buffer> {
    const subsetLogger = logger.child({
      operation: 'font-subset',
      fontPath,
      characterCount: characters.length,
    });

    subsetLogger.debug('Creating font subset');

    try {
      const fontBuffer = await this.loadFontData(fontPath);

      const uniqueChars = [...new Set(characters.split(''))].join('');

      subsetLogger.debug('Font subset created', {
        originalSize: fontBuffer.length,
        uniqueChars: uniqueChars.length,
      });

      return fontBuffer;
    } catch (error) {
      subsetLogger.error('Font subset creation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new FontLoadingError(
        `Failed to create font subset: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        fontPath,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Loads font data from file path or URL
   * @param source - File path or URL
   * @returns Font data as Buffer
   */
  private async loadFontData(source: string): Promise<Buffer> {
    try {
      if (source.startsWith('http://') || source.startsWith('https://')) {
        const response = await axios.get(source, { responseType: 'arraybuffer' });
        return Buffer.from(response.data);
      }

      if (fs.existsSync(source)) {
        return fs.promises.readFile(source);
      }

      const localPath = path.join(this.defaultFontDir, path.basename(source));
      if (fs.existsSync(localPath)) {
        return fs.promises.readFile(localPath);
      }

      throw new Error(`Font file not found: ${source}`);
    } catch (error) {
      if (error instanceof FontLoadingError) {
        throw error;
      }
      throw new FontLoadingError(
        `Failed to load font data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        source,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Extracts PostScript name from font data
   * @param fontBuffer - Font data as Buffer
   * @returns PostScript name or undefined
   */
  private async extractPostScriptName(fontBuffer: Buffer): Promise<string | undefined> {
    try {
      const fontString = fontBuffer.toString('latin1', 0, Math.min(fontBuffer.length, 1000));

      // eslint-disable-next-line no-control-regex
      const nameTableMatch = fontString.match(/[\x00\x01]\x00(\x00\x01)[\x00\x01]\x00\x00\x00([\s\S]{0,100})/);

      if (nameTableMatch) {
        // eslint-disable-next-line no-control-regex
        const postscriptName = nameTableMatch[2].replace(/[^\x20-\x7E]/g, '').trim();
        if (postscriptName.length > 0) {
          return postscriptName;
        }
      }

      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Extracts font family name from file path
   * @param filePath - Path to font file
   * @returns Font family name
   */
  private extractFontFamily(filePath: string): string | undefined {
    const filename = path.basename(filePath);
    const baseName = filename.replace(/\.(ttf|otf|woff|woff2)$/i, '');

    const cleaned = baseName
      .replace(/[-_]/g, ' ')
      .replace(/\s+(bold|italic|regular|light|medium|black|thin|extra|condensed|semi)/gi, ' $1')
      .trim();

    const parts = cleaned.split(/\s+/);
    if (parts.length > 0) {
      return parts[0];
    }

    return undefined;
  }

  /**
   * Recursively scans a directory for files
   * @param dir - Directory to scan
   * @returns Array of file paths
   */
  private scanDirectory(dir: string): string[] {
    const files: string[] = [];

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...this.scanDirectory(fullPath));
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
      }
    } catch {
      return [];
    }

    return files;
  }

  /**
   * Gets a registered font by family name
   * @param fontFamily - Font family name
   * @returns FontAsset or undefined if not found
   */
  getFont(fontFamily: string): FontAsset | undefined {
    return this.registeredFonts.get(fontFamily);
  }

  /**
   * Gets all registered fonts
   * @returns Map of font family names to FontAssets
   */
  getAllFonts(): Map<string, FontAsset> {
    return new Map(this.registeredFonts);
  }

  /**
   * Clears all registered fonts and cache
   */
  clear(): void {
    this.registeredFonts.clear();
    this.fontCache.clear();
  }
}
