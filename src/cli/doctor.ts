import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import pc from 'picocolors';
import { loadConfig } from '../core/config.js';

const execAsync = (cmd: string): Promise<{ stdout: string; stderr: string }> => {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: 10_000 }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout: String(stdout), stderr: String(stderr) });
      }
    });
  });
};

export interface DoctorCheckResult {
  category: string;
  name: string;
  status: 'ok' | 'warn' | 'fail';
  message: string;
}

export async function runDoctorChecks(): Promise<DoctorCheckResult[]> {
  const results: DoctorCheckResult[] = [];
  const config = loadConfig();

  // 1. Node.js runtime version
  const nodeVersion = process.versions.node;
  const major = parseInt(nodeVersion.split('.')[0], 10);
  if (major >= 20) {
    results.push({
      category: 'Runtime',
      name: 'Node.js',
      status: 'ok',
      message: `v${nodeVersion} (compatible >= v20)`,
    });
  } else {
    results.push({
      category: 'Runtime',
      name: 'Node.js',
      status: 'fail',
      message: `v${nodeVersion} is below recommended v20+`,
    });
  }

  // 2. Docker CLI and daemon check
  try {
    const { stdout: dockerVer } = await execAsync('docker --version');
    results.push({
      category: 'Sandbox',
      name: 'Docker CLI',
      status: 'ok',
      message: dockerVer.trim(),
    });

    try {
      await execAsync('docker info');
      results.push({
        category: 'Sandbox',
        name: 'Docker Daemon',
        status: 'ok',
        message: 'Daemon is active and reachable',
      });
    } catch {
      results.push({
        category: 'Sandbox',
        name: 'Docker Daemon',
        status: 'warn',
        message: 'Docker daemon is not running. Please start Docker Desktop or the docker service.',
      });
    }
  } catch {
    results.push({
      category: 'Sandbox',
      name: 'Docker CLI',
      status: 'warn',
      message: 'docker command not found in PATH. Sandbox tests will require Docker to run.',
    });
    results.push({
      category: 'Sandbox',
      name: 'Docker Daemon',
      status: 'warn',
      message: 'Unavailable (Docker CLI missing)',
    });
  }

  // 3. LLM API keys & provider configuration (WITHOUT printing secret values)
  const provider = config.llmProvider;
  results.push({
    category: 'LLM Triage',
    name: 'Provider Config',
    status: 'ok',
    message: `${provider} (model: ${config.llmModel})`,
  });

  const hasGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim());
  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim());

  results.push({
    category: 'LLM Triage',
    name: 'GEMINI_API_KEY',
    status: hasGemini ? 'ok' : 'warn',
    message: hasGemini ? 'Set (present)' : 'Not set (will fallback to --no-llm unless provider is different)',
  });

  results.push({
    category: 'LLM Triage',
    name: 'OPENAI_API_KEY',
    status: hasOpenAI ? 'ok' : 'warn',
    message: hasOpenAI ? 'Set (present)' : 'Not set',
  });

  results.push({
    category: 'LLM Triage',
    name: 'ANTHROPIC_API_KEY',
    status: hasAnthropic ? 'ok' : 'warn',
    message: hasAnthropic ? 'Set (present)' : 'Not set',
  });

  // 4. Sandbox defaults
  results.push({
    category: 'Limits',
    name: 'Sandbox Timeouts',
    status: 'ok',
    message: `Total: ${config.sandboxTimeoutMs}ms | Tool: ${config.toolTimeoutMs}ms`,
  });

  results.push({
    category: 'Limits',
    name: 'Container Limits',
    status: 'ok',
    message: `CPU: ${config.sandboxCpuLimit} | RAM: ${config.sandboxMemoryLimit} | PIDs: ${config.sandboxPidLimit}`,
  });

  return results;
}

export async function doctorCommand(): Promise<number> {
  console.log(pc.bold(pc.cyan('\n🔍 Running mcpguard doctor diagnostics...\n')));
  const results = await runDoctorChecks();

  let hasFail = false;
  let hasWarn = false;

  for (const item of results) {
    let badge: string;
    if (item.status === 'ok') {
      badge = pc.green('✔ OK   ');
    } else if (item.status === 'warn') {
      badge = pc.yellow('⚠ WARN ');
      hasWarn = true;
    } else {
      badge = pc.red('✖ FAIL ');
      hasFail = true;
    }

    const cat = pc.dim(`[${item.category}]`.padEnd(14));
    const name = pc.bold(item.name.padEnd(20));
    console.log(`  ${badge} ${cat} ${name} : ${item.message}`);
  }

  console.log('\n' + pc.dim('─'.repeat(60)));
  if (hasFail) {
    console.log(pc.red(pc.bold('✖ mcpguard doctor found critical issues that must be resolved.')));
    return 1;
  } else if (hasWarn) {
    console.log(pc.yellow('⚠ mcpguard doctor completed with warnings. Some optional features (like live Docker sandboxing or LLM triage) may require setup.'));
    return 0;
  } else {
    console.log(pc.green(pc.bold('✔ All doctor checks passed successfully!')));
    return 0;
  }
}
