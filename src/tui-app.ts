import './runtime/register-path-aliases';
import * as React from 'react';
import { render } from 'ink';
import { App } from './tui/App';
import { runFoundryTUI, parseFoundryTUIArguments } from './tui-foundry';

/**
 * Check if Foundry TUI mode should be launched
 * 
 * Checks for:
 * - --foundry flag
 * --mode=foundry flag
 * - FOUNDRY_TUI_MODE environment variable
 */
function shouldLaunchFoundryTUI(): boolean {
  const args = process.argv.slice(2);
  
  // Check for explicit flags
  if (args.includes('--foundry')) {
    return true;
  }
  
  // Check for --mode=foundry
  if (args.some(arg => arg === '--mode=foundry' || arg === '--mode foundry')) {
    return true;
  }
  
  // Check for environment variable
  if (process.env.FOUNDRY_TUI_MODE === 'true' || process.env.FOUNDRY_TUI_MODE === '1') {
    return true;
  }
  
  return false;
}

/**
 * Remove Foundry-specific flags from arguments before parsing
 */
function cleanArguments(args: string[]): string[] {
  return args.filter(arg => {
    // Remove --foundry flag
    if (arg === '--foundry') {
      return false;
    }
    // Remove --mode=foundry but keep other --mode values
    if (arg === '--mode=foundry') {
      return false;
    }
    return true;
  });
}

/**
 * OpenCode TUI Application Entry Point
 *
 * Replaces the previous readline-based implementation with a React Ink TUI.
 * 
 * Supports two modes:
 * 1. Standard TUI mode (default) - General-purpose cowork interface
 * 2. Foundry TUI mode (--foundry, --mode=foundry) - Enterprise delegation workspace
 */
export async function startTui(): Promise<void> {
  // Check if Foundry TUI mode is requested
  if (shouldLaunchFoundryTUI()) {
    const rawArgs = process.argv.slice(2);
    const cleanArgs = cleanArguments(rawArgs);
    const args = parseFoundryTUIArguments(cleanArgs);
    
    await runFoundryTUI(args);
    return;
  }

  // Clear the console for a clean TUI start
  process.stdout.write('\x1b[2J\x1b[0f');

  // Configure stdin to prevent mouse event issues
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
  }

  // Render the Ink app
  const { waitUntilExit } = render(React.createElement(App), {
    patchConsole: false,
  });

  try {
    await waitUntilExit();
  } catch (error) {
    console.error('TUI Error:', error);
    process.exit(1);
  }
}

// Start the TUI if run directly
if (require.main === module) {
  startTui().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
