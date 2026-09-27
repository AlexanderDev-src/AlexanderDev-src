// Vercel serverless function  ->  /api/list   (every icon name, as JSON)
import { listResponse, send } from '../lib/handler.js';

export default function handler(req, res) {
  send(res, listResponse());
}
