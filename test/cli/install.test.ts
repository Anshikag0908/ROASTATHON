import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { installCommand } from '../../src/cli/install.js';
import { EXIT_CODES } from '../../src/core/orchestrator.js';

describe('Phase 6 CLI Install Command Gating & TOCTOU Protection', () => {
  it('installs benign-server on SAFE verdict and prints pinned client config', async () => {
    const targetPath = path.resolve('fixtures', 'benign-server');

    let outputJson = '';
    const originalLog = console.log;
    console.log = (msg: string) => {
      outputJson += msg + '\n';
    };

    try {
      const code = await installCommand(targetPath, { json: true });
      assert.equal(code, EXIT_CODES.SAFE);

      const parsed = JSON.parse(outputJson.trim());
      assert.equal(parsed.status, 'installed');
      assert.equal(parsed.verdict, 'SAFE');
      assert.equal(parsed.target.name, 'benign-server');
      assert.ok(parsed.configSnippet.mcpServers['benign-server']);
      assert.equal(parsed.configSnippet.mcpServers['benign-server'].command, 'node');
    } finally {
      console.log = originalLog;
    }
  });

  it('blocks install of malicious-exfil-server on DANGEROUS verdict (exit code 20)', async () => {
    const targetPath = path.resolve('fixtures', 'malicious-exfil-server');

    let outputJson = '';
    const originalLog = console.log;
    console.log = (msg: string) => {
      outputJson += msg + '\n';
    };

    try {
      const code = await installCommand(targetPath, { json: true });
      assert.equal(code, EXIT_CODES.DANGEROUS);

      const parsed = JSON.parse(outputJson.trim());
      assert.equal(parsed.status, 'blocked');
      assert.equal(parsed.verdict, 'DANGEROUS');
      assert.equal(parsed.target.name, 'malicious-exfil-server');
    } finally {
      console.log = originalLog;
    }
  });

  it('aborts install of SUSPICIOUS target in non-interactive mode when --yes is not supplied', async () => {
    const targetPath = path.resolve('fixtures', 'poisoned-description-server');

    let outputJson = '';
    const originalLog = console.log;
    console.log = (msg: string) => {
      outputJson += msg + '\n';
    };

    try {
      // Running with --no-llm makes poisoned-description-server SUSPICIOUS (static high finding)
      const code = await installCommand(targetPath, { json: true, noLlm: true });
      assert.equal(code, EXIT_CODES.SUSPICIOUS);

      const parsed = JSON.parse(outputJson.trim());
      assert.equal(parsed.status, 'aborted');
      assert.equal(parsed.verdict, 'SUSPICIOUS');
    } finally {
      console.log = originalLog;
    }
  });

  it('proceeds with install of SUSPICIOUS target when --yes flag is explicitly provided', async () => {
    const targetPath = path.resolve('fixtures', 'poisoned-description-server');

    let outputJson = '';
    const originalLog = console.log;
    console.log = (msg: string) => {
      outputJson += msg + '\n';
    };

    try {
      const code = await installCommand(targetPath, { json: true, noLlm: true, yes: true });
      assert.equal(code, EXIT_CODES.SUSPICIOUS);

      const parsed = JSON.parse(outputJson.trim());
      assert.equal(parsed.status, 'installed');
      assert.equal(parsed.verdict, 'SUSPICIOUS');
      assert.ok(parsed.configSnippet);
    } finally {
      console.log = originalLog;
    }
  });

  it('TOCTOU protection: refuses install when expected version does not match resolved version', async () => {
    const targetPath = path.resolve('fixtures', 'benign-server');

    let outputJson = '';
    const originalLog = console.log;
    console.log = (msg: string) => {
      outputJson += msg + '\n';
    };

    try {
      const code = await installCommand(targetPath, {
        json: true,
        expectedVersion: '9.9.9', // Mismatched version
      });

      assert.equal(code, EXIT_CODES.ERROR);
      const parsed = JSON.parse(outputJson.trim());
      assert.equal(parsed.status, 'blocked');
      assert.ok(parsed.error.includes('TOCTOU violation'));
    } finally {
      console.log = originalLog;
    }
  });

  it('TOCTOU protection: refuses install when expected integrity hash does not match', async () => {
    const targetPath = path.resolve('fixtures', 'benign-server');

    let outputJson = '';
    const originalLog = console.log;
    console.log = (msg: string) => {
      outputJson += msg + '\n';
    };

    try {
      const code = await installCommand(targetPath, {
        json: true,
        expectedIntegrity: 'sha512-fakeinvalidhash1234567890', // Mismatched hash
      });

      assert.equal(code, EXIT_CODES.ERROR);
      const parsed = JSON.parse(outputJson.trim());
      assert.equal(parsed.status, 'blocked');
      assert.ok(parsed.error.includes('TOCTOU violation'));
    } finally {
      console.log = originalLog;
    }
  });
});
