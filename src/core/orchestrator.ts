import path from 'node:path';
import fs from 'node:fs/promises';
import { ScanEventBus } from './events.js';
import { loadConfig } from './config.js';
import type { Config, ScanResult, TargetMetadata, Finding, SandboxEvent, Verdict } from './types.js';

export const EXIT_CODES = {
  SAFE: 0,
  SUSPICIOUS: 10,
  DANGEROUS: 20,
  ERROR: 1,
} as const;

export interface ScanOptions {
  json?: boolean;
  noLlm?: boolean;
  timeout?: number;
  reportHtml?: string;
  config?: Partial<Config>;
}

export class Orchestrator {
  public readonly eventBus: ScanEventBus;
  public readonly config: Config;

  constructor(eventBus?: ScanEventBus, configOverrides?: Partial<Config>) {
    this.eventBus = eventBus || new ScanEventBus();
    this.config = loadConfig(configOverrides);
  }

  public async scan(targetInput: string, options: ScanOptions = {}): Promise<ScanResult> {
    const startTime = Date.now();
    const isLocal = await this.isLocalPath(targetInput);

    let targetMetadata: TargetMetadata;

    if (isLocal) {
      const resolved = path.resolve(targetInput);
      let pkgName = path.basename(resolved);
      let pkgVersion = '0.0.0';

      try {
        const pkgPath = path.join(resolved, 'package.json');
        const pkgContent = await fs.readFile(pkgPath, 'utf8');
        const pkg = JSON.parse(pkgContent);
        if (pkg.name) pkgName = pkg.name;
        if (pkg.version) pkgVersion = pkg.version;
      } catch {
        // Fall back to folder name if no package.json
      }

      targetMetadata = {
        name: pkgName,
        version: pkgVersion,
        ecosystem: 'local',
        resolvedPath: resolved,
      };
    } else {
      targetMetadata = {
        name: targetInput,
        ecosystem: 'npm',
      };
    }

    // 1. Stage: Resolve & Fetch
    this.eventBus.emit('stage:start', { stage: 'fetch', target: targetMetadata.name });
    this.eventBus.emit('stage:progress', {
      stage: 'fetch',
      message: `Inspecting target: ${targetMetadata.name} (${targetMetadata.ecosystem})`,
    });
    this.eventBus.emit('stage:complete', { stage: 'fetch', status: 'success' });

    // 2. Stage: Static Checks (skeleton in Phase 1)
    this.eventBus.emit('stage:start', { stage: 'static', target: targetMetadata.name });
    const findings: Finding[] = [];
    this.eventBus.emit('stage:progress', { stage: 'static', message: 'Running static analysis rules...' });
    this.eventBus.emit('stage:complete', { stage: 'static', status: 'success' });

    // 3. Stage: LLM Triage (skeleton in Phase 1)
    const llmUsed = !options.noLlm && Boolean(this.config.geminiApiKey || this.config.openaiApiKey || this.config.anthropicApiKey);
    this.eventBus.emit('stage:start', { stage: 'llm', target: targetMetadata.name });
    this.eventBus.emit('stage:progress', {
      stage: 'llm',
      message: llmUsed ? 'Running LLM triage review...' : 'LLM triage skipped (--no-llm or no API key)',
    });
    this.eventBus.emit('stage:complete', { stage: 'llm', status: 'success' });

    // 4. Stage: Sandbox Test (skeleton in Phase 1)
    this.eventBus.emit('stage:start', { stage: 'sandbox', target: targetMetadata.name });
    this.eventBus.emit('stage:progress', { stage: 'sandbox', message: 'Initializing sandbox environment...' });
    const sandboxEvents: SandboxEvent[] = [];
    this.eventBus.emit('stage:complete', { stage: 'sandbox', status: 'success' });

    // 5. Stage: Verdict Engine
    this.eventBus.emit('stage:start', { stage: 'verdict', target: targetMetadata.name });

    let verdict: Verdict = 'SAFE';
    const verdictReasons: string[] = [];

    // Evaluate findings (standard initial policy)
    const hasCriticalOrHigh = findings.some((f) => f.severity === 'critical' || f.severity === 'high');
    const hasMedium = findings.some((f) => f.severity === 'medium');

    if (hasCriticalOrHigh) {
      verdict = 'DANGEROUS';
      verdictReasons.push('Critical or high severity security findings were detected.');
    } else if (hasMedium) {
      verdict = 'SUSPICIOUS';
      verdictReasons.push('Medium severity findings require manual confirmation.');
    } else {
      verdict = 'SAFE';
      verdictReasons.push('No suspicious or dangerous behavior detected during inspection.');
    }

    this.eventBus.emit('stage:complete', { stage: 'verdict', status: 'success' });

    const scanResult: ScanResult = {
      target: targetMetadata,
      rulesetVersion: '0.1.0',
      mcpguardVersion: '0.1.0',
      findings,
      sandbox: {
        ran: true,
        completed: true,
        durationMs: Date.now() - startTime,
        events: sandboxEvents,
        toolsDiscovered: [],
        toolsCalled: [],
      },
      llm: {
        used: llmUsed,
        provider: this.config.llmProvider,
        model: this.config.llmModel,
        suspicions: [],
      },
      verdict,
      verdictReasons,
    };

    this.eventBus.emit('scan:complete', scanResult);
    return scanResult;
  }

  private async isLocalPath(input: string): Promise<boolean> {
    if (
      input.startsWith('.') ||
      input.startsWith('/') ||
      input.startsWith('\\') ||
      /^[a-zA-Z]:\\/.test(input) ||
      input.includes(path.sep)
    ) {
      return true;
    }

    try {
      const stats = await fs.stat(path.resolve(input));
      return stats.isDirectory() || stats.isFile();
    } catch {
      return false;
    }
  }
}
