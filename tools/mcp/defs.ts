/**
 * Shared MCP types
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
