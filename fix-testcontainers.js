const fs = require('fs');
let code = fs.readFileSync('tests/integration/cowork/postgres-test-harness.ts', 'utf8');

code = code.replace(
  ".withEnvironment(\"POSTGRES_USER\", username)",
  ".withEnvironment({POSTGRES_USER: username})"
);
code = code.replace(
  ".withEnvironment(\"POSTGRES_PASSWORD\", password)",
  ".withEnvironment({POSTGRES_PASSWORD: password})"
);
code = code.replace(
  ".withEnvironment(\"POSTGRES_DB\", database)",
  ".withEnvironment({POSTGRES_DB: database})"
);

fs.writeFileSync('tests/integration/cowork/postgres-test-harness.ts', code);
