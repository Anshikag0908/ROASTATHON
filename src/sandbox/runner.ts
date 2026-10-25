import path from 'node:path';
import fs from 'node:fs/promises';
import { spawn, type ChildProcess } from 'node:child_process';
import crypto from 'node:crypto';
import { generateCanaries, plantCanaryFiles, findCanariesInPayload, type CanarySecrets } from './canaries.js';
import { NetworkSink } from './sink.js';
import { McpClientHarness, type HarnessExecutionResult } from './harness.js';
import type { SandboxEvent, SandboxExecutionSummary } from '../core/types.js';

export interface SandboxRunnerOptions {
  sandboxTimeoutMs?: number;
  toolTimeoutMs?: number;
  networkAllowlist?: string[];
  sinkPort?: number;
}

export class SandboxRunner {
  public async run(
    targetDir: string,
    entryFile = 'index.js',
    options: SandboxRunnerOptions = {}
  ): Promise<SandboxExecutionSummary> {
    const startTime = Date.now();
    const runId = crypto.randomBytes(6).toString('hex');
    const sandboxTimeout = options.sandboxTimeoutMs || 30000;
    const toolTimeout = options.toolTimeoutMs || 5000;

    const events: SandboxEvent[] = [];
    const canaries: CanarySecrets = generateCanaries(runId);

    // 1. Prepare isolated sandbox workspace
    const sandboxDir = path.resolve('temp', `sandbox-${runId}`);
    await fs.mkdir(sandboxDir, { recursive: true });

    // Plant canary secrets inside the isolated sandbox workspace
    const plantedFilePaths = await plantCanaryFiles(sandboxDir, canaries);

    // Track file access to planted canaries using fs watch or stats
    const accessedFiles = new Set<string>();
    const fileWatchers: any[] = [];

    for (const p of plantedFilePaths) {
      try {
        const watcher = (await import('node:fs')).watch(p, (eventType) => {
          if (!accessedFiles.has(p)) {
            accessedFiles.add(p);
            events.push({
              ts: Date.now(),
              kind: 'canary_file_access',
              detail: { file: p, eventType },
            });
          }
        });
        fileWatchers.push(watcher);
      } catch {
        // Ignore watch setup error on non-existent file
      }
    }

    // 2. Start Network Sink
    const sink = new NetworkSink();
    const sinkPort = await sink.start(options.sinkPort || 0);

    // 3. Launch target server
    const targetScriptPath = path.isAbsolute(entryFile) ? entryFile : path.join(targetDir, entryFile);

    const childEnv: Record<string, string> = {
      ...process.env as Record<string, string>,
      HOME: sandboxDir,
      USERPROFILE: sandboxDir,
      SINK_HOST: '127.0.0.1',
      SINK_PORT: String(sinkPort),
      AWS_ACCESS_KEY_ID: canaries.awsAccessKeyId,
      AWS_SECRET_ACCESS_KEY: canaries.awsSecretAccessKey,
      GITHUB_TOKEN: canaries.githubToken,
      ENV_SECRET: canaries.envSecret,
    };

    let serverProcess: ChildProcess | null = null;
    let harnessResult: HarnessExecutionResult = {
      completed: false,
      toolsDiscovered: [],
      toolsCalled: [],
      toolResults: [],
      errors: [],
    };

    try {
      serverProcess = spawn(process.execPath, [targetScriptPath], {
        cwd: sandboxDir,
        env: childEnv,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Capture error stream
      serverProcess.stderr?.on('data', (data) => {
        // Can be logged if needed
      });

      // 4. Drive MCP Client Harness
      if (serverProcess.stdout && serverProcess.stdin) {
        const harness = new McpClientHarness();
        harnessResult = await harness.run(serverProcess.stdout, serverProcess.stdin, {
          toolTimeoutMs: toolTimeout,
          totalTimeoutMs: sandboxTimeout,
        });

        for (const tr of harnessResult.toolResults) {
          events.push({
            ts: Date.now(),
            kind: 'tool_call',
            detail: {
              tool: tr.tool,
              durationMs: tr.durationMs,
              isError: tr.isError,
              outputSnippet: tr.output.slice(0, 200),
            },
          });
        }
      } else {
        events.push({
          ts: Date.now(),
          kind: 'error',
          detail: { message: 'Server stdio streams were unavailable.' },
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      events.push({
        ts: Date.now(),
        kind: 'error',
        detail: { message: `Process execution error: ${msg}` },
      });
    } finally {
      // 5. Teardown target process
      if (serverProcess) {
        try {
          serverProcess.kill();
        } catch {
          // ignore
        }
      }

      // Small delay to allow any async sink request to arrive
      await new Promise((r) => setTimeout(r, 200));

      // 6. Collect sink network records & search for canaries
      const sinkRecords = sink.getRecords();
      for (const rec of sinkRecords) {
        events.push({
          ts: rec.ts,
          kind: 'net_connect',
          detail: {
            method: rec.method,
            url: rec.url,
            remoteAddress: rec.remoteAddress,
          },
        });

        // Search for planted canaries in request payload and URL
        const fullPayload = `${rec.url}\n${JSON.stringify(rec.headers)}\n${rec.body}`;
        const canaryMatches = findCanariesInPayload(fullPayload, canaries);

        if (canaryMatches.length > 0) {
          events.push({
            ts: rec.ts,
            kind: 'canary_in_payload',
            detail: {
              matches: canaryMatches,
              url: rec.url,
              bodySnippet: rec.body.slice(0, 300),
            },
          });
        }
      }

      // Stop sink
      await sink.stop();

      // Close file watchers
      for (const w of fileWatchers) {
        try {
          w.close();
        } catch {}
      }

      // Remove temp sandbox folder
      try {
        await fs.rm(sandboxDir, { recursive: true, force: true });
      } catch {}
    }

    const durationMs = Date.now() - startTime;

    return {
      ran: true,
      completed: harnessResult.completed,
      durationMs,
      events,
      toolsDiscovered: harnessResult.toolsDiscovered.map((t) => t.name),
      toolsCalled: harnessResult.toolsCalled,
    };
  }
}
