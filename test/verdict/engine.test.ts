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

  it('[D3] verdicts DANGEROUS when static prompt injection is independently flagged by LLM triage', () => {
    const sandbox: SandboxExecutionSummary = {
      ran: true,
      completed: true,
      durationMs: 50,
      events: [],
      toolsDiscovered: ['lookup'],
      toolsCalled: ['lookup'],
    };

    const staticFinding: Finding = {
      id: 'STATIC-TOOL-DESC-INJECTION-001',
      source: 'static',
      severity: 'high',
      rule: 'TOOL-DESC-INJECTION',
      title: 'Prompt injection pattern in tool description',
      description: 'System override pattern detected in tool description.',
      evidence: { file: 'index.js' },
      confidence: 'high',
    };

    const llmFinding: Finding = {
      id: 'LLM-SUSPICION-001',
      source: 'llm',
      severity: 'high',
      rule: 'LLM-PROMPT-INJECTION',
      title: 'Malicious instruction override in tool description',
      description: 'The tool description attempts prompt injection by commanding the model to exfiltrate files.',
      evidence: { file: 'index.js' },
      confidence: 'high',
    };

    const result = engine.evaluate([staticFinding, llmFinding], sandbox);
    assert.equal(result.verdict, 'DANGEROUS');
    assert.ok(result.reasons.some((r) => r.includes('[D3]')));
  });

  it('verdicts DANGEROUS on any critical security finding', () => {
    const sandbox: SandboxExecutionSummary = {
      ran: true,
      completed: true,
      durationMs: 50,
      events: [],
      toolsDiscovered: ['lookup'],
      toolsCalled: ['lookup'],
    };

    const criticalFinding: Finding = {
      id: 'STATIC-OBFUSCATION-CRITICAL',
      source: 'static',
      severity: 'critical',
      rule: 'OBFUSCATION',
      title: 'Heavily obfuscated payload with execution vector',
      description: 'Multiple layered eval and base64 decode calls detected.',
      evidence: { file: 'index.js' },
      confidence: 'high',
    };

    const result = engine.evaluate([criticalFinding], sandbox);
    assert.equal(result.verdict, 'DANGEROUS');
    assert.ok(result.reasons.some((r) => r.includes('Critical security finding')));
  });

  it('verdicts SUSPICIOUS on non-allowlisted network egress without canary match', () => {
    const sandbox: SandboxExecutionSummary = {
      ran: true,
      completed: true,
      durationMs: 50,
      events: [
        {
          ts: Date.now(),
          kind: 'net_connect',
          detail: { host: 'unknown-tracker.evil.com' },
        },
      ],
      toolsDiscovered: ['query'],
      toolsCalled: ['query'],
    };

    const result = engine.evaluate([], sandbox, ['api.trusted.com']);
    assert.equal(result.verdict, 'SUSPICIOUS');
    assert.ok(result.reasons.some((r) => r.includes('non-allowlisted')));
  });

  it('allows egress to allowlisted hosts without flagging SUSPICIOUS', () => {
    const sandbox: SandboxExecutionSummary = {
      ran: true,
      completed: true,
      durationMs: 50,
      events: [
        {
          ts: Date.now(),
          kind: 'net_connect',
          detail: { host: 'api.weather.com' },
        },
      ],
      toolsDiscovered: ['weather'],
      toolsCalled: ['weather'],
    };

    const result = engine.evaluate([], sandbox, ['api.weather.com']);
    assert.equal(result.verdict, 'SAFE');
  });

  it('verdicts SUSPICIOUS on high or medium findings', () => {
    const sandbox: SandboxExecutionSummary = {
      ran: true,
      completed: true,
      durationMs: 50,
      events: [],
      toolsDiscovered: ['info'],
      toolsCalled: ['info'],
    };

    const mediumFinding: Finding = {
      id: 'STATIC-EXEC-001',
      source: 'static',
      severity: 'medium',
      rule: 'EXEC',
      title: 'Invocation of child_process or spawn',
      description: 'Calls child_process.exec',
      evidence: { file: 'index.js' },
      confidence: 'medium',
    };

    const result = engine.evaluate([mediumFinding], sandbox);
    assert.equal(result.verdict, 'SUSPICIOUS');
    assert.ok(result.reasons.some((r) => r.includes('Medium severity finding')));
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
