export type { 
  StandardTemplateConfig,
  WhitepaperTemplateConfig, 
  TechnicalTemplateConfig,
  TemplateConfig,
  TemplateType 
} from './types';

export { 
  createTemplate,
  getTemplateName,
  getTemplateStyling
} from './template-registry';

// Re-export template classes
export { StandardTemplate } from './standard';
export { WhitepaperTemplate } from './whitepaper';
export { TechnicalTemplate } from './technical';

// Re-export template creation functions
export { createStandardTemplate } from './standard';
export { createWhitepaperTemplate } from './whitepaper';
export { createTechnicalTemplate } from './technical';
