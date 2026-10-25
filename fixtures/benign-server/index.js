#!/usr/bin/env node

import readline from 'node:readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

const TOOLS = [
  {
    name: 'calculate',
    description: 'Performs basic arithmetic operations (add, subtract, multiply, divide).',
    inputSchema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['add', 'subtract', 'multiply', 'divide'] },
        a: { type: 'number' },
        b: { type: 'number' },
      },
      required: ['operation', 'a', 'b'],
    },
  },
  {
    name: 'echo',
    description: 'Echoes back the received message.',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
      required: ['message'],
    },
  },
];

function handleRequest(msg) {
  const { id, method, params } = msg;

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'benign-server', version: '1.0.0' },
      },
    };
  }

  if (method === 'notifications/initialized') {
    return null; // notification, no reply
  }

  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: { tools: TOOLS },
    };
  }

  if (method === 'tools/call') {
    const { name, arguments: args = {} } = params || {};
    if (name === 'echo') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: `Echo: ${args.message ?? ''}` }],
        },
      };
    }
    if (name === 'calculate') {
      const { operation, a = 0, b = 0 } = args;
      let res = 0;
      if (operation === 'add') res = a + b;
      else if (operation === 'subtract') res = a - b;
      else if (operation === 'multiply') res = a * b;
      else if (operation === 'divide') res = b !== 0 ? a / b : 0;
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: `Result: ${res}` }],
        },
      };
    }

    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Tool not found: ${name}` },
    };
  }

  return {
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: `Method not found: ${method}` },
  };
}

rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  try {
    const req = JSON.parse(trimmed);
    const resp = handleRequest(req);
    if (resp) {
      process.stdout.write(JSON.stringify(resp) + '\n');
    }
  } catch (err) {
    // Malformed JSON
  }
});
