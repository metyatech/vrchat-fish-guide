import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8',
};

const [, , rootArg = 'out', ...restArgs] = process.argv;
const cwd = process.cwd();
const rootDir = path.resolve(cwd, rootArg);

function parsePort(args) {
  if (args.length === 0) {
    return 3000;
  }

  const listenIndex = args.findIndex((arg) => arg === '--listen' || arg === '-l');
  if (listenIndex >= 0 && args[listenIndex + 1]) {
    return Number(args[listenIndex + 1]);
  }

  const positional = args.find((arg) => /^\d+$/.test(arg));
  return positional ? Number(positional) : 3000;
}

const port = parsePort(restArgs);

function sendFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
}

function resolveRequestPath(urlPathname) {
  const unsafePath = decodeURIComponent(urlPathname.split('?')[0]);
  const trimmed = unsafePath.replace(/^\/+/, '');
  const candidate = path.resolve(rootDir, trimmed);

  if (!candidate.startsWith(rootDir)) {
    return null;
  }

  return candidate;
}

const server = http.createServer((req, res) => {
  if (!req.url) {
    res.writeHead(400);
    res.end('Bad Request');
    return;
  }

  const candidate = resolveRequestPath(req.url);
  if (!candidate) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const tryPaths = [candidate];
  if (!path.extname(candidate)) {
    tryPaths.push(`${candidate}.html`, path.join(candidate, 'index.html'));
  }

  const existingPath = tryPaths.find(
    (filePath) => fs.existsSync(filePath) && fs.statSync(filePath).isFile(),
  );
  if (existingPath) {
    sendFile(existingPath, res);
    return;
  }

  const notFound = path.join(rootDir, '404.html');
  if (fs.existsSync(notFound)) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(notFound).pipe(res);
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Static server ready on http://127.0.0.1:${port}\n`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
