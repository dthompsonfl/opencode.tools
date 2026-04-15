export function formatTelemetryLine(agentId: string, type: string, content: unknown) {
  const text = typeof content === 'string' ? content : JSON.stringify(content);
  return `[${agentId}][${type}] ${text}`;
}
