#!/usr/bin/env node

import { Command } from 'commander';
import { doctorCommand } from './doctor.js';
import { scanCommand } from './scan.js';

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
  .option('--report <file>', 'Save output report to specified file')
  .action(async (target: string, options) => {
    const code = await scanCommand(target, options);
    process.exit(code);
  });

program.parseAsync(process.argv).catch((err) => {
  console.error('Unexpected CLI error:', err);
  process.exit(1);
});
