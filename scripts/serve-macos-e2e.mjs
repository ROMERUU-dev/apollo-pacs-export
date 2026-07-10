import { createReadStream, existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { createServer } from 'node:http';

const host = '127.0.0.1';
const port = Number.parseInt(process.env.PORT ?? '4180', 10);
const root = new URL('../dist/', import.meta.url).pathname;
const contentTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
let bridgeEvidence;

const json = (response, value) => {
  const body = JSON.stringify(value);
  response.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'no-store' });
  response.end(body);
};

createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${host}:${port}`);
  if (request.method === 'GET' && url.pathname === '/__evidence/desktop-platform') {
    if (bridgeEvidence === undefined) {
      response.writeHead(404, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end('{"received":false}');
    } else {
      json(response, { received: true, pass: bridgeEvidence });
    }
    return;
  }
  if (request.method === 'POST' && url.pathname === '/__evidence/desktop-platform') {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => { if (body.length < 2_048) body += chunk; });
    request.on('end', () => {
      try {
        const value = JSON.parse(body);
        const capabilities = value.capabilities ?? {};
        const safe = value.environment === 'macos' && value.bridgeState === 'connected'
          && capabilities.printing === false && capabilities.printerStatus === false
          && capabilities.cashDrawer === false && capabilities.deviceSettings === false;
        bridgeEvidence = safe;
        process.stdout.write(`Apollo React native bridge: ${safe ? 'pass' : 'fail'}\n`);
      } catch {
        bridgeEvidence = false;
        process.stdout.write('Apollo React native bridge: fail\n');
      }
      response.writeHead(204, { 'Cache-Control': 'no-store' });
      response.end();
    });
    return;
  }

  if (url.pathname === '/api/v1/session') {
    json(response, { username: 'apollo-m2-synthetic', subject: 'synthetic-m2', roles: ['apollo-receptionist'] });
    return;
  }
  if (url.pathname.startsWith('/api/v1/')) {
    json(response, []);
    return;
  }

  const relative = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]+/, '');
  const candidate = join(root, relative || 'index.html');
  const file = existsSync(candidate) && (await stat(candidate)).isFile() ? candidate : join(root, 'index.html');
  const type = contentTypes[extname(file)] ?? 'application/octet-stream';
  const size = (await stat(file)).size;
  response.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Cache-Control': 'no-store' });
  createReadStream(file).pipe(response);
}).listen(port, host, async () => {
  await readFile(join(root, 'index.html'));
  process.stdout.write(`Apollo React M2 harness listening on http://${host}:${port}/recepcion\n`);
});
