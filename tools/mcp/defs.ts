/**
 * Shared MCP types and JSON-RPC helpers
 */

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties?: Record<string, unknown>;
    additionalProperties?: boolean;
    required?: string[];
  };
}

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
}

export function jsonRpcOk(id: string | number | null, result: unknown): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    result
  };
}

export function jsonRpcErr(id: string | number | null, code: number, message: string, data?: unknown): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
      data
    }
  };
}

export function toMcpContent(result: unknown): { content: Array<{ type: 'text'; text: string }> } {
  let text: string;
  
  if (typeof result === 'string') {
    text = result;
  } else if (typeof result === 'object' && result !== null) {
    try {
      text = JSON.stringify(result, null, 2);
    } catch {
      text = String(result);
    }
  } else {
    text = String(result);
  }
  
  return {
    content: [{ type: 'text', text }]
  };
}

export function isJsonRpcRequest(data: unknown): data is JsonRpcRequest {
  return (
    typeof data === 'object' &&
    data !== null &&
    'jsonrpc' in data &&
    (data as JsonRpcRequest).jsonrpc === '2.0' &&
    'method' in data &&
    typeof (data as JsonRpcRequest).method === 'string' &&
    'id' in data
  );
}

export function isJsonRpcNotification(data: unknown): data is JsonRpcNotification {
  return (
    typeof data === 'object' &&
    data !== null &&
    'jsonrpc' in data &&
    (data as JsonRpcNotification).jsonrpc === '2.0' &&
    'method' in data &&
    typeof (data as JsonRpcNotification).method === 'string' &&
    !('id' in data)
  );
}