# Prompt: Install Safety Hardening

## Task
Make native integration opt-in for safety in `scripts/native-integrate.js` and `package.json`.

## Requirements

### Current Behavior (Problem)

The current `postinstall` script runs integration automatically:
```json
"postinstall": "npm run build && node scripts/postinstall.js && node scripts/native_integrate.js"
```

This modifies user home directories without consent.

### Desired Behavior (Solution)

1. **Opt-in Integration**
   - Integration only runs with `OPENCODE_AUTO_INTEGRATE=1` environment variable
   - Default: No modifications to user directories

2. **Explicit CLI Command**
   - Add `opencode-tools integrate` command
   - User runs this explicitly when they want integration

3. **Safety Checks**
   - Verify target directories exist
   - Check write permissions
   - Handle errors gracefully
   - Log all actions

### Changes to scripts/native-integrate.js

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');

// Check for opt-in flag
const AUTO_INTEGRATE = process.env.OPENCODE_AUTO_INTEGRATE === '1';

function integrateWithOpenCode(packageRoot) {
  if (!AUTO_INTEGRATE) {
    console.log('[INFO] OpenCode auto-integration is disabled.');
    console.log('[INFO] To enable, run with OPENCODE_AUTO_INTEGRATE=1');
    console.log('[INFO] Or use: opencode-tools integrate');
    return;
  }
  
  // ... existing integration logic ...
}

// Add manual integration function
function manualIntegrate(packageRoot) {
  console.log('[INFO] Running manual OpenCode integration...');
  // ... existing logic ...
  console.log('[SUCCESS] Integration complete!');
}
```

### Changes to src/cli.ts

```typescript
// Add integrate command
program
  .command('integrate')
  .description('Integrate with OpenCode installation (manual)')
  .option('-f, --force', 'Force re-integration')
  .action(async (options) => {
    try {
      const { integrateWithOpenCode } = require('../scripts/native-integrate');
      integrateWithOpenCode(process.cwd());
    } catch (error) {
      logger.error('Integration failed:', error);
      process.exit(1);
    }
  });
```

### Changes to package.json

```json
{
  "scripts": {
    "postinstall": "npm run build && node scripts/postinstall.js"
  }
}
```

## Implementation Guidelines

- Keep existing logic but guard with flag
- Add informative log messages
- Handle errors gracefully
- Update both script and CLI

## Validation

- Test without flag (should skip)
- Test with flag (should integrate)
- Test manual CLI command
- Verify no errors

## Dependencies
- No new dependencies
