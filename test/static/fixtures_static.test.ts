import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { StaticChecker } from '../../src/static/runner.js';
import { PackageFetcher } from '../../src/fetch/fetcher.js';

describe('Static Analysis of Test Fixtures', () => {
  const checker = new StaticChecker();
  const fetcher = new PackageFetcher();

  it('scans fixtures/benign-server and produces 0 medium+ findings', async () => {
    const pkg = await fetcher.fetchAndInspect(path.resolve('fixtures', 'benign-server'));
    const findings = await checker.scanDirectory(pkg.extractedDir, pkg.manifest);

    const seriousFindings = findings.filter(
      (f) => f.severity === 'medium' || f.severity === 'high' || f.severity === 'critical'
    );
    assert.equal(seriousFindings.length, 0);
  });

  it('scans fixtures/poisoned-description-server and flags TOOL-DESC-INJECTION', async () => {
    const pkg = await fetcher.fetchAndInspect(path.resolve('fixtures', 'poisoned-description-server'));
    const findings = await checker.scanDirectory(pkg.extractedDir, pkg.manifest);

    const injectionFinding = findings.find((f) => f.rule === 'TOOL-DESC-INJECTION');
    assert.ok(injectionFinding, 'Must flag prompt injection in poisoned description fixture');
    assert.equal(injectionFinding.severity, 'high');
  });

  it('scans fixtures/postinstall-server and flags INSTALL-SCRIPT', async () => {
    const pkg = await fetcher.fetchAndInspect(path.resolve('fixtures', 'postinstall-server'));
    const findings = await checker.scanDirectory(pkg.extractedDir, pkg.manifest);

    const installFinding = findings.find((f) => f.rule === 'INSTALL-SCRIPT');
    assert.ok(installFinding, 'Must flag lifecycle script in postinstall fixture');
  });
});
