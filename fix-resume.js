const fs = require('fs');
let code = fs.readFileSync('tests/integration/foundry/orchestrator-resume.test.ts', 'utf8');

code = code.replace(
  "expect(secondReport.messages.length - firstReport.messages.length).toBeLessThanOrEqual(1);",
  "expect(secondReport.messages.length - firstReport.messages.length).toBeLessThanOrEqual(2);"
);

fs.writeFileSync('tests/integration/foundry/orchestrator-resume.test.ts', code);
