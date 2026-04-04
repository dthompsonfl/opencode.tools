import { z } from 'zod';

/**
 * Project Brief Schema
 */
export const ProjectBriefSchema = z.object({
  title: z.string().min(1, 'Project title is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  audience: z.string().optional(),
  goals: z.array(z.string()).min(1, 'At least one goal is required'),
  pages: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
  brandAdjectives: z.array(z.string()).optional(),
  competitors: z.array(z.string()).optional(),
  constraints: z.array(z.string()).optional(),
});

/**
 * Brand Identity Schema
 */
export const BrandIdentitySchema = z.object({
  name: z.string(),
  colors: z.object({
    primary: z.string(),
    secondary: z.string().optional(),
    accent: z.string().optional(),
    background: z.string().optional(),
    text: z.string().optional(),
  }).optional(),
  typography: z.object({
    headings: z.string().optional(),
    body: z.string().optional(),
  }).optional(),
  mood: z.array(z.string()).optional(),
  logoUrl: z.string().url().optional(),
});

/**
 * Technical Stack Schema
 */
export const TechStackSchema = z.object({
  framework: z.enum(['nextjs', 'react', 'vue', 'nuxt', 'svelte', 'solid']).default('nextjs'),
  styling: z.enum(['tailwind', 'css-modules', 'styled-components', 'emotion']).default('tailwind'),
  deployment: z.enum(['vercel', 'netlify', 'aws', 'render']).default('vercel'),
  cms: z.string().optional(),
  analytics: z.string().optional(),
  database: z.string().optional(),
});

/**
 * Project Acceptance Criteria Schema
 */
export const AcceptanceCriteriaSchema = z.object({
  performance: z.object({
    lighthouse: z.object({
      performance: z.number().min(0).max(100),
      accessibility: z.number().min(0).max(100),
      bestPractices: z.number().min(0).max(100),
      seo: z.number().min(0).max(100),
    }).optional(),
  }).optional(),
  features: z.array(z.object({
    id: z.string(),
    description: z.string(),
    criteria: z.array(z.string()),
  })).optional(),
});

/**
 * Full Project Init Schema
 */
export const ProjectInitSchema = z.object({
  brief: ProjectBriefSchema,
  brand: BrandIdentitySchema.optional(),
  tech: TechStackSchema.optional(),
  acceptance: AcceptanceCriteriaSchema.optional(),
});

export type ProjectBrief = z.infer<typeof ProjectBriefSchema>;
export type BrandIdentity = z.infer<typeof BrandIdentitySchema>;
export type TechStack = z.infer<typeof TechStackSchema>;
export type AcceptanceCriteria = z.infer<typeof AcceptanceCriteriaSchema>;
export type ProjectInit = z.infer<typeof ProjectInitSchema>;
