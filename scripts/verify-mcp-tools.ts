import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { TOOL_DEFS } from '../tools/mcp/registry';

const pendingRequests = new Map<string | number, { resolve: (val: any) => void; reject: (err: any) => void }>();

async function main() {
  const cliPath = path.resolve(__dirname, '..', 'dist', 'src', 'cli.js');
  if (!fs.existsSync(cliPath)) {
    console.error('CLI not found. Please run `npm run build` first.');
    process.exit(1);
  }

  const server = spawn('node', [cliPath, 'mcp']);
  let buffer = '';
  let failed = false;

  server.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (line.trim()) {
        try {
          const response = JSON.parse(line);
          if (response.id && pendingRequests.has(response.id)) {
            const { resolve, reject } = pendingRequests.get(response.id)!;
            pendingRequests.delete(response.id);
            if (response.error) {
              reject(response.error);
            } else {
              resolve(response.result);
            }
          }
        } catch (e) {
          console.error('Non-JSON stdout line detected:', line);
          failed = true;
        }
      }
    }
  });

  server.stderr.on('data', (data) => {
    console.error(`MCP Server stderr: ${data}`);
  });

  server.on('close', (code) => {
    console.log(`MCP Server exited with code ${code}`);
    if (failed || code !== 0) {
      process.exit(1);
    }
  });

  try {
    const initResult = await sendRequest(server, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'verify', version: '1.0' } });
    console.log('Initialized successfully:', initResult);

    server.stdin?.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

    const listResult = await sendRequest(server, 'tools/list', {});
    const receivedTools = listResult.tools.map((t: any) => t.name);
    const expectedTools = TOOL_DEFS.map(t => t.name);
    const missingTools = expectedTools.filter(t => !receivedTools.includes(t));

    if (missingTools.length > 0) {
      throw new Error(`Missing tools: ${missingTools.join(', ')}`);
    }
    console.log('All tools are correctly listed.');

    const callResult = await sendRequest(server, 'tools/call', { name: 'foundryHealth', arguments: {} });
    console.log('Tool call foundryHealth result:', callResult);

    console.log('✅ All MCP checks passed');
  } catch (error) {
    console.error('❌ Test failed:', error);
    failed = true;
  } finally {
    server.kill();
  }
}

async function sendRequest(server: ChildProcess, method: string, params: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    pendingRequests.set(id, { resolve, reject });

    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    if (server.stdin) {
      server.stdin.write(JSON.stringify(request) + '\n');
    } else {
      reject(new Error('Server stdin not available'));
    }

    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error(`Timeout waiting for response to ${method}`));
      }
    }, 10000);
  });
}

main().catch(console.error);