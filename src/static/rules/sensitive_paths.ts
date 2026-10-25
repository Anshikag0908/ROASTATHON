import type { StaticRule, StaticRuleContext } from '../types.js';
import type { Finding } from '../../core/types.js';

const SENSITIVE_PATH_PATTERNS = [
  { pattern: /(['"`])(?:\.aws[/\\]credentials|\.aws[/\\]config)\1/i, name: 'AWS Credentials/Config' },
  { pattern: /(['"`])(?:\.ssh[/\\]id_rsa|\.ssh[/\\]id_ed25519|\.ssh[/\\]known_hosts)\1/i, name: 'SSH Key' },
  { pattern: /(['"`])\.env(?:\.local|\.prod|\.production)?\1/i, name: 'Dotenv Secrets File' },
  { pattern: /(['"`])\.npmrc\1/i, name: 'NPM Registry Config' },
  { pattern: /(['"`])(?:\.kube[/\\]config|gcloud)\1/i, name: 'Cloud/Cluster Config' },
  { pattern: /(?:solana|metamask|keychain|wallet\.dat)/i, name: 'Crypto Wallet / Keychain' },
];

const NETWORK_PATTERNS = /\b(?:fetch|https?\.request|axios|net\.connect|got|superagent)\b/;

export const sensitivePathsRule: StaticRule = {
  id: 'STATIC-SENSITIVE-PATH-001',
  family: 'SENSITIVE-PATH',
  name: 'Sensitive Credential Path Access',
  severity: 'medium',
  confidence: 'high',
  description: 'Flags references to local sensitive files such as SSH keys, cloud credentials, or .env files.',
  falsePositiveNotes: 'Legitimate dev tools or cloud management CLI tools may legitimately read configuration.',
  check: (ctx: StaticRuleContext): Finding[] => {
    const findings: Finding[] = [];
    const hasNetwork = NETWORK_PATTERNS.test(ctx.content);

    for (let i = 0; i < ctx.lines.length; i++) {
      const line = ctx.lines[i];
      for (const { pattern, name } of SENSITIVE_PATH_PATTERNS) {
        if (pattern.test(line)) {
          const severity = hasNetwork ? 'high' : 'medium';
          findings.push({
            id: 'STATIC-SENSITIVE-PATH-001',
            source: 'static',
            severity,
            rule: 'SENSITIVE-PATH',
            title: `Reference to sensitive credential path: ${name}`,
            description: `File references sensitive path (${name}). ${hasNetwork ? 'File also contains network requests (raised to high severity).' : ''}`,
            evidence: {
              file: ctx.relativePath,
              line: i + 1,
              snippet: line.trim().slice(0, 150),
            },
            confidence: 'high',
          });
          break; // Avoid duplicating findings per line
        }
      }
    }

    return findings;
  },
};
