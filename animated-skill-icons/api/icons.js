// Vercel serverless function  ->  /api/icons?i=rust,js,cpp   (also reachable as /icons, see vercel.json)
import { iconsResponse, send } from '../lib/handler.js';

export default function handler(req, res) {
  const { searchParams } = new URL(req.url, 'http://localhost');
  send(res, iconsResponse(searchParams));
}
