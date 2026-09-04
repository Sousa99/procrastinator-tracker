import 'dotenv/config';
import { serve } from '@hono/node-server';
import { createDb } from './db/client';
import { createApp } from './app';
import { createMcpHttpApp } from './adapters/mcp';

const mode = process.argv.includes('--mcp') ? 'mcp' : 'http';

const { db } = createDb();

if (mode === 'mcp') {
  const { app, ready } = createMcpHttpApp(db);
  await ready;
  const mcpPort = Number(process.env.MCP_PORT ?? 3001);
  console.log(`MCP server listening on http://localhost:${mcpPort}/mcp (streamable HTTP)`);
  serve({ fetch: app.fetch, port: mcpPort });
} else {
  const app = createApp(db);
  const port = Number(process.env.PORT ?? 3000);
  console.log(`REST API listening on http://localhost:${port} (OpenAPI: /doc, Swagger UI: /ui)`);
  serve({ fetch: app.fetch, port });
}
