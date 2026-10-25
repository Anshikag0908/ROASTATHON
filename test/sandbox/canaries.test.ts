import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { generateCanaries, plantCanaryFiles, findCanariesInPayload } from '../../src/sandbox/canaries.js';

describe('Canary Secrets Module', () => {
  it('generates unique random canaries on each invocation', () => {
    const c1 = generateCanaries();
    const c2 = generateCanaries();

    assert.notEqual(c1.awsAccessKeyId, c2.awsAccessKeyId);
    assert.notEqual(c1.awsSecretAccessKey, c2.awsSecretAccessKey);
    assert.notEqual(c1.sshKeyToken, c2.sshKeyToken);
    assert.notEqual(c1.envSecret, c2.envSecret);
    assert.notEqual(c1.githubToken, c2.githubToken);

    assert.ok(c1.awsAccessKeyId.startsWith('AKIA'));
    assert.ok(c1.githubToken.startsWith('ghp_'));
    assert.ok(c1.sshPrivateKey.includes('BEGIN OPENSSH PRIVATE KEY'));
  });

  it('plants format-valid canary files into specified directory', async () => {
    const canaries = generateCanaries();
    const testDir = path.resolve('temp', 'test-canary-plant');
    await fs.mkdir(testDir, { recursive: true });

    try {
      const planted = await plantCanaryFiles(testDir, canaries);
      assert.ok(planted.length >= 3);

      const awsCreds = await fs.readFile(path.join(testDir, '.aws', 'credentials'), 'utf8');
      assert.ok(awsCreds.includes(canaries.awsAccessKeyId));
      assert.ok(awsCreds.includes(canaries.awsSecretAccessKey));

      const sshKey = await fs.readFile(path.join(testDir, '.ssh', 'id_rsa'), 'utf8');
      assert.ok(sshKey.includes('OPENSSH PRIVATE KEY'));

      const envFile = await fs.readFile(path.join(testDir, '.env'), 'utf8');
      assert.ok(envFile.includes(canaries.envSecret));
      assert.ok(envFile.includes(canaries.githubToken));
    } finally {
      await fs.rm(testDir, { recursive: true, force: true });
    }
  });

  it('detects canaries in plain, base64, and hex payloads', () => {
    const canaries = generateCanaries();

    // 1. Plain
    const plainPayload = `User data with key: ${canaries.awsAccessKeyId} sent to remote.`;
    const plainMatches = findCanariesInPayload(plainPayload, canaries);
    assert.equal(plainMatches.length, 1);
    assert.equal(plainMatches[0].canaryName, 'AWS_ACCESS_KEY_ID');
    assert.equal(plainMatches[0].encoding, 'plain');

    // 2. Base64
    const b64Secret = Buffer.from(canaries.envSecret).toString('base64');
    const b64Payload = `Token header: Bearer ${b64Secret}`;
    const b64Matches = findCanariesInPayload(b64Payload, canaries);
    assert.equal(b64Matches.length, 1);
    assert.equal(b64Matches[0].canaryName, 'ENV_SECRET');
    assert.equal(b64Matches[0].encoding, 'base64');

    // 3. Negative test (clean payload)
    const cleanMatches = findCanariesInPayload('Normal calculator output result = 42', canaries);
    assert.equal(cleanMatches.length, 0);
  });
});
