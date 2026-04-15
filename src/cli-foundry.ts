#!/usr/bin/env node

/**
 * Foundry TUI CLI Entry Point
 *
 * Command-line entry point specifically for the Foundry TUI.
 * Parses arguments and launches the consolidated TUI.
 *
 * Usage:
 *   ts-node --project tsconfig.foundry.json src/cli-foundry.ts [options]
 *   npm run foundry:tui -- [options]
 *
 * Options:
 *   --demo              Run in demo mode with mock data
 *   --provider=<name>   Set LLM provider (openai, gemini, ollama, mock)
 *   --project=<id>      Open specific project by ID
 *   --port=<number>     WebSocket port for external connections
 *   --verbose           Enable verbose logging
 *   --help              Show help message
 *   --version           Show version
 */

import { runFoundryTUI, parseFoundryTUIArguments, checkFoundryTUIHealth } from './tui-foundry';
import { logger } from './runtime/logger';

const VERSION = '1.0.0';

/**
 * Display help message
 */
function showHelp(): void {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║              Foundry TUI - Command Line Interface            ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Usage: foundry:tui [options]                                ║
║                                                              ║
║  Options:                                                    ║
║    --demo              Run in demo mode with mock data       ║
║    --provider=<name>   Set LLM provider                      ║
║                        (openai, gemini, ollama, mock)        ║
║    --project=<id>      Open specific project by ID           ║
║    --port=<number>     WebSocket port for external           ║
║                        connections (default: none)           ║
║    --verbose           Enable verbose logging                ║
║    --help              Show this help message                ║
║    --version           Show version information              ║
║    --health            Check system health and exit          ║
║                                                              ║
║  Examples:                                                   ║
║    npm run foundry:tui                                       ║
║    npm run foundry:tui -- --demo                             ║
║    npm run foundry:tui -- --provider=ollama                  ║
║    npm run foundry:tui -- --project=my-project --demo        ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`);
}

/**
 * Display version information
 */
function showVersion(): void {
  console.log(`Foundry TUI v${VERSION}`);
  console.log('Enterprise Delegation Workspace');
  console.log('Part of OpenCode Tools');
}

/**
 * Check if help or version flags are present
 */
function checkEarlyExitArgs(argv: string[]): boolean {
  if (argv.includes('--help') || argv.includes('-h')) {
    showHelp();
    return true;
  }

  if (argv.includes('--version') || argv.includes('-v')) {
    showVersion();
    return true;
  }

  return false;
}

/**
 * Run health check and display results
 */
async function runHealthCheck(): Promise<void> {
  console.log('\n🔍 Running Foundry TUI health check...\n');

  try {
    const health = await checkFoundryTUIHealth();

    console.log('Health Check Results:');
    console.log('  EventBus:', health.eventBus ? '✅ Online' : '❌ Offline');
    console.log('  Bridge:', health.bridge ? '✅ Healthy' : '❌ Unhealthy');
    console.log('  Collaboration:', health.collaboration ? '✅ Ready' : '❌ Not Ready');

    if (health.errors.length > 0) {
      console.log('\n  Issues detected:');
      health.errors.forEach((error) => {
        console.log(`    ⚠️  ${error}`);
      });
    }

    console.log(`\n  Overall Status: ${health.healthy ? '✅ Healthy' : '❌ Unhealthy'}\n`);

    process.exit(health.healthy ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Health check failed:', error instanceof Error ? error.message : String(error));
    console.error('\nPossible causes:');
    console.error('  • Missing dependencies - run npm install');
    console.error('  • Build not complete - run npm run build');
    console.error('  • Configuration issues - check your .env file\n');
    process.exit(1);
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  // Handle early exit arguments
  if (checkEarlyExitArgs(argv)) {
    process.exit(0);
  }

  // Handle health check
  if (argv.includes('--health')) {
    await runHealthCheck();
    return;
  }

  // Parse arguments
  const args = parseFoundryTUIArguments(argv);

  // Enable verbose logging if requested
  if (args.verbose) {
    logger.info('[CLI-Foundry] Verbose logging enabled');
    logger.info(`[CLI-Foundry] Arguments: ${JSON.stringify(args)}`);
  }

  try {
    // Run the Foundry TUI
    await runFoundryTUI(args);
  } catch (error) {
    // Error handling is done within runFoundryTUI, but we catch here
    // to ensure proper exit code
    process.exit(1);
  }
}

// Run main if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
