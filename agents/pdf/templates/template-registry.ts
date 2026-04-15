import { TemplateType, TemplateConfig } from './types';
import { StandardTemplate, StandardTemplateConfig } from './standard';
import { WhitepaperTemplate, WhitepaperTemplateConfig } from './whitepaper';
import { TechnicalTemplate, TechnicalTemplateConfig } from './technical';

export function createTemplate(
  type: TemplateType,
  config?: Partial<TemplateConfig>
): StandardTemplate | WhitepaperTemplate | TechnicalTemplate {
  switch (type) {
    case 'standard':
      return new StandardTemplate(config as Partial<StandardTemplateConfig>);
    case 'whitepaper':
      return new WhitepaperTemplate(config as Partial<WhitepaperTemplateConfig>);
    case 'technical':
      return new TechnicalTemplate(config as Partial<TechnicalTemplateConfig>);
    default:
      return new StandardTemplate(config as Partial<StandardTemplateConfig>);
  }
}

export function getTemplateName(template: StandardTemplate | WhitepaperTemplate | TechnicalTemplate): string {
  return template.getTemplateName();
}

export function getTemplateStyling(
  template: StandardTemplate | WhitepaperTemplate | TechnicalTemplate
) {
  return template.getStyling();
}
