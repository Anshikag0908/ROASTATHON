import type { StaticRule, StaticRuleContext } from '../types.js';
import type { Finding } from '../../core/types.js';

const CHILD_PROCESS_PATTERN = /\b(?:child_process|execSync|spawnSync|execFile)\b|\b(?:exec|spawn)\s*\(/;

export const execRule: StaticRule = {
  id: 'STATIC-EXEC-001',
  family: 'EXEC',
  name: 'Process Execution and Shelling Out',
  severity: 'medium',
  confidence: 'high',
  description: 'Flags usage of child_process, exec, or spawn to run system commands.',
  falsePositiveNotes: 'Legitimate CLI wrappers or build automation tools routinely spawn child processes.',
  check: (ctx: StaticRuleContext): Finding[] => {
    const findings: Finding[] = [];

    for (let i = 0; i < ctx.lines.length; i++) {
      const line = ctx.lines[i];
      if (CHILD_PROCESS_PATTERN.test(line)) {
        findings.push({
          id: 'STATIC-EXEC-001',
          source: 'static',
          severity: 'medium',
          rule: 'EXEC',
          title: 'Child process execution detected',
          description: 'Code invokes child_process, exec, or spawn to execute system binaries or shell commands.',
          evidence: {
            file: ctx.relativePath,
            line: i + 1,
            snippet: line.trim().slice(0, 150),
          },
          confidence: 'high',
        });
        break; // One finding per file is sufficient
      }
    }

    return findings;
  },
};
