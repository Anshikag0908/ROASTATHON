import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runDoctorChecks } from '../../src/cli/doctor.js';

describe('Doctor Diagnostics', () => {
  it('returns diagnostic items and never prints secret keys', async () => {
    // Inject a fake test key in env to verify secrecy
    const originalKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'super-secret-key-12345';

    try {
      const results = await runDoctorChecks();
      assert.ok(results.length >= 5);

      // Verify no diagnostic message contains the actual key value
      for (const item of results) {
        assert.ok(!item.message.includes('super-secret-key-12345'), `Key leaked in check ${item.name}!`);
      }

      // Check node check is present
      const nodeCheck = results.find((r) => r.name === 'Node.js');
      assert.ok(nodeCheck);
      assert.equal(nodeCheck.status, 'ok');
    } finally {
      process.env.GEMINI_API_KEY = originalKey;
    }
  });
});
