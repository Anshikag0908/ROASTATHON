import readline from 'node:readline';
import path from 'node:path';
import pc from 'picocolors';
import { Orchestrator, EXIT_CODES, type ScanOptions } from '../core/orchestrator.js';
import { printTerminalReport } from '../report/terminal.js';
import { formatJsonReport, writeJsonReport } from '../report/json.js';
import { sanitizeText } from '../report/sanitize.js';
import type { ScanResult } from '../core/types.js';

export interface CliInstallFlags {
  yes?: boolean;
  json?: boolean;
  noLlm?: boolean;
  timeout?: string;
  report?: string;
  expectedVersion?: string;
  expectedIntegrity?: string;
  client?: 'claude' | 'generic';
}

export interface InstallResultOutput {
  status: 'installed' | 'blocked' | 'aborted';
  verdict: 'SAFE' | 'SUSPICIOUS' | 'DANGEROUS';
  target: {
    name: string;
    version?: string;
    integrity?: string;
    ecosystem: string;
  };
  pinnedSpec: string;
  configSnippet: Record<string, any>;
  verdictReasons: string[];
}

export async function installCommand(target: string, flags: CliInstallFlags): Promise<number> {
  if (!target || !target.trim()) {
    console.error(pc.red('Error: Target package name or directory path is required.'));
    console.error(pc.dim('Usage: mcpguard install <name[@version] | path> [options]'));
    return EXIT_CODES.ERROR;
  }

  const timeoutMs = flags.timeout ? parseInt(flags.timeout, 10) : undefined;
  const scanOptions: ScanOptions = {
    json: flags.json,
    noLlm: flags.noLlm,
    timeout: timeoutMs,
  };

  const orchestrator = new Orchestrator();

  if (!flags.json) {
    console.log(pc.bold(pc.cyan(`\n🛡️  mcpguard security gate verifying target: ${sanitizeText(target)}\n`)));

    orchestrator.eventBus.on('stage:start', (e) => {
      console.log(pc.dim(`  ▶ [Stage: ${e.stage.toUpperCase()}] starting...`));
    });

    orchestrator.eventBus.on('stage:progress', (e) => {
      console.log(pc.dim(`    • ${sanitizeText(e.message)}`));
    });

    orchestrator.eventBus.on('stage:complete', (e) => {
      const statusText =
        e.status === 'success'
          ? pc.green('done')
          : e.status === 'warn'
            ? pc.yellow('warning')
            : pc.red('failed');
      console.log(pc.dim(`  ✔ [Stage: ${e.stage.toUpperCase()}] ${statusText}\n`));
    });
  }

  let result: ScanResult;
  try {
    result = await orchestrator.scan(target, scanOptions);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(pc.red(`\n✖ Fatal scan error during install gate: ${sanitizeText(msg)}`));
    return EXIT_CODES.ERROR;
  }

  // Save report if requested
  if (flags.report) {
    await writeJsonReport(result, flags.report);
    if (!flags.json) {
      console.log(pc.green(`Scan report saved to ${flags.report}`));
    }
  }

  // 1. TOCTOU Validation Checks
  if (flags.expectedVersion && result.target.version && result.target.version !== flags.expectedVersion) {
    const errorMsg = `TOCTOU violation: Expected version ${flags.expectedVersion}, but target resolved to ${result.target.version}. Refusing install.`;
    if (flags.json) {
      console.log(JSON.stringify({ error: errorMsg, status: 'blocked', verdict: result.verdict }, null, 2));
    } else {
      console.error(pc.bold(pc.red(`\n✖ BLOCKED: ${errorMsg}\n`)));
    }
    return EXIT_CODES.ERROR;
  }

  if (flags.expectedIntegrity && result.target.integrity && result.target.integrity !== flags.expectedIntegrity) {
    const errorMsg = `TOCTOU violation: Expected integrity hash ${flags.expectedIntegrity}, but target computed ${result.target.integrity}. Refusing install.`;
    if (flags.json) {
      console.log(JSON.stringify({ error: errorMsg, status: 'blocked', verdict: result.verdict }, null, 2));
    } else {
      console.error(pc.bold(pc.red(`\n✖ BLOCKED: ${errorMsg}\n`)));
    }
    return EXIT_CODES.ERROR;
  }

  // Generate safe pinned spec & client config
  const isLocal = result.target.ecosystem === 'local';
  const pinnedSpec = isLocal
    ? result.target.name
    : result.target.version
      ? `${result.target.name}@${result.target.version}`
      : result.target.name;

  const configSnippet = generateClientConfig(result.target.name, pinnedSpec, isLocal);

  // 2. Verdict Gating
  if (result.verdict === 'DANGEROUS') {
    if (flags.json) {
      const output: InstallResultOutput = {
        status: 'blocked',
        verdict: 'DANGEROUS',
        target: result.target,
        pinnedSpec,
        configSnippet,
        verdictReasons: result.verdictReasons,
      };
      console.log(JSON.stringify(output, null, 2));
    } else {
      printTerminalReport(result);
      console.log(pc.bold(pc.bgRed(pc.white('\n  ⛔ INSTALLATION BLOCKED: TARGET IS DANGEROUS  \n'))));
      console.log(pc.red('Target demonstrated confirmed malicious behavior or prompt injection.'));
      console.log(pc.dim('mcpguard strictly prohibits installing packages with a DANGEROUS verdict.\n'));
    }
    return EXIT_CODES.DANGEROUS;
  }

  if (result.verdict === 'SUSPICIOUS') {
    if (!flags.json) {
      printTerminalReport(result);
      console.log(pc.bold(pc.yellow('\n⚠ CAUTION: Target received a SUSPICIOUS verdict.')));
      console.log(pc.yellow('Review the findings and sandbox reasons above carefully.'));
    }

    let proceed = Boolean(flags.yes);

    if (!proceed) {
      if (flags.json) {
        console.log(
          JSON.stringify(
            {
              status: 'aborted',
              verdict: 'SUSPICIOUS',
              target: result.target,
              message: 'Installation aborted: Target is SUSPICIOUS and --yes was not provided.',
            },
            null,
            2
          )
        );
        return EXIT_CODES.SUSPICIOUS;
      }

      // Check if interactive TTY is available
      if (process.stdin.isTTY) {
        proceed = await askConfirmation(pc.bold(pc.yellow('\nDo you want to proceed anyway? (y/N): ')));
      } else {
        console.log(pc.red('\nNon-interactive session detected without --yes. Aborting install.'));
        proceed = false;
      }
    }

    if (!proceed) {
      if (!flags.json) {
        console.log(pc.dim('\nInstallation aborted by user.\n'));
      }
      return EXIT_CODES.SUSPICIOUS;
    }

    // User confirmed or --yes
    if (flags.json) {
      const output: InstallResultOutput = {
        status: 'installed',
        verdict: 'SUSPICIOUS',
        target: result.target,
        pinnedSpec,
        configSnippet,
        verdictReasons: result.verdictReasons,
      };
      console.log(JSON.stringify(output, null, 2));
    } else {
      printSuccessConfig(result.target.name, pinnedSpec, result.target.integrity, configSnippet, true);
    }
    return EXIT_CODES.SUSPICIOUS;
  }

  // 3. Verdict SAFE
  if (flags.json) {
    const output: InstallResultOutput = {
      status: 'installed',
      verdict: 'SAFE',
      target: result.target,
      pinnedSpec,
      configSnippet,
      verdictReasons: result.verdictReasons,
    };
    console.log(JSON.stringify(output, null, 2));
  } else {
    printTerminalReport(result);
    printSuccessConfig(result.target.name, pinnedSpec, result.target.integrity, configSnippet, false);
  }

  return EXIT_CODES.SAFE;
}

function generateClientConfig(
  serverName: string,
  pinnedSpec: string,
  isLocal: boolean
): Record<string, any> {
  const cleanName = serverName.replace(/^@/, '').replace(/[\/\\@]/g, '-');

  if (isLocal) {
    return {
      mcpServers: {
        [cleanName]: {
          command: 'node',
          args: [path.resolve(pinnedSpec, 'index.js')],
        },
      },
    };
  }

  return {
    mcpServers: {
      [cleanName]: {
        command: 'npx',
        args: ['-y', pinnedSpec],
      },
    },
  };
}

function printSuccessConfig(
  name: string,
  pinnedSpec: string,
  integrity: string | undefined,
  configSnippet: Record<string, any>,
  wasSuspicious: boolean
): void {
  const line = '─'.repeat(60);
  console.log('\n' + pc.bold(pc.green(line)));
  if (wasSuspicious) {
    console.log(pc.bold(pc.yellow('  ✔ INSTALL ALLOWED (CONFIRMED OVERRIDE)')));
  } else {
    console.log(pc.bold(pc.green('  ✔ VERIFIED SAFE — READY TO INSTALL')));
  }
  console.log(pc.bold(pc.green(line)));

  console.log(`\n  Target Package : ${pc.bold(sanitizeText(name))}`);
  console.log(`  Pinned Version : ${pc.bold(pc.cyan(sanitizeText(pinnedSpec)))}`);
  if (integrity) {
    console.log(`  Integrity Hash : ${pc.dim(sanitizeText(integrity))}`);
  }

  console.log(pc.bold('\n  Claude Desktop / MCP Client Configuration Snippet:'));
  console.log(pc.dim('  Add this block to your claude_desktop_config.json:\n'));
  console.log(pc.cyan(JSON.stringify(configSnippet, null, 2)));
  console.log('\n' + pc.dim(line) + '\n');
}

function askConfirmation(prompt: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      const trimmed = answer.trim().toLowerCase();
      resolve(trimmed === 'y' || trimmed === 'yes');
    });
  });
}
