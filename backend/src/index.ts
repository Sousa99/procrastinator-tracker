import 'dotenv/config';
import { serve } from '@hono/node-server';
import { createDb } from './db/client';
import { createApp } from './app';
import { runMcpServer } from './adapters/mcp';

const mode = process.argv.includes('--mcp') ? 'mcp' : 'http';

const { db } = createDb();

if (mode === 'mcp') {
  await runMcpServer(db);
} else {
  const app = createApp(db);
  const port = Number(process.env.PORT ?? 3000);
  console.log(`REST API listening on http://localhost:${port} (OpenAPI: /doc, Swagger UI: /ui)`);
  serve({ fetch: app.fetch, port });
}
