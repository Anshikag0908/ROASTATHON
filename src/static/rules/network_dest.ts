import type { StaticRule, StaticRuleContext } from '../types.js';
import type { Finding } from '../../core/types.js';

// Matches IPv4 addresses (excluding 127.0.0.1 and 0.0.0.0)
const IP_REGEX = /\b(?!127\.0\.0\.1|0\.0\.0\.0)(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/;

// Matches http/https/ws/wss URLs
const URL_REGEX = /https?:\/\/[a-zA-Z0-9.-]+(?::[0-9]+)?(?:\/[^\s'"`,]*)?/g;

const SAFE_DOMAINS = new Set([
  'localhost',
  '127.0.0.1',
  'json-schema.org',
  'w3.org',
  'github.com',
  'registry.npmjs.org',
  'schemas.microsoft.com',
]);

export const networkDestRule: StaticRule = {
  id: 'STATIC-NETWORK-DEST-001',
  family: 'NETWORK-DEST',
  name: 'Non-Allowlisted Remote Destination',
  severity: 'medium',
  confidence: 'medium',
  description: 'Flags hardcoded IP addresses or outbound network connection URLs in package code.',
  falsePositiveNotes: 'API clients for legitimate services (e.g., Slack, GitHub API) include external URLs.',
  check: (ctx: StaticRuleContext): Finding[] => {
    const findings: Finding[] = [];
    const allowlist = new Set((ctx.networkAllowlist || []).map((h) => h.toLowerCase()));

    for (let i = 0; i < ctx.lines.length; i++) {
      const line = ctx.lines[i];

      // 1. IP check
      const ipMatch = line.match(IP_REGEX);
      if (ipMatch) {
        const ip = ipMatch[0];
        if (!allowlist.has(ip)) {
          findings.push({
            id: 'STATIC-NETWORK-DEST-001',
            source: 'static',
            severity: 'medium',
            rule: 'NETWORK-DEST',
            title: `Hardcoded IP address detected: ${ip}`,
            description: `File references external direct IP address ${ip}.`,
            evidence: {
              file: ctx.relativePath,
              line: i + 1,
              snippet: line.trim().slice(0, 150),
            },
            confidence: 'high',
          });
          continue;
        }
      }

      // 2. URL check
      const urlMatches = line.match(URL_REGEX);
      if (urlMatches) {
        for (const u of urlMatches) {
          try {
            const parsed = new URL(u);
            const host = parsed.hostname.toLowerCase();
            if (host === 'sink' || host === 'sink.invalid') continue; // Test sink is permitted
            if (SAFE_DOMAINS.has(host) || allowlist.has(host)) continue;

            findings.push({
              id: 'STATIC-NETWORK-DEST-001',
              source: 'static',
              severity: 'medium',
              rule: 'NETWORK-DEST',
              title: `External network URL detected: ${host}`,
              description: `File contains external network destination URL: ${u}`,
              evidence: {
                file: ctx.relativePath,
                line: i + 1,
                snippet: line.trim().slice(0, 150),
              },
              confidence: 'medium',
            });
            break;
          } catch {
            // Ignore malformed URL matches
          }
        }
      }
    }

    return findings;
  },
};
