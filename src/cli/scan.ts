import pc from 'picocolors';
import { Orchestrator, EXIT_CODES, type ScanOptions } from '../core/orchestrator.js';
import { printTerminalReport } from '../report/terminal.js';
import { formatJsonReport, writeJsonReport } from '../report/json.js';
import { sanitizeText } from '../report/sanitize.js';

export interface CliScanFlags {
  json?: boolean;
  noLlm?: boolean;
  timeout?: string;
  report?: string;
}

export async function scanCommand(target: string, flags: CliScanFlags): Promise<number> {
  if (!target || !target.trim()) {
    console.error(pc.red('Error: Target package name or directory path is required.'));
    console.error(pc.dim('Usage: mcpguard scan <name[@version] | path>'));
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
    console.log(pc.bold(pc.cyan(`\n🛡️  mcpguard scanning target: ${sanitizeText(target)}\n`)));

    // Subscribe to event bus for progress output
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

  try {
    const result = await orchestrator.scan(target, scanOptions);

    if (flags.json) {
      console.log(formatJsonReport(result));
    } else {
      printTerminalReport(result);
    }

    if (flags.report) {
      await writeJsonReport(result, flags.report);
      if (!flags.json) {
        console.log(pc.green(`Report saved to ${flags.report}`));
      }
    }

    switch (result.verdict) {
      case 'SAFE':
        return EXIT_CODES.SAFE;
      case 'SUSPICIOUS':
        return EXIT_CODES.SUSPICIOUS;
      case 'DANGEROUS':
        return EXIT_CODES.DANGEROUS;
      default:
        return EXIT_CODES.ERROR;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(pc.red(`\n✖ Fatal scan error: ${sanitizeText(msg)}`));
    return EXIT_CODES.ERROR;
  }
}
