import type { StaticRule, StaticRuleContext } from '../types.js';
import type { Finding } from '../../core/types.js';

const EVAL_PATTERN = /\b(?:eval\s*\(|new\s+Function\s*\()/;
const HEX_ESCAPE_CLUSTER = /(?:\\x[0-9a-fA-F]{2}){4,}/;
const BASE64_EXEC_PATTERN = /Buffer\.from\([^)]+,\s*['"]base64['"]\)\s*\.\s*toString\([^)]*\)\s*[,;)]?.*(?:eval|Function|exec)/s;

export const obfuscationRule: StaticRule = {
  id: 'STATIC-OBFUSCATION-001',
  family: 'OBFUSCATION',
  name: 'Code Obfuscation or Dynamic Evaluation',
  severity: 'high',
  confidence: 'high',
  description: 'Flags dynamic eval, new Function, clustered hex escapes, or decoded payloads fed to execution.',
  falsePositiveNotes: 'Bundlers or template engines occasionally use new Function for code generation.',
  check: (ctx: StaticRuleContext): Finding[] => {
    const findings: Finding[] = [];

    // Whole-file pattern
    if (BASE64_EXEC_PATTERN.test(ctx.content)) {
      findings.push({
        id: 'STATIC-OBFUSCATION-001',
        source: 'static',
        severity: 'high',
        rule: 'OBFUSCATION',
        title: 'Base64 decoded string fed to execution function',
        description: 'File decodes base64 string and passes it into eval, Function, or process execution.',
        evidence: {
          file: ctx.relativePath,
          snippet: 'Buffer.from(..., "base64").toString() -> execution',
        },
        confidence: 'high',
      });
      return findings;
    }

    for (let i = 0; i < ctx.lines.length; i++) {
      const line = ctx.lines[i];

      if (EVAL_PATTERN.test(line)) {
        findings.push({
          id: 'STATIC-OBFUSCATION-001',
          source: 'static',
          severity: 'high',
          rule: 'OBFUSCATION',
          title: 'Dynamic code execution via eval or new Function',
          description: 'File uses eval() or new Function() to execute arbitrary string code dynamically.',
          evidence: {
            file: ctx.relativePath,
            line: i + 1,
            snippet: line.trim().slice(0, 150),
          },
          confidence: 'high',
        });
        break;
      }

      if (HEX_ESCAPE_CLUSTER.test(line)) {
        findings.push({
          id: 'STATIC-OBFUSCATION-001',
          source: 'static',
          severity: 'medium',
          rule: 'OBFUSCATION',
          title: 'Dense hex escape sequences detected',
          description: 'File contains clustered hexadecimal escape sequences commonly used to conceal strings.',
          evidence: {
            file: ctx.relativePath,
            line: i + 1,
            snippet: line.trim().slice(0, 150),
          },
          confidence: 'medium',
        });
        break;
      }
    }

    return findings;
  },
};
