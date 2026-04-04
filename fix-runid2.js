const fs = require('fs');
let code = fs.readFileSync('tests/integration/runtime/run-id-propagation.test.ts', 'utf8');

code = code.replace(
  "expect(result.data).toEqual({ value: 42 });",
  "expect(result).toEqual({ value: 42 });"
);

fs.writeFileSync('tests/integration/runtime/run-id-propagation.test.ts', code);
