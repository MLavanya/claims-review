import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Express } from 'express';
import { createApp } from '../server/app.js';

const rewrittenPathParameter = '__api_path';

export function createVercelHandler(app: Express = createApp().app) {
  return (request: IncomingMessage, response: ServerResponse) => {
    const url = new URL(request.url ?? '/', 'http://vercel.local');
    const rewrittenPath = url.searchParams.get(rewrittenPathParameter);

    if (rewrittenPath !== null) {
      url.searchParams.delete(rewrittenPathParameter);

      if (!/^[a-zA-Z0-9/_-]+$/.test(rewrittenPath) || rewrittenPath.split('/').includes('..')) {
        response.writeHead(404, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ error: 'API route not found.' }));
        return;
      }

      const query = url.searchParams.toString();
      request.url = `/api/${rewrittenPath}${query ? `?${query}` : ''}`;
    }

    app(request, response);
  };
}

export default createVercelHandler();
