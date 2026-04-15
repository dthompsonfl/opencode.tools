const fs = require('fs');
let code = fs.readFileSync('tests/integration/runtime/run-id-propagation.test.ts', 'utf8');

code = code.replace(
  "const output = records[0].output as any;",
  "const output = records[0] as any;"
);

fs.writeFileSync('tests/integration/runtime/run-id-propagation.test.ts', code);
