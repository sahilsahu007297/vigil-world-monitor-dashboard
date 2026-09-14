import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicFeedHandler } from './public-feeds.ts';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.txt': 'text/plain' };
createServer((req, res) => publicFeedHandler(req, res, async () => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
    // Preserve the dashboard's existing global-feed proxy on production hosting.
    if (/^\/api\/[a-z-]+$/.test(pathname)) {
      const response = await fetch(`https://osirisai.live${pathname}`, { signal: AbortSignal.timeout(15000) });
      res.writeHead(response.status, { 'Content-Type': response.headers.get('content-type') || 'application/json' });
      res.end(Buffer.from(await response.arrayBuffer())); return;
    }
    const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(resolve(root) + sep)) { res.writeHead(403); res.end(); return; }
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch { res.writeHead(404); res.end('Not found'); }
})).listen(Number(process.env.PORT || 8443), '0.0.0.0');
