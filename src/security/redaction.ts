export interface RedactionResult {
  redactedText: string;
  redactions: Array<{ type: string; count: number }>;
}

export function redactText(text: string): string {
  return redactTextStructured(text).redactedText;
}

export function redactTextStructured(text: string): RedactionResult {
  if (!text) return { redactedText: text, redactions: [] };

  const patterns = [
    { type: 'email', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g },
    { type: 'phone', regex: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g },
    { type: 'ssn', regex: /\b\d{3}-\d{2}-\d{4}\b/g },
    { type: 'credit_card', regex: /\b(?:4[0-9]{12}(?:[0-9]{3})?|[25][1-7][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})\b/g },
    { type: 'aws_key', regex: /\b(?:AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}\b/g },
    { type: 'jwt', regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g }
  ];

  let redactedText = text;
  const redactions: Array<{ type: string; count: number }> = [];

  for (const { type, regex } of patterns) {
    const matches = redactedText.match(regex);
    if (matches && matches.length > 0) {
      redactions.push({ type, count: matches.length });
      redactedText = redactedText.replace(regex, `[REDACTED_${type.toUpperCase()}]`);
    }
  }

  return {
    redactedText,
    redactions
  };
}