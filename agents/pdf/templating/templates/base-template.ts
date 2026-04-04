export const baseTemplate = `
<!DOCTYPE html>
<html>
<head>
  <title>{{ title }}</title>
  <style>
    body {
      font-family: {{ fontFamily }};
      font-size: {{ fontSize }}pt;
      line-height: {{ lineHeight }};
      color: {{ textColor }};
      margin: {{ marginTop }}in {{ marginRight }}in {{ marginBottom }}in {{ marginLeft }}in;
    }
    .page-break { page-break-after: always; }
    .no-break { page-break-inside: avoid; }
    .section {
      margin-bottom: 1em;
    }
    .section-title {
      font-weight: 600;
      margin-bottom: 0.5em;
    }
    .section-content {
      margin-left: 0;
    }
  </style>
</head>
<body>
  {{> header }}
  {{> content }}
  {{> footer }}
</body>
</html>
`;

export const getBaseTemplate = (): string => baseTemplate;

export interface BaseTemplateData {
  title: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  textColor: string;
  marginTop: string;
  marginRight: string;
  marginBottom: string;
  marginLeft: string;
}

export const baseTemplateName = 'base';
