const fs = require('fs');
let code = fs.readFileSync('tests/integration/runtime/run-id-propagation.test.ts', 'utf8');

code = code.replace(
  "const output = records[0] as any;",
  "const parsedRecord = typeof records[0] === 'string' ? JSON.parse(records[0]) : records[0];\n    const output = parsedRecord.output as any;"
);
code = code.replace(
  "expect(result).toEqual({ value: 42 });",
  "expect(result.data).toEqual({ value: 42 });"
);

fs.writeFileSync('tests/integration/runtime/run-id-propagation.test.ts', code);
