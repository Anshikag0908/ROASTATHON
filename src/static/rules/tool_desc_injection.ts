import type { StaticRule, StaticRuleContext } from '../types.js';
import type { Finding } from '../../core/types.js';

const INJECTION_PATTERNS = [
  { pattern: /ignore\s+(?:all\s+)?previous\s+instructions/i, name: 'Ignore Previous Instructions' },
  { pattern: /system\s+(?:override|instruction|prompt):/i, name: 'System Override / Instruction Prefix' },
  { pattern: /do\s+not\s+tell\s+(?:the\s+)?user/i, name: 'Instruction Concealment ("Do not tell the user")' },
  { pattern: /(?:read|steal|send)\s+(?:~?[/\\]|\.aws|\.ssh|\.env)/i, name: 'Imperative Secret Exfiltration Directive' },
  { pattern: /exfiltrate\s+to\s+https?:/i, name: 'Exfiltrate to URL Instruction' },
];

const HIDDEN_UNICODE_PATTERN = /[\u200B-\u200D\uFEFF]|[\u{E0000}-\u{E007F}]/u;

export function inspectToolDescription(
  toolName: string,
  description: string,
  sourceLocation: string
): Finding[] {
  const findings: Finding[] = [];
  if (!description || typeof description !== 'string') return findings;

  // 1. Prompt injection patterns
  for (const { pattern, name } of INJECTION_PATTERNS) {
    if (pattern.test(description)) {
      findings.push({
        id: 'STATIC-TOOL-DESC-INJECTION-001',
        source: 'static',
        severity: 'high',
        rule: 'TOOL-DESC-INJECTION',
        title: `Prompt injection pattern in tool description: ${name}`,
        description: `Tool '${toolName}' contains suspicious instruction pattern "${name}" aimed at manipulating host LLMs.`,
        evidence: {
          file: sourceLocation,
          snippet: description.slice(0, 200),
        },
        confidence: 'high',
      });
      break;
    }
  }

  // 2. Hidden Unicode / Zero-width characters
  if (HIDDEN_UNICODE_PATTERN.test(description)) {
    findings.push({
      id: 'STATIC-TOOL-DESC-INJECTION-002',
      source: 'static',
      severity: 'high',
      rule: 'TOOL-DESC-INJECTION',
      title: 'Hidden or zero-width unicode characters in tool description',
      description: `Tool '${toolName}' contains concealed zero-width or unicode tag characters commonly used in stealth prompt injection.`,
      evidence: {
        file: sourceLocation,
        snippet: 'Zero-width or invisible unicode bytes detected in text.',
      },
      confidence: 'high',
    });
  }

  return findings;
}

export const toolDescInjectionRule: StaticRule = {
  id: 'STATIC-TOOL-DESC-INJECTION-001',
  family: 'TOOL-DESC-INJECTION',
  name: 'Tool Description Prompt Injection',
  severity: 'high',
  confidence: 'high',
  description: 'Flags prompt injection patterns, hidden unicode, or imperative directives in tool descriptions.',
  falsePositiveNotes: 'Security documentation or prompt engineering servers may mention prompt injection terms.',
  check: (ctx: StaticRuleContext): Finding[] => {
    const findings: Finding[] = [];

    // 1. Check whole file for prompt injection patterns in code
    for (const { pattern, name } of INJECTION_PATTERNS) {
      if (pattern.test(ctx.content)) {
        // Find line number
        let matchedLine = 1;
        for (let i = 0; i < ctx.lines.length; i++) {
          if (pattern.test(ctx.lines[i])) {
            matchedLine = i + 1;
            break;
          }
        }

        findings.push({
          id: 'STATIC-TOOL-DESC-INJECTION-001',
          source: 'static',
          severity: 'high',
          rule: 'TOOL-DESC-INJECTION',
          title: `Prompt injection pattern in code description: ${name}`,
          description: `Code contains suspicious prompt injection directive "${name}".`,
          evidence: {
            file: ctx.relativePath,
            line: matchedLine,
            snippet: ctx.lines[matchedLine - 1]?.trim().slice(0, 150) || name,
          },
          confidence: 'high',
        });
        break;
      }
    }

    return findings;
  },
};
