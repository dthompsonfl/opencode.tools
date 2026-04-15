/**
 * Tests for Markdown Parser
 */

import {
  parseMarkdownWithFrontmatter,
  parseCommandMarkdown,
  parseAgentMarkdown,
  parseSkillMarkdown
} from '../../../src/cowork/markdown-parser';

describe('parseMarkdownWithFrontmatter', () => {
  it('should parse valid frontmatter and body', () => {
    const content = `---
description: Test command
allowed-tools:
  - read
  - write
---

# Body content

This is the body.`;

    const result = parseMarkdownWithFrontmatter(content);

    expect(result.frontmatter).toEqual({
      description: 'Test command',
      'allowed-tools': ['read', 'write']
    });
    expect(result.body).toBe('# Body content\n\nThis is the body.');
  });

  it('should handle missing frontmatter', () => {
    const content = '# Just body content';

    const result = parseMarkdownWithFrontmatter(content);

    expect(result.frontmatter).toEqual({});
    expect(result.body).toBe('# Just body content');
  });

  it('should handle empty frontmatter', () => {
    const content = `---
---

# Body after empty frontmatter`;

    const result = parseMarkdownWithFrontmatter(content);

    expect(result.frontmatter).toEqual({});
    expect(result.body).toBe('# Body after empty frontmatter');
  });

  it('should throw error for invalid YAML', () => {
    const content = `---
invalid: yaml: content:
---

Body`;

    expect(() => parseMarkdownWithFrontmatter(content)).toThrow('Invalid YAML frontmatter');
  });
});

describe('parseCommandMarkdown', () => {
  it('should parse command with all fields', () => {
    const content = `---
description: Perform a code review
allowed-tools:
  - read
  - grep
model: gpt-4
argument-hint: "<path>"
---

# Code Review

You are a code reviewer.`;

    const result = parseCommandMarkdown(content, 'code-review');

    expect(result.id).toBe('code-review');
    expect(result.name).toBe('Code Review');
    expect(result.description).toBe('Perform a code review');
    expect(result.allowedTools).toEqual(['read', 'grep']);
    expect(result.model).toBe('gpt-4');
    expect(result.argumentHint).toBe('<path>');
    expect(result.body).toBe('# Code Review\n\nYou are a code reviewer.');
  });

  it('should throw error for missing description', () => {
    const content = `---
model: gpt-4
---

Body`;

    expect(() => parseCommandMarkdown(content, 'test-command')).toThrow(
      'missing required "description" field'
    );
  });

  it('should parse command with minimal fields', () => {
    const content = `---
description: Simple command
---

Simple body`;

    const result = parseCommandMarkdown(content, 'simple');

    expect(result.id).toBe('simple');
    expect(result.name).toBe('Simple');
    expect(result.description).toBe('Simple command');
    expect(result.allowedTools).toBeUndefined();
    expect(result.model).toBeUndefined();
    expect(result.body).toBe('Simple body');
  });
});

describe('parseAgentMarkdown', () => {
  it('should parse agent with all fields', () => {
    const content = `---
name: pm
description: Project Manager agent
tools:
  - read
  - write
model: gpt-4
color: blue
---

# Project Manager

You are a project manager.`;

    const result = parseAgentMarkdown(content, 'pm');

    expect(result.id).toBe('pm');
    expect(result.name).toBe('pm');
    expect(result.description).toBe('Project Manager agent');
    expect(result.tools).toEqual(['read', 'write']);
    expect(result.model).toBe('gpt-4');
    expect(result.color).toBe('blue');
    expect(result.body).toBe('# Project Manager\n\nYou are a project manager.');
  });

  it('should throw error for missing name', () => {
    const content = `---
description: Agent without name
---

Body`;

    expect(() => parseAgentMarkdown(content, 'test-agent')).toThrow(
      'missing required "name" field'
    );
  });

  it('should throw error for missing description', () => {
    const content = `---
name: test
---

Body`;

    expect(() => parseAgentMarkdown(content, 'test-agent')).toThrow(
      'missing required "description" field'
    );
  });
});

describe('parseSkillMarkdown', () => {
  it('should parse skill with name in frontmatter', () => {
    const content = `---
name: coding-skill
---

# Skill content

This is a skill.`;

    const result = parseSkillMarkdown(content, 'coding-skill');

    expect(result.id).toBe('coding-skill');
    expect(result.name).toBe('coding-skill');
    expect(result.body).toBe('# Skill content\n\nThis is a skill.');
  });

  it('should derive name from id if not in frontmatter', () => {
    const content = `---
---

# Skill body`;

    const result = parseSkillMarkdown(content, 'my-skill');

    expect(result.id).toBe('my-skill');
    expect(result.name).toBe('My Skill');
    expect(result.body).toBe('# Skill body');
  });

  it('should handle skill with no frontmatter', () => {
    const content = '# Just skill content';

    const result = parseSkillMarkdown(content, 'simple-skill');

    expect(result.id).toBe('simple-skill');
    expect(result.name).toBe('Simple Skill');
    expect(result.body).toBe('# Just skill content');
  });
});
