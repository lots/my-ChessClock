/*!
 * serve.mjs - dependency-free static server for local use.
 *
 *   npm start            -> http://localhost:8080
 *   PORT=3000 npm start  -> http://localhost:3000
 *
 * It prints every LAN address as well, so a phone on the same wifi can open the
 * clock by typing one short URL.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '0.0.0.0';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8'
};

function send(res, status, body, headers) {
  res.writeHead(status, Object.assign({
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store'
  }, headers || {}));
  res.end(body);
}

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    return send(res, 400, 'Bad request');
  }
  if (pathname.endsWith('/')) pathname += 'index.html';

  const target = path.join(ROOT, pathname);
  const relative = path.relative(ROOT, target);
  // Refuse anything that tries to climb out of the served directory.
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return send(res, 403, 'Forbidden');
  }

  fs.stat(target, (err, stat) => {
    if (err || !stat.isFile()) return send(res, 404, 'Not found: ' + pathname);
    const type = TYPES[path.extname(target).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': stat.size,
      'Cache-Control': 'no-store'
    });
    fs.createReadStream(target).pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  const addresses = ['http://localhost:' + PORT];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const net of list || []) {
      if (net.family === 'IPv4' && !net.internal) addresses.push('http://' + net.address + ':' + PORT);
    }
  }
  console.log('CoQ Weiqi/Chess Clock is being served from ' + ROOT);
  for (const address of addresses) console.log('  ' + address);
  console.log('Open one of these in a browser. Ctrl+C to stop.');
});
