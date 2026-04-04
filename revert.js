const fs = require('fs');

function applyRouter() {
  let code = fs.readFileSync('src/cowork/runtime/tool-router.ts', 'utf8');
  code = code.replace(
    "// Initialize tools if base path is set\n    if (this.fsBasePath) {\n      this.initializeProductionTools(options?.allowedBashCommands);\n    }\n\n    // Register legacy filesystem tools (backward compatibility)\n    this.registerLegacyFsTools();",
    "// Register legacy filesystem tools (backward compatibility)\n    this.registerLegacyFsTools();\n\n    // Initialize tools if base path is set (this will overwrite legacy tools if they share names)\n    if (this.fsBasePath) {\n      this.initializeProductionTools(options?.allowedBashCommands);\n    }"
  );

  let routerTest = fs.readFileSync('tests/unit/cowork/runtime/tool-router.test.ts', 'utf8');
  routerTest = routerTest.replace(
    "expect(entries).toContain('hello.txt');",
    "expect(entries.map((e: any) => e.name ?? e)).toContain('hello.txt');"
  );
  routerTest = routerTest.replace(
    "expect(entries).toContain('inside.txt');",
    "expect(entries.map((e: any) => e.name ?? e)).toContain('inside.txt');"
  );
  routerTest = routerTest.replace(
    "expect(fileContent).toBe('hello');",
    "expect(typeof fileContent === 'string' ? fileContent : fileContent.content).toBe('hello');"
  );
  routerTest = routerTest.replace(
    "expect(entries.map((e: any) => e.name ?? e)).toContain('hello.txt');",
    "expect(Array.isArray(entries) ? entries.map((e: any) => e.name ?? e) : (entries.entries || []).map((e: any) => e.name ?? e)).toContain('hello.txt');"
  );
  routerTest = routerTest.replace(
    "expect(entries.map((e: any) => e.name ?? e)).toContain('inside.txt');",
    "expect(Array.isArray(entries) ? entries.map((e: any) => e.name ?? e) : (entries.entries || []).map((e: any) => e.name ?? e)).toContain('inside.txt');"
  );

  fs.writeFileSync('src/cowork/runtime/tool-router.ts', code);
  fs.writeFileSync('tests/unit/cowork/runtime/tool-router.test.ts', routerTest);
}

applyRouter();
