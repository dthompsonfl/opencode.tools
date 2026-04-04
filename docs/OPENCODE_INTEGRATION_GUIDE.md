# Seamless OpenCode Tools Integration Guide

This guide provides explicit, granular instructions to integrate the **OpenCode Tools** suite directly and natively into the official **OpenCode CLI**. By following these steps, you will grant the OpenCode agents (like `foundry`, `orchestrator`, `codegen`, `architecture`, etc.) direct access to the entire repository of tools provided by the `opencode-tools` package.

Agents will treat every tool (e.g., `webfetch`, `research.plan`, `pdf_generate`, `ci.verify`) as natively available, seamlessly weaving them into their workflows without requiring you to switch between different interfaces.

---

## 1. Prerequisites

Before integrating, ensure you have the OpenCode CLI installed and initialized on your system.

```bash
# Verify OpenCode installation
opencode --version
```

If you haven't initialized OpenCode yet, run its initialization command so it creates the global configuration directory (usually `~/.config/opencode/` on Linux/macOS or `%APPDATA%\OpenCode` on Windows).

## 2. Installation

You can integrate OpenCode Tools by cloning the repository and running the integration script or by installing the NPM package globally.

### Option A: From Source (Recommended for Contributors)

```bash
# Clone the repository
git clone https://github.com/opencode/ai-tool opencode-tools
cd opencode-tools

# Install dependencies and build
npm install
npm run build

# Run the integration script natively
OPENCODE_AUTO_INTEGRATE=1 node scripts/native-integrate.js
```

### Option B: From NPM

```bash
# Install globally with auto-integration flag
OPENCODE_AUTO_INTEGRATE=1 npm install -g opencode-tools
```

---

## 3. How the Integration Works

The `native-integrate.js` script seamlessly registers OpenCode Tools with your global OpenCode installation by performing the following actions:

1.  **Registers the MCP Server**: It registers the `opencode-tools` MCP server in your `~/.config/opencode/mcp.json` or `opencode.json` configuration, ensuring the OpenCode CLI knows how to launch and connect to the tool provider.
2.  **Exposes All Native Tools**: It analyzes the tools available in the `opencode-tools` suite (over 65 specialized tools) and configures your `opencode.json` to enable them globally under the `"tools"` configuration object.
3.  **Grants Agent Permissions**: It configures individual OpenCode agents (e.g., `foundry`, `codegen`, `qa`) to automatically use these tools naturally. This means the `codegen` agent can seamlessly call `codegen.scaffold` and the `qa` agent can naturally execute `qa.static.run`.
4.  **Installs Bundled Plugins and Prompts**: It copies the specialized `opencode-system-prompt.md` to your OpenCode prompt library, ensuring the agents have the correct instructions on how to behave securely and robustly using these tools.

---

## 4. Manual Verification and Configuration

To ensure the integration was successful, open your OpenCode global configuration file.

```bash
# Linux / macOS
cat ~/.config/opencode/opencode.json

# Windows
type %APPDATA%\OpenCode\opencode.json
```

### Verify MCP Server Configuration
You should see the `opencode-tools` server registered under the `"mcp"` key:

```json
{
  "mcp": {
    "opencode-tools": {
      "name": "OpenCode Tools",
      "type": "stdio",
      "command": "opencode-tools",
      "args": ["mcp"],
      "description": "Complete developer team automation"
    }
  }
}
```

### Verify Tool Access for Agents
Ensure that the global `"tools"` array and individual agent tools contain the tools from this repository:

```json
{
  "tools": {
    "webfetch": true,
    "research.plan": true,
    "codegen.feature": true,
    "pdf_generate": true
  },
  "agent": {
    "foundry": {
      "tools": {
        "audit.logToolCall": true,
        "research.plan": true
      }
    }
  }
}
```

---

## 5. Seamless Usage

Once integrated, you do not need to use the `opencode-tools` CLI directly for everyday tasks. You can seamlessly use the native OpenCode CLI, and the agents will orchestrate the background tools naturally.

### Example: Architectural Design

Simply ask the OpenCode CLI to design a system, and the `architecture` agent will natively invoke the `arch.generate` tool.

```bash
opencode "Read the product requirements in docs/prd.md and design a highly scalable microservices architecture. Generate a Mermaid diagram and a JSON backlog."
```

### Example: QA Automation

Ask the CLI to write tests, and the `qa` agent will seamlessly utilize the `qa.generate_testplan` and `qa.static.run` tools.

```bash
opencode "Review the code in src/auth.ts, run static analysis on it, and generate a comprehensive QA test plan."
```

### Example: Document Generation

Ask the CLI to create a client-ready whitepaper, and it will effortlessly use the `pdf_generate` tool.

```bash
opencode "Take the research findings from docs/research.md and generate a professional, branded PDF whitepaper using the existing styling assets."
```

---

## 6. Troubleshooting

**Tools are not showing up in OpenCode:**
Run the integration script manually with the force flag:
```bash
node scripts/native-integrate.js --manual
```

**MCP Server Connection Failed:**
Ensure the `opencode-tools` binary is accessible in your system `PATH` (if installed globally) or update the `"command"` path in your `~/.config/opencode/mcp.json` to point to the absolute path of the `dist/src/cli.js` file.

**Permission Denied when executing tools:**
Check the `permission` blocks in your `opencode.json`. Ensure that `"bash": "allow"` or specific commands like `"npm *": "allow"` are correctly configured for the acting agent if it requires shell execution capabilities.