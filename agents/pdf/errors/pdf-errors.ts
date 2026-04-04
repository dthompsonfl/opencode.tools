import { BaseError } from '../../../src/runtime/errors';

export class PDFGenerationError extends BaseError {
  constructor(
    message: string,
    public context?: Record<string, unknown>,
    public cause?: Error
  ) {
    super(`PDF Generation Error: ${message}`);
    this.name = 'PDFGenerationError';
  }
}

export class ChartRenderingError extends BaseError {
  constructor(
    chartId: string,
    message: string,
    public cause?: Error
  ) {
    super(`Chart Rendering Error for ${chartId}: ${message}`);
    this.name = 'ChartRenderingError';
  }
}

export class DiagramRenderingError extends BaseError {
  constructor(
    diagramId: string,
    message: string,
    public cause?: Error
  ) {
    super(`Diagram Rendering Error for ${diagramId}: ${message}`);
    this.name = 'DiagramRenderingError';
  }
}

export class AssetProcessingError extends BaseError {
  constructor(
    assetId: string,
    message: string,
    public cause?: Error
  ) {
    super(`Asset Processing Error for ${assetId}: ${message}`);
    this.name = 'AssetProcessingError';
  }
}

export class SecurityError extends BaseError {
  constructor(message: string) {
    super(`Security Error: ${message}`);
    this.name = 'SecurityError';
  }
}

export class TemplateError extends BaseError {
  constructor(
    message: string,
    public templateId?: string,
    public cause?: Error
  ) {
    super(`Template Error: ${message}`);
    this.name = 'TemplateError';
  }
}

export class LayoutError extends BaseError {
  constructor(
    message: string,
    public context?: Record<string, unknown>,
    public cause?: Error
  ) {
    super(`Layout Error: ${message}`);
    this.name = 'LayoutError';
  }
}

export class FontError extends BaseError {
  constructor(
    message: string,
    public fontFamily?: string,
    public cause?: Error
  ) {
    super(`Font Error: ${message}`);
    this.name = 'FontError';
  }
}

export class OutputError extends BaseError {
  constructor(
    message: string,
    public context?: Record<string, unknown>,
    public cause?: Error
  ) {
    super(`Output Error: ${message}`);
    this.name = 'OutputError';
  }
}
