import readline from 'node:readline';
import type { Readable, Writable } from 'node:stream';

export interface DiscoveredTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, any>;
}

export interface ToolCallResult {
  tool: string;
  arguments: Record<string, any>;
  output: string;
  durationMs: number;
  isError?: boolean;
}

export interface HarnessExecutionResult {
  completed: boolean;
  toolsDiscovered: DiscoveredTool[];
  toolsCalled: string[];
  toolResults: ToolCallResult[];
  errors: string[];
}

export class McpClientHarness {
  private nextId = 1;

  public async run(
    input: Readable,
    output: Writable,
    options: { toolTimeoutMs?: number; totalTimeoutMs?: number } = {}
  ): Promise<HarnessExecutionResult> {
    const toolTimeout = options.toolTimeoutMs || 5000;
    const totalTimeout = options.totalTimeoutMs || 30000;

    const rl = readline.createInterface({
      input,
      terminal: false,
    });

    const pendingRequests = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void; timer: NodeJS.Timeout }>();
    const errors: string[] = [];
    const toolsDiscovered: DiscoveredTool[] = [];
    const toolsCalled: string[] = [];
    const toolResults: ToolCallResult[] = [];

    rl.on('line', (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      try {
        const msg = JSON.parse(trimmed);
        if (msg.id && pendingRequests.has(msg.id)) {
          const req = pendingRequests.get(msg.id)!;
          clearTimeout(req.timer);
          pendingRequests.delete(msg.id);
          req.resolve(msg);
        }
      } catch {
        // Ignore unparseable line
      }
    });

    const onStreamClosed = () => {
      for (const [id, req] of pendingRequests.entries()) {
        clearTimeout(req.timer);
        req.reject(new Error(`Server process stream closed before response (id ${id})`));
      }
      pendingRequests.clear();
    };

    input.on('end', onStreamClosed);
    input.on('close', onStreamClosed);

    const sendRequest = (method: string, params: Record<string, any> = {}): Promise<any> => {
      return new Promise((resolve, reject) => {
        const id = this.nextId++;
        const timer = setTimeout(() => {
          pendingRequests.delete(id);
          reject(new Error(`MCP request '${method}' (id ${id}) timed out after ${toolTimeout}ms`));
        }, toolTimeout);

        pendingRequests.set(id, { resolve, reject, timer });

        const payload = JSON.stringify({
          jsonrpc: '2.0',
          id,
          method,
          params,
        }) + '\n';

        output.write(payload);
      });
    };

    const sendNotification = (method: string, params: Record<string, any> = {}) => {
      const payload = JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
      }) + '\n';
      output.write(payload);
    };

    let completed = false;

    try {
      // 1. Handshake: initialize
      const initResp = await sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'mcpguard-harness', version: '0.1.0' },
      });

      if (initResp.error) {
        throw new Error(`Initialize error: ${initResp.error.message || JSON.stringify(initResp.error)}`);
      }

      // 2. Notification: initialized
      sendNotification('notifications/initialized');

      // 3. List tools
      const listResp = await sendRequest('tools/list', {});
      if (listResp.result && Array.isArray(listResp.result.tools)) {
        for (const t of listResp.result.tools) {
          if (t && typeof t.name === 'string') {
            toolsDiscovered.push({
              name: t.name,
              description: t.description,
              inputSchema: t.inputSchema,
            });
          }
        }
      }

      // 4. Exercise every discovered tool
      for (const tool of toolsDiscovered) {
        const callArgs = this.generateMinimalArguments(tool.inputSchema);
        const callStart = Date.now();
        toolsCalled.push(tool.name);

        try {
          const callResp = await sendRequest('tools/call', {
            name: tool.name,
            arguments: callArgs,
          });

          let outputText = '';
          if (callResp.result && Array.isArray(callResp.result.content)) {
            outputText = callResp.result.content
              .map((c: any) => (typeof c.text === 'string' ? c.text : JSON.stringify(c)))
              .join('\n');
          } else if (callResp.error) {
            outputText = `Error: ${callResp.error.message || JSON.stringify(callResp.error)}`;
          }

          toolResults.push({
            tool: tool.name,
            arguments: callArgs,
            output: outputText,
            durationMs: Date.now() - callStart,
            isError: Boolean(callResp.error || callResp.result?.isError),
          });
        } catch (callErr) {
          const msg = callErr instanceof Error ? callErr.message : String(callErr);
          errors.push(`Failed calling tool ${tool.name}: ${msg}`);
          toolResults.push({
            tool: tool.name,
            arguments: callArgs,
            output: `Execution error: ${msg}`,
            durationMs: Date.now() - callStart,
            isError: true,
          });
        }
      }

      completed = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(msg);
      completed = false;
    } finally {
      // Clean up any remaining timers
      for (const req of pendingRequests.values()) {
        clearTimeout(req.timer);
      }
      pendingRequests.clear();
      rl.close();
    }

    return {
      completed,
      toolsDiscovered,
      toolsCalled,
      toolResults,
      errors,
    };
  }

  public generateMinimalArguments(schema?: Record<string, any>): Record<string, any> {
    if (!schema || schema.type !== 'object' || !schema.properties) {
      return {};
    }

    const args: Record<string, any> = {};
    for (const [propName, propDef] of Object.entries(schema.properties as Record<string, any>)) {
      args[propName] = this.generateValueForProperty(propDef);
    }
    return args;
  }

  private generateValueForProperty(propDef: any): any {
    if (!propDef || typeof propDef !== 'object') return 'test';

    if (Array.isArray(propDef.enum) && propDef.enum.length > 0) {
      return propDef.enum[0];
    }

    switch (propDef.type) {
      case 'string':
        return 'test';
      case 'number':
      case 'integer':
        return 1;
      case 'boolean':
        return false;
      case 'array':
        return [];
      case 'object':
        return {};
      default:
        return 'test';
    }
  }
}
