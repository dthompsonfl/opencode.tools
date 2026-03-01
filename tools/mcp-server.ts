/**
 * MCP Server - Complete JSON-RPC implementation for OpenCode Tools
 * 
 * This server exposes all OpenCode Tools functionality via the Model Context Protocol
 */

import { 
  JsonRpcRequest, 
  JsonRpcResponse, 
  JsonRpcNotification,
  jsonRpcOk, 
  jsonRpcErr, 
  toMcpContent,
  isJsonRpcRequest,
  isJsonRpcNotification
} from './mcp/defs';
import { TOOL_DEFS, getToolHandler } from './mcp/registry';
import { z } from 'zod';

// Set MCP mode and patch console to prevent stdout pollution
if (typeof process !== 'undefined') {
  process.env.OPENCODE_MCP = '1';
  
  // Patch console methods to write to stderr instead of stdout using util.format
  const util = require('util');
  console.log = (...args) => process.stderr.write(util.format(...args) + '\n');
  console.info = (...args) => process.stderr.write(util.format(...args) + '\n');
  console.debug = (...args) => process.stderr.write(util.format(...args) + '\n');
  console.warn = (...args) => process.stderr.write(util.format(...args) + '\n');
  
  // Keep console.error as-is (already writes to stderr)
}

/**
 * Handle JSON-RPC method calls
 */
async function handleMethod(method: string, params: unknown, id: string | number): Promise<JsonRpcResponse> {
  try {
    switch (method) {
      case 'initialize':
        return handleInitialize(params, id);
      
      case 'tools/list':
        return handleToolsList(params, id);
      
      case 'tools/call':
        return await handleToolsCall(params, id);
      
      case 'ping':
        return jsonRpcOk(id, { pong: true });
      
      default:
        return jsonRpcErr(id, -32601, `Method not found: ${method}`);
    }
  } catch (error) {
    return jsonRpcErr(id, -32000, error instanceof Error ? error.message : String(error));
  }
}

/**
 * Handle initialize request
 */
function handleInitialize(params: unknown, id: string | number): JsonRpcResponse {
  const protocolVersion = (params as any)?.protocolVersion;
  
  // Support multiple protocol versions
  const supportedVersions = ['2025-06-18', '1.0'];
  
  return jsonRpcOk(id, {
    protocolVersion: supportedVersions.includes(protocolVersion) ? protocolVersion : '2025-06-18',
    capabilities: {
      tools: {
        listChanged: false
      }
    },
    serverInfo: {
      name: 'opencode-tools-mcp',
      version: process.env.npm_package_version || '1.0.0'
    }
  });
}

/**
 * Handle tools/list request
 */
function handleToolsList(params: unknown, id: string | number): JsonRpcResponse {
  // Optional cursor support (we return all tools)
  const cursor = (params as any)?.cursor;
  
  return jsonRpcOk(id, {
    tools: TOOL_DEFS,
    nextCursor: null // All tools returned in one call
  });
}

/**
 * Handle tools/call request
 */
async function handleToolsCall(params: unknown, id: string | number): Promise<JsonRpcResponse> {
  const toolCall = params as { name: string; arguments: Record<string, unknown> };
  
  if (!toolCall?.name) {
    return jsonRpcErr(id, -32602, 'Invalid params: name is required');
  }
  
  const handler = getToolHandler(toolCall.name);
  if (!handler) {
    return jsonRpcErr(id, -32602, `Tool not found: ${toolCall.name}`);
  }
  
  // Basic validation mapping JSON Schema subset to Zod subset
  const toolDef = TOOL_DEFS.find(t => t.name === toolCall.name);
  if (toolDef && toolDef.inputSchema) {
    const zodSchemaObj: Record<string, z.ZodTypeAny> = {};
    if (toolDef.inputSchema.properties) {
      for (const [key, prop] of Object.entries(toolDef.inputSchema.properties)) {
        let zodType: z.ZodTypeAny = z.any();
        if ((prop as any).type === 'string') zodType = z.string();
        else if ((prop as any).type === 'number') zodType = z.number();
        else if ((prop as any).type === 'boolean') zodType = z.boolean();
        else if ((prop as any).type === 'array') zodType = z.array(z.any());
        else if ((prop as any).type === 'object') zodType = z.record(z.string(), z.any());

        if (!toolDef.inputSchema.required || !toolDef.inputSchema.required.includes(key)) {
          zodType = zodType.optional();
        }
        // nosemgrep: javascript.lang.security.audit.unsafe-dynamic-method.unsafe-dynamic-method
        zodSchemaObj[key] = zodType;
      }
    }

    let zodSchema: z.ZodTypeAny = z.object(zodSchemaObj);
    if (toolDef.inputSchema.additionalProperties) {
      zodSchema = z.object(zodSchemaObj).catchall(z.any());
    } else {
      zodSchema = z.object(zodSchemaObj).strict();
    }

    try {
      zodSchema.parse(toolCall.arguments || {});
    } catch (validationError: any) {
      return jsonRpcErr(id, -32602, `Invalid params: ${validationError.message}`);
    }
  }

  try {
    const result = await handler(toolCall.arguments || {});
    return jsonRpcOk(id, toMcpContent(result));
  } catch (error) {
    return jsonRpcErr(id, -32000, error instanceof Error ? error.message : String(error));
  }
}

/**
 * Handle JSON-RPC notifications
 */
async function handleNotification(method: string, params: unknown): Promise<void> {
  switch (method) {
    case 'notifications/initialized':
      // Server is initialized, can perform any post-initialization setup
      break;
      
    default:
      // Ignore unknown notifications
      break;
  }
}

/**
 * Main MCP server implementation
 */
export async function main(): Promise<void> {
  const stdin = process.stdin;
  const stdout = process.stdout;
  
  let buffer = '';
  const MAX_BUFFER_SIZE = 10 * 1024 * 1024; // 10MB limit for the buffer
  
  // Set up stdin for line-by-line reading
  stdin.setEncoding('utf8');
  stdin.resume();
  
  stdin.on('data', async (chunk: string) => {
    buffer += chunk;

    if (buffer.length > MAX_BUFFER_SIZE) {
      // Buffer too large, prevent memory exhaustion
      const response = jsonRpcErr(null, -32700, 'Parse error: Request too large');
      stdout.write(JSON.stringify(response) + '\n');
      buffer = '';
      return;
    }
    
    // Process complete lines
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      try {
        const message = JSON.parse(line);
        
        if (isJsonRpcRequest(message)) {
          // Handle request
          const response = await handleMethod(message.method, message.params, message.id);
          stdout.write(JSON.stringify(response) + '\n');
          
        } else if (isJsonRpcNotification(message)) {
          // Handle notification
          await handleNotification(message.method, message.params);
          
        } else {
          // Invalid message format
          const response = jsonRpcErr(null, -32700, 'Parse error');
          stdout.write(JSON.stringify(response) + '\n');
        }
        
      } catch (error) {
        // JSON parse error or other error
        const response = jsonRpcErr(null, -32700, error instanceof Error ? error.message : 'Parse error');
        stdout.write(JSON.stringify(response) + '\n');
      }
    }
  });
  
  // Handle stdin end
  stdin.on('end', () => {
    process.exit(0);
  });
  
  // Handle errors
  stdin.on('error', (error) => {
    console.error('Stdin error:', error);
    process.exit(1);
  });
  
  // Keep the process alive
  process.on('SIGINT', () => {
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    process.exit(0);
  });
}