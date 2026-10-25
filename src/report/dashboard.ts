import http from 'node:http';
import type { ScanEventBus } from '../core/events.js';
import { ScanEventBus as EventBus } from '../core/events.js';
import { Orchestrator } from '../core/orchestrator.js';
import { getDashboardHtml } from './dashboard_page.js';

export class DashboardServer {
  private server: http.Server | null = null;
  private sseClients: Set<http.ServerResponse> = new Set();
  private bus: ScanEventBus;
  private orchestrator: Orchestrator;

  constructor(eventBus?: ScanEventBus) {
    this.bus = eventBus || new EventBus();
    this.orchestrator = new Orchestrator(this.bus);
    this.attach(this.bus);
  }

  public attach(eventBus: ScanEventBus): void {
    const eventNames: Array<keyof import('../core/types.js').ScanEventsMap> = [
      'stage:start',
      'stage:progress',
      'stage:complete',
      'finding:discovered',
      'sandbox:event',
      'scan:complete',
    ];

    for (const name of eventNames) {
      eventBus.on(name, (payload) => {
        this.broadcast(name, payload);
      });
    }
  }

  public async start(port = 3100, host = '127.0.0.1'): Promise<number> {
    if (this.server) {
      const addr = this.server.address() as any;
      return addr.port;
    }

    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        const url = req.url?.split('?')[0] || '/';
        const method = req.method?.toUpperCase() || 'GET';

        // CORS headers for local tools
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        if (url === '/' || url === '/index.html') {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(getDashboardHtml());
          return;
        }

        if (url === '/events') {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          });
          res.write(': connected\n\n');

          this.sseClients.add(res);

          req.on('close', () => {
            this.sseClients.delete(res);
          });
          return;
        }

        if (url === '/api/status' && method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              status: 'online',
              service: 'mcpguard-backend',
              version: '0.1.0',
              timestamp: new Date().toISOString(),
            })
          );
          return;
        }

        if (url === '/api/scan' && method === 'POST') {
          let bodyStr = '';
          req.on('data', (chunk) => {
            bodyStr += chunk;
          });

          req.on('end', async () => {
            try {
              const body = bodyStr ? JSON.parse(bodyStr) : {};
              const target = body.target;
              if (!target) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'target parameter is required' }));
                return;
              }

              const result = await this.orchestrator.scan(target, {
                noLlm: body.noLlm,
                timeout: body.timeout,
                noCache: body.noCache,
              });

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, result }));
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: msg }));
            }
          });
          return;
        }

        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
      });

      this.server.on('error', (err) => {
        reject(err);
      });

      this.server.listen(port, host, () => {
        const addr = this.server!.address() as any;
        resolve(addr.port);
      });
    });
  }

  public broadcast(type: string, payload: unknown): void {
    const data = JSON.stringify({ type, payload });
    for (const client of this.sseClients) {
      try {
        client.write(`data: ${data}\n\n`);
      } catch {
        this.sseClients.delete(client);
      }
    }
  }

  public async stop(): Promise<void> {
    for (const client of this.sseClients) {
      try {
        client.end();
      } catch {
        // Ignore client error
      }
    }
    this.sseClients.clear();

    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          this.server = null;
          resolve();
        });
      });
    }
  }
}
