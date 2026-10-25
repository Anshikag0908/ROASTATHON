import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { Orchestrator, EXIT_CODES } from '../../src/core/orchestrator.js';

describe('Scan Pipeline (Walking Skeleton)', () => {
  it('scans fixtures/benign-server and returns a valid ScanResult structure', async () => {
    const orchestrator = new Orchestrator();
    const fixtureDir = path.resolve('fixtures', 'benign-server');

    const result = await orchestrator.scan(fixtureDir);

    assert.equal(result.target.name, 'benign-server');
    assert.equal(result.target.ecosystem, 'local');
    assert.equal(result.verdict, 'SAFE');
    assert.equal(result.findings.length, 0);
    assert.ok(result.sandbox.ran);
    assert.ok(result.sandbox.completed);
  });

  it('correctly defines standard exit codes', () => {
    assert.equal(EXIT_CODES.SAFE, 0);
    assert.equal(EXIT_CODES.SUSPICIOUS, 10);
    assert.equal(EXIT_CODES.DANGEROUS, 20);
    assert.equal(EXIT_CODES.ERROR, 1);
  });
});
