export function parseCommandLine(input: string): { command: string; args: string[] } | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) return null;
  const parts = trimmed.slice(1).split(/\s+/);
  const command = parts.shift() || '';
  return { command: command.toLowerCase(), args: parts };
}
