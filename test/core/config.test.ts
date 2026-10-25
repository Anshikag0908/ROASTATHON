import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig, DEFAULT_CONFIG } from '../../src/core/config.js';

describe('Config Module', () => {
  it('loads confirmed defaults when no env vars are set', () => {
    const config = loadConfig();
    assert.equal(config.sandboxTimeoutMs, 30000);
    assert.equal(config.toolTimeoutMs, 5000);
    assert.equal(config.sandboxCpuLimit, '0.5');
    assert.equal(config.sandboxMemoryLimit, '512m');
    assert.equal(config.sandboxPidLimit, 64);
    assert.equal(config.sandboxImage, 'node:20-alpine');
    assert.equal(config.sinkImage, 'mcpguard-sink:latest');
    assert.deepEqual(config.networkAllowlist, []);
  });

  it('allows overriding defaults via arguments', () => {
    const custom = loadConfig({ sandboxTimeoutMs: 15000, sandboxCpuLimit: '1.0' });
    assert.equal(custom.sandboxTimeoutMs, 15000);
    assert.equal(custom.sandboxCpuLimit, '1.0');
    // Non-overridden values remain default
    assert.equal(custom.sandboxMemoryLimit, '512m');
  });
});
