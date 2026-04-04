/**
 * MCP Server - Standardized JSON-RPC implementation using @modelcontextprotocol/sdk
 * 
 * This server exposes all OpenCode Tools functionality via the Model Context Protocol
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import { TOOL_DEFS, getToolHandler } from './mcp/registry';
import { toMcpContent } from './mcp/defs';
import { z } from 'zod';
import { initializeRuntime, getRuntime, runtimeHealthCheck } from '../src/runtime/bootstrap';

// Set MCP mode and patch console to prevent stdout pollution
if (typeof process !== 'undefined') {
  process.env.OPENCODE_MCP = '1';
  
  // Patch console methods to write to stderr instead of stdout using util.format
  const util = require('util');
  console.log = (...args: any[]) => process.stderr.write(util.format(...args) + '\n');
  console.info = (...args: any[]) => process.stderr.write(util.format(...args) + '\n');
  console.debug = (...args: any[]) => process.stderr.write(util.format(...args) + '\n');
  console.warn = (...args: any[]) => process.stderr.write(util.format(...args) + '\n');
  
  // Keep console.error as-is (already writes to stderr)

  // Add robust error boundaries to prevent silent crashes and unhandled Promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    process.stderr.write(`Unhandled Rejection: ${reason}\n`);
  });

  process.on('uncaughtException', (error) => {
    process.stderr.write(`Uncaught Exception: ${error.message}\n${error.stack}\n`);
  });
}

/**
 * Main MCP server implementation
 */
export async function main(): Promise<void> {
  // Initialize the runtime (loads plugins, agents, registries)
  // This is the single source of truth for bootstrap - no more duplicated init logic
  const runtime = initializeRuntime({
    eagerInit: true,
    verbose: false,
  });
  
  const server = new Server(
    {
      name: 'opencode-tools-mcp',
      version: process.env.npm_package_version || '1.0.0',
    },
    {
      capabilities: {
        tools: {
          listChanged: false
        },
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: TOOL_DEFS.map((def) => ({
        name: def.name,
        description: def.description,
        inputSchema: def.inputSchema as any,
      })),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolCall = request.params;

    if (!toolCall?.name) {
      throw new McpError(ErrorCode.InvalidParams, 'Invalid params: name is required');
    }

    const handler = getToolHandler(toolCall.name);
    if (!handler) {
      throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${toolCall.name}`);
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
        throw new McpError(ErrorCode.InvalidParams, `Invalid params: ${validationError.message}`);
      }
    }

    try {
      const result = await handler(toolCall.arguments || {});
      return toMcpContent(result) as any;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new McpError(ErrorCode.InternalError, message);
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Keep the process alive
  process.on('SIGINT', () => {
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    process.exit(0);
  });
}
