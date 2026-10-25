import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { VerdictEngine } from '../../src/verdict/engine.js';
import type { SandboxExecutionSummary, Finding } from '../../src/core/types.js';

describe('Verdict Engine Policy', () => {
  const engine = new VerdictEngine();

  it('[D1] verdicts DANGEROUS when canary appears in network payload', () => {
    const sandbox: SandboxExecutionSummary = {
      ran: true,
      completed: true,
      durationMs: 120,
      events: [
        {
          ts: Date.now(),
          kind: 'canary_in_payload',
          detail: { canaryName: 'AWS_ACCESS_KEY_ID' },
        },
      ],
      toolsDiscovered: ['echo'],
      toolsCalled: ['echo'],
    };

    const result = engine.evaluate([], sandbox);
    assert.equal(result.verdict, 'DANGEROUS');
    assert.ok(result.reasons.some((r) => r.includes('[D1]')));
    assert.equal(result.newFindings[0].id, 'SANDBOX-EXFIL-D1');
  });

  it('[D2] verdicts DANGEROUS when canary file read is accompanied by outbound network activity', () => {
    const sandbox: SandboxExecutionSummary = {
      ran: true,
      completed: true,
      durationMs: 150,
      events: [
        {
          ts: Date.now(),
          kind: 'canary_file_access',
          detail: { file: '/home/node/.aws/credentials' },
        },
        {
          ts: Date.now(),
          kind: 'net_connect',
          detail: { url: '/ping' },
        },
      ],
      toolsDiscovered: ['lookup'],
      toolsCalled: ['lookup'],
    };

    const result = engine.evaluate([], sandbox);
    assert.equal(result.verdict, 'DANGEROUS');
    assert.ok(result.reasons.some((r) => r.includes('[D2]')));
    assert.equal(result.newFindings[0].id, 'SANDBOX-EXFIL-D2');
  });

  it('verdicts SUSPICIOUS when canary file accessed without network egress', () => {
    const sandbox: SandboxExecutionSummary = {
      ran: true,
      completed: true,
      durationMs: 80,
      events: [
        {
          ts: Date.now(),
          kind: 'canary_file_access',
          detail: { file: '/home/node/.ssh/id_rsa' },
        },
      ],
      toolsDiscovered: ['reader'],
      toolsCalled: ['reader'],
    };

    const result = engine.evaluate([], sandbox);
    assert.equal(result.verdict, 'SUSPICIOUS');
    assert.equal(result.newFindings[0].id, 'SANDBOX-CANARY-READ-001');
  });

  it('fails closed: verdicts SUSPICIOUS (analysis incomplete) if sandbox failed or no tools discovered', () => {
    const sandbox: SandboxExecutionSummary = {
      ran: true,
      completed: false, // timed out or crashed
      durationMs: 5000,
      events: [],
      toolsDiscovered: [],
      toolsCalled: [],
    };

    const result = engine.evaluate([], sandbox);
    assert.equal(result.verdict, 'SUSPICIOUS');
    assert.ok(result.reasons.some((r) => r.includes('Fail-closed')));
    assert.equal(result.newFindings[0].id, 'SANDBOX-INCOMPLETE-001');
  });

  it('verdicts SAFE only when sandbox completes cleanly with no suspicious signals', () => {
    const sandbox: SandboxExecutionSummary = {
      ran: true,
      completed: true,
      durationMs: 50,
      events: [
        {
          ts: Date.now(),
          kind: 'tool_call',
          detail: { tool: 'calculate' },
        },
      ],
      toolsDiscovered: ['calculate'],
      toolsCalled: ['calculate'],
    };

    const result = engine.evaluate([], sandbox);
    assert.equal(result.verdict, 'SAFE');
    assert.equal(result.newFindings.length, 0);
  });
});
