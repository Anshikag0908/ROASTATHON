import path from 'node:path';
import fs from 'node:fs/promises';
import type { Finding } from '../core/types.js';
import type { ManifestSummary } from '../fetch/types.js';
import type { StaticRule, StaticRuleContext } from './types.js';
import { sensitivePathsRule } from './rules/sensitive_paths.js';
import { installScriptsRule } from './rules/install_scripts.js';
import { networkDestRule } from './rules/network_dest.js';
import { execRule } from './rules/exec.js';
import { obfuscationRule } from './rules/obfuscation.js';
import { envHarvestRule } from './rules/env_harvest.js';
import { toolDescInjectionRule, inspectToolDescription } from './rules/tool_desc_injection.js';

export const ALL_RULES: StaticRule[] = [
  sensitivePathsRule,
  installScriptsRule,
  networkDestRule,
  execRule,
  obfuscationRule,
  envHarvestRule,
  toolDescInjectionRule,
];

const SCAN_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.jsx', '.tsx', '.json', '.sh']);
const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.tmp']);

export class StaticChecker {
  private rules: StaticRule[];

  constructor(rules: StaticRule[] = ALL_RULES) {
    this.rules = rules;
  }

  public async scanDirectory(
    dirPath: string,
    manifest?: ManifestSummary,
    networkAllowlist: string[] = []
  ): Promise<Finding[]> {
    const findings: Finding[] = [];
    const files = await this.collectFiles(dirPath);

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const lines = content.split('\n');
        const relativePath = path.relative(dirPath, file).replace(/\\/g, '/');

        const ctx: StaticRuleContext = {
          filePath: file,
          relativePath,
          content,
          lines,
          manifest,
          networkAllowlist,
        };

        for (const rule of this.rules) {
          const ruleFindings = rule.check(ctx);
          findings.push(...ruleFindings);
        }
      } catch {
        // Skip binary or unreadable files
      }
    }

    return findings;
  }

  public inspectLiveTools(
    tools: Array<{ name: string; description?: string }>,
    source = 'live-mcp-harness'
  ): Finding[] {
    const findings: Finding[] = [];
    for (const tool of tools) {
      if (tool.description) {
        const descFindings = inspectToolDescription(tool.name, tool.description, `${source}::${tool.name}`);
        findings.push(...descFindings);
      }
    }
    return findings;
  }

  private async collectFiles(dir: string): Promise<string[]> {
    const results: string[] = [];

    const recurse = async (current: string) => {
      let entries: any[] = [];
      try {
        entries = await fs.readdir(current, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (!IGNORED_DIRS.has(entry.name)) {
            await recurse(path.join(current, entry.name));
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (SCAN_EXTENSIONS.has(ext)) {
            results.push(path.join(current, entry.name));
          }
        }
      }
    };

    await recurse(dir);
    return results;
  }
}
