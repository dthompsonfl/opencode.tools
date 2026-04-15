/**
 * Tests for Plugin Loader
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as fs from 'fs';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as os from 'os';
import {
  loadPlugin,
  loadAllPlugins,
  getBundledPluginsDir,
  getSystemPluginsDir
} from '../../../src/cowork/plugin-loader';

// Mock fs module
jest.mock('fs');
jest.mock('os', () => ({
  ...jest.requireActual('os'),
  homedir: () => '/home/testuser'
}));

describe('getBundledPluginsDir', () => {
  it('should return path to bundled plugins directory', () => {
    const result = getBundledPluginsDir();
    expect(result).toContain('plugins');
  });
});

describe('getSystemPluginsDir', () => {
  it('should return path to system plugins directory', () => {
    const result = getSystemPluginsDir();
    expect(result).toContain('.opencode');
    expect(result).toContain('cowork');
    expect(result).toContain('plugins');
  });
});

describe('loadPlugin', () => {
  const testPluginDir = '/test/plugins/test-plugin';

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should load plugin with valid manifest', () => {
    // Mock file system
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.endsWith('plugin.json')) {
        return JSON.stringify({
          id: 'test-plugin',
          name: 'Test Plugin',
          version: '1.0.0',
          description: 'A test plugin'
        });
      }
      return '';
    });

    (fs.statSync as jest.Mock).mockImplementation((filePath: string) => {
      return {
        isDirectory: () => !filePath.endsWith('.json') && !filePath.endsWith('.md')
      };
    });

    (fs.readdirSync as jest.Mock).mockReturnValue([]);

    const result = loadPlugin(testPluginDir);

    expect(result.manifest.id).toBe('test-plugin');
    expect(result.manifest.name).toBe('Test Plugin');
    expect(result.manifest.version).toBe('1.0.0');
    expect(result.rootPath).toBe(testPluginDir);
  });

  it('should throw error for missing manifest', () => {
    (fs.readFileSync as jest.Mock).mockImplementation(() => {
      throw new Error('File not found');
    });

    expect(() => loadPlugin(testPluginDir)).toThrow('no valid plugin.json');
  });

  it('should throw error for invalid manifest fields', () => {
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.endsWith('plugin.json')) {
        return JSON.stringify({
          name: 'Missing ID Plugin'
          // Missing id and version
        });
      }
      return '';
    });

    expect(() => loadPlugin(testPluginDir)).toThrow('missing required manifest fields');
  });

  it('should load commands from commands directory', () => {
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.endsWith('plugin.json')) {
        return JSON.stringify({
          id: 'test-plugin',
          name: 'Test Plugin',
          version: '1.0.0'
        });
      }
      if (filePath.endsWith('test-command.md')) {
        return `---
description: Test command
---

Command body`;
      }
      return '';
    });

    (fs.statSync as jest.Mock).mockImplementation((filePath: string) => {
      const isDir = filePath.includes('commands') || filePath.includes('test-plugin');
      return {
        isDirectory: () => isDir || filePath.endsWith('.md')
      };
    });

    (fs.readdirSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.includes('commands')) {
        return [{ name: 'test-command.md', isDirectory: () => false, isFile: () => true }];
      }
      return [];
    });

    const result = loadPlugin(testPluginDir);

    expect(result.commands.length).toBeGreaterThan(0);
    expect(result.commands[0].id).toBe('test-command');
    expect(result.commands[0].description).toBe('Test command');
  });
});

describe('loadAllPlugins', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty array when no plugins exist', () => {
    (fs.statSync as jest.Mock).mockImplementation(() => {
      throw new Error('Directory not found');
    });

    const result = loadAllPlugins();

    expect(result).toEqual([]);
  });
});
