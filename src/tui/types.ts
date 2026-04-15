export interface AgentStep {
  key: string;
  question: string;
  type: 'text' | 'select' | 'confirm';
  options?: { label: string; value: string }[];
  required?: boolean;
}

export interface AgentActivity {
  agentId: string;
  agentName: string;
  status: 'idle' | 'thinking' | 'working' | 'completing' | 'failed' | 'success';
  lastLog?: string;
  progress?: number; // 0-100
}

export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  steps: AgentStep[];
  execute: (answers: Record<string, any>, log: (msg: string) => void) => Promise<any>;
  interactive?: boolean; // If true, uses refinement cycle instead of wizard
  repl?: boolean; // If true, agent runs in continuous REPL mode
  onInput?: (input: string, log: (msg: string) => void) => Promise<void>;
}

export interface Message {
  id: string;
  role: 'user' | 'agent' | 'system' | 'log';
  content: string;
  timestamp: number;
}

export interface Session {
  id: string;
  name: string;
  agentId: string;
  messages: Message[];
  answers: Record<string, any>;
  status: 'idle' | 'refining' | 'running' | 'completed' | 'failed';
  activities: AgentActivity[];
  createdAt: number;
  updatedAt: number;
}
