/**
 * Markdown Parser for Cowork Plugin System
 * 
 * Parses YAML frontmatter and body content from markdown files
 * for commands, agents, and skills.
 */

import * as yaml from 'js-yaml';
import {
  CommandDefinition,
  AgentDefinition,
  SkillDefinition
} from './types';

/**
 * Result of parsing markdown with frontmatter
 */
interface ParseResult {
  /** Parsed YAML frontmatter */
  frontmatter: Record<string, unknown>;
  /** Body content without frontmatter */
  body: string;
}

/**
 * Parse markdown content with YAML frontmatter
 * 
 * @param content - Full markdown file content
 * @returns Parsed frontmatter and body
 * @throws Error if YAML is invalid
 */
export function parseMarkdownWithFrontmatter(content: string): ParseResult {
  // Check for frontmatter delimiters
  if (!content.startsWith('---')) {
    // No frontmatter, return entire content as body
    return {
      frontmatter: {},
      body: content
    };
  }

  // Find the closing delimiter
  const firstNewline = content.indexOf('\n');
  if (firstNewline === -1) {
    return {
      frontmatter: {},
      body: content
    };
  }

  const secondDelimiterIndex = content.indexOf('---', firstNewline + 1);
  
  if (secondDelimiterIndex === -1) {
    // Only opening delimiter, treat as no frontmatter
    return {
      frontmatter: {},
      body: content
    };
  }

  // Extract frontmatter and body
  const frontmatterRaw = content.slice(3, secondDelimiterIndex).trim();
  const body = content.slice(secondDelimiterIndex + 3).trim();

  // Parse YAML frontmatter
  let frontmatter: Record<string, unknown> = {};
  
  if (frontmatterRaw) {
    try {
      frontmatter = yaml.load(frontmatterRaw) as Record<string, unknown> || {};
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Invalid YAML frontmatter: ${errorMessage}`);
    }
  }

  return {
    frontmatter,
    body
  };
}

/**
 * Parse a command markdown file
 * 
 * @param content - Markdown file content
 * @param id - Command ID (usually filename without extension)
 * @returns Parsed CommandDefinition
 * @throws Error if required fields are missing
 */
export function parseCommandMarkdown(content: string, id: string): CommandDefinition {
  const { frontmatter, body } = parseMarkdownWithFrontmatter(content);

  // Validate required fields
  const description = frontmatter.description;
  if (!description || typeof description !== 'string') {
    throw new Error(`Command "${id}" is missing required "description" field in frontmatter`);
  }

  // Parse optional fields
  const allowedTools = parseStringArray(frontmatter['allowed-tools']);
  const model = typeof frontmatter.model === 'string' ? frontmatter.model : undefined;
  const argumentHint = typeof frontmatter['argument-hint'] === 'string' 
    ? frontmatter['argument-hint'] 
    : undefined;

  // Derive name from ID if not provided
  const name = id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return {
    id,
    name,
    description,
    body: body || '',
    allowedTools,
    model,
    argumentHint
  };
}

/**
 * Parse an agent markdown file
 * 
 * @param content - Markdown file content
 * @param id - Agent ID (usually filename without extension)
 * @returns Parsed AgentDefinition
 * @throws Error if required fields are missing
 */
export function parseAgentMarkdown(content: string, id: string): AgentDefinition {
  const { frontmatter, body } = parseMarkdownWithFrontmatter(content);

  // Validate required fields
  const name = frontmatter.name;
  if (!name || typeof name !== 'string') {
    throw new Error(`Agent "${id}" is missing required "name" field in frontmatter`);
  }

  const description = frontmatter.description;
  if (!description || typeof description !== 'string') {
    throw new Error(`Agent "${id}" is missing required "description" field in frontmatter`);
  }

  // Parse optional fields
  const tools = parseStringArray(frontmatter.tools);
  const model = typeof frontmatter.model === 'string' ? frontmatter.model : undefined;
  const color = typeof frontmatter.color === 'string' ? frontmatter.color : undefined;

  return {
    id,
    name,
    description,
    body: body || '',
    tools,
    model,
    color
  };
}

/**
 * Parse a skill markdown file
 * 
 * @param content - Markdown file content
 * @param id - Skill ID
 * @returns Parsed SkillDefinition
 */
export function parseSkillMarkdown(content: string, id: string): SkillDefinition {
  const { frontmatter, body } = parseMarkdownWithFrontmatter(content);

  // Name can come from frontmatter or be derived from ID
  const name = typeof frontmatter.name === 'string' 
    ? frontmatter.name 
    : id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return {
    id,
    name,
    body: body || ''
  };
}

/**
 * Helper function to parse string array from frontmatter
 */
function parseStringArray(value: unknown): string[] | undefined {
  if (!value) {
    return undefined;
  }

  if (Array.isArray(value)) {
    const result: string[] = [];
    for (const item of value) {
      if (typeof item === 'string') {
        result.push(item);
      }
    }
    return result.length > 0 ? result : undefined;
  }

  if (typeof value === 'string') {
    return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }

  return undefined;
}
