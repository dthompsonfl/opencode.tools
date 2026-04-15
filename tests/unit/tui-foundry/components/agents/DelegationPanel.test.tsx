/**
 * Tests for DelegationPanel Component
 */

import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DelegationPanel, type DelegationRequest } from '../../../../../src/tui-foundry/components/agents/DelegationPanel';

describe('DelegationPanel', () => {
  const mockOnDelegate = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    mockOnDelegate.mockClear();
    mockOnCancel.mockClear();
  });

  it('renders with required props', () => {
    const { lastFrame } = render(
      React.createElement(DelegationPanel, {
        projectId: 'test-project',
        onDelegate: mockOnDelegate,
        onCancel: mockOnCancel,
      })
    );

    const frame = lastFrame();
    expect(frame).toContain('Delegate Task');
    expect(frame).toContain('test-project');
    expect(frame).toContain('Select Agent');
    expect(frame).toContain('Task Description');
    expect(frame).toContain('Priority');
  });

  it('renders with teamId', () => {
    const { lastFrame } = render(
      React.createElement(DelegationPanel, {
        projectId: 'test-project',
        teamId: 'team-1',
        onDelegate: mockOnDelegate,
        onCancel: mockOnCancel,
      })
    );

    const frame = lastFrame();
    expect(frame).toContain('team-1');
  });

  it('renders with defaultAgentId', () => {
    const { lastFrame } = render(
      React.createElement(DelegationPanel, {
        projectId: 'test-project',
        defaultAgentId: 'arch-1',
        onDelegate: mockOnDelegate,
        onCancel: mockOnCancel,
      })
    );

    const frame = lastFrame();
    expect(frame).toContain('Architect');
  });

  it('displays priority options', () => {
    const { lastFrame } = render(
      React.createElement(DelegationPanel, {
        projectId: 'test-project',
        onDelegate: mockOnDelegate,
        onCancel: mockOnCancel,
      })
    );

    const frame = lastFrame();
    expect(frame).toContain('Low');
    expect(frame).toContain('Normal');
    expect(frame).toContain('High');
    expect(frame).toContain('Critical');
  });

  it('displays action buttons', () => {
    const { lastFrame } = render(
      React.createElement(DelegationPanel, {
        projectId: 'test-project',
        onDelegate: mockOnDelegate,
        onCancel: mockOnCancel,
      })
    );

    const frame = lastFrame();
    expect(frame).toContain('Cancel');
    expect(frame).toContain('Delegate');
  });

  it('displays keyboard navigation help', () => {
    const { lastFrame } = render(
      React.createElement(DelegationPanel, {
        projectId: 'test-project',
        onDelegate: mockOnDelegate,
        onCancel: mockOnCancel,
      })
    );

    const frame = lastFrame();
    expect(frame).toContain('Tab');
    expect(frame).toContain('Enter');
    expect(frame).toContain('Esc');
  });
});

describe('DelegationRequest Type', () => {
  it('accepts valid delegation request', () => {
    const request: DelegationRequest = {
      agentId: 'agent-1',
      task: 'Implement authentication',
      priority: 'high',
      context: 'Use JWT tokens',
    };

    expect(request.agentId).toBe('agent-1');
    expect(request.task).toBe('Implement authentication');
    expect(request.priority).toBe('high');
    expect(request.context).toBe('Use JWT tokens');
  });

  it('accepts minimal delegation request', () => {
    const request: DelegationRequest = {
      agentId: 'agent-1',
      task: 'Simple task',
      priority: 'normal',
    };

    expect(request.agentId).toBe('agent-1');
    expect(request.task).toBe('Simple task');
    expect(request.priority).toBe('normal');
    expect(request.context).toBeUndefined();
  });
});
