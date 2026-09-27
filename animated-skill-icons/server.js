// Local preview / self-hosting without Vercel:   node server.js   ->  http://localhost:3000
// Serves the same /icons and /list endpoints plus the picker page in public/.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { iconsResponse, listResponse, send } from './lib/handler.js';

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const PORT = Number(process.env.PORT) || 3000;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const route = url.pathname.replace(/\/+$/, '') || '/';

  if (route === '/icons' || route === '/api/icons') return send(res, iconsResponse(url.searchParams));
  if (route === '/list' || route === '/api/list') return send(res, listResponse());

  const file = path.normalize(path.join(PUBLIC, route === '/' ? 'index.html' : route));
  if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.statusCode = 404; return res.end('Not found');
  }
  res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`animated-skill-icons  ->  http://localhost:${PORT}`));
