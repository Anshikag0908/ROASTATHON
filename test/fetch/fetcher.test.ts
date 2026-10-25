import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { PackageFetcher, parsePackageSpecifier } from '../../src/fetch/fetcher.js';

describe('Package Fetcher', () => {
  it('parses unscoped and scoped package specifiers', () => {
    assert.deepEqual(parsePackageSpecifier('express'), { name: 'express' });
    assert.deepEqual(parsePackageSpecifier('express@4.18.2'), { name: 'express', version: '4.18.2' });
    assert.deepEqual(parsePackageSpecifier('@modelcontextprotocol/server-filesystem'), {
      name: '@modelcontextprotocol/server-filesystem',
    });
    assert.deepEqual(parsePackageSpecifier('@modelcontextprotocol/server-filesystem@0.6.2'), {
      name: '@modelcontextprotocol/server-filesystem',
      version: '0.6.2',
    });
  });

  it('inspects local directory package safely without executing code', async () => {
    const fetcher = new PackageFetcher();
    const pkgPath = path.resolve('fixtures', 'benign-server');
    const fetched = await fetcher.fetchAndInspect(pkgPath);

    assert.equal(fetched.target.name, 'benign-server');
    assert.equal(fetched.target.ecosystem, 'local');
    assert.equal(fetched.manifest.name, 'benign-server');
    assert.equal(fetched.manifest.version, '1.0.0');
    assert.equal(fetched.manifest.lifecycleScripts.length, 0);

    await fetched.cleanup();
  });

  it('detects lifecycle scripts in postinstall-server fixture without executing them', async () => {
    const fetcher = new PackageFetcher();
    const pkgPath = path.resolve('fixtures', 'postinstall-server');

    const fetched = await fetcher.fetchAndInspect(pkgPath);

    assert.equal(fetched.target.name, 'postinstall-server');
    assert.equal(fetched.manifest.lifecycleScripts.length, 1);
    assert.equal(fetched.manifest.lifecycleScripts[0].name, 'postinstall');
    assert.equal(fetched.manifest.lifecycleScripts[0].command, 'node scripts/postinstall.js');

    await fetched.cleanup();
  });
});
