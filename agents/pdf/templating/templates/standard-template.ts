import { baseTemplate } from './base-template';

export const standardTemplate = `
${baseTemplate}

{{#* inline "header" }}
<header class="standard-header" style="border-bottom: 1px solid #333; padding-bottom: 0.5em; margin-bottom: 1em;">
  <div class="logo" style="font-weight: bold; font-size: 14pt;">{{ organization }}</div>
  <div class="document-info" style="font-size: 10pt; color: #666;">{{ title }}</div>
</header>
{{/inline }}

{{#* inline "footer" }}
<footer class="standard-footer" style="border-top: 1px solid #333; padding-top: 0.5em; margin-top: 1em; font-size: 9pt; color: #666;">
  <div class="page-number" style="float: left;">Page {{page}} of {{pages}}</div>
  <div class="date" style="float: right;">{{ date }}</div>
  <div style="clear: both;"></div>
</footer>
{{/inline }}

{{#* inline "section-header" }}
<div class="section-header" style="margin-top: 1.5em; margin-bottom: 0.5em;">
  <h{{ level }} style="color: #333; font-weight: 600; margin: 0;">{{ title }}</h{{ level }}>
</div>
{{/inline }}

{{#* inline "paragraph" }}
<p class="paragraph" style="margin: 0 0 0.5em 0; text-align: {{ textAlign }};">{{ content }}</p>
{{/inline }}
`;

export const getStandardTemplate = (): string => standardTemplate;

export const standardTemplateName = 'standard';
