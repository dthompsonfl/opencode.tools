/**
 * Foundry TUI Main Entry Point
 *
 * Consolidated entry point for the Foundry TUI that:
 * - Initializes all subsystems (EventBus, CoworkOrchestrator, FoundryCollaborationBridge)
 * - Sets up the LLM provider
 * - Renders the React Ink application
 * - Handles graceful shutdown
 */

import '../runtime/register-path-aliases';
import * as React from 'react';
import { render } from 'ink';
import { EventBus } from '../cowork/orchestrator/event-bus';
import { FoundryCollaborationBridge } from '../foundry/integration/collaboration-bridge';
import { createWarmedUpBridge } from '../foundry/cowork-bridge';
import { logger } from '../runtime/logger';
import { App } from './App';
import { StoreProvider } from './store/store';
import { TuiRuntime } from './runtime/tui-runtime';
import { RuntimeProvider } from './runtime/context';

/**
 * CLI Arguments interface
 */
export interface FoundryTUIArguments {
  /** Run in demo mode with mock data */
  demo?: boolean;
  /** LLM provider name (openai, gemini, ollama, etc.) */
  provider?: string;
  /** Open specific project by ID */
  project?: string;
  /** WebSocket port for external connections */
  port?: number;
  /** Enable verbose logging */
  verbose?: boolean;
}

/**
 * Runtime context for the Foundry TUI
 */
export interface FoundryTUIContext {
  eventBus: EventBus;
  collaborationBridge: FoundryCollaborationBridge;
  warmedUpBridge: ReturnType<typeof createWarmedUpBridge>;
  isDemoMode: boolean;
  projectId?: string;
  port?: number;
}

/**
 * Parse command line arguments for the Foundry TUI
 */
export function parseFoundryTUIArguments(argv: string[] = process.argv.slice(2)): FoundryTUIArguments {
  const args: FoundryTUIArguments = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--demo') {
      args.demo = true;
    } else if (arg === '--verbose') {
      args.verbose = true;
    } else if (arg.startsWith('--provider=')) {
      args.provider = arg.split('=')[1];
    } else if (arg.startsWith('--project=')) {
      args.project = arg.split('=')[1];
    } else if (arg.startsWith('--port=')) {
      const port = parseInt(arg.split('=')[1], 10);
      if (!isNaN(port) && port > 0 && port <= 65535) {
        args.port = port;
      }
    } else if (arg === '--provider' && argv[i + 1] && !argv[i + 1].startsWith('--')) {
      args.provider = argv[++i];
    } else if (arg === '--project' && argv[i + 1] && !argv[i + 1].startsWith('--')) {
      args.project = argv[++i];
    } else if (arg === '--port' && argv[i + 1] && !argv[i + 1].startsWith('--')) {
      const port = parseInt(argv[++i], 10);
      if (!isNaN(port) && port > 0 && port <= 65535) {
        args.port = port;
      }
    }
  }

  return args;
}

/**
 * Initialize the LLM provider based on arguments
 */
function initializeLLMProvider(args: FoundryTUIArguments): void {
  // Set LLM provider from arguments or environment
  if (args.provider) {
    process.env.COWORK_LLM_PROVIDER = args.provider;
    logger.info(`[FoundryTUI] LLM provider set to: ${args.provider}`);
  }

  // For demo mode, allow mock provider if no real provider is configured
  if (args.demo && !process.env.COWORK_LLM_PROVIDER && !process.env.OPENAI_API_KEY) {
    process.env.COWORK_LLM_PROVIDER = 'mock';
    process.env.COWORK_ALLOW_MOCK_LLM = 'true';
    logger.info('[FoundryTUI] Demo mode: using mock LLM provider');
  }

  // Validate that we have a provider configured
  const provider = process.env.COWORK_LLM_PROVIDER || (process.env.OPENAI_API_KEY ? 'openai' : null);
  if (!provider) {
    logger.warn('[FoundryTUI] No LLM provider configured. Set COWORK_LLM_PROVIDER or OPENAI_API_KEY.');
  }
}

/**
 * Initialize all subsystems for the Foundry TUI
 */
async function initializeSubsystems(args: FoundryTUIArguments): Promise<FoundryTUIContext> {
  logger.info('[FoundryTUI] Initializing subsystems...');

  // Initialize LLM provider
  initializeLLMProvider(args);

  // Initialize EventBus
  const eventBus = EventBus.getInstance();
  logger.info('[FoundryTUI] EventBus initialized');

  // Initialize warmed-up bridge
  const warmedUpBridge = createWarmedUpBridge();
  logger.info('[FoundryTUI] FoundryCoworkBridge warmed up');

  // Run health check
  const health = warmedUpBridge.healthCheck();
  if (!health.healthy) {
    logger.warn('[FoundryTUI] Bridge health check warnings:', health.errors);
  } else {
    logger.info('[FoundryTUI] Bridge health check passed');
  }

  // Initialize FoundryCollaborationBridge for team collaboration
  const collaborationBridge = new FoundryCollaborationBridge();
  await collaborationBridge.initialize();
  logger.info('[FoundryTUI] FoundryCollaborationBridge initialized');

  const runtime = TuiRuntime.getInstance();
  await runtime.initialize((_action) => {
    // Store dispatch is connected from React tree; runtime can bootstrap here safely.
  });
  logger.info('[FoundryTUI] TUI runtime initialized');

  // If project ID specified, validate it exists or prepare for it
  if (args.project) {
    logger.info(`[FoundryTUI] Project specified: ${args.project}`);
  }

  return {
    eventBus,
    collaborationBridge,
    warmedUpBridge,
    isDemoMode: args.demo ?? false,
    projectId: args.project,
    port: args.port,
  };
}

/**
 * Setup graceful shutdown handlers
 */
function setupShutdownHandlers(context: FoundryTUIContext, cleanup: () => void): void {
  const shutdown = async (signal: string) => {
    logger.info(`[FoundryTUI] Received ${signal}, shutting down gracefully...`);

    try {
      // Stop collaboration bridge
      context.collaborationBridge.stop();
      TuiRuntime.getInstance().shutdown();

      // Cleanup
      cleanup();

      logger.info('[FoundryTUI] Shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('[FoundryTUI] Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('[FoundryTUI] Uncaught exception:', error);
    void shutdown('uncaughtException');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason) => {
    logger.error('[FoundryTUI] Unhandled rejection:', reason);
  });
}

/**
 * Run the Foundry TUI application
 *
 * This is the main entry point for the consolidated Foundry TUI.
 * It initializes all subsystems and renders the React Ink application.
 *
 * @param args - Optional CLI arguments (parsed from process.argv if not provided)
 * @returns Promise that resolves when the TUI exits
 *
 * @example
 * ```typescript
 * // Run with default arguments
 * await runFoundryTUI();
 *
 * // Run in demo mode
 * await runFoundryTUI({ demo: true });
 *
 * // Run with specific provider
 * await runFoundryTUI({ provider: 'ollama' });
 * ```
 */
export async function runFoundryTUI(args?: FoundryTUIArguments): Promise<void> {
  const parsedArgs = args ?? parseFoundryTUIArguments();

  // Clear console for clean TUI start
  process.stdout.write('\x1b[2J\x1b[0f');

  logger.info('[FoundryTUI] Starting Foundry TUI...');
  logger.info(`[FoundryTUI] Arguments: ${JSON.stringify(parsedArgs)}`);

  let context: FoundryTUIContext | undefined;

  try {
    // Initialize all subsystems
    context = await initializeSubsystems(parsedArgs);

    // Setup graceful shutdown
    setupShutdownHandlers(context, () => {
      // Additional cleanup if needed
    });

    // Publish startup event
    context.eventBus.publish('foundry:tui:started', {
      timestamp: Date.now(),
      demoMode: context.isDemoMode,
      projectId: context.projectId,
      port: context.port,
    });

    // Configure stdin to prevent mouse event issues
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
    }

    // Render the React Ink application
    logger.info('[FoundryTUI] Rendering TUI...');
    const { waitUntilExit, cleanup } = render(
      React.createElement(RuntimeProvider, { children: React.createElement(StoreProvider, { children: React.createElement(App, {}) }) }),
      { patchConsole: false }
    );

    // Wait for the TUI to exit
    await waitUntilExit();

    // Cleanup
    cleanup();

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[FoundryTUI] Fatal error:', error);

    // Display user-friendly error message
    console.error('\n❌ Foundry TUI failed to start');
    console.error(`   Error: ${errorMessage}`);
    console.error('\nPossible solutions:');
    console.error('  • Run with --demo flag for demo mode without LLM');
    console.error('  • Set OPENAI_API_KEY environment variable');
    console.error('  • Use --provider=mock for testing');
    console.error('  • Run "npm run verify" to check system health\n');

    throw error;
  }
}

/**
 * Quick health check for the Foundry TUI runtime
 *
 * @returns Health check result
 */
export async function checkFoundryTUIHealth(): Promise<{
  healthy: boolean;
  eventBus: boolean;
  bridge: boolean;
  collaboration: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  // Check EventBus
  let eventBus = false;
  try {
    const eb = EventBus.getInstance();
    eb.publish('health:check', { timestamp: Date.now() });
    eventBus = true;
  } catch (error) {
    errors.push(`EventBus: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Check Bridge
  let bridge = false;
  try {
    const warmedUpBridge = createWarmedUpBridge();
    const health = warmedUpBridge.healthCheck();
    bridge = health.healthy;
    if (!bridge) {
      errors.push(...health.errors.map(e => `Bridge: ${e}`));
    }
  } catch (error) {
    errors.push(`Bridge: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Check Collaboration Bridge
  let collaboration = false;
  try {
    const cb = new FoundryCollaborationBridge();
    const health = cb.healthCheck();
    collaboration = health.healthy;
  } catch (error) {
    errors.push(`Collaboration: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    healthy: eventBus && bridge && collaboration,
    eventBus,
    bridge,
    collaboration,
    errors,
  };
}

// Export types and utilities for consumers
export { App } from './App';
export type { 
  FoundryScreen, 
  FoundryPhase, 
  FoundryState, 
  FoundryAction, 
  FoundryDispatch,
  DashboardMetrics,
  Message,
  Agent,
  TeamMember,
  Project,
  QualityGate,
  Artifact,
  CollaborationEntry,
  ExecutionStream,
  LLMConfig,
  ConnectionStatus,
  AgentStatus,
  AgentRole,
  TeamStatus,
  ProjectStatus,
  QualityGateStatus,
  ArtifactType,
  ActivityType,
  MessageRole,
  ChatThread,
  ChatUIState,
  NavigationState,
  ValidationResult,
  HealthStatus,
} from './types';
export { 
  COLORS, 
  THEME, 
  TEXT_STYLES, 
  buildProgressBar, 
  getStatusColor, 
  getStatusIcon, 
  getRoleColor, 
  getRoleLabel,
  truncateText,
  formatBytes,
  formatDuration,
  formatTime,
  formatDate,
  formatRelativeTime,
} from './theme';
export { StoreProvider, useStore, useDispatch, useSelector } from './store/store';
export * from './store/selectors';
export * from './hooks/useKeyboard';
export * from './hooks/useEventBus';
export * from './hooks/useLLM';
export * from './hooks/useAgents';
