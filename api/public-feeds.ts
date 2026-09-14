import type { IncomingMessage, ServerResponse } from 'node:http';
import { publicFeedHandler } from '../server/public-feeds.ts';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const originalUrl = req.url || '/';
  const urlObj = new URL(originalUrl, 'http://localhost');
  const pathParam = urlObj.searchParams.get('path');
  if (pathParam) {
    urlObj.searchParams.delete('path');
    const remainingQuery = urlObj.searchParams.toString();
    req.url = `/public-feeds/${pathParam}${remainingQuery ? `?${remainingQuery}` : ''}`;
  }

  publicFeedHandler(req, res, () => {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
  });
}
