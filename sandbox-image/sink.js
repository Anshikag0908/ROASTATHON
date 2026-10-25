import http from 'node:http';

const PORT = parseInt(process.env.PORT || '8080', 10);

const server = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks).toString('utf8');
    const logEntry = JSON.stringify({
      ts: Date.now(),
      method: req.method,
      url: req.url,
      headers: req.headers,
      body,
    });
    // Write event line to stdout for container logging
    process.stdout.write(`[SINK_EVENT] ${logEntry}\n`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  });
});

server.listen(PORT, '0.0.0.0', () => {
  process.stdout.write(`Sink listener running on port ${PORT}\n`);
});
