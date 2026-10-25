import type { StaticRule, StaticRuleContext } from '../types.js';
import type { Finding } from '../../core/types.js';

const ENUM_ENV_PATTERN = /Object\.(?:keys|entries|values)\s*\(\s*process\.env\s*\)|JSON\.stringify\s*\(\s*process\.env\s*\)/;
const SENSITIVE_ENV_VARS = /process\.env\[?['"`](?:AWS_SECRET_ACCESS_KEY|AWS_SESSION_TOKEN|GITHUB_TOKEN|PRIVATE_KEY|PASSWORD|SECRET_KEY)['"`]?\]?/i;

export const envHarvestRule: StaticRule = {
  id: 'STATIC-ENV-HARVEST-001',
  family: 'ENV-HARVEST',
  name: 'Environment Variable Harvesting',
  severity: 'medium',
  confidence: 'high',
  description: 'Flags bulk enumeration of process.env or access to credential-named environment variables.',
  falsePositiveNotes: 'Debug loggers or config dump utilities sometimes serialize process.env.',
  check: (ctx: StaticRuleContext): Finding[] => {
    const findings: Finding[] = [];

    for (let i = 0; i < ctx.lines.length; i++) {
      const line = ctx.lines[i];

      if (ENUM_ENV_PATTERN.test(line)) {
        findings.push({
          id: 'STATIC-ENV-HARVEST-001',
          source: 'static',
          severity: 'medium',
          rule: 'ENV-HARVEST',
          title: 'Bulk enumeration of environment variables',
          description: 'Code enumerates or serializes process.env wholesale, commonly used for credential harvesting.',
          evidence: {
            file: ctx.relativePath,
            line: i + 1,
            snippet: line.trim().slice(0, 150),
          },
          confidence: 'high',
        });
        break;
      }

      if (SENSITIVE_ENV_VARS.test(line)) {
        findings.push({
          id: 'STATIC-ENV-HARVEST-001',
          source: 'static',
          severity: 'medium',
          rule: 'ENV-HARVEST',
          title: 'Access to sensitive credential environment variable',
          description: 'Code accesses sensitive credential environment variable (e.g., AWS_SECRET_ACCESS_KEY, GITHUB_TOKEN).',
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
