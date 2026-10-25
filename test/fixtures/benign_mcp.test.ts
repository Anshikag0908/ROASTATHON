import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import readline from 'node:readline';

describe('Benign MCP Server Fixture', () => {
  it('initializes, lists tools, and executes calculate and echo via stdio JSON-RPC', async () => {
    const fixturePath = path.resolve('fixtures', 'benign-server', 'index.js');
    const child = spawn(process.execPath, [fixturePath], {
      stdio: ['pipe', 'pipe', 'inherit'],
    });

    const rl = readline.createInterface({ input: child.stdout });
    const responses: any[] = [];

    rl.on('line', (line) => {
      try {
        responses.push(JSON.parse(line));
      } catch {}
    });

    // Helper to send JSON-RPC message
    const send = (msg: object) => {
      child.stdin.write(JSON.stringify(msg) + '\n');
    };

    // 1. initialize
    send({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05' },
    });

    // Wait for response 1
    await waitForResponse(responses, 1);
    assert.equal(responses[0].result.serverInfo.name, 'benign-server');
    assert.ok(responses[0].result.capabilities.tools);

    // 2. tools/list
    send({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {},
    });

    await waitForResponse(responses, 2);
    const tools = responses[1].result.tools;
    assert.equal(tools.length, 2);
    const names = tools.map((t: any) => t.name);
    assert.ok(names.includes('calculate'));
    assert.ok(names.includes('echo'));

    // 3. tools/call echo
    send({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'echo', arguments: { message: 'hello world' } },
    });

    await waitForResponse(responses, 3);
    assert.equal(responses[2].result.content[0].text, 'Echo: hello world');

    // 4. tools/call calculate
    send({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: { name: 'calculate', arguments: { operation: 'multiply', a: 6, b: 7 } },
    });

    await waitForResponse(responses, 4);
    assert.equal(responses[3].result.content[0].text, 'Result: 42');

    // Clean teardown
    child.kill();
  });
});

async function waitForResponse(responses: any[], expectedId: number, timeoutMs = 3000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (responses.some((r) => r.id === expectedId)) {
      return;
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`Timed out waiting for response id ${expectedId}`);
}
