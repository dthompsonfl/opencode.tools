import mermaid from 'mermaid';
import { MermaidOptions } from './diagram-config';

export function initializeMermaid(options?: MermaidOptions): void {
  mermaid.initialize({
    startOnLoad: false,
    theme: options?.theme || 'default',
    securityLevel: options?.securityLevel || 'loose',
    flowchart: {
      useMaxWidth: true,
      htmlLabels: true,
      curve: 'basis'
    },
    sequence: {
      mirrorActors: false,
      bottomMarginAdj: 1
    },
    gantt: {
      titleTopMargin: 25,
      barHeight: 20,
      barGap: 4,
      topPadding: 50
    },
    class: {
      useMaxWidth: true
    },
    state: {
      useMaxWidth: true
    },
    er: {
      useMaxWidth: true
    },
    journey: {
      useMaxWidth: true
    },
    mindmap: {
      useMaxWidth: true
    },
    pie: {
      useMaxWidth: true
    },
    timeline: {
      useMaxWidth: true
    }
  });
}

export async function parseDiagram(definition: string): Promise<void> {
  await mermaid.parse(definition);
}

export async function generateSVG(
  id: string,
  definition: string
): Promise<string> {
  const { svg } = await mermaid.render(id, definition);
  return svg;
}

export async function validateMermaidSyntax(definition: string): Promise<boolean> {
  try {
    await mermaid.parse(definition);
    return true;
  } catch {
    return false;
  }
}
