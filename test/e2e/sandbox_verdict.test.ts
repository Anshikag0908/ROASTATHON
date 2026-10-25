import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import { Orchestrator, EXIT_CODES } from '../../src/core/orchestrator.js';

describe('Phase 3 End-to-End Sandbox & Verdict Pipeline', () => {
  const orchestrator = new Orchestrator();

  it('scans fixtures/benign-server and produces verdict SAFE', async () => {
    const targetPath = path.resolve('fixtures', 'benign-server');
    const result = await orchestrator.scan(targetPath);

    assert.equal(result.target.name, 'benign-server');
    assert.equal(result.verdict, 'SAFE');
    assert.equal(result.sandbox.ran, true);
    assert.equal(result.sandbox.completed, true);
    assert.ok(result.sandbox.toolsDiscovered.length >= 2);
    assert.ok(result.sandbox.toolsCalled.length >= 2);
    assert.equal(result.findings.length, 0);
  });

  it('scans fixtures/malicious-exfil-server and produces verdict DANGEROUS with exfiltration evidence', async () => {
    const targetPath = path.resolve('fixtures', 'malicious-exfil-server');
    const result = await orchestrator.scan(targetPath);

    assert.equal(result.target.name, 'malicious-exfil-server');
    assert.equal(result.verdict, 'DANGEROUS');
    assert.ok(result.findings.length > 0);

    // Evidence must contain canary exfiltration finding (D1 or D2)
    const exfilFinding = result.findings.find(
      (f) => f.id === 'SANDBOX-EXFIL-D1' || f.id === 'SANDBOX-EXFIL-D2'
    );
    assert.ok(exfilFinding, 'Must emit SANDBOX-EXFIL-D1 or D2 finding');
    assert.equal(exfilFinding.severity, 'critical');

    // Reasons must explain the verdict
    assert.ok(
      result.verdictReasons.some((r) => r.includes('[D1]') || r.includes('[D2]')),
      'Must cite D1 or D2 reason in verdict'
    );
  });

  it('fails closed: a server that crashes or fails to start produces verdict SUSPICIOUS (never SAFE)', async () => {
    // Create temporary broken server
    const brokenDir = path.resolve('temp', 'test-broken-server');
    await fs.mkdir(brokenDir, { recursive: true });
    await fs.writeFile(
      path.join(brokenDir, 'package.json'),
      JSON.stringify({ name: 'broken-server', version: '1.0.0', main: 'crash.js' })
    );
    await fs.writeFile(
      path.join(brokenDir, 'crash.js'),
      'console.error("Fatal startup crash!"); process.exit(1);\n'
    );

    try {
      const result = await orchestrator.scan(brokenDir);

      assert.equal(result.target.name, 'broken-server');
      assert.equal(result.verdict, 'SUSPICIOUS');
      assert.notEqual(result.verdict, 'SAFE');

      const incompleteFinding = result.findings.find((f) => f.id === 'SANDBOX-INCOMPLETE-001');
      assert.ok(incompleteFinding, 'Must emit SANDBOX-INCOMPLETE-001 finding on crash');
    } finally {
      await fs.rm(brokenDir, { recursive: true, force: true });
    }
  });
});
