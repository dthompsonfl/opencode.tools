import type { Command } from './types';

export const builtinCommands: Command[] = [
  {
    id: 'help',
    description: 'Show help for commands',
    usage: '/help',
    handler: async () => {
      return 'Available commands: /help, /agents, /agent focus <id>, /workspaces, /workspace open <id>';
    },
  },
  {
    id: 'agents',
    description: 'List agents and statuses',
    usage: '/agents',
    handler: async (_args, context) => {
      const agents = context?.state?.agents || [];
      if (agents.length === 0) return 'No agents registered';
      return agents.map((a: any) => `${a.id} - ${a.name} (${a.roleLabel}) [${a.status}]`).join('\n');
    },
  },
  {
    id: 'agent:focus',
    description: 'Focus on an agent thread',
    usage: '/agent focus <id>',
    handler: async (args, context) => {
      const id = args[0];
      if (!id) return 'Usage: /agent focus <id>';
      context?.dispatch?.({ type: 'CHAT_SET_ACTIVE_THREAD', threadId: `agent:${id}` });
      return `Focused agent thread: agent:${id}`;
    },
  },
  {
    id: 'workspaces',
    description: 'List workspaces',
    usage: '/workspaces',
    handler: async (_args, context) => {
      const ctrl = context?.runtime?.coworkController;
      if (!ctrl) return 'Cowork runtime not available';
      const w = ctrl.listWorkspaces();
      if (!w || w.length === 0) return 'No workspaces';
      return w.map((ws: any) => `${ws.id} - ${ws.name} (project: ${ws.projectId})`).join('\n');
    },
  },
  {
    id: 'workspace:open',
    description: 'Open a workspace detail',
    usage: '/workspace open <id>',
    handler: async (args, context) => {
      const id = args[0];
      if (!id) return 'Usage: /workspace open <id>';
      context?.dispatch?.({ type: 'SET_SCREEN', screen: 'workspace' });
      context?.dispatch?.({ type: 'SET_ACTIVE_PROJECT', projectId: context?.state?.activeProjectId ?? '' });
      // set some inspector state if desired
      return `Opened workspace ${id}`;
    },
  },
];

export default builtinCommands;
