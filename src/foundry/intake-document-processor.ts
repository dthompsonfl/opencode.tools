import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { PDFDocument } from 'pdf-lib';

export type IntakeDocumentFormat = 'markdown' | 'yaml' | 'json' | 'mermaid' | 'pdf' | 'unknown';

export interface FoundryIntakeDocumentInput {
  id?: string;
  name?: string;
  filePath?: string;
  format?: IntakeDocumentFormat;
  content?: string;
}

export interface FoundryIntakeDocumentArtifact {
  id: string;
  name: string;
  format: IntakeDocumentFormat;
  source: 'inline' | 'file';
  metadata: Record<string, unknown>;
  text: string;
  structured: Record<string, unknown> | null;
  summary: string;
  warnings: string[];
}

export interface FoundryIntakeProcessingResult {
  documents: FoundryIntakeDocumentArtifact[];
  mergedContext: Record<string, unknown>;
  warnings: string[];
}

interface ResolvedDocument {
  name: string;
  source: 'inline' | 'file';
  rawText: string;
  rawBuffer: Buffer | null;
  format: IntakeDocumentFormat;
}

export class IntakeDocumentProcessor {
  public async processDocuments(inputs: FoundryIntakeDocumentInput[]): Promise<FoundryIntakeProcessingResult> {
    const artifacts: FoundryIntakeDocumentArtifact[] = [];
    const warnings: string[] = [];

    for (let index = 0; index < inputs.length; index += 1) {
      const input = inputs[index];
      try {
        const resolved = await this.resolveDocument(input, index);
        const artifact = await this.createArtifact(input, resolved, index);
        artifacts.push(artifact);
        warnings.push(...artifact.warnings);
      } catch (error) {
        warnings.push(
          `Unable to process intake document ${input.name ?? input.filePath ?? `#${index + 1}`}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return {
      documents: artifacts,
      mergedContext: this.mergeDocumentContexts(artifacts),
      warnings,
    };
  }

  private async resolveDocument(input: FoundryIntakeDocumentInput, index: number): Promise<ResolvedDocument> {
    const hasInlineContent = typeof input.content === 'string';
    const hasFilePath = typeof input.filePath === 'string' && input.filePath.trim().length > 0;

    if (!hasInlineContent && !hasFilePath) {
      throw new Error('Document requires either `content` or `filePath`.');
    }

    if (hasInlineContent) {
      const rawText = input.content ?? '';
      const format = this.detectFormat(input.format, input.name, undefined, rawText);
      return {
        name: input.name?.trim() || `intake-inline-${index + 1}`,
        source: 'inline',
        rawText,
        rawBuffer: null,
        format,
      };
    }

    const filePath = path.resolve(input.filePath ?? '');
    const buffer = await fs.readFile(filePath);
    const inferredName = input.name?.trim() || path.basename(filePath);
    const rawText = buffer.toString('utf-8');
    const format = this.detectFormat(input.format, inferredName, filePath, rawText);

    return {
      name: inferredName,
      source: 'file',
      rawText,
      rawBuffer: buffer,
      format,
    };
  }

  private async createArtifact(
    input: FoundryIntakeDocumentInput,
    resolved: ResolvedDocument,
    index: number,
  ): Promise<FoundryIntakeDocumentArtifact> {
    switch (resolved.format) {
      case 'markdown':
        return this.fromMarkdown(input, resolved, index);
      case 'yaml':
        return this.fromYaml(input, resolved, index);
      case 'json':
        return this.fromJson(input, resolved, index);
      case 'mermaid':
        return this.fromMermaid(input, resolved, index);
      case 'pdf':
        return this.fromPdf(input, resolved, index);
      default:
        return {
          id: input.id ?? `intake-${index + 1}`,
          name: resolved.name,
          format: 'unknown',
          source: resolved.source,
          metadata: {},
          text: resolved.rawText,
          structured: null,
          summary: `Unstructured intake document (${resolved.name})`,
          warnings: ['Document format is unknown; processing as plain text.'],
        };
    }
  }

  private fromMarkdown(
    input: FoundryIntakeDocumentInput,
    resolved: ResolvedDocument,
    index: number,
  ): FoundryIntakeDocumentArtifact {
    const headings = resolved.rawText
      .split(/\r?\n/)
      .filter((line) => line.trim().startsWith('#'))
      .map((line) => line.trim().replace(/^#+\s*/, ''));

    return {
      id: input.id ?? `intake-${index + 1}`,
      name: resolved.name,
      format: 'markdown',
      source: resolved.source,
      metadata: { headings, headingCount: headings.length },
      text: resolved.rawText,
      structured: { headings },
      summary: `Markdown intake with ${headings.length} headings`,
      warnings: [],
    };
  }

  private fromYaml(
    input: FoundryIntakeDocumentInput,
    resolved: ResolvedDocument,
    index: number,
  ): FoundryIntakeDocumentArtifact {
    const parsed = yaml.load(resolved.rawText);
    const structured = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : { value: parsed as unknown };

    return {
      id: input.id ?? `intake-${index + 1}`,
      name: resolved.name,
      format: 'yaml',
      source: resolved.source,
      metadata: { topLevelKeys: Object.keys(structured) },
      text: resolved.rawText,
      structured,
      summary: `YAML intake with ${Object.keys(structured).length} top-level keys`,
      warnings: [],
    };
  }

  private fromJson(
    input: FoundryIntakeDocumentInput,
    resolved: ResolvedDocument,
    index: number,
  ): FoundryIntakeDocumentArtifact {
    const parsed = JSON.parse(resolved.rawText) as unknown;
    const structured = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : { value: parsed as unknown };

    return {
      id: input.id ?? `intake-${index + 1}`,
      name: resolved.name,
      format: 'json',
      source: resolved.source,
      metadata: { topLevelKeys: Object.keys(structured) },
      text: resolved.rawText,
      structured,
      summary: `JSON intake with ${Object.keys(structured).length} top-level keys`,
      warnings: [],
    };
  }

  private fromMermaid(
    input: FoundryIntakeDocumentInput,
    resolved: ResolvedDocument,
    index: number,
  ): FoundryIntakeDocumentArtifact {
    const firstLine = resolved.rawText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0);

    return {
      id: input.id ?? `intake-${index + 1}`,
      name: resolved.name,
      format: 'mermaid',
      source: resolved.source,
      metadata: { diagramType: firstLine ?? 'unknown' },
      text: resolved.rawText,
      structured: { diagramType: firstLine ?? 'unknown' },
      summary: `Mermaid diagram intake (${firstLine ?? 'unknown diagram type'})`,
      warnings: [],
    };
  }

  private async fromPdf(
    input: FoundryIntakeDocumentInput,
    resolved: ResolvedDocument,
    index: number,
  ): Promise<FoundryIntakeDocumentArtifact> {
    const warnings: string[] = [];
    const buffer = resolved.rawBuffer ?? Buffer.from(resolved.rawText, 'utf-8');
    let metadata: Record<string, unknown> = {};

    try {
      const document = await PDFDocument.load(buffer, { ignoreEncryption: true });
      metadata = {
        pageCount: document.getPageCount(),
        title: document.getTitle() ?? null,
        author: document.getAuthor() ?? null,
        subject: document.getSubject() ?? null,
        creator: document.getCreator() ?? null,
        producer: document.getProducer() ?? null,
      };
    } catch (error) {
      warnings.push(`PDF metadata parsing failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    const extractedText = this.extractBestEffortPdfText(buffer);
    if (!extractedText) {
      warnings.push('PDF text extraction produced no clear text; metadata-only result generated.');
    }

    return {
      id: input.id ?? `intake-${index + 1}`,
      name: resolved.name,
      format: 'pdf',
      source: resolved.source,
      metadata,
      text: extractedText,
      structured: Object.keys(metadata).length > 0 ? metadata : null,
      summary: `PDF intake processed with ${typeof metadata.pageCount === 'number' ? metadata.pageCount : 'unknown'} pages`,
      warnings,
    };
  }

  private detectFormat(
    explicitFormat: IntakeDocumentFormat | undefined,
    name: string | undefined,
    filePath: string | undefined,
    content: string,
  ): IntakeDocumentFormat {
    if (explicitFormat && explicitFormat !== 'unknown') {
      return explicitFormat;
    }

    const candidate = (filePath ?? name ?? '').toLowerCase();
    if (candidate.endsWith('.md') || candidate.endsWith('.markdown')) {
      return 'markdown';
    }

    if (candidate.endsWith('.yml') || candidate.endsWith('.yaml')) {
      return 'yaml';
    }

    if (candidate.endsWith('.json')) {
      return 'json';
    }

    if (candidate.endsWith('.mmd') || candidate.endsWith('.mermaid')) {
      return 'mermaid';
    }

    if (candidate.endsWith('.pdf')) {
      return 'pdf';
    }

    const trimmed = content.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return 'json';
    }

    if (/^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram)\b/m.test(content)) {
      return 'mermaid';
    }

    if (/^#\s+/m.test(content)) {
      return 'markdown';
    }

    if (/^[\w-]+:\s+/m.test(content)) {
      return 'yaml';
    }

    return 'unknown';
  }

  private extractBestEffortPdfText(buffer: Buffer): string {
    const binary = buffer.toString('latin1');
    const matches = binary.match(/[\x20-\x7E]{12,}/g);
    if (!matches || matches.length === 0) {
      return '';
    }

    const text = matches
      .slice(0, 120)
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
      .join('\n')
      .slice(0, 8000);

    return text;
  }

  private mergeDocumentContexts(artifacts: FoundryIntakeDocumentArtifact[]): Record<string, unknown> {
    const mergedStructured: Record<string, unknown> = {};
    const summaries: string[] = [];

    for (const artifact of artifacts) {
      summaries.push(`${artifact.name}: ${artifact.summary}`);
      if (artifact.structured && typeof artifact.structured === 'object') {
        mergedStructured[artifact.name] = artifact.structured;
      }
    }

    return {
      documentCount: artifacts.length,
      summaries,
      structured: mergedStructured,
    };
  }
}
