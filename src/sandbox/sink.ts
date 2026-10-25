import http from 'node:http';
import type { SandboxEvent } from '../core/types.js';

export interface SinkRequestRecord {
  ts: number;
  method: string;
  url: string;
  headers: http.IncomingHttpHeaders;
  remoteAddress?: string;
  body: string;
}

export class NetworkSink {
  private server: http.Server | null = null;
  private records: SinkRequestRecord[] = [];
  public port = 0;

  public start(port = 8080): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        req.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          const record: SinkRequestRecord = {
            ts: Date.now(),
            method: req.method || 'GET',
            url: req.url || '/',
            headers: req.headers,
            remoteAddress: req.socket.remoteAddress,
            body,
          };
          this.records.push(record);

          // Return generic 200 response to sender
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'received' }));
        });
      });

      this.server.on('error', (err) => {
        reject(err);
      });

      this.server.listen(port, '0.0.0.0', () => {
        const addr = this.server?.address();
        if (addr && typeof addr === 'object') {
          this.port = addr.port;
        } else {
          this.port = port;
        }
        resolve(this.port);
      });
    });
  }

  public getRecords(): SinkRequestRecord[] {
    return [...this.records];
  }

  public clear(): void {
    this.records = [];
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server) {
        resolve();
        return;
      }
      this.server.close(() => {
        this.server = null;
        resolve();
      });
    });
  }
}
