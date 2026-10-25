import pc from 'picocolors';
import type { ScanResult, Finding } from '../core/types.js';
import { sanitizeText } from './sanitize.js';

export function printTerminalReport(result: ScanResult): void {
  const line = '═'.repeat(60);
  console.log('\n' + pc.bold(pc.cyan(line)));
  console.log(pc.bold(pc.cyan(`  mcpguard Scan Report: ${sanitizeText(result.target.name)}`)));
  if (result.target.version) {
    console.log(pc.dim(`  Version: ${sanitizeText(result.target.version)} | Ecosystem: ${result.target.ecosystem}`));
  }
  console.log(pc.bold(pc.cyan(line)));

  // 1. Findings
  console.log('\n' + pc.bold('── Findings (' + result.findings.length + ') ──'));
  if (result.findings.length === 0) {
    console.log(pc.dim('  No static, LLM, or sandbox findings recorded.'));
  } else {
    for (const f of result.findings) {
      printFinding(f);
    }
  }

  // 2. Sandbox Summary
  console.log('\n' + pc.bold('── Sandbox Execution ──'));
  if (!result.sandbox.ran) {
    console.log(pc.yellow('  [!] Sandbox was not executed.'));
  } else {
    console.log(`  Completed: ${result.sandbox.completed ? pc.green('Yes') : pc.red('No')} (${result.sandbox.durationMs}ms)`);
    console.log(`  Tools Discovered: ${result.sandbox.toolsDiscovered.length} (${sanitizeText(result.sandbox.toolsDiscovered.join(', ') || 'none')})`);
    console.log(`  Tools Exercised:  ${result.sandbox.toolsCalled.length} (${sanitizeText(result.sandbox.toolsCalled.join(', ') || 'none')})`);
    console.log(`  Recorded Events:  ${result.sandbox.events.length}`);
  }

  // 3. LLM Triage Summary
  console.log('\n' + pc.bold('── LLM Triage ──'));
  if (!result.llm.used) {
    console.log(pc.dim('  LLM triage did not run (offline / --no-llm mode).'));
  } else {
    console.log(`  Provider: ${sanitizeText(result.llm.provider || 'unknown')} (${sanitizeText(result.llm.model || 'unknown')})`);
    console.log(`  Suspicions Flagged: ${result.llm.suspicions.length}`);
  }

  // 4. Verdict & Reasons
  console.log('\n' + pc.bold('── Verdict ──'));
  let verdictBadge: string;
  if (result.verdict === 'SAFE') {
    verdictBadge = pc.bgGreen(pc.black(pc.bold('  SAFE  ')));
  } else if (result.verdict === 'SUSPICIOUS') {
    verdictBadge = pc.bgYellow(pc.black(pc.bold('  SUSPICIOUS  ')));
  } else {
    verdictBadge = pc.bgRed(pc.white(pc.bold('  DANGEROUS  ')));
  }
  console.log(`  Verdict: ${verdictBadge}`);

  if (result.verdictReasons.length > 0) {
    console.log(pc.bold('\n  Reasons:'));
    for (const reason of result.verdictReasons) {
      console.log(`  • ${sanitizeText(reason)}`);
    }
  }

  // Mandatory honest disclosure
  console.log('\n' + pc.dim('─'.repeat(60)));
  console.log(pc.dim('  NOTE: "SAFE" means no malicious behavior was observed'));
  console.log(pc.dim('  in this run. It is not a guarantee.'));
  console.log(pc.dim('─'.repeat(60)) + '\n');
}

function printFinding(f: Finding): void {
  let sevBadge: string;
  switch (f.severity) {
    case 'critical':
      sevBadge = pc.bgRed(pc.white(' CRITICAL '));
      break;
    case 'high':
      sevBadge = pc.red('[HIGH]');
      break;
    case 'medium':
      sevBadge = pc.yellow('[MEDIUM]');
      break;
    case 'low':
      sevBadge = pc.blue('[LOW]');
      break;
    default:
      sevBadge = pc.dim('[INFO]');
  }

  console.log(`  ${sevBadge} ${pc.bold(sanitizeText(f.title))} (${pc.dim(f.id)})`);
  console.log(`    ${pc.dim('Source:')} ${f.source} | ${pc.dim('Rule:')} ${sanitizeText(f.rule)} | ${pc.dim('Confidence:')} ${f.confidence}`);
  console.log(`    ${sanitizeText(f.description)}`);

  if (f.evidence.file) {
    const loc = f.evidence.line ? `${f.evidence.file}:${f.evidence.line}` : f.evidence.file;
    console.log(`    ${pc.dim('Location:')} ${sanitizeText(loc)}`);
  }
  if (f.evidence.snippet) {
    console.log(`    ${pc.dim('Snippet:')} ${pc.italic(sanitizeText(f.evidence.snippet))}`);
  }
  console.log('');
}
