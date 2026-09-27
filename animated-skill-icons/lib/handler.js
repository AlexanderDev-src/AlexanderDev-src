// Runtime-agnostic request handlers: take URLSearchParams, return { status, headers, body }.
import { parseOptions, render, catalogue } from './render.js';

const CORS = { 'Access-Control-Allow-Origin': '*' };

function text(status, body) {
  return { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...CORS }, body };
}

export function iconsResponse(searchParams) {
  const opts = parseOptions(searchParams);
  if (opts.errors.length) return text(400, opts.errors.join('\n'));
  const { svg, unknown } = render(opts);
  if (!svg) return text(404, `None of these icons exist: ${unknown.join(', ')}\nFind names at /list or on the picker page.`);
  const headers = {
    'Content-Type': 'image/svg+xml; charset=utf-8',
    // GitHub proxies README images through its own cache (camo); these keep both caches happy
    'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    ...CORS,
  };
  if (unknown.length) headers['X-Unknown-Icons'] = unknown.join(',').replace(/[^\x20-\x7e]/g, '?').slice(0, 500);
  return { status: 200, headers, body: svg };
}

let cachedList;
export function listResponse() {
  cachedList ??= JSON.stringify(catalogue());
  return {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=3600, s-maxage=86400', ...CORS },
    body: cachedList,
  };
}

// adapter for Node's (req, res) – used by Vercel functions and server.js
export function send(res, r) {
  res.statusCode = r.status;
  for (const [k, v] of Object.entries(r.headers)) res.setHeader(k, v);
  res.end(r.body);
}
