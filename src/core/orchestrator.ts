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
  llmProviderOverride?: any;
  noCache?: boolean;
  cacheDir?: string;
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
    const rulesetVersion = '0.1.0';
    const mcpguardVersion = '0.1.0';

    const cache = new (await import('./cache.js')).ScanCache({ cacheDir: options.cacheDir });
    const cacheKey = cache.computeCacheKey(targetMetadata, rulesetVersion, mcpguardVersion);

    if (!options.noCache) {
      const cachedResult = await cache.get(cacheKey);
      if (cachedResult) {
        this.eventBus.emit('stage:progress', {
          stage: 'fetch',
          message: `CACHE HIT: Using verified cached scan result for ${targetMetadata.name}@${targetMetadata.version || '0.0.0'}`,
        });
        this.eventBus.emit('stage:complete', { stage: 'fetch', status: 'success' });
        this.eventBus.emit('scan:complete', cachedResult);
        if (!options.keepExtracted) {
          await fetched.cleanup();
        }
        if (options.reportHtml) {
          const { writeHtmlReport } = await import('../report/html.js');
          await writeHtmlReport(cachedResult, options.reportHtml);
        }
        return cachedResult;
      }
    }

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

    // 2. Stage: Static Checks
    this.eventBus.emit('stage:start', { stage: 'static', target: targetMetadata.name });
    this.eventBus.emit('stage:progress', { stage: 'static', message: 'Running static analysis rules...' });

    const staticChecker = new (await import('../static/runner.js')).StaticChecker();
    const findings: Finding[] = [];

    const staticFindings = await staticChecker.scanDirectory(
      fetched.extractedDir,
      fetched.manifest,
      this.config.networkAllowlist
    );

    findings.push(...staticFindings);
    for (const f of staticFindings) {
      this.eventBus.emit('finding:discovered', f);
    }

    this.eventBus.emit('stage:progress', {
      stage: 'static',
      message: `Completed static checks: ${staticFindings.length} finding(s) discovered.`,
    });
    this.eventBus.emit('stage:complete', {
      stage: 'static',
      status: staticFindings.some((f) => f.severity === 'high' || f.severity === 'critical') ? 'warn' : 'success',
    });

    // 3. Stage: LLM Triage
    let llmSummary = {
      used: false,
      provider: undefined as string | undefined,
      model: undefined as string | undefined,
      suspicions: [] as string[],
    };

    const llmProvider = options.noLlm
      ? null
      : options.llmProviderOverride || (await import('../llm/factory.js')).createLLMProvider(this.config);

    this.eventBus.emit('stage:start', { stage: 'llm', target: targetMetadata.name });

    if (llmProvider && !options.noLlm) {
      this.eventBus.emit('stage:progress', {
        stage: 'llm',
        message: `Running LLM triage review with ${llmProvider.name} (${llmProvider.model})...`,
      });

      const { LLMTriager } = await import('../llm/triage.js');
      const triager = new LLMTriager(llmProvider, this.config.llmMaxTokens);

      const triageResult = await triager.triage({
        packageName: targetMetadata.name,
        packageVersion: targetMetadata.version,
        manifestSummary: {
          main: fetched.manifest.main,
          bin: fetched.manifest.bin,
          scripts: fetched.manifest.scripts,
          dependencies: fetched.manifest.dependencies,
        },
        staticFindings,
      });

      if (triageResult.used) {
        llmSummary = {
          used: true,
          provider: triageResult.provider,
          model: triageResult.model,
          suspicions: triageResult.suspicions.map((s) => s.title),
        };

        for (const lf of triageResult.findings) {
          findings.push(lf);
          this.eventBus.emit('finding:discovered', lf);
        }

        this.eventBus.emit('stage:progress', {
          stage: 'llm',
          message: `LLM triage completed: ${triageResult.suspicions.length} suspicion(s) flagged.`,
        });
      }

      this.eventBus.emit('stage:complete', {
        stage: 'llm',
        status: triageResult.suspicions.length > 0 ? 'warn' : 'success',
      });
    } else {
      this.eventBus.emit('stage:progress', {
        stage: 'llm',
        message: 'LLM triage skipped (--no-llm or no API key configured).',
      });
      this.eventBus.emit('stage:complete', { stage: 'llm', status: 'success' });
    }

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

    // Inspect live discovered tool descriptions from the live sandbox harness
    if (sandboxSummary.discoveredToolDetails && sandboxSummary.discoveredToolDetails.length > 0) {
      const liveToolFindings = staticChecker.inspectLiveTools(sandboxSummary.discoveredToolDetails);
      for (const lf of liveToolFindings) {
        findings.push(lf);
        this.eventBus.emit('finding:discovered', lf);
      }

      // Live tool triage with LLM if enabled
      if (llmProvider && !options.noLlm) {
        const { LLMTriager } = await import('../llm/triage.js');
        const triager = new LLMTriager(llmProvider, this.config.llmMaxTokens);
        const liveTriageResult = await triager.triage({
          packageName: targetMetadata.name,
          packageVersion: targetMetadata.version,
          staticFindings: findings.filter((f) => f.source === 'static'),
          tools: sandboxSummary.discoveredToolDetails,
        });

        if (liveTriageResult.findings.length > 0) {
          for (const lf of liveTriageResult.findings) {
            findings.push(lf);
            this.eventBus.emit('finding:discovered', lf);
          }
          llmSummary.suspicions.push(...liveTriageResult.suspicions.map((s) => s.title));
        }
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
      llm: llmSummary,
      verdict: evaluation.verdict,
      verdictReasons: evaluation.reasons,
    };

    if (!options.noCache) {
      await cache.set(cacheKey, scanResult);
    }

    if (!options.keepExtracted) {
      await fetched.cleanup();
    }

    if (options.reportHtml) {
      const { writeHtmlReport } = await import('../report/html.js');
      await writeHtmlReport(scanResult, options.reportHtml);
    }

    this.eventBus.emit('scan:complete', scanResult);
    return scanResult;
  }
}
