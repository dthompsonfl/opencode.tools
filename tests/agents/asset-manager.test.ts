import { AssetManager } from '../../agents/pdf/assets/asset-manager';
import {
  AssetConfig,
  AssetType,
  AssetFormat,
  AssetStyle,
} from '../../agents/pdf/assets/asset-config';
import { ImageProcessor } from '../../agents/pdf/assets/image-processor';
import { FontLoader } from '../../agents/pdf/assets/font-loader';
import { AssetProcessingError } from '../../agents/pdf/errors/pdf-errors';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('axios');

describe('AssetManager', () => {
  let assetManager: AssetManager;
  const testRunId = 'test-run-123';

  beforeEach(() => {
    assetManager = new AssetManager({
      tempDir: path.join(__dirname, '..', '..', 'temp', 'test-assets'),
      maxCacheSize: 10 * 1024 * 1024,
    });
  });

  afterEach(async () => {
    await assetManager.cleanup(testRunId);
    assetManager.clearCache();
  });

  describe('constructor', () => {
    it('should create AssetManager with default options', () => {
      const manager = new AssetManager();
      expect(manager).toBeDefined();
    });

    it('should create AssetManager with custom options', () => {
      const manager = new AssetManager({
        tempDir: '/custom/temp',
        maxCacheSize: 5 * 1024 * 1024,
        defaultQuality: 90,
      });
      expect(manager).toBeDefined();
    });
  });

  describe('getAsset', () => {
    it('should return null for non-existent asset', async () => {
      const result = await assetManager.getAsset('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('deleteAsset', () => {
    it('should not throw for non-existent asset', async () => {
      await expect(assetManager.deleteAsset('non-existent')).resolves.not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should complete without error for empty run', async () => {
      await expect(assetManager.cleanup('empty-run')).resolves.not.toThrow();
    });
  });

  describe('cache stats', () => {
    it('should return initial cache stats', () => {
      const stats = assetManager.getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('count');
      expect(stats).toHaveProperty('maxSize');
      expect(stats.count).toBe(0);
    });
  });
});

describe('ImageProcessor', () => {
  let imageProcessor: ImageProcessor;

  beforeEach(() => {
    imageProcessor = new ImageProcessor({
      defaultQuality: 85,
      printDpi: 300,
      webDpi: 72,
    });
  });

  describe('constructor', () => {
    it('should create ImageProcessor with default options', () => {
      const processor = new ImageProcessor();
      expect(processor).toBeDefined();
    });

    it('should create ImageProcessor with custom options', () => {
      const processor = new ImageProcessor({
        defaultQuality: 95,
        printDpi: 300,
        webDpi: 96,
      });
      expect(processor).toBeDefined();
    });
  });

  describe('getImageMetadata', () => {
    it('should throw for invalid buffer', async () => {
      const invalidBuffer = Buffer.from('not a valid image');
      await expect(imageProcessor.getImageMetadata(invalidBuffer)).rejects.toThrow();
    });
  });

  describe('resize', () => {
    it('should throw for invalid buffer', async () => {
      const invalidBuffer = Buffer.from('not a valid image');
      await expect(imageProcessor.resize(invalidBuffer, 100, 100)).rejects.toThrow();
    });
  });

  describe('convertFormat', () => {
    it('should throw for invalid buffer', async () => {
      const invalidBuffer = Buffer.from('not a valid image');
      await expect(imageProcessor.convertFormat(invalidBuffer, 'png')).rejects.toThrow();
    });
  });

  describe('optimize', () => {
    it('should throw for invalid buffer', async () => {
      const invalidBuffer = Buffer.from('not a valid image');
      await expect(imageProcessor.optimize(invalidBuffer, {})).rejects.toThrow();
    });
  });
});

describe('FontLoader', () => {
  let fontLoader: FontLoader;

  beforeEach(() => {
    fontLoader = new FontLoader();
  });

  afterEach(() => {
    fontLoader.clear();
  });

  describe('constructor', () => {
    it('should create FontLoader with default options', () => {
      const loader = new FontLoader();
      expect(loader).toBeDefined();
    });

    it('should create FontLoader with custom font directory', () => {
      const loader = new FontLoader({
        defaultFontDir: '/custom/fonts',
      });
      expect(loader).toBeDefined();
    });
  });

  describe('getFont', () => {
    it('should return undefined for non-existent font', () => {
      const font = fontLoader.getFont('NonExistentFont');
      expect(font).toBeUndefined();
    });
  });

  describe('getAllFonts', () => {
    it('should return empty map initially', () => {
      const fonts = fontLoader.getAllFonts();
      expect(fonts.size).toBe(0);
    });
  });

  describe('clear', () => {
    it('should not throw when clearing', () => {
      expect(() => fontLoader.clear()).not.toThrow();
    });
  });
});

describe('AssetConfig types', () => {
  describe('AssetConfig', () => {
    it('should accept valid image asset config', () => {
      const config: AssetConfig = {
        id: 'test-image',
        type: 'image',
        source: 'https://example.com/image.png',
        width: 800,
        height: 600,
        quality: 85,
        format: 'png',
      };
      expect(config.id).toBe('test-image');
      expect(config.type).toBe('image');
    });

    it('should accept valid font asset config', () => {
      const config: AssetConfig = {
        id: 'test-font',
        type: 'font',
        source: 'Roboto',
      };
      expect(config.id).toBe('test-font');
      expect(config.type).toBe('font');
    });

    it('should accept valid logo asset config', () => {
      const config: AssetConfig = {
        id: 'test-logo',
        type: 'logo',
        source: 'https://example.com/logo.png',
        width: 200,
      };
      expect(config.id).toBe('test-logo');
      expect(config.type).toBe('logo');
    });

    it('should accept valid icon asset config', () => {
      const config: AssetConfig = {
        id: 'test-icon',
        type: 'icon',
        source: 'https://example.com/icon.svg',
        width: 32,
      };
      expect(config.id).toBe('test-icon');
      expect(config.type).toBe('icon');
    });

    it('should accept valid watermark asset config', () => {
      const style: AssetStyle = {
        opacity: 0.3,
        rotation: -45,
        position: 'center',
        blendMode: 'multiply',
      };
      const config: AssetConfig = {
        id: 'test-watermark',
        type: 'watermark',
        source: 'CONFIDENTIAL',
        style,
      };
      expect(config.id).toBe('test-watermark');
      expect(config.type).toBe('watermark');
      expect(config.style?.opacity).toBe(0.3);
      expect(config.style?.rotation).toBe(-45);
    });
  });

  describe('AssetType', () => {
    it('should have all expected asset types', () => {
      const types: AssetType[] = ['image', 'font', 'logo', 'icon', 'watermark'];
      expect(types).toHaveLength(5);
    });
  });

  describe('AssetFormat', () => {
    it('should have all expected asset formats', () => {
      const formats: AssetFormat[] = ['jpeg', 'png', 'webp', 'gif', 'svg'];
      expect(formats).toHaveLength(5);
    });
  });

  describe('AssetStyle', () => {
    it('should accept valid asset style', () => {
      const style: AssetStyle = {
        opacity: 0.5,
        rotation: 90,
        position: 'bottom',
        blendMode: 'overlay',
      };
      expect(style.opacity).toBe(0.5);
      expect(style.rotation).toBe(90);
      expect(style.position).toBe('bottom');
      expect(style.blendMode).toBe('overlay');
    });

    it('should accept partial asset style', () => {
      const style: AssetStyle = {
        opacity: 0.8,
      };
      expect(style.opacity).toBe(0.8);
      expect(style.rotation).toBeUndefined();
    });
  });
});

describe('ImageProcessor DPI constants', () => {
  it('should export PRINT_DPI constant', () => {
    const { PRINT_DPI } = require('../../agents/pdf/assets/image-processor');
    expect(PRINT_DPI).toBe(300);
  });

  it('should export WEB_DPI constant', () => {
    const { WEB_DPI } = require('../../agents/pdf/assets/image-processor');
    expect(WEB_DPI).toBe(72);
  });
});

describe('Default fonts', () => {
  it('should export standard PDF fonts', () => {
    const { defaultFonts } = require('../../agents/pdf/fonts/default-fonts');
    expect(defaultFonts.Helvetica).toBe('Helvetica');
    expect(defaultFonts['Helvetica-Bold']).toBe('Helvetica-Bold');
    expect(defaultFonts['Times-Roman']).toBe('Times-Roman');
    expect(defaultFonts['Courier']).toBe('Courier');
  });

  it('should export isStandardPdfFont function', () => {
    const { isStandardPdfFont } = require('../../agents/pdf/fonts/default-fonts');
    expect(isStandardPdfFont('Helvetica')).toBe(true);
    expect(isStandardPdfFont('Arial')).toBe(false);
  });

  it('should export getStandardPdfFontName function', () => {
    const { getStandardPdfFontName } = require('../../agents/pdf/fonts/default-fonts');
    expect(getStandardPdfFontName('Helvetica')).toBe('Helvetica');
    expect(getStandardPdfFontName('Arial')).toBe('Arial');
  });
});

describe('Custom fonts', () => {
  it('should export Google Fonts', () => {
    const { googleFonts } = require('../../agents/pdf/fonts/custom-fonts');
    expect(googleFonts.length).toBeGreaterThan(0);
    const hasRoboto = googleFonts.some((f: { family: string }) => f.family === 'Roboto');
    expect(hasRoboto).toBe(true);
  });

  it('should export open source fonts', () => {
    const { openSourceFonts } = require('../../agents/pdf/fonts/custom-fonts');
    expect(openSourceFonts.length).toBeGreaterThan(0);
  });

  it('should export business fonts', () => {
    const { businessFonts } = require('../../agents/pdf/fonts/custom-fonts');
    expect(businessFonts.length).toBeGreaterThan(0);
  });

  it('should export fontSubstitutions map', () => {
    const { fontSubstitutions } = require('../../agents/pdf/fonts/custom-fonts');
    expect(fontSubstitutions['Arial']).toBe('Helvetica');
  });

  it('should export getAllCustomFonts function', () => {
    const { getAllCustomFonts } = require('../../agents/pdf/fonts/custom-fonts');
    const fonts = getAllCustomFonts();
    expect(fonts.length).toBeGreaterThan(0);
  });

  it('should export getFontConfig function', () => {
    const { getFontConfig } = require('../../agents/pdf/fonts/custom-fonts');
    const config = getFontConfig('Roboto');
    expect(config).not.toBeNull();
    expect(config?.family).toBe('Roboto');
  });

  it('should return null for unknown font in getFontConfig', () => {
    const { getFontConfig } = require('../../agents/pdf/fonts/custom-fonts');
    const config = getFontConfig('UnknownFont12345');
    expect(config).toBeNull();
  });
});

describe('ImageProcessingError', () => {
  it('should create error with message', () => {
    const { ImageProcessingError } = require('../../agents/pdf/assets/image-processor');
    const error = new ImageProcessingError('Test error');
    expect(error.message).toBe('Image Processing Error: Test error');
    expect(error.name).toBe('ImageProcessingError');
  });

  it('should create error with source', () => {
    const { ImageProcessingError } = require('../../agents/pdf/assets/image-processor');
    const source = Buffer.from('test');
    const error = new ImageProcessingError('Test error', source);
    expect(error.source).toBe(source);
  });

  it('should create error with cause', () => {
    const { ImageProcessingError } = require('../../agents/pdf/assets/image-processor');
    const cause = new Error('Original error');
    const error = new ImageProcessingError('Test error', undefined, cause);
    expect(error.cause).toBe(cause);
  });
});

describe('FontLoadingError', () => {
  it('should create error with message', () => {
    const { FontLoadingError } = require('../../agents/pdf/assets/font-loader');
    const error = new FontLoadingError('Test error');
    expect(error.message).toBe('Font Loading Error: Test error');
    expect(error.name).toBe('FontLoadingError');
  });

  it('should create error with font family', () => {
    const { FontLoadingError } = require('../../agents/pdf/assets/font-loader');
    const error = new FontLoadingError('Test error', 'Roboto');
    expect(error.fontFamily).toBe('Roboto');
  });
});

describe('AssetProcessingError', () => {
  it('should create error with asset id', () => {
    const { AssetProcessingError } = require('../../agents/pdf/errors/pdf-errors');
    const error = new AssetProcessingError('asset-123', 'Test error');
    expect(error.message).toBe('Asset Processing Error for asset-123: Test error');
    expect(error.name).toBe('AssetProcessingError');
  });
});
