import winston from 'winston';

export type DiagramType = 
  | 'flowchart' 
  | 'sequence' 
  | 'gantt' 
  | 'class' 
  | 'state' 
  | 'er' 
  | 'journey'
  | 'mindmap'
  | 'pie'
  | 'timeline';

export type DiagramLayout = 'TB' | 'LR' | 'RL' | 'BT';

export interface DiagramStyle {
  theme?: 'default' | 'neutral' | 'forest' | 'dark' | 'base';
  backgroundColor?: string;
  fontFamily?: string;
  fontSize?: number;
}

export interface DiagramConfig {
  id: string;
  type: DiagramType;
  title: string;
  definition: string;
  layout?: DiagramLayout;
  style?: DiagramStyle;
  width?: number;
  height?: number;
}

export interface MermaidOptions {
  theme?: 'default' | 'neutral' | 'forest' | 'dark' | 'base';
  securityLevel?: 'loose' | 'strict';
  startOnLoad?: boolean;
}

export interface DiagramRenderingError extends Error {
  diagramId: string;
  diagramType: DiagramType;
  runId: string;
  cause?: Error;
}

export function createDiagramError(
  message: string,
  diagramId: string,
  diagramType: DiagramType,
  runId: string,
  cause?: Error
): DiagramRenderingError {
  const error = new Error(message) as DiagramRenderingError;
  error.diagramId = diagramId;
  error.diagramType = diagramType;
  error.runId = runId;
  error.cause = cause;
  return error;
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'diagram-engine' },
  transports: [
    new winston.transports.File({ filename: 'logs/diagram-engine/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/diagram-engine/combined.log' })
  ]
});

export { logger };
