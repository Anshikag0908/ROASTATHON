#!/usr/bin/env node

import { Command } from 'commander';
import { doctorCommand } from './doctor.js';
import { scanCommand } from './scan.js';
import { installCommand } from './install.js';

const program = new Command();

program
  .name('mcpguard')
  .description('Security pipeline and sandbox testing for Model Context Protocol (MCP) servers')
  .version('0.1.0');

program
  .command('doctor')
  .description('Diagnose local environment, Docker availability, and configuration')
  .action(async () => {
    const code = await doctorCommand();
    process.exit(code);
  });

program
  .command('scan <target>')
  .description('Scan an MCP package or local directory for malicious behavior')
  .option('--json', 'Output results in JSON format')
  .option('--no-llm', 'Disable LLM triage review step')
  .option('--timeout <ms>', 'Scan execution timeout in milliseconds')
  .option('--report <file>', 'Save output report to specified file (JSON or HTML)')
  .option('--html <file>', 'Save interactive HTML report to specified file')
  .option('--no-cache', 'Bypass cached scan results and force a fresh analysis')
  .option('--dashboard', 'Launch live streaming web dashboard during scan')
  .action(async (target: string, options) => {
    const code = await scanCommand(target, options);
    process.exit(code);
  });

program
  .command('install <target>')
  .description('Verify an MCP server package through the security pipeline and gate installation')
  .option('-y, --yes', 'Automatically proceed on SUSPICIOUS verdicts without interactive prompt')
  .option('--json', 'Output installation verdict and pinned config in JSON format')
  .option('--no-llm', 'Disable LLM triage review step')
  .option('--timeout <ms>', 'Scan execution timeout in milliseconds')
  .option('--report <file>', 'Save output report to specified file')
  .option('--html <file>', 'Save interactive HTML report to specified file')
  .option('--no-cache', 'Bypass cached scan results and force a fresh analysis')
  .option('--expected-version <version>', 'Enforce expected version match (TOCTOU protection)')
  .option('--expected-integrity <hash>', 'Enforce expected integrity hash match (TOCTOU protection)')
  .action(async (target: string, options) => {
    const code = await installCommand(target, options);
    process.exit(code);
  });

program
  .command('dashboard')
  .description('Start standalone live web dashboard server')
  .option('-p, --port <port>', 'Server port (default: 3100)')
  .action(async (options) => {
    const { DashboardServer } = await import('../report/dashboard.js');
    const server = new DashboardServer();
    const port = await server.start(options.port ? parseInt(options.port, 10) : 3100);
    console.log(`\n🛡️  mcpguard live dashboard running at: http://127.0.0.1:${port}\n`);
  });

program.parseAsync(process.argv).catch((err) => {
  console.error('Unexpected CLI error:', err);
  process.exit(1);
});
