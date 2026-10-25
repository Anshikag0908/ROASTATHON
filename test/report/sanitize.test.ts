import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeText } from '../../src/report/sanitize.js';

describe('Sanitize Utility', () => {
  it('strips ANSI escape codes from untrusted strings', () => {
    const malicious = '\u001b[31;1mDangerous Content\u001b[0m';
    const cleaned = sanitizeText(malicious);
    assert.equal(cleaned, 'Dangerous Content');
  });

  it('strips zero-width and control characters', () => {
    const withZeroWidth = 'safe\u200Btext\u0000here';
    const cleaned = sanitizeText(withZeroWidth);
    assert.equal(cleaned, 'safetexthere');
  });

  it('truncates overly long strings and appends ellipsis', () => {
    const longString = 'A'.repeat(600);
    const cleaned = sanitizeText(longString, 100);
    assert.ok(cleaned.length < 130);
    assert.ok(cleaned.endsWith('... [truncated]'));
  });
});
