import { z } from 'zod';
import { BaseError } from '../../../src/runtime/errors';

export class ValidationError extends BaseError {
  constructor(
    message: string,
    public validationErrors: z.ZodError
  ) {
    super(`Validation Error: ${message}`);
    this.name = 'ValidationError';
  }
}

export class InputValidationError extends BaseError {
  constructor(
    message: string,
    public field?: string,
    public value?: unknown,
    public expectedType?: string
  ) {
    super(`Input Validation Error: ${message}`);
    this.name = 'InputValidationError';
  }
}

export class SchemaValidationError extends BaseError {
  constructor(
    message: string,
    public schemaPath?: string,
    public validationDetails?: Record<string, unknown>
  ) {
    super(`Schema Validation Error: ${message}`);
    this.name = 'SchemaValidationError';
  }
}
