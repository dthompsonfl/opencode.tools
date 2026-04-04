export type AgentStreamEventType = 'step' | 'tool' | 'thought' | 'result';

export interface AgentStreamEvent<TPayload = unknown> {
  type: AgentStreamEventType;
  agentId: string;
  step: number;
  timestamp: string;
  payload: TPayload;
}

export type AgentStreamCallback = (event: AgentStreamEvent) => void;
