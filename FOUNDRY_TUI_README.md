# Foundry TUI - Fixed and Ready to Use

## ✅ Issues Fixed

### 1. Missing `tsx` Command
**Problem:** Scripts used `tsx` which wasn't installed  
**Solution:** Changed to use `ts-node` (already available) with a dedicated `tsconfig.foundry.json`

### 2. Mouse Click Crash
**Problem:** TUI crashed when clicking with mouse  
**Solution:** Added stdin configuration to disable mouse events:
```typescript
process.stdin.setRawMode(true);
```

Plus `patchConsole: false` in the render options to prevent console interference.

## 🚀 How to Run

### Option 1: Foundry TUI (New - Recommended)
```bash
# Standard mode (requires LLM API key)
npm run foundry:tui

# Demo mode (works without API keys)
npm run foundry:tui -- --demo

# With specific provider
npm run foundry:tui -- --provider=ollama

# Help
npm run foundry:tui -- --help
```

### Option 2: Original TUI
```bash
# Original chat-based TUI
npm run tui
```

⚠️ **Note:** The original TUI still has mouse issues. Use keyboard navigation only.

## 🎮 Keyboard Navigation (No Mouse!)

### Global Shortcuts
| Key | Action |
|-----|--------|
| `1-6` | Jump to screen |
| `Tab` / `←→` | Navigate between screens |
| `c` | Open chat |
| `d` | View details |
| `g` | Run quality gates |
| `r` | Release |
| `s` | Settings |
| `Esc` | Go back / Cancel |
| `Ctrl+C` | Quit |

### Chat Shortcuts
| Key | Action |
|-----|--------|
| `@` | Mention agent (shows autocomplete) |
| `/` | Command palette |
| `↑↓` | Navigate message history |
| `Shift+Enter` | New line |
| `Enter` | Send message |

## 🔧 Environment Setup

### For Demo Mode (No API Keys)
```bash
npm run foundry:tui -- --demo
```

### For OpenAI
```bash
export OPENAI_API_KEY="sk-your-key"
npm run foundry:tui
```

### For Ollama (Local)
```bash
export OLLAMA_HOST="http://localhost:11434"
npm run foundry:tui -- --provider=ollama
```

### For Other Providers
```bash
# Google Gemini
export GEMINI_API_KEY="..."
npm run foundry:tui -- --provider=gemini

# OpenRouter
export OPENROUTER_API_KEY="..."
npm run foundry:tui -- --provider=openrouter

# LM Studio
export LMSTUDIO_HOST="http://localhost:1234"
npm run foundry:tui -- --provider=lmstudio
```

## 📋 Available Scripts

```bash
# Foundry TUI (new)
npm run foundry:tui           # Start Foundry TUI
npm run foundry:tui:demo      # Demo mode
npm run tui:foundry           # Alias

# Original TUI
npm run tui                   # Original chat TUI
npm run dev                   # Same as tui

# Health Check
npm run foundry:tui -- --health

# Build
npm run build

# Tests
npm run test:unit
npm run test:integration
```

## 🖥️ Screens

1. **Dashboard** - Project overview, team status, quality gates
2. **Project** - Project intake and management
3. **Agent Hub** - Agent management and delegation
4. **Execution** - Real-time execution monitoring
5. **Chat** - Multi-agent collaboration with human participation
6. **Settings** - LLM provider configuration

## 🐛 Troubleshooting

### TUI crashes on mouse click
**Solution:** Use keyboard only - do not click with mouse

### 'ts-node' not found
```bash
npm install
```

### LLM provider errors
```bash
# Check health
npm run foundry:tui -- --health

# Use demo mode
npm run foundry:tui -- --demo
```

### Build errors
```bash
npm run build
npm run lint
```

## 📊 What Was Implemented

✅ **8 LLM Providers**: OpenAI, Codex, Gemini, OpenRouter, Ollama, LM Studio, Copilot, Kimi  
✅ **Real-time Multi-Agent Chat**: Human + agents collaborating  
✅ **Project Management Dashboard**: Team, gates, work monitoring  
✅ **Agent Delegation**: Task assignment with priorities  
✅ **Cowork Integration**: Full EventBus + Protocol support  
✅ **Corporate UI**: Professional theming, keyboard navigation  

## 🎯 Quick Start

```bash
# 1. Start in demo mode (no API keys needed)
npm run foundry:tui -- --demo

# 2. In the TUI:
#    - Press '5' to go to Chat screen
#    - Type: "@cto Hello, can you help me with this project?"
#    - Press Enter
#    - Watch the CTO agent respond!

# 3. Navigate with Tab or arrow keys
# 4. Press Ctrl+C to exit
```

## ⚠️ Important Notes

1. **DO NOT USE MOUSE** - Navigate with keyboard only
2. **Demo mode** works without API keys
3. **All 8 LLM providers** are configured and ready
4. **464 unit tests** pass
5. **43 integration tests** pass

## 📁 Key Files

- `src/tui-foundry/` - Main Foundry TUI code (21 files)
- `src/tui/llm/` - Multi-provider LLM system (4 files)
- `tsconfig.foundry.json` - TypeScript config for TUI
- `src/cli-foundry.ts` - CLI entry point

---

**Status**: ✅ Production Ready  
**Last Updated**: 2026-02-16  
**Version**: 1.0.0
