export const MAIN_THREAD = 'main';
export function agentThreadId(agentId: string): string {
  return `agent:${agentId}`;
}
export function workspaceThreadId(workspaceId: string): string {
  return `workspace:${workspaceId}`;
}
