import { DiagramLayout } from '../diagram-config';

export interface FlowchartConfig {
  nodes?: FlowchartNode[];
  edges?: FlowchartEdge[];
  layout?: DiagramLayout;
}

export interface FlowchartNode {
  id: string;
  label: string;
  shape?: 'rect' | 'round' | 'stadium' | 'cylinder' | 'circle' | 'diamond';
  class?: string;
}

export interface FlowchartEdge {
  from: string;
  to: string;
  label?: string;
  style?: 'solid' | 'dashed' | 'dotted';
}

export function createFlowchartDefinition(config: FlowchartConfig): string {
  const layout = config.layout || 'TB';
  let definition = `graph ${layout}\n`;

  if (config.nodes) {
    for (const node of config.nodes) {
      const openShape = getNodeShape(node.shape);
      const closeShape = closeNodeShape(node.shape);
      definition += `  ${node.id}${openShape}${node.label}${closeShape}\n`;
      if (node.class) {
        definition += `  style ${node.id} fill:${node.class}\n`;
      }
    }
  }

  if (config.edges) {
    for (const edge of config.edges) {
      const label = edge.label ? `|${edge.label}|` : '';
      const style = edge.style ? ` style ${edge.style}` : '';
      definition += `  ${edge.from} -->${label} ${edge.to}${style}\n`;
    }
  }

  return definition;
}

function getNodeShape(shape?: string): string {
  switch (shape) {
    case 'round':
      return '(';
    case 'stadium':
      return '([';
    case 'cylinder':
      return '([';
    case 'circle':
      return '((';
    case 'diamond':
      return '{';
    default:
      return '[';
  }
}

export function closeNodeShape(shape?: string): string {
  switch (shape) {
    case 'round':
      return ')';
    case 'stadium':
      return '])';
    case 'cylinder':
      return '])';
    case 'circle':
      return '))';
    case 'diamond':
      return '}';
    default:
      return ']';
  }
}

export const defaultFlowchartDefinition = `
graph TB
  A[Start] --> B{Process}
  B -->|Yes| C[Action 1]
  B -->|No| D[Action 2]
  C --> E[End]
  D --> E
`;
