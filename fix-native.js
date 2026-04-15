const fs = require('fs');

let nativeAgentsTest = fs.readFileSync('tests/unit/cowork/native-agents.test.ts', 'utf8');

nativeAgentsTest = nativeAgentsTest.replace(
  "const toolsConfigPath = path.join(configDir, 'opencode-tools.json');\n  const legacyConfigPath = path.join(configDir, 'opencode.json');",
  "const toolsConfigPath = path.join(configDir, 'opencode-tools.json');\n  const legacyConfigPath = path.join(configDir, 'opencode.json');\n  const officialConfigPath = path.join(configDir, 'opencode.json');"
);

nativeAgentsTest = nativeAgentsTest.replace(
  "it('should load agents from opencode-tools.json', () => {",
  "it('should load agents from opencode.json (official)', () => {"
);
nativeAgentsTest = nativeAgentsTest.replace(
  "if (filePath === toolsConfigPath) {\n        return JSON.stringify({\n          agents: {\n            research: {",
  "if (filePath === officialConfigPath) {\n        return JSON.stringify({\n          agents: {\n            research: {"
);
nativeAgentsTest = nativeAgentsTest.replace(
  "it('should fallback to opencode.json if opencode-tools.json is missing', () => {",
  "it('should fallback to opencode-tools.json if opencode.json is missing', () => {"
);
nativeAgentsTest = nativeAgentsTest.replace(
  "if (filePath === toolsConfigPath) {\n        throw new Error('File not found');\n      }\n      if (filePath === legacyConfigPath) {\n        return JSON.stringify({\n          agents: {\n            legacy: {",
  "if (filePath === officialConfigPath) {\n        throw new Error('File not found');\n      }\n      if (filePath === toolsConfigPath) {\n        return JSON.stringify({\n          agents: {\n            legacy: {"
);

nativeAgentsTest = nativeAgentsTest.replace(
  "it('should prefer opencode-tools.json over opencode.json', () => {",
  "it('should prefer opencode.json over opencode-tools.json', () => {"
);
nativeAgentsTest = nativeAgentsTest.replace(
  "if (filePath === toolsConfigPath) {\n        return JSON.stringify({\n          agents: {\n            newAgent: { description: 'New Agent', prompt: 'New', tools: { newTool: true } }\n          }\n        });\n      }\n      if (filePath === legacyConfigPath) {\n        return JSON.stringify({\n          agents: {\n            oldAgent: { description: 'Old Agent', prompt: 'Old', tools: { oldTool: true } }\n          }\n        });\n      }",
  "if (filePath === officialConfigPath) {\n        return JSON.stringify({\n          agents: {\n            newAgent: { description: 'New Agent', prompt: 'New', tools: { newTool: true } }\n          }\n        });\n      }\n      if (filePath === toolsConfigPath) {\n        return JSON.stringify({\n          agents: {\n            oldAgent: { description: 'Old Agent', prompt: 'Old', tools: { oldTool: true } }\n          }\n        });\n      }"
);

fs.writeFileSync('tests/unit/cowork/native-agents.test.ts', nativeAgentsTest);
