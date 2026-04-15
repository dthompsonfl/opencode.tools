import { baseTemplate } from './base-template';

export const whitepaperTemplate = `
${baseTemplate}

{{#* inline "cover" }}
<div class="whitepaper-cover" style="page-break-after: always; height: 100vh; display: flex; align-items: center; justify-content: center; background: {{ primaryColor }}; color: white;">
  <div class="cover-content" style="text-align: center; max-width: 80%;">
    <h1 class="cover-title" style="font-size: 48pt; font-weight: 700; margin-bottom: 0.5em;">{{ title }}</h1>
    {{#if subtitle}}<p class="cover-subtitle" style="font-size: 24pt; margin-bottom: 2em;">{{ subtitle }}</p>{{/if}}
    <div class="cover-meta" style="font-size: 14pt;">
      <p class="cover-authors" style="margin-bottom: 0.5em;">{{ authors }}</p>
      {{#if organization}}<p class="cover-org" style="margin-bottom: 0.5em;">{{ organization }}</p>{{/if}}
      <p class="cover-version">Version {{ version }}</p>
    </div>
  </div>
</div>
{{/inline }}

{{#* inline "header" }}
<header class="whitepaper-header" style="padding: 0.5em 0; border-bottom: 2px solid {{ primaryColor }}; margin-bottom: 1em;">
  <div class="logo" style="font-weight: bold; font-size: 12pt;">{{ organization }}</div>
</header>
{{/inline }}

{{#* inline "section-header" }}
<div class="whitepaper-section-header" style="margin-top: 2em; margin-bottom: 1em; border-left: 4px solid {{ primaryColor }}; padding-left: 0.5em;">
  <h{{ level }} style="color: {{ primaryColor }}; font-weight: 600; margin: 0; font-size: {{multiply level 4}}pt;">{{ title }}</h{{ level }}>
</div>
{{/inline }}

{{#* inline "footer" }}
<footer class="whitepaper-footer" style="border-top: 1px solid #ccc; padding-top: 0.5em; margin-top: 2em; font-size: 9pt; color: #666;">
  <div class="page-number" style="text-align: center;">Page {{page}} of {{pages}}</div>
</footer>
{{/inline }}

{{#* inline "highlight-box" }}
<div class="highlight-box" style="background: {{ highlightColor }}; padding: 1em; border-radius: 4px; margin: 1em 0;">
  <strong>{{ title }}</strong>
  <p style="margin: 0.5em 0 0 0;">{{ content }}</p>
</div>
{{/inline }}
`;

export const getWhitepaperTemplate = (): string => whitepaperTemplate;

export const whitepaperTemplateName = 'whitepaper';

Handlebars.registerHelper('multiply', (a: number, b: number) => (a || 1) * b);
