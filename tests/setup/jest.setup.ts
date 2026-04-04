/**
 * Jest Setup and Configuration
 * 
 * Global test setup, utilities, and configuration for OpenCode Tools test suite
 */

import { jest } from '@jest/globals';
import * as path from 'path';

// ====================
// Global Test Configuration
// ====================

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };

beforeAll(() => {
  // Suppress console output during tests unless explicitly enabled
  if (!process.env.VERBOSE_TESTS) {
    global.console = {
      ...console,
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
  }
});

afterAll(() => {
  // Restore console methods
  global.console = originalConsole;
});

// ====================
// Global Test Utilities
// ====================

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidResearchOutput(): R;
      toBeValidUrl(): R;
      toBeValidEmail(): R;
      toBeValidISODate(): R;
      toBeArrayOfValidSources(): R;
    }
  }
}

// ====================
// Mock Implementations
// ====================

export {};

// Mock uuid library for ESM compatibility

// Mock uuid library for ESM compatibility
jest.mock('uuid', () => ({
  v4: jest.fn(() => '123e4567-e89b-12d3-a456-426614174000'), // Valid UUID
  v5: jest.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
}));

beforeEach(() => {
  const uuid = jest.requireMock('uuid') as {
    v4?: jest.Mock;
    v5?: jest.Mock;
  };

  if (uuid.v4 && typeof uuid.v4.mockImplementation === 'function') {
    uuid.v4.mockImplementation(() => '123e4567-e89b-12d3-a456-426614174000');
  }

  if (uuid.v5 && typeof uuid.v5.mockImplementation === 'function') {
    uuid.v5.mockImplementation(() => '123e4567-e89b-12d3-a456-426614174000');
  }
});
