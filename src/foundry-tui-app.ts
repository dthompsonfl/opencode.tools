import './runtime/register-path-aliases';
import * as React from 'react';
import { render } from 'ink';
import { FoundryTuiApp } from './foundry-tui/App';

export async function startFoundryTui(): Promise<void> {
  process.stdout.write('\x1b[2J\x1b[0f');

  const { waitUntilExit } = render(React.createElement(FoundryTuiApp));

  try {
    await waitUntilExit();
  } catch (error) {
    console.error('Foundry TUI Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startFoundryTui().catch((error) => {
    console.error('Fatal foundry TUI error:', error);
    process.exit(1);
  });
}
