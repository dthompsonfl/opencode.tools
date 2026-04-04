import { baseTemplate } from './base-template';

export const technicalTemplate = `
${baseTemplate}

{{#* inline "header" }}
<header class="tech-header" style="background: #1e1e1e; color: #fff; padding: 0.5em 1em; margin: -1in -1in 1em -1in;">
  <div class="tech-nav" style="display: flex; justify-content: space-between; align-items: center;">
    <span class="tech-title" style="font-weight: 600;">{{ title }}</span>
    <span class="tech-version" style="font-size: 10pt; color: #aaa;">v{{ version }}</span>
  </div>
  {{#if breadcrumb}}<div class="tech-breadcrumb" style="font-size: 9pt; color: #888; margin-top: 0.25em;">{{ breadcrumb }}</div>{{/if}}
</header>
{{/inline }}

{{#* inline "code-block" }}
<pre class="code-block" style="background: #1e1e1e; color: #d4d4d4; padding: 1em; border-radius: 4px; overflow-x: auto; margin: 1em 0; font-family: 'Consolas', 'Monaco', monospace; font-size: 10pt;" data-language="{{ language }}"><code>{{ content }}</code></pre>
{{/inline }}

{{#* inline "note" }}
<div class="tech-note" style="border-left: 3px solid {{ accentColor }}; padding-left: 1em; margin: 1em 0; background: #f9f9f9;">
  <strong style="color: {{ accentColor }};">{{ type }}:</strong> {{ content }}
</div>
{{/inline }}

{{#* inline "warning" }}
<div class="tech-warning" style="border-left: 3px solid #ff6600; padding-left: 1em; margin: 1em 0; background: #fff9f0;">
  <strong style="color: #ff6600;">⚠️ Warning:</strong> {{ content }}
</div>
{{/inline }}

{{#* inline "tip" }}
<div class="tech-tip" style="border-left: 3px solid #00aa00; padding-left: 1em; margin: 1em 0; background: #f0fff0;">
  <strong style="color: #00aa00;">💡 Tip:</strong> {{ content }}
</div>
{{/inline }}

{{#* inline "footer" }}
<footer class="tech-footer" style="background: #1e1e1e; color: #888; padding: 0.5em 1em; margin: 1em -1in -1in -1in; font-size: 9pt;">
  <div style="display: flex; justify-content: space-between;">
    <span>{{ title }} v{{ version }}</span>
    <span>Page {{page}} of {{pages}}</span>
  </div>
</footer>
{{/inline }}

{{#* inline "api-endpoint" }}
<div class="api-endpoint" style="background: #f5f5f5; padding: 1em; border-radius: 4px; margin: 1em 0; font-family: monospace;">
  <div style="margin-bottom: 0.5em;">
    <span style="background: {{ methodColor }}; color: white; padding: 0.2em 0.5em; border-radius: 2px; font-size: 10pt;">{{ method }}</span>
    <span style="margin-left: 0.5em;">{{ path }}</span>
  </div>
  {{#if description}}<p style="margin: 0.5em 0 0 0; color: #666;">{{ description }}</p>{{/if}}
</div>
{{/inline }}
`;

export const getTechnicalTemplate = (): string => technicalTemplate;

export const technicalTemplateName = 'technical';
