const fs = require('fs');
let code = fs.readFileSync('package.json', 'utf8');

code = code.replace(/--testPathPattern=/g, '--testPathPatterns=');

fs.writeFileSync('package.json', code);
