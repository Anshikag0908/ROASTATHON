/**
 * Sanitizes untrusted content (package names, tool descriptions, file snippets, error messages)
 * before rendering in the terminal or logs. Strips ANSI escape codes, terminal control characters,
 * and dangerous unicode direction overrides.
 */

// Matches ANSI escape sequences
const ANSI_REGEX = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

// Matches control characters except newline and tab
const CONTROL_CHARS_REGEX = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u200B-\u200D\uFEFF\u202A-\u202E]/g;

export function sanitizeText(input: string, maxLen = 500): string {
  if (typeof input !== 'string') {
    return '';
  }
  let cleaned = input.replace(ANSI_REGEX, '').replace(CONTROL_CHARS_REGEX, '');
  if (cleaned.length > maxLen) {
    cleaned = cleaned.slice(0, maxLen) + '... [truncated]';
  }
  return cleaned;
}
