"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.startTui = startTui;
require("./runtime/register-path-aliases");
const React = __importStar(require("react"));
const ink_1 = require("ink");
const App_1 = require("./tui/App");
const tui_foundry_1 = require("./tui-foundry");
/**
 * Check if Foundry TUI mode should be launched
 *
 * Checks for:
 * - --foundry flag
 * --mode=foundry flag
 * - FOUNDRY_TUI_MODE environment variable
 */
function shouldLaunchFoundryTUI() {
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
function cleanArguments(args) {
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
async function startTui() {
    // Check if Foundry TUI mode is requested
    if (shouldLaunchFoundryTUI()) {
        const rawArgs = process.argv.slice(2);
        const cleanArgs = cleanArguments(rawArgs);
        const args = (0, tui_foundry_1.parseFoundryTUIArguments)(cleanArgs);
        await (0, tui_foundry_1.runFoundryTUI)(args);
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
    const { waitUntilExit } = (0, ink_1.render)(React.createElement(App_1.App), {
        patchConsole: false,
    });
    try {
        await waitUntilExit();
    }
    catch (error) {
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
//# sourceMappingURL=tui-app.js.map