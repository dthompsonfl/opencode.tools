export interface SequenceParticipant {
  alias: string;
  name: string;
  type?: 'participant' | 'actor' | 'boundary' | 'control' | 'entity' | 'database';
}

export interface SequenceMessage {
  from: string;
  to: string;
  message: string;
  type?: 'solid' | 'dotted';
  direction?: '->' | '-->';
  activate?: boolean;
  note?: string;
}

export interface SequenceConfig {
  title?: string;
  participants?: SequenceParticipant[];
  messages?: SequenceMessage[];
  autoNumber?: boolean;
}

export function createSequenceDiagramDefinition(config: SequenceConfig): string {
  let definition = '';

  if (config.title) {
    definition += `title ${config.title}\n`;
  }

  definition += 'sequenceDiagram\n';

  if (config.participants) {
    for (const participant of config.participants) {
      const type = participant.type || 'participant';
      definition += `  ${type} ${participant.alias} as ${participant.name}\n`;
    }
  }

  if (config.messages) {
    for (const msg of config.messages) {
      const solidLine = msg.type === 'dotted' ? '-->' : '->>';
      const messageStr = `${msg.from}${solidLine}${msg.to}: ${msg.message}\n`;
      definition += `  ${messageStr}`;

      if (msg.activate) {
        definition += `  activate ${msg.to}\n`;
      }

      if (msg.note) {
        definition += `  Note right of ${msg.from}: ${msg.note}\n`;
      }
    }
  }

  return definition;
}

export const defaultSequenceDiagramDefinition = `
sequenceDiagram
  participant A as Client
  participant B as Server
  participant C as Database
  A->>B: Request
  B->>C: Query
  C-->>B: Response
  B-->>A: Result
`;
