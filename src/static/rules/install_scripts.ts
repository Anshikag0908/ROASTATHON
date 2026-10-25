import type { StaticRule, StaticRuleContext } from '../types.js';
import type { Finding } from '../../core/types.js';

const REMOTE_EXEC_PATTERN = /\b(?:curl|wget|fetch|powershell|bash|sh|cmd\.exe|http:|https:)\b/i;

export const installScriptsRule: StaticRule = {
  id: 'STATIC-INSTALL-SCRIPT-001',
  family: 'INSTALL-SCRIPT',
  name: 'Suspicious Package Install Script',
  severity: 'high',
  confidence: 'high',
  description: 'Flags packages containing preinstall, install, or postinstall lifecycle scripts.',
  falsePositiveNotes: 'Native packages using node-gyp or build steps commonly use install scripts.',
  check: (ctx: StaticRuleContext): Finding[] => {
    const findings: Finding[] = [];
    if (!ctx.manifest || !ctx.manifest.lifecycleScripts || ctx.manifest.lifecycleScripts.length === 0) {
      return findings;
    }

    // Only emit findings when inspecting package.json or root manifest
    if (!ctx.relativePath.endsWith('package.json')) {
      return findings;
    }

    for (const script of ctx.manifest.lifecycleScripts) {
      const isRemoteOrShell = REMOTE_EXEC_PATTERN.test(script.command);
      const severity = isRemoteOrShell ? 'high' : 'medium';

      findings.push({
        id: 'STATIC-INSTALL-SCRIPT-001',
        source: 'static',
        severity,
        rule: 'INSTALL-SCRIPT',
        title: `Lifecycle script detected: ${script.name}`,
        description: `Package manifest defines a '${script.name}' script: "${script.command}". ${
          isRemoteOrShell ? 'Script invokes shell or network commands (high severity).' : ''
        }`,
        evidence: {
          file: ctx.relativePath,
          snippet: `"${script.name}": "${script.command}"`,
        },
        confidence: 'high',
      });
    }

    return findings;
  },
};
