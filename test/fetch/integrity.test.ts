import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeBufferHash, verifyIntegrity } from '../../src/fetch/integrity.js';

describe('Integrity Module', () => {
  it('computes and verifies sha512 integrity string correctly', () => {
    const data = Buffer.from('console.log("hello mcp");');
    const hash = computeBufferHash(data, 'sha512');

    assert.ok(hash.startsWith('sha512-'));
    assert.equal(verifyIntegrity(data, hash), true);

    // Tampered data must fail
    const tampered = Buffer.from('console.log("tampered");');
    assert.equal(verifyIntegrity(tampered, hash), false);
  });

  it('computes and verifies sha256 integrity string', () => {
    const data = Buffer.from('test buffer content');
    const hash = computeBufferHash(data, 'sha256');

    assert.ok(hash.startsWith('sha256-'));
    assert.equal(verifyIntegrity(data, hash), true);
  });

  it('verifies legacy sha1 hex hashes', () => {
    const data = Buffer.from('hello legacy');
    // sha1 of "hello legacy" = 5110d1822368c5b3d68bcbbd00f7b02db7c28a2a
    const validSha1 = '654c9c42ee664aa82279e3c10c373880e55252c2';
    assert.equal(verifyIntegrity(data, validSha1), true);
    assert.equal(verifyIntegrity(data, '0000000000000000000000000000000000000000'), false);
  });
});
