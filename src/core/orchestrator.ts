import path from 'node:path';
import fs from 'node:fs/promises';
import { ScanEventBus } from './events.js';
import { loadConfig } from './config.js';
import type { Config, ScanResult, TargetMetadata, Finding, SandboxEvent, Verdict } from './types.js';

import { PackageFetcher } from '../fetch/fetcher.js';
import type { FetchedPackage } from '../fetch/types.js';

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
  keepExtracted?: boolean;
}

export class Orchestrator {
  public readonly eventBus: ScanEventBus;
  public readonly config: Config;
  private readonly fetcher: PackageFetcher;

  constructor(eventBus?: ScanEventBus, configOverrides?: Partial<Config>) {
    this.eventBus = eventBus || new ScanEventBus();
    this.config = loadConfig(configOverrides);
    this.fetcher = new PackageFetcher();
  }

  public async scan(targetInput: string, options: ScanOptions = {}): Promise<ScanResult> {
    const startTime = Date.now();

    // 1. Stage: Resolve & Fetch
    this.eventBus.emit('stage:start', { stage: 'fetch', target: targetInput });
    this.eventBus.emit('stage:progress', {
      stage: 'fetch',
      message: `Fetching & inspecting target: ${targetInput}`,
    });

    let fetched: FetchedPackage;
    try {
      fetched = await this.fetcher.fetchAndInspect(targetInput);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.eventBus.emit('stage:complete', { stage: 'fetch', status: 'error', message: msg });
      throw err;
    }

    const targetMetadata: TargetMetadata = fetched.target;

    this.eventBus.emit('stage:progress', {
      stage: 'fetch',
      message: `Resolved: ${targetMetadata.name}@${targetMetadata.version || '0.0.0'} (${targetMetadata.ecosystem})`,
    });

    if (fetched.manifest.lifecycleScripts.length > 0) {
      this.eventBus.emit('stage:progress', {
        stage: 'fetch',
        message: `Found ${fetched.manifest.lifecycleScripts.length} lifecycle script(s): ${fetched.manifest.lifecycleScripts.map((s) => s.name).join(', ')}`,
      });
    }

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

    // 4. Stage: Sandbox Test
    this.eventBus.emit('stage:start', { stage: 'sandbox', target: targetMetadata.name });
    this.eventBus.emit('stage:progress', {
      stage: 'sandbox',
      message: 'Starting isolated sandbox, planting canaries & monitoring traffic...',
    });

    const sandboxRunner = new (await import('../sandbox/runner.js')).SandboxRunner();
    let entryFile = fetched.manifest.main || 'index.js';
    if (typeof fetched.manifest.bin === 'string') {
      entryFile = fetched.manifest.bin;
    } else if (fetched.manifest.bin && typeof fetched.manifest.bin === 'object') {
      const firstBin = Object.values(fetched.manifest.bin)[0];
      if (typeof firstBin === 'string') entryFile = firstBin;
    }

    const sandboxSummary = await sandboxRunner.run(fetched.extractedDir, entryFile, {
      sandboxTimeoutMs: options.timeout || this.config.sandboxTimeoutMs,
      toolTimeoutMs: this.config.toolTimeoutMs,
      networkAllowlist: this.config.networkAllowlist,
    });

    for (const event of sandboxSummary.events) {
      this.eventBus.emit('sandbox:event', event);
      if (event.kind === 'canary_in_payload') {
        this.eventBus.emit('stage:progress', {
          stage: 'sandbox',
          message: 'CRITICAL: Planted canary secret matched in outbound network traffic!',
          detail: event.detail,
        });
      } else if (event.kind === 'canary_file_access') {
        this.eventBus.emit('stage:progress', {
          stage: 'sandbox',
          message: 'ALERT: Planted canary credential file was opened/read.',
          detail: event.detail,
        });
      }
    }

    this.eventBus.emit('stage:progress', {
      stage: 'sandbox',
      message: `Exercised ${sandboxSummary.toolsCalled.length}/${sandboxSummary.toolsDiscovered.length} tool(s) in ${sandboxSummary.durationMs}ms`,
    });
    this.eventBus.emit('stage:complete', {
      stage: 'sandbox',
      status: sandboxSummary.completed ? 'success' : 'warn',
    });

    // 5. Stage: Verdict Engine
    this.eventBus.emit('stage:start', { stage: 'verdict', target: targetMetadata.name });

    const verdictEngine = new (await import('../verdict/engine.js')).VerdictEngine();
    const evaluation = verdictEngine.evaluate(findings, sandboxSummary, this.config.networkAllowlist);

    findings.push(...evaluation.newFindings);
    for (const f of evaluation.newFindings) {
      this.eventBus.emit('finding:discovered', f);
    }

    this.eventBus.emit('stage:complete', { stage: 'verdict', status: 'success' });

    const scanResult: ScanResult = {
      target: targetMetadata,
      rulesetVersion: '0.1.0',
      mcpguardVersion: '0.1.0',
      findings,
      sandbox: sandboxSummary,
      llm: {
        used: llmUsed,
        provider: this.config.llmProvider,
        model: this.config.llmModel,
        suspicions: [],
      },
      verdict: evaluation.verdict,
      verdictReasons: evaluation.reasons,
    };

    if (!options.keepExtracted) {
      await fetched.cleanup();
    }

    this.eventBus.emit('scan:complete', scanResult);
    return scanResult;
  }
}
