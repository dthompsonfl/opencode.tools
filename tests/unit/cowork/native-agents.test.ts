import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { loadNativeAgents } from '../../../src/cowork/plugin-loader';

// Mock fs module
jest.mock('fs');
jest.mock('os', () => ({
  ...jest.requireActual('os'),
  homedir: () => '/home/testuser'
}));

describe('loadNativeAgents', () => {
  const mockHomeDir = '/home/testuser';
  // Use path.join for cross-platform compatibility
  const configDir = path.join(mockHomeDir, '.config', 'opencode');
  const toolsConfigPath = path.join(configDir, 'opencode-tools.json');
  const legacyConfigPath = path.join(configDir, 'opencode.json');
  const officialConfigPath = path.join(configDir, 'opencode-tools.json');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load agents from opencode.json (official)', () => {
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath === officialConfigPath) {
        return JSON.stringify({
          agents: {
            research: {
              description: 'Research Agent',
              prompt: 'Research stuff',
              tools: { webfetch: true, disabledTool: false }
            }
          }
        });
      }
      throw new Error('File not found: ' + filePath);
    });

    const agents = loadNativeAgents();

    expect(agents).toHaveLength(1);
    expect(agents[0].id).toBe('research');
    expect(agents[0].name).toContain('Research Agent');
    expect(agents[0].description).toBe('Research Agent');
    expect(agents[0].body).toBe('Research stuff');
    expect(agents[0].tools).toEqual(['webfetch']);
  });

  it('should fallback to opencode-tools.json if opencode.json is missing', () => {
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath === officialConfigPath) {
        throw new Error('File not found');
      }
      if (filePath === legacyConfigPath) {
        return JSON.stringify({
          agents: {
            legacy: {
              description: 'Legacy Agent',
              prompt: 'Legacy stuff',
              tools: { legacyTool: true }
            }
          }
        });
      }
      throw new Error('File not found: ' + filePath);
    });

    const agents = loadNativeAgents();

    expect(agents).toHaveLength(1);
    expect(agents[0].id).toBe('legacy');
    expect(agents[0].tools).toEqual(['legacyTool']);
  });

  it('should prefer opencode.json over opencode-tools.json', () => {
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath === legacyConfigPath) {
        return JSON.stringify({
          agents: {
            newAgent: { description: 'New Agent', prompt: 'New', tools: { newTool: true } }
          }
        });
      }
      if (filePath === toolsConfigPath) {
        return JSON.stringify({
          agents: {
            oldAgent: { description: 'Old Agent', prompt: 'Old', tools: { oldTool: true } }
          }
        });
      }
      throw new Error('File not found: ' + filePath);
    });

    const agents = loadNativeAgents();

    expect(agents).toHaveLength(1);
    expect(agents[0].id).toBe('newAgent');
    // Should NOT contain oldAgent
    const agentIds = agents.map(a => a.id);
    expect(agentIds).toContain('newAgent');
    expect(agentIds).not.toContain('oldAgent');
  });

  it('should return empty array if no config found', () => {
    (fs.readFileSync as jest.Mock).mockImplementation(() => {
      throw new Error('File not found');
    });

    const agents = loadNativeAgents();
    expect(agents).toEqual([]);
  });
});
