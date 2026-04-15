const fs = require('fs');

function applyRouter() {
  let code = fs.readFileSync('scripts/verify-mcp-tools.ts', 'utf8');
  code = code.replace(
    "await sendRequest(server, 'initialize', { protocolVersion: '2025-06-18' });\n  await sendRequest(server, 'notifications/initialized', {});",
    "await sendRequest(server, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'verify', version: '1.0' } });\n  server.stdin?.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\\n');"
  );
  fs.writeFileSync('scripts/verify-mcp-tools.ts', code);
}
applyRouter();
