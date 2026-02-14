/**
 * Cowork Plugin System - Main Export
 * 
 * Comprehensive multi-agent development system with:
 * - CTO-level orchestration
 * - Inter-agent collaboration
 * - Self-healing code review
 * - Auto-feature implementation
 */

// Core types
export * from './types';

// Registries
export * from './registries';

// Orchestrators
export * from './orchestrator';

// Collaboration
export * from './collaboration';

// Permissions
export * from './permissions';

// Hooks
export * from './hooks';

// Features (Auto-implementation)
export * from './features';

// Parsers
export { parseMarkdownWithFrontmatter, parseCommandMarkdown, parseAgentMarkdown, parseSkillMarkdown } from './markdown-parser';

// Plugin loader
export { loadAllPlugins, loadPlugin, getBundledPluginsDir, getSystemPluginsDir } from './plugin-loader';

// Self-healing review system (create if needed)
export { 
  CTOOrchestrator,
  type CTOOrchestratorOptions,
  type RequirementUnderstanding,
  type StrategicPlan,
  type QualityGate
} from './orchestrator/cto-orchestrator';

// Auto-feature pipeline
export {
  AutoFeaturePipeline,
  type FeatureSpec,
  type FeatureResult,
  type AutoFeatureOptions
} from './features/auto-feature-pipeline';
